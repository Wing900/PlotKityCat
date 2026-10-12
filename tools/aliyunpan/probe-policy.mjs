// probe-policy: 展开"安全策略"和"空间管理"子菜单，找直链/外链/下载策略
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

// 点"安全策略"展开
console.log('=== 展开"安全策略" ===');
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() === '安全策略' && el.getBoundingClientRect().width > 0);
  if (items[0]) items[0].click();
}).catch(() => {});
await page.waitForTimeout(1500);

const secMenu = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 22 && /直链|外链|链接|下载|分享|预览|水印|策略|权限|安全|开关|允许|禁止|导出|访问|有效期|密码/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('安全策略子项:', JSON.stringify([...new Set(secMenu)], null, 1));

// dump 安全策略页 body
console.log('\n=== 安全策略页 body 前 2500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2500));

// 点"空间管理"展开
console.log('\n=== 展开"空间管理" ===');
await page.evaluate(() => {
  const items = [...document.querySelectorAll('*')].filter(el => el.children.length === 0 && el.textContent.trim() === '空间管理' && el.getBoundingClientRect().width > 0);
  if (items[0]) items[0].click();
}).catch(() => {});
await page.waitForTimeout(1500);

const spaceMenu = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 22 && /直链|外链|链接|下载|分享|策略|权限|公共|预览|水印|允许|空间|企业|个人|配置/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('空间管理子项:', JSON.stringify([...new Set(spaceMenu)], null, 1));

console.log('\n=== 空间管理页 body 前 2000 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2000));

await browser.close();