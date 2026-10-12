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

const dump = () => page.evaluate(() => {
  const sel = 'a[href*="/course/view.php?id="]';
  const items = Array.from(document.querySelectorAll(sel));
  const seen = new Set();
  return items.filter(a => a.getBoundingClientRect().width > 0).map(a => {
    const href = a.getAttribute('href');
    if (seen.has(href)) return null; seen.add(href);
    return { name: a.textContent.trim().slice(0, 70), href };
  }).filter(Boolean);
}).catch(() => []);

console.log('=== 教师教育学部分类 (162) ===');
await page.goto('https://moodle.scnu.edu.cn/local/semester/semestercourse.php?categoryid=162', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);
const c1 = await dump();
console.log('共', c1.length);
console.log(JSON.stringify(c1.filter(c => /实习|工作坊|一师一优|课例|研习|邵|教学|教育|优课/.test(c.name)), null, 1));

for (const kw of ['一师一优', '课例', '邵铭宇', '教育实习', '研习', '优课']) {
  console.log('\n=== 搜 ' + kw + ' ===');
  const url = 'https://moodle.scnu.edu.cn/course/search.php?search=' + encodeURIComponent(kw);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const r = await dump();
  console.log(JSON.stringify(r.slice(0, 6), null, 1));
}

await ctx.close();