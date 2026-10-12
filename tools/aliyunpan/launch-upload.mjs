// launch-upload: 关闭 CDP 浏览器 → Playwright launch 同 profile → setInputFiles 本地路径（无大小限制）→ 上传 3 文件
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

// 1) 关闭现有 CDP 浏览器（释放 profile 锁）
try {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const bcdp = await b.newBrowserCDPSession();
  await bcdp.send('Browser.close');
  console.log('已关闭旧浏览器');
} catch (e) { console.log('旧浏览器已不可达:', e.message.slice(0, 80)); }
await new Promise(r => setTimeout(r, 3000));

// 2) launch headed 同 profile（登录态保留）
const profileDir = 'D:/projects/plotkitycat/tools/aliyunpan/profile';
const ctx2 = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--disable-blink-features=AutomationControlled'],
});
const page = ctx2.pages()[0] || await ctx2.newPage();
console.log('launched, initial url:', page.url());

// 3) 导航个人空间
await page.goto('https://bj37773.apps.aliyunfile.com/disk/drive/user', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('goto fail:', e.message));
await page.waitForTimeout(4000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});
console.log('now url:', page.url());

// 4) 上传 3 文件（本地路径，无大小限制）
const files = [
  'D:/projects/plotkitycat/build/release/PlotKityCat-v0.0.5.0.zip',
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-full.zip',
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-single.zip',
];
console.log('=== setInputFiles 3 个文件 ===');
await page.locator('input[type=file]').nth(0).setInputFiles(files);
console.log('已触发，等上传...');

// 5) 等上传完成
const expectNames = ['PlotKityCat-v0.0.5.0', 'PlotKityCat-0.0.5.0-windows-amd64', 'PlotKityCat-mac-full', 'PlotKityCat-mac-single'];
const start = Date.now();
let done = false;
while (Date.now() - start < 600000) {
  const body = await page.locator('body').innerText().catch(() => '');
  const idx = body.indexOf('全选');
  const listArea = idx >= 0 ? body.slice(idx) : '';
  const allPresent = expectNames.every(n => listArea.includes(n));
  const remaining = body.match(/剩余上传任务 \((\d+)\)/);
  const remCount = remaining ? parseInt(remaining[1]) : -1;
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] 剩余上传:${remCount} | 列表已现: ${expectNames.filter(n => listArea.includes(n)).length}/4`);
  if (allPresent && remCount === 0) { done = true; break; }
  await page.waitForTimeout(4000);
}
console.log('\n上传完成?', done, '| 耗时', Math.round((Date.now() - start) / 1000), 's');

console.log('\n=== 文件列表 ===');
const text = await page.locator('body').innerText().catch(() => '');
const idx2 = text.indexOf('全选');
console.log(text.slice(idx2, idx2 + 1500));

console.log('\n上传脚本完成，写 flag，关闭浏览器。');
const { writeFileSync } = await import('fs');
writeFileSync('D:/projects/plotkitycat/tools/aliyunpan/upload-done.flag', String(done));
await ctx2.close();