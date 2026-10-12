// create-share-1: 对 mac-single 完整创建分享（5次/取消仅企业内/保留密码/永久），抓链接
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

// 选中 mac-single
const row = page.locator('.row-list_row').filter({ hasText: 'PlotKityCat-mac-single' }).first();
await row.scrollIntoViewIfNeeded();
await row.click().catch(() => {});
await page.waitForTimeout(1000);

// 点分享
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '分享' && b.getBoundingClientRect().width > 0);
  if (btn) btn.click();
});
await page.waitForTimeout(2500);

// helper: 点指定文本的 toggle（精确找含 input[type=checkbox] 的 v-input，点 .v-input__slot）
async function clickToggle(text) {
  return await page.evaluate((t) => {
    const labels = [...document.querySelectorAll('.v-dialog__content--active *')].filter(el => el.textContent.trim() === t && el.children.length === 0);
    if (!labels.length) return 'label not found: ' + t;
    let node = labels[0];
    for (let i = 0; i < 10 && node; i++) {
      node = node.parentElement;
      if (!node) break;
      if (node.querySelector('input[type=checkbox]') && /v-input/.test(node.className || '')) break;
    }
    if (!node || !node.querySelector('input[type=checkbox]')) return 'no toggle: ' + t;
    const cb = node.querySelector('input[type=checkbox]');
    const before = cb.checked;
    const slot = node.querySelector('.v-input__slot') || cb;
    slot.click();
    const after = cb.checked;
    return `toggled ${t}: ${before}→${after}`;
  }, text);
}

// 1) 开启"限制保存/下载次数"toggle → 再 fill 5
console.log('开启限制下载次数 toggle:', await clickToggle('限制保存/下载次数'));
await page.waitForTimeout(800);
const dlInputs = page.locator('.v-dialog__content--active input[placeholder="范围1~9999"]');
console.log('次数 input 数:', await dlInputs.count());
const dlInput = dlInputs.nth(1);
const isEnabled = await dlInput.isEnabled().catch(() => false);
console.log('下载次数 input enabled?', isEnabled);
if (isEnabled) {
  await dlInput.fill('5');
  console.log('下载次数设 5');
} else {
  await page.evaluate(() => {
    const inp = document.querySelector('.v-dialog__content--active input[aria-label="download_number_limit_input"]');
    if (inp) { inp.disabled = false; inp.value = '5'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  console.log('兜底 evaluate 设值 5');
}

// 2) 取消"仅企业内用户可访问"（点 toggle 关闭）
console.log('取消仅企业内:', await clickToggle('仅企业内用户可访问'));
await page.waitForTimeout(500);

// 3) 有效期：点 input 看选项
console.log('\n=== 点有效期 input ===');
await page.locator('.v-dialog__content--active input[placeholder="选择日期"]').click().catch(e => console.log('date click fail:', e.message));
await page.waitForTimeout(1800);

const validityOpts = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    return el.children.length === 0 && t.length < 15 && /永久|长期|无限制|自定义|天|年|永久有效|9999/.test(t);
  }).map(el => el.textContent.trim());
});
console.log('有效期相关选项:', JSON.stringify([...new Set(validityOpts)], null, 1));

// dump 日期选择器整体
const calDump = await page.evaluate(() => {
  const cals = [...document.querySelectorAll('.v-dialog__content--active, .v-menu__content--active, .v-picker, [role=dialog]')];
  return cals.map(c => ({ cls: (c.className || '').slice(0, 60), text: c.textContent.trim().slice(0, 400) })).filter(c => c.text);
});
console.log('\n日期选择器容器:');
console.log(JSON.stringify(calDump.slice(0, 4), null, 1));

// 尝试点"永久"
const permRes = await page.evaluate(() => {
  const targets = [...document.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t === '永久' || t === '永久有效' || t === '无限制' || t === '长期有效';
  });
  if (targets.length) { targets[0].click(); return 'clicked: ' + targets[0].textContent.trim(); }
  return 'no permanent option';
});
console.log('点永久:', permRes);
await page.waitForTimeout(1000);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(800);

// 4) 点创建
console.log('\n=== 点创建 ===');
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.v-dialog__content--active button')].find(b => b.textContent.trim() === '创建');
  if (btn) btn.click();
});
await page.waitForTimeout(3500);

// 5) 抓链接
const afterText = await page.locator('body').innerText().catch(() => '');
const urls = afterText.match(/https?:\/\/[^\s，。"'<>]+/g);
console.log('\n=== 抓到链接 ===');
console.log(urls);

// dump 创建后弹窗
const si = afterText.indexOf('查看分享');
console.log('\n=== 创建后弹窗 ===');
console.log(si >= 0 ? afterText.slice(si, si + 700) : afterText.slice(0, 700));

await ctx.close();