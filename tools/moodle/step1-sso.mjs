import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');
import { writeFileSync } from 'fs';

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

console.log('=== 打开 tws 课程 id=970（触发登录）===');
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);

// 点统一身份认证进 sso 登录页
if (page.url().includes('/login') || page.url().includes('enrol')) {
  const ssoLink = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /统一身份认证|sso/.test(x.textContent + (x.href || '')));
    return a ? a.href : null;
  }).catch(() => null);
  if (ssoLink) {
    await page.goto(ssoLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
}

console.log('请在弹出的浏览器窗口登录 sso（统一身份认证）。2 分钟后脚本自动继续进课程...');
console.log('当前 URL:', page.url());
// 等 2 分钟，不关窗口，博士登录
await page.waitForTimeout(120000);

console.log('\n=== 2 分钟到，进课程 id=970 ===');
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('课程页 URL:', page.url());

// 如果在 enrol 选课页，选课
if (page.url().includes('enrol')) {
  console.log('在选课页，找选课方法...');
  const opt = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
      .map(x => ({ text: x.textContent.trim().slice(0, 40), href: x.href }))
      .filter(x => /自选|选课|enrol|加入|self/.test(x.text + x.href));
  }).catch(() => []);
  console.log('选课选项:', JSON.stringify(opt, null, 1));
  if (opt.length) {
    await page.goto(opt[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|确认|注册|submit/i.test(x.textContent + (x.value || '')));
      if (b) b.click();
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3500);
    console.log('选课后 URL:', page.url());
  }
}

// dump 课程内容 + 讨论区
const body = await page.locator('body').innerText().catch(() => '');
const lines = body.split('\n').filter(l => l.trim()).filter(l => /课例|讨论|论坛|一师|研习|三角|有理数|指数|话题|优课|观看|视频|添加新话题|任务|活动|模块|话题一|邵/.test(l));
console.log('\n=== 课程文本（课例/讨论/研习）===');
console.log(lines.slice(0, 60).join('\n'));

const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ text: x.textContent.trim().slice(0, 55), href: x.href }))
    .filter(x => /forum|discuss|topic|课例|讨论|一师|研习|三角|有理数|指数|优课/.test(x.text + x.href));
}).catch(() => []);
console.log('\n=== 讨论区/课例链接 ===');
console.log(JSON.stringify(links.slice(0, 40), null, 1));

writeFileSync('D:/projects/plotkitycat/tools/moodle/course-dump.json', JSON.stringify({ url: page.url(), links, bodyLines: lines }, null, 2));
console.log('\n已写 course-dump.json。浏览器保持开（不自动关），博士可继续在浏览器操作。');

// 保持浏览器开（不 close），让 bash timeout 自然结束
await page.waitForTimeout(600000);