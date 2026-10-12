// explore-delete: 探索分享管理删除操作（hover/右键/选中行看删除按钮）
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

// 找第一个分享行（D5kY2BjYpTo 废分享）
const wasteRow = page.locator('.row-list_row').filter({ hasText: 'D5kY2BjYpTo' }).first();
console.log('废分享行数:', await page.locator('.row-list_row').filter({ hasText: 'D5kY2BjYpTo' }).count());

// 1) hover 行看是否出现操作图标
console.log('\n=== hover 行 ===');
await wasteRow.hover().catch(() => {});
await page.waitForTimeout(1000);
const hoverBtns = await page.evaluate(() => {
  return [...document.querySelectorAll('.row-list_row button, .row-list_row .v-icon, .row-list_row [role=button]')].filter(b => b.getBoundingClientRect().width > 0).map(b => ({
    text: b.textContent.trim().slice(0, 15), aria: b.getAttribute('aria-label') || '', title: b.getAttribute('title') || '', cls: (b.className || '').slice(0, 40),
  }));
});
console.log('行内按钮:', JSON.stringify(hoverBtns, null, 1));

// 2) 右键行
console.log('\n=== 右键行 ===');
await wasteRow.click({ button: 'right' }).catch(e => console.log('right fail:', e.message));
await page.waitForTimeout(1500);
const menuText = await page.locator('body').innerText().catch(() => '');
const menuHits = ['删除', '取消分享', '移除', '编辑', '复制', '取消', '管理', '详情'].filter(m => menuText.includes(m));
console.log('右键菜单命中:', menuHits);
const menuDump = await page.evaluate(() => {
  const menus = [...document.querySelectorAll('[role=menu], .v-menu__content--active, [class*=context], [class*=dropdown]')];
  return menus.filter(m => m.getBoundingClientRect().width > 0).map(m => ({ cls: (m.className || '').slice(0, 60), text: m.textContent.trim().slice(0, 200) }));
});
console.log('菜单容器:', JSON.stringify(menuDump, null, 1));
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);

// 3) dump 行完整 HTML（看有没有隐藏的操作图标）
console.log('\n=== 行 outerHTML ===');
const rowHtml = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.row-list_row')].filter(r => r.textContent.includes('D5kY2BjYpTo'));
  return rows[0]?.outerHTML.slice(0, 2000) || 'not found';
});
console.log(rowHtml);

await ctx.close();