// upload-cdp: 用 CDP DOM.setFileInputFiles 传文件路径（绕过 Playwright 50MB 限制），不关浏览器
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

await page.evaluate(() => {
  document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove());
  const c = document.querySelector('button[aria-label="关闭"]'); if (c) c.click();
}).catch(() => {});
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

if (!page.url().includes('/disk/drive/user')) {
  await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

const files = [
  'D:/projects/plotkitycat/build/release/PlotKityCat-v0.0.5.0.zip',
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-full.zip',
  'D:/projects/plotkitycat/build/release/PlotKityCat-mac-single.zip',
];

// 用 CDP session 调 DOM.setFileInputFiles，传文件路径（绕过 Playwright 50MB 限制）
const cdp = await ctx.newCDPSession(page);
// Runtime.evaluate 拿 input objectId → DOM.requestNode 转 nodeId
const evalRes = await cdp.send('Runtime.evaluate', {
  expression: `document.querySelector('input[type=file]')`,
  returnByValue: false,
});
const objectId = evalRes.result.objectId;
console.log('input objectId:', objectId);
if (!objectId) throw new Error('未找到 input[type=file]');
const nodeRes = await cdp.send('DOM.requestNode', { objectId });
const nodeId = nodeRes.nodeId;
console.log('input nodeId:', nodeId);
if (!nodeId) throw new Error('nodeId 转换失败');

console.log('=== 通过 CDP 传文件路径 ===');
await cdp.send('DOM.setFileInputFiles', { nodeId, files });
console.log('setFileInputFiles done, 等上传...');

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
console.log(text.slice(idx2, idx2 + 1200));

await browser.close();