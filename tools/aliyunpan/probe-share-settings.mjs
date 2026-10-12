// probe-share-settings: 点"分享设置管理"，dump 完整页面找直链/外链/下载开关
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

if (!page.url().includes('/disk/admin')) {
  await page.goto('https://bj37773.apps.aliyunfile.com/disk/admin/home', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
}
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 先展开安全策略
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() === '安全策略' && el.getBoundingClientRect().width > 0);
  if (items[0]) items[0].click();
}).catch(() => {});
await page.waitForTimeout(1200);

// 点"分享设置管理"
console.log('=== 点"分享设置管理" ===');
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() === '分享设置管理' && el.getBoundingClientRect().width > 0);
  if (items[0]) items[0].click();
}).catch(() => {});
await page.waitForTimeout(3500);
console.log('now url:', page.url());

console.log('\n=== 分享设置管理 body 完整 ===');
const text = await page.locator('body').innerText().catch(() => '');
// 截掉左侧菜单，找主体内容
const idx = text.indexOf('分享设置');
console.log(idx >= 0 ? text.slice(idx, idx + 4000) : text.slice(0, 3500));

// 所有开关/选项标签
const opts = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 30 && /直链|外链|链接|下载|分享|有效期|密码|预览|保存|企业内|公开|访客|匿名|永久|天|开关|允许|禁止|启用|禁用|范围|权限/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('\n=== 命中开关/选项 ===');
console.log(JSON.stringify([...new Set(opts)].slice(0, 40), null, 1));

await browser.close();