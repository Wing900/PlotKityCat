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

// 1) 课例1讨论区
console.log('=== 课例1讨论区 forum/view.php?id=26446 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('URL:', page.url());

const body = await page.locator('body').innerText().catch(() => '');
console.log('\n--- 讨论区文本（话题列表）---');
console.log(body.slice(0, 3000));

// 话题链接
const topics = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ text: x.textContent.trim().slice(0, 60), href: x.href }))
    .filter(x => /discuss\.php|话题|回复|topic/.test(x.text + x.href));
}).catch(() => []);
console.log('\n--- 话题链接 ---');
console.log(JSON.stringify(topics.slice(0, 20), null, 1));

// 进第一个话题（邵老师话题一）看内容
if (topics.length) {
  const t1 = topics.find(t => /discuss/.test(t.href)) || topics[0];
  console.log('\n=== 进话题: ' + t1.text + ' ===');
  await page.goto(t1.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const tBody = await page.locator('body').innerText().catch(() => '');
  console.log(tBody.slice(0, 4000));
  writeFileSync('D:/projects/plotkitycat/tools/moodle/topic1.txt', tBody);
}

// 2) 课例1链接（1.1 网页地址）
console.log('\n=== 课例1链接 url/view.php?id=26447 ===');
await page.goto('https://tws.scnu.edu.cn/mod/url/view.php?id=26447', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('课例1跳转 URL:', page.url());

await ctx.close();