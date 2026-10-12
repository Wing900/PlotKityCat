// search-course: 复用 profile，搜 moodle 课程找实习工作坊
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();

const kws = ['邵铭宇', '一师一优课', '课例研习', '实习工作坊', '三角函数'];
for (const kw of kws) {
  console.log(`\n=== 搜 "${kw}" ===`);
  const url = `https://moodle.scnu.edu.cn/course/search.php?search=${encodeURIComponent(kw)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const results = await page.evaluate(() => {
    const items = [...document.querySelectorAll('a[href*="/course/view.php?id="]')];
    const seen = new Set();
    return items.filter(a => a.getBoundingClientRect().width > 0).map(a => {
      const href = a.getAttribute('href');
      if (seen.has(href)) return null; seen.add(href);
      return { name: a.textContent.trim().slice(0, 70), href };
    }).filter(Boolean);
  }).catch(() => []);
  console.log(JSON.stringify(results.slice(0, 8), null, 1));
}

await ctx.close();