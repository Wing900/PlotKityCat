import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

console.log('=== 进课程 id=970（触发登录）===');
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);

// 如果未登录，点统一身份认证
if (page.url().includes('/login') || page.url().includes('enrol')) {
  console.log('未登录，点统一身份认证...');
  const ssoLink = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /统一身份认证|sso/.test(x.textContent + (x.href || '')));
    return a ? a.href : null;
  }).catch(() => null);
  if (ssoLink) {
    await page.goto(ssoLink, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(3000);
    console.log('SSO 后 URL:', page.url());
    // sso 可能自动回 tws，或要博士登录/授权
    if (page.url().includes('sso.scnu.edu.cn')) {
      console.log('在 SSO 页，请博士在浏览器完成登录/授权（最长等 5 分钟）...');
      try {
        await page.waitForFunction(() => location.hostname.includes('tws.scnu.edu.cn'), { timeout: 300000 });
        console.log('SSO 完成，回 tws:', page.url());
      } catch (e) { console.log('SSO 等待超时，当前:', page.url()); }
    }
  }
}

// 再进课程
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('\n课程页 URL:', page.url());

// 如果在 enrol 选课页，选课
if (page.url().includes('enrol')) {
  console.log('在选课页，找选课按钮...');
  const enrolBtn = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /自选|选课|enrol.*self|加入/.test(x.textContent + (x.href || '')) && x.getBoundingClientRect().width > 0);
    return a ? { text: a.textContent.trim(), href: a.href } : null;
  }).catch(() => null);
  console.log('选课按钮:', JSON.stringify(enrolBtn));
  if (enrolBtn) {
    await page.goto(enrolBtn.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // 确认选课
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|确认|注册/i.test(x.textContent + (x.value || '')));
      if (b) b.click();
    }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3500);
    console.log('选课后 URL:', page.url());
  }
}

// dump 课程内容
console.log('\n=== 课程页文本（课例/讨论/一师一优/研习/三角/有理数/指数）===');
const body = await page.locator('body').innerText().catch(() => '');
const lines = body.split('\n').filter(l => l.trim()).filter(l => /课例|讨论|论坛|一师|研习|三角|有理数|指数|话题|优课|观看|视频|添加新话题|任务|活动|模块/.test(l));
console.log(lines.slice(0, 60).join('\n'));

console.log('\n=== 讨论区/课例链接 ===');
const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ text: x.textContent.trim().slice(0, 55), href: x.href }))
    .filter(x => /forum|discuss|topic|课例|讨论|一师|研习|三角|有理数|指数|优课|view\.php/.test(x.text + x.href));
}).catch(() => []);
console.log(JSON.stringify(links.slice(0, 40), null, 1));

await ctx.close();