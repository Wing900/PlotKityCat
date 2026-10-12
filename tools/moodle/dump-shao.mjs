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

// 邵老师点评 d=161584
console.log('=== 邵老师点评 d=161584 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=161584', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);
let b = await page.locator('body').innerText().catch(() => '');
let i = b.indexOf('邵老师点评');
console.log(b.slice(i >= 0 ? i : 0, (i >= 0 ? i : 0) + 2500));
writeFileSync('D:/projects/plotkitycat/tools/moodle/shao.txt', b);

// 对该节课的认识 d=161594
console.log('\n=== 对该节课的认识 d=161594 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=161594', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
b = await page.locator('body').innerText().catch(() => '');
i = b.indexOf('对该节课的认识');
console.log(b.slice(i >= 0 ? i : 0, (i >= 0 ? i : 0) + 1800));

// 课后小思 d=161592
console.log('\n=== 课后小思 d=161592 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=161592', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);
b = await page.locator('body').innerText().catch(() => '');
i = b.indexOf('课后小思');
console.log(b.slice(i >= 0 ? i : 0, (i >= 0 ? i : 0) + 1800));

await ctx.close();