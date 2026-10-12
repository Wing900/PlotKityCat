import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();

console.log('=== 选课页 enrol/index.php?id=970 ===');
await page.goto('https://tws.scnu.edu.cn/enrol/index.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// dump 选课方法/按钮
const opt = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('a, button, input[type=submit]'));
  return items.filter(x => x.getBoundingClientRect().width > 0).map(x => ({
    tag: x.tagName, text: x.textContent.trim().slice(0, 40), href: x.getAttribute('href') || '', value: x.value || '',
  })).filter(x => x.text || x.value || x.href);
}).catch(() => []);
console.log(JSON.stringify(opt, null, 1));

// 找"自选课程"或"选课"链接
const selfEnrol = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /自选|选课|enrol|self|加入/.test(x.textContent) || /enrol\.self/.test(x.href || ''));
  return a ? { text: a.textContent.trim(), href: a.href } : null;
}).catch(() => null);
console.log('选课链接:', JSON.stringify(selfEnrol));

if (selfEnrol) {
  await page.goto(selfEnrol.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);
  // 确认选课按钮
  const confirm = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|确认|submit/i.test(x.textContent + (x.value || '')));
    return b ? { text: b.textContent.trim() || b.value, tag: b.tagName } : null;
  }).catch(() => null);
  console.log('确认选课按钮:', JSON.stringify(confirm));
  if (confirm) {
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|确认|submit/i.test(x.textContent + (x.value || '')));
      if (b) b.click();
    });
    await page.waitForTimeout(3000);
  }
}

// 进课程
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(4000);
console.log('\n=== 课程页 URL:', page.url(), '===');
const body = await page.locator('body').innerText().catch(() => '');
const lines = body.split('\n').filter(l => l.trim()).filter(l => /课例|讨论|论坛|一师|研习|三角|有理数|指数|话题|优课|观看|视频|添加新话题|任务|活动/.test(l));
console.log('含课例/讨论的行:');
console.log(lines.slice(0, 50).join('\n'));

console.log('\n=== 讨论区/论坛链接 ===');
const links = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ text: x.textContent.trim().slice(0, 50), href: x.href }))
    .filter(x => /forum|discuss|topic|课例|讨论|一师|研习|三角|有理数|指数|优课/.test(x.text + x.href));
}).catch(() => []);
console.log(JSON.stringify(links.slice(0, 30), null, 1));

await ctx.close();