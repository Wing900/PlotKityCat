// probe-more: 列所有 pages(新标签) + 关弹窗 + 探"更多"菜单 + "详情"面板找直链
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];

// 列所有 pages（管理控制台可能开了新标签）
console.log('=== 所有 pages ===');
for (const p of ctx.pages()) console.log(p.url());

const page = ctx.pages().find(p => p.url().includes('/disk/drive/user') || p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 关弹窗：直接点 close 按钮
await page.evaluate(() => {
  const c = document.querySelector('button[aria-label="关闭"]');
  if (c) c.click();
}).catch(() => {});
await page.waitForTimeout(1000);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

const namePart = 'PlotKityCat-0.0.5.0-windows-amd64';
const fileRow = page.locator('.row-list_row').filter({ hasText: namePart }).first();

// 1) 点"更多"按钮（顶部操作栏）
console.log('\n=== 点"更多" ===');
await fileRow.click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(800);
const moreRes = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const m = btns.find(b => b.getBoundingClientRect().width > 0 && b.textContent.trim() === '更多');
  if (m) { m.click(); return 'clicked'; }
  return 'not found';
});
console.log(moreRes);
await page.waitForTimeout(1500);

// dump 弹出的"更多"菜单
const moreMenu = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 20 && /直链|链接|下载|分享|外链|原始|获取|复制|导出|二维码|保存|转存/i.test(t);
  });
  return leaves.map(el => el.textContent.trim());
});
console.log('更多菜单项:', JSON.stringify([...new Set(moreMenu)], null, 1));

await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(800);

// 2) 点"详情"看文件详情面板有没有直链
console.log('\n=== 点"详情" ===');
await fileRow.click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(800);
const detailRes = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const d = btns.find(b => b.getBoundingClientRect().width > 0 && b.textContent.trim() === '详情');
  if (d) { d.click(); return 'clicked'; }
  return 'not found';
});
console.log(detailRes);
await page.waitForTimeout(1500);

console.log('\n=== 详情面板 body（找直链/链接）===');
const detailText = await page.locator('body').innerText().catch(() => '');
const detailIdx = detailText.indexOf('PlotKityCat-0.0.5.0-windows-amd64.zip');
console.log(detailIdx >= 0 ? detailText.slice(detailIdx, detailIdx + 1500) : detailText.slice(0, 1000));

// 详情里的可见链接
const urls = detailText.match(/https?:\/\/[^\s，。"'<>]+/g);
console.log('\n详情中 URL:', urls);

await browser.close();