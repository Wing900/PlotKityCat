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

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);

// 点添加新话题
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) a.click();
}).catch(() => {});
await page.waitForTimeout(5000);

// dump 所有 form + submit 按钮
const data = await page.evaluate(() => {
  const forms = Array.from(document.querySelectorAll('form')).map(f => ({ id: f.id, action: f.action, method: f.method, inputs: Array.from(f.querySelectorAll('input,textarea,button,iframe')).map(x => ({ tag: x.tagName, id: x.id, name: x.name, type: x.type, value: (x.value||'').slice(0,20), text: x.textContent.trim().slice(0,30), visible: x.getBoundingClientRect().width>0 })) }));
  return forms;
}).catch(() => []);
console.log(JSON.stringify(data, null, 1));

await ctx.close();