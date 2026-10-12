// verify-toggle: 诊断 toggle 结构，试点 Playwright 点文本
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

const row = page.locator('.row-list_row').filter({ hasText: 'PlotKityCat-mac-single' }).first();
await row.click().catch(() => {});
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '分享' && b.getBoundingClientRect().width > 0);
  if (btn) btn.click();
});
await page.waitForTimeout(2500);

// dump 祖先链
const chain = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('.v-dialog__content--active *')].filter(el => el.textContent.trim() === '限制保存/下载次数' && el.children.length === 0);
  if (!labels.length) return 'not found';
  let node = labels[0];
  const out = [];
  for (let i = 0; i < 7 && node; i++) {
    out.push({ tag: node.tagName, cls: (node.className || '').slice(0, 50), checkbox: !!node.querySelector('input[type=checkbox]'), icon: !!node.querySelector('.v-icon') });
    node = node.parentElement;
  }
  return out;
});
console.log('=== 限制保存/下载次数 祖先链 ===');
console.log(JSON.stringify(chain, null, 1));

// dump 祖先 3 层 outerHTML
const outer = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('.v-dialog__content--active *')].filter(el => el.textContent.trim() === '限制保存/下载次数' && el.children.length === 0);
  if (!labels.length) return 'not found';
  let n = labels[0];
  for (let i = 0; i < 3; i++) n = n.parentElement;
  return n.outerHTML.slice(0, 1800);
});
console.log('\n=== 祖先3层 outerHTML ===');
console.log(outer);

// 试 Playwright 点文本
console.log('\n=== 试 Playwright 点文本 ===');
await page.locator('.v-dialog__content--active').locator('text=限制保存/下载次数').first().click().catch(e => console.log('click fail:', e.message));
await page.waitForTimeout(1200);
const enabledAfter = await page.locator('.v-dialog__content--active input[aria-label="download_number_limit_input"]').isEnabled().catch(() => 'err');
console.log('点文本后 input enabled?', enabledAfter);

// dump 点击后祖先链（看变化）
const chain2 = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('.v-dialog__content--active *')].filter(el => el.textContent.trim() === '限制保存/下载次数' && el.children.length === 0);
  if (!labels.length) return 'not found';
  let node = labels[0];
  const out = [];
  for (let i = 0; i < 5 && node; i++) {
    out.push({ tag: node.tagName, cls: (node.className || '').slice(0, 50), checkbox: !!node.querySelector('input[type=checkbox]'), cbChecked: node.querySelector('input[type=checkbox]')?.checked });
    node = node.parentElement;
  }
  return out;
});
console.log('点击后祖先链:', JSON.stringify(chain2, null, 1));

await ctx.close();