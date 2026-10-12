// probe-admin: 直接导航管理控制台 URL，dump 完整菜单找直链/外链/下载策略
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

console.log('=== 导航 /disk/admin/home ===');
await page.goto('https://bj37773.apps.aliyunfile.com/disk/admin/home', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('goto fail:', e.message));
await page.waitForTimeout(4000);
console.log('now url:', page.url());

console.log('\n=== 控制台 body 前 3500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 3500));

// 所有可见导航/菜单项
const nav = await page.evaluate(() => {
  return [...document.querySelectorAll('[role=menuitem], .v-list-item, .nav-item, [class*=menu-item], [class*=nav-item], a, button, li, span')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    if (!t || t.length > 22) return false;
    return /直链|外链|链接|下载|文件|分享|配置|设置|权限|安全|策略|域|成员|日志|存储|接入|高级|功能|开启|管理|空间|公共|预览|水印/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('\n=== 命中菜单项 ===');
console.log(JSON.stringify([...new Set(nav)], null, 1));

await browser.close();