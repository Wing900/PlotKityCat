// probe-console: 进管理控制台，找"直链/下载链接"设置
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 关掉分享弹窗（如有）
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(800);
await page.locator('button[aria-label="关闭"]').first().click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(800);

await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 1) 点"管理控制台"
console.log('=== 点管理控制台 ===');
await page.locator('button:has-text("管理控制台"), *:has-text("管理控制台")').first().click({ timeout: 5000 }).catch(e => console.log('click fail:', e.message));
await page.waitForTimeout(3000);
console.log('now url:', page.url());

// 2) dump 控制台导航/菜单（找"直链/下载/链接/文件"相关）
console.log('\n=== 控制台 body 文本前 2500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2500));

// 3) 所有侧边/顶部菜单项
const navItems = await page.evaluate(() => {
  const sels = '[role=menuitem], .v-list-item, .nav-item, [class*=menu-item], a, button';
  return [...document.querySelectorAll(sels)].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 30 && /直链|链接|下载|文件|分享|配置|设置|权限|安全|管理|空间|策略|域|成员|日志/i.test(t);
  }).map(el => el.textContent.trim()).slice(0, 50);
});
console.log('\n=== 控制台菜单项（命中关键词）===');
console.log(JSON.stringify([...new Set(navItems)], null, 1));

await browser.close();