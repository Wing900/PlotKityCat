// probe-console2: 彻底关弹窗 → 进管理控制台 → 完整 dump 菜单找直链
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 彻底关弹窗：Escape 多次 + 点所有"取消/close/关闭" + 遮罩
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
}
await page.evaluate(() => {
  document.querySelectorAll('.v-dialog__content--active, .v-overlay--active').forEach(el => {
    const close = el.querySelector('button[aria-label="关闭"], button:has-text("取消"), button:has-text("close")');
    if (close) close.click();
  });
}).catch(() => {});
await page.waitForTimeout(1000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

console.log('=== 当前 URL ===', page.url());

// 点"管理控制台"（用 evaluate 精确点顶部那个）
console.log('\n=== 点管理控制台 ===');
const res = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button, a, *')];
  const t = btns.find(b => b.textContent.trim() === '管理控制台' && b.getBoundingClientRect().width > 0);
  if (!t) return 'not found';
  t.click();
  return 'clicked';
});
console.log(res);
await page.waitForTimeout(4000);
console.log('now url:', page.url());

// 完整 dump 控制台
console.log('\n=== 控制台 body 前 3000 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 3000));

// 所有可见菜单项
const nav = await page.evaluate(() => {
  const sels = '[role=menuitem], .v-list-item, .nav-item, [class*=menu-item], [class*=nav], a, button, span';
  return [...document.querySelectorAll(sels)].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    if (!t || t.length > 25) return false;
    return /直链|链接|下载|文件|分享|配置|设置|权限|安全|管理|空间|策略|域|成员|日志|存储|外链|接入/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('\n=== 命中菜单项 ===');
console.log(JSON.stringify([...new Set(nav)], null, 1));

await browser.close();