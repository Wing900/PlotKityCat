// launch-moodle: 打开砺儒云课堂，博士登录后 dump 我的课程
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
console.log('打开砺儒云课堂，请博士在浏览器登录...');
await page.goto('https://moodle.scnu.edu.cn', { waitUntil: 'domcontentloaded', timeout: 30000 });

// 等登录态（最长 6 分钟）：登录后有 logout 链接
try {
  await page.waitForFunction(() => {
    return !!document.querySelector('a[href*="logout"], .userbutton, .usermenu, [aria-label*="用户"]');
  }, { timeout: 360000 });
  console.log('检测到登录态，继续...');
} catch (e) {
  console.log('登录等待超时或检测失败，dump 当前页面:');
}

await page.waitForTimeout(2000);
// goto 我的课程
await page.goto('https://moodle.scnu.edu.cn/my/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);

// dump 课程列表
console.log('\n=== 我的课程列表 ===');
const courses = await page.evaluate(() => {
  // Moodle 课程卡片/列表
  const items = [...document.querySelectorAll('a[href*="/course/view.php?id="]')];
  const seen = new Set();
  return items.filter(a => a.getBoundingClientRect().width > 0).map(a => {
    const href = a.getAttribute('href');
    if (seen.has(href)) return null; seen.add(href);
    return { name: a.textContent.trim().slice(0, 60), href };
  }).filter(Boolean);
}).catch(() => []);
console.log(JSON.stringify(courses, null, 1));

// dump 页面文本（找"实习""工作坊""一师一优"关键词）
console.log('\n=== 页面含 实习/工作坊/一师一优/课例 的文本 ===');
const body = await page.locator('body').innerText().catch(() => '');
const lines = body.split('\n').filter(l => /实习|工作坊|一师一优|课例|研习|邵铭宇/.test(l)).slice(0, 20);
console.log(lines.join('\n'));

await ctx.close();