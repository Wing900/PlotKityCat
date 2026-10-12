// create-shares-single: 重新创建 3 个单文件分享（每次刷新清选中，避免累积）
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

const targets = [
  { name: 'PlotKityCat-mac-full', label: 'Mac 完整版', key: 'mac-full' },
  { name: 'PlotKityCat-0.0.5.0-windows-amd64', label: 'Win 单 exe', key: 'win-single' },
  { name: 'PlotKityCat-v0.0.5.0', label: 'Win 完整版', key: 'win-full' },
];

const results = [];
for (const t of targets) {
  console.log(`\n=== ${t.label} (${t.name}) ===`);
  // 每次刷新清选中
  await page.goto('https://bj37773.apps.aliyunfile.com/disk/drive/user', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove()));

  // 点单个文件行（刷新后清选中，点单个=单选）
  const row = page.locator('.row-list_row').filter({ hasText: t.name }).first();
  await row.scrollIntoViewIfNeeded();
  await row.click().catch(e => console.log('select fail:', e.message));
  await page.waitForTimeout(1000);

  // 点分享
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '分享' && b.getBoundingClientRect().width > 0);
    if (btn) btn.click();
  });
  await page.waitForTimeout(2500);

  // 1) 开启"限制保存/下载次数" + fill 5
  const toggle = page.locator('.v-dialog__content--active div[role=checkbox][aria-label="限制保存/下载次数"]');
  if (await toggle.count()) {
    await toggle.first().click();
    await page.waitForTimeout(600);
  }
  const dlInput = page.locator('.v-dialog__content--active input[aria-label="download_number_limit_input"]');
  if (await dlInput.isEnabled().catch(() => false)) {
    await dlInput.fill('5');
    console.log('  下载次数设 5');
  }

  // 2) 仅企业内：保持默认（公开，不点 toggle）

  // 3) 有效期永久
  await page.locator('.v-dialog__content--active input[placeholder="选择日期"]').click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('*')].find(el => el.textContent.trim() === '永久有效' && el.getBoundingClientRect().width > 0 && el.children.length === 0);
    if (t) t.click();
  });
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);

  // 4) 创建
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.v-dialog__content--active button')].find(b => b.textContent.trim() === '创建');
    if (btn) btn.click();
  });
  await page.waitForTimeout(3500);

  // 5) 抓链接 + dump 分享文件数（验证单文件）
  const body = await page.locator('body').innerText().catch(() => '');
  const urls = body.match(/https?:\/\/[^\s，。"'<>]+domainId=[^.\s]+/g);
  // dump 创建后弹窗标题（看是否只 1 个文件）
  const si = body.indexOf('查看分享');
  const shareTitle = si >= 0 ? body.slice(si, si + 100).replace(/\n/g, ' ') : '';
  console.log('  分享标题:', shareTitle);
  console.log('  链接:', urls);
  if (urls && urls.length) results.push({ ...t, url: urls[0] });

  // 关弹窗
  await page.evaluate(() => {
    const c = document.querySelector('.v-dialog__content--active button[aria-label="关闭"]');
    if (c) c.click();
  }).catch(() => {});
  await page.waitForTimeout(1000);
}

console.log('\n========== 3 个单文件分享 ==========');
console.log(JSON.stringify(results, null, 2));

const { writeFileSync, readFileSync } = await import('fs');
// 合并到 shares.json（保留 mac-single 9d3BcCsMbG9）
const old = JSON.parse(readFileSync('D:/projects/plotkitycat/tools/aliyunpan/shares.json'));
const merged = [...old.filter(x => x.key === 'mac-single'), ...results];
writeFileSync('D:/projects/plotkitycat/tools/aliyunpan/shares.json', JSON.stringify(merged, null, 2));
console.log('\n合并后 shares.json:');
console.log(JSON.stringify(merged, null, 2));

await ctx.close();