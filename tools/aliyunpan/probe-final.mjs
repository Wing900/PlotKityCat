// probe-final: Playwright 真实 click 进"分享设置管理"，dump 完整内容找直链开关
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

// Playwright 真实 click：先展开"安全策略"
console.log('=== click 安全策略（展开）===');
await page.locator('text=安全策略').first().click({ timeout: 5000 }).catch(e => console.log('fail:', e.message));
await page.waitForTimeout(1500);

// 点"分享设置管理"
console.log('=== click 分享设置管理 ===');
await page.locator('text=分享设置管理').first().click({ timeout: 5000 }).catch(e => console.log('fail:', e.message));
await page.waitForTimeout(4000);
console.log('now url:', page.url());

console.log('\n=== 分享设置管理 完整 body ===');
const text = await page.locator('body').innerText().catch(() => '');
// 找主体内容区（跳过左侧菜单的重复）
const lines = text.split('\n').filter(l => l.trim());
console.log(lines.slice(0, 120).join('\n'));

// 所有可见开关/选项
const opts = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 30 && /直链|外链|链接|下载|分享|有效期|密码|预览|保存|企业内|公开|访客|匿名|永久|天|允许|禁止|启用|禁用|范围|权限|水印|转存|开启|关闭/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('\n=== 命中开关/选项 ===');
console.log(JSON.stringify([...new Set(opts)].slice(0, 50), null, 1));

await browser.close();