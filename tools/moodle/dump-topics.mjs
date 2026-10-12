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

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);

// 所有话题链接
const topics = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ text: x.textContent.trim().slice(0, 50), href: x.href }))
    .filter(x => /discuss\.php\?d=/.test(x.href));
}).catch(() => []);
console.log('话题数:', topics.length);
console.log(JSON.stringify(topics, null, 1));

// 进每个话题看正文（前6个）
const out = [];
for (let i = 0; i < Math.min(topics.length, 6); i++) {
  const t = topics[i];
  console.log('\n=== 话题' + (i+1) + ': ' + t.text + ' ===');
  await page.goto(t.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText().catch(() => '');
  // 找正文（话题发起人 + 内容）
  const start = body.indexOf('话题');
  const snippet = body.slice(start >= 0 ? start : 0, (start >= 0 ? start : 0) + 1500);
  console.log(snippet);
  out.push({ i: i+1, title: t.text, href: t.href, body: snippet });
}

writeFileSync('D:/projects/plotkitycat/tools/moodle/topics.json', JSON.stringify(out, null, 2));
console.log('\n已写 topics.json');

await ctx.close();