// launch-moodle-login: 弹浏览器打开登录页，博士登录后自动 dump 课程
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized', '--disable-popup-blocking'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });
console.log('登录页 URL: https://moodle.scnu.edu.cn/login/index.php');
console.log('浏览器窗口已最大化弹出，请博士登录砺儒云课堂（最多等 20 分钟，慢慢登）...');
await page.goto('https://moodle.scnu.edu.cn/login/index.php', { waitUntil: 'domcontentloaded', timeout: 30000 });

// 只检测真正登录态（logout 链接/用户菜单），不检测 URL 变化（避免点链接误判）
try {
  await page.waitForFunction(() => {
    if (location.href.includes('/login')) return false;
    return !!(document.querySelector('a[href*="login/logout.php"], a[href*="/logout"]') ||
              document.querySelector('.userbutton, .usermenutrigger, .dropdown.usermenu'));
  }, { timeout: 3500000 });
  console.log('✓ 检测到登录态，URL:', page.url());
} catch (e) {
  console.log('登录等待超时（约58分钟），dump 当前状态');
}

await page.waitForTimeout(2000);
await page.goto('https://moodle.scnu.edu.cn/my/', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);

console.log('\n=== 我的课程列表（全部）===');
const courses = await page.evaluate(() => {
  const items = [...document.querySelectorAll('a[href*="/course/view.php?id="]')];
  const seen = new Set();
  return items.filter(a => a.getBoundingClientRect().width > 0).map(a => {
    const href = a.getAttribute('href');
    if (seen.has(href)) return null; seen.add(href);
    return { name: a.textContent.trim().slice(0, 80), href };
  }).filter(Boolean);
}).catch(() => []);
console.log(JSON.stringify(courses, null, 1));

console.log('\n=== 含 实习/工作坊/一师一优/课例/邵 的课程 ===');
const hit = courses.filter(c => /实习|工作坊|一师一优|课例|研习|邵铭宇|三角函数|有理数|指数函数/.test(c.name));
console.log(JSON.stringify(hit, null, 1));

await ctx.close();