// upload-all: 上传剩余 3 文件到阿里云企业版个人空间（Win 完整版 + Mac 完整版 + Mac 单 app；Win 单 exe 已传）
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 清遮罩 + 关弹窗
await page.evaluate(() => {
  document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove());
  const c = document.querySelector('button[aria-label="关闭"]'); if (c) c.click();
}).catch(() => {});
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 确保个人空间
if (!page.url().includes('/disk/drive/user')) {
  await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

const files = [
  'D:/projects/plotkitycat/build/release/PlotKityCat-v0.0.5.0.zip',       // Win 完整版 120MB
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-full.zip',       // Mac 完整版 135MB
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-single.zip',     // Mac 单 app 6MB
];

console.log('=== 上传 3 个文件 ===');
for (const f of files) console.log(' -', f);
await page.locator('input[type=file]').nth(0).setInputFiles(files);
console.log('setInputFiles 已触发，等待上传完成...');

// 等上传完成：文件列表区出现 4 个文件名前缀 + 剩余上传任务为 0
const expectNames = ['PlotKityCat-v0.0.5.0', 'PlotKityCat-0.0.5.0-windows-amd64', 'PlotKityCat-mac-full', 'PlotKityCat-mac-single'];
const start = Date.now();
let done = false;
while (Date.now() - start < 600000) {
  const body = await page.locator('body').innerText().catch(() => '');
  // 文件列表区：截取"全选"后
  const idx = body.indexOf('全选');
  const listArea = idx >= 0 ? body.slice(idx) : '';
  const allPresent = expectNames.every(n => listArea.includes(n));
  const remaining = body.match(/剩余上传任务 \((\d+)\)/);
  const remCount = remaining ? parseInt(remaining[1]) : -1;
  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`[${elapsed}s] 剩余上传:${remCount} | 文件列表已出现: ${expectNames.filter(n => listArea.includes(n)).length}/4`);
  if (allPresent && remCount === 0) { done = true; break; }
  await page.waitForTimeout(4000);
}
console.log('\n上传完成?', done, '| 耗时', Math.round((Date.now() - start) / 1000), 's');

// dump 文件列表
console.log('\n=== 文件列表 ===');
const text = await page.locator('body').innerText().catch(() => '');
const idx2 = text.indexOf('全选');
console.log(text.slice(idx2, idx2 + 1200));

await browser.close();