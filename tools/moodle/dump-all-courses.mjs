// dump-all-courses: 复用 profile，dump 全部我的课程 + 宽搜
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');
import { writeFileSync } from 'fs';

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://moodle.scnu.edu.cn/my/', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// 滚动加载全部
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
}

const courses = await page.evaluate(() => {
  const items = [...document.querySelectorAll('a[href*="/course/view.php?id="]')];
  const seen = new Set();
  return items.filter(a => a.getBoundingClientRect().width > 0).map(a => {
    const href = a.getAttribute('href');
    if (seen.has(href)) return null; seen.add(href);
    return { name: a.textContent.trim().slice(0, 100), href };
  }).filter(Boolean);
}).catch(() => []);

writeFileSync('D:/projects/plotkitycat/tools/moodle/courses.json', JSON.stringify(courses, null, 2));
console.log(`共 ${courses.length} 门课程`);

console.log('\n=== 命中 实习/工作坊/一师一优/课例/研习/邵/三角/有理数/指数/教学技能/教育研习 ===');
const hit = courses.filter(c => /实习|工作坊|一师一优|课例|研习|邵铭宇|三角函数|有理数|指数函数|教学技能|教育研习|名师|优课|观摩|听课|评课/.test(c.name));
console.log(JSON.stringify(hit, null, 1));

console.log('\n=== 命中 数学/教学/教育 的课程 ===');
const math = courses.filter(c => /数学|教学|教育|师范|中学/.test(c.name)).slice(0, 25);
console.log(JSON.stringify(math, null, 1));

await ctx.close();