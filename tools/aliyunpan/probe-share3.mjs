// probe-share3: 精确右键文件列表 .item-name 行 → 点"分享" → dump 分享弹窗找直链
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

const fileName = 'PlotKityCat-0.0.5.0-windows-amd64.zip';

// 1) 精确定位文件列表 .item-name 行（排除 transfer-list-item），右键
console.log('=== 右键文件列表行 ===');
const fileRow = page.locator('.item-name').filter({ hasText: fileName }).first();
const rowCount = await page.locator('.item-name').filter({ hasText: fileName }).count();
console.log('匹配 .item-name 行数:', rowCount);

await fileRow.scrollIntoViewIfNeeded().catch(() => {});
await fileRow.click({ button: 'right', timeout: 8000 }).catch(e => console.log('right click fail:', e.message));
await page.waitForTimeout(1500);

// 2) 找右键菜单里"分享"项并点击
console.log('\n=== 找右键菜单"分享"项 ===');
// 菜单项可能是各种元素，用可见 + hasText 定位
const shareItem = page.locator(':visible').filter({ hasText: /^分享$/ }).first();
const shareCount = await page.locator(':visible').filter({ hasText: /^分享$/ }).count().catch(() => 0);
console.log('可见"分享"项数:', shareCount);

// dump 菜单容器
const menuDump = await page.evaluate(() => {
  // 找最近出现的 menu/overlay
  const all = [...document.querySelectorAll('*')];
  const menus = all.filter(el => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && cs.display !== 'none' && /menu|context|dropdown|popover|overlay/i.test(el.className || '') && el.offsetParent !== null;
  }).slice(0, 5);
  return menus.map(m => ({ cls: (m.className||'').slice(0,80), text: m.textContent.slice(0,200), rect: JSON.stringify(m.getBoundingClientRect()) }));
});
console.log('\n=== 固定定位的菜单容器 ===');
console.log(JSON.stringify(menuDump, null, 1));

// 尝试点击"分享"
await shareItem.click({ timeout: 5000 }).catch(e => console.log('share click fail:', e.message));
await page.waitForTimeout(2000);

// 3) dump 分享弹窗
console.log('\n=== 当前 URL ===', page.url());
console.log('\n=== 分享弹窗 body 文本前 2000 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2000));

// dump 所有可见 input（链接输入框）+ button（复制/创建链接）
const inputs = await page.locator('input:visible, textarea:visible').all();
console.log('\n=== 可见 input/textarea ===');
for (const inp of inputs) {
  const val = await inp.inputValue().catch(() => '');
  const ph = await inp.getAttribute('placeholder').catch(() => '');
  if (val || ph) console.log('value:', val.slice(0,200), '| placeholder:', ph);
}

const btns = await page.locator('button:visible').all();
const info = [];
for (const b of btns) {
  const text = (await b.innerText().catch(() => '')).trim().slice(0, 30);
  const label = await b.getAttribute('aria-label').catch(() => '');
  if (text || label) info.push({ text, label });
}
const linkHits = info.filter(x => /创建|生成|链接|复制|分享|直链|有效期|密码|提取/i.test((x.text||'')+(x.label||'')));
console.log('\n=== 命中 创建/链接/复制 的 button ===');
console.log(JSON.stringify(linkHits, null, 1));

await browser.close();