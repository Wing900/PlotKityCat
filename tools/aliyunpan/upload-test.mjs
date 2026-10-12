// upload-test: 切个人空间 → 上传 Win 单 exe 试水 → 等完成 → dump 文件列表 + 探分享入口
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 兜底清遮罩
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 1) 切个人空间
console.log('=== 切个人空间 ===');
await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(e => console.log('click fail:', e.message));
await page.waitForTimeout(2500);
console.log('now url:', page.url());

// 2) 看 2 个 input[type=file] 的属性（区分文件 vs 文件夹）
const inputs = await page.locator('input[type=file]').all();
console.log('\n=== input[type=file] 属性 ===');
for (let i = 0; i < inputs.length; i++) {
  const attrs = await page.evaluate((idx) => {
    const el = document.querySelectorAll('input[type=file]')[idx];
    return {
      accept: el.accept, webkitdirectory: el.webkitdirectory,
      multiple: el.multiple, name: el.name, parentText: el.parentElement?.getAttribute('aria-label') || ''
    };
  }, i).catch(() => null);
  console.log(i, JSON.stringify(attrs));
}

// 3) 选"文件"上传的 input（非 webkitdirectory），setInputFiles
const fileIdx = 0; // 先用第一个试
const filePath = 'D:/projects/plotkitycat/build/release/PlotKityCat-0.0.5.0-windows-amd64.zip';
console.log('\n=== 上传文件:', filePath, '===');
await page.locator('input[type=file]').nth(fileIdx).setInputFiles(filePath);
console.log('setInputFiles done, 等待上传完成...');

// 4) 等上传完成：轮询文件列表出现该文件名（最长 120s）
const fileName = 'PlotKityCat-0.0.5.0-windows-amd64.zip';
const start = Date.now();
let found = false;
while (Date.now() - start < 120000) {
  const body = await page.locator('body').innerText().catch(() => '');
  if (body.includes(fileName)) { found = true; break; }
  // 检查传输任务是否还在进行
  await page.waitForTimeout(2000);
}
console.log('上传完成?', found, '| 耗时', Math.round((Date.now()-start)/1000), 's');

// 5) dump 文件列表
console.log('\n=== body 文本前 1500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 1500));

await browser.close();