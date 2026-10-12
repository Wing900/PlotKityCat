// share-create: 重新打开分享弹窗 → dump 完整内容 → 点创建 → 拿链接
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

if (!page.url().includes('/disk/drive/user')) {
  await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

const namePart = 'PlotKityCat-0.0.5.0-windows-amd64';

// 1) 选中文件行（左键单击选中，触发顶部操作栏）
const fileRow = page.locator('.row-list_row').filter({ hasText: namePart }).first();
await fileRow.scrollIntoViewIfNeeded();
await fileRow.click({ timeout: 8000 }).catch(e => console.log('click fail:', e.message));
await page.waitForTimeout(1200);

// 2) 点顶部操作栏"分享"按钮（精确文本"分享"，不是"我的分享"）
console.log('=== 点顶部"分享"按钮 ===');
const clicked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const shareBtn = btns.find(b => {
    const r = b.getBoundingClientRect();
    if (r.width === 0) return false;
    const t = b.textContent.trim();
    return t === '分享';
  });
  if (shareBtn) { shareBtn.click(); return 'ok'; }
  return 'not found';
});
console.log(clicked);
await page.waitForTimeout(2000);

// 3) dump 完整弹窗文本 + 所有按钮
console.log('\n=== 弹窗完整 body 文本（分享弹窗部分）===');
const bodyText = await page.locator('body').innerText().catch(() => '');
const idx = bodyText.indexOf('创建分享');
console.log(idx >= 0 ? bodyText.slice(idx, idx + 3000) : bodyText.slice(0, 2500));

// 4) 所有可见按钮
const btns = await page.locator('button:visible').all();
const info = [];
for (const b of btns) {
  const t = (await b.innerText().catch(() => '')).trim().slice(0, 25);
  const l = await b.getAttribute('aria-label').catch(() => '');
  if (t || l) info.push({ t, l });
}
console.log('\n=== 所有可见 button ===');
console.log(JSON.stringify(info, null, 1));

// 5) 点"创建分享"按钮
console.log('\n=== 点"创建分享" ===');
const createRes = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const target = btns.find(b => {
    const r = b.getBoundingClientRect();
    if (r.width === 0) return false;
    const t = b.textContent.trim();
    return t === '创建分享' || t === '创建';
  });
  if (target) { target.click(); return 'clicked: ' + target.textContent.trim(); }
  return 'not found';
});
console.log(createRes);
await page.waitForTimeout(3000);

// 6) dump 创建后弹窗（找链接）
console.log('\n=== 创建后 body（找链接）===');
const afterText = await page.locator('body').innerText().catch(() => '');
// 找 http 链接
const urlMatch = afterText.match(/https?:\/\/[^\s，。"'<>]+/g);
console.log('找到的 URL:', urlMatch);

const inputs = await page.locator('input:visible, textarea:visible').all();
console.log('\n=== 可见 input/textarea ===');
for (let i = 0; i < inputs.length; i++) {
  const val = await inputs[i].inputValue().catch(() => '');
  if (val) console.log(i, 'value:', val.slice(0,300));
}

console.log('\n=== 创建后弹窗文本（创建分享之后）===');
const idx2 = afterText.indexOf('创建分享');
console.log(idx2 >= 0 ? afterText.slice(idx2, idx2 + 3000) : afterText.slice(0, 2000));

await browser.close();