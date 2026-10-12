// explore-share-mgmt: 进分享管理，dump 列表行 + 每行操作按钮（找删除）
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
await page.goto('https://bj37773.apps.aliyunfile.com/disk/admin/shareLinkManagement', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(4000);
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove()));

// dump 分享列表 body
console.log('=== 分享管理 body 前 2500 ===');
const text = await page.locator('body').innerText().catch(() => '');
console.log(text.slice(0, 2500));

// 找分享行（含分享ID）+ 每行操作按钮
console.log('\n=== 分享行 + 操作 ===');
const rows = await page.evaluate(() => {
  // 找含分享ID格式（8位字母数字）的行
  const allRows = [...document.querySelectorAll('.row-list_row, tr, [role=row], .v-list-item')];
  return allRows.filter(r => {
    const t = r.textContent;
    return /[A-Za-z0-9]{10}/.test(t) && /生效|过期|私密|公开/.test(t);
  }).slice(0, 12).map(r => {
    const r2 = r.getBoundingClientRect();
    const btns = [...r.querySelectorAll('button, [role=button], .v-icon')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({
      text: b.textContent.trim().slice(0, 15),
      aria: b.getAttribute('aria-label') || '',
      cls: (b.className || '').slice(0, 40),
    }));
    return { text: r.textContent.trim().slice(0, 120), btns };
  });
});
console.log(JSON.stringify(rows, null, 1));

// 找所有可见按钮（含"删除/管理/编辑/复制"等）
const allBtns = await page.evaluate(() => {
  return [...document.querySelectorAll('button, [role=button]')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({
    text: b.textContent.trim().slice(0, 20), aria: b.getAttribute('aria-label') || '', cls: (b.className || '').slice(0, 40),
  })).filter(b => b.text || b.aria);
});
console.log('\n=== 所有可见按钮（命中删除/管理/编辑/复制）===');
console.log(JSON.stringify(allBtns.filter(b => /删除|管理|编辑|复制|取消|过期|移除|delete|remove|manage|edit|copy/i.test(b.text + b.aria)), null, 1));

await ctx.close();