// explore-share: 打开创建分享弹窗，dump 完整选项找 IP流量/有效期/公开设置
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/aliyunpan/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.goto('https://bj37773.apps.aliyunfile.com/disk/drive/user', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(4000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove()));

// 选中 mac-single（最小，操作快）
const fileRow = page.locator('.row-list_row').filter({ hasText: 'PlotKityCat-mac-single' }).first();
await fileRow.scrollIntoViewIfNeeded();
await fileRow.click().catch(() => {});
await page.waitForTimeout(1000);

// 点顶部"分享"
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '分享' && b.getBoundingClientRect().width > 0);
  if (btn) btn.click();
});
await page.waitForTimeout(2500);

// dump 弹窗完整文本
const text = await page.locator('body').innerText().catch(() => '');
const idx = text.indexOf('创建分享');
console.log('=== 创建分享弹窗完整文本 ===');
console.log(idx >= 0 ? text.slice(idx, idx + 4500) : text.slice(0, 3000));

// 弹窗内所有叶子文本（找 IP流量/有效期/公开选项）
const opts = await page.evaluate(() => {
  const dialog = document.querySelector('.v-dialog__content--active') || document.body;
  const items = [...dialog.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
    return el.children.length === 0 && el.textContent.trim();
  });
  return items.map(el => el.textContent.trim()).filter(t => t.length < 40);
});
console.log('\n=== 弹窗叶子文本（去重）===');
console.log(JSON.stringify([...new Set(opts)].slice(0, 100), null, 1));

// 找"有效期"相关：select / 日期 / 永久选项
console.log('\n=== 找 IP/流量/有效期/公开 关键词 ===');
const hits = [...new Set(opts)].filter(t => /IP|流量|GB|MB|有效|永久|天|公开|企业内|密码|预览|下载|保存|次数|限制|访客|匿名/i.test(t));
console.log(JSON.stringify(hits, null, 1));

// 所有可见 input
const inputs = await page.locator('.v-dialog__content--active input:visible').all().catch(() => []);
console.log('\n=== 弹窗内 input ===');
for (const inp of inputs) {
  const val = await inp.inputValue().catch(() => '');
  const ph = await inp.getAttribute('placeholder').catch(() => '');
  const type = await inp.getAttribute('type').catch(() => '');
  console.log({ type, val: val.slice(0, 50), ph });
}

await ctx.close();