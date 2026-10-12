// create-shares-all: 批量创建 4 个分享（role=checkbox toggle + 永久 + 5次 + 取消仅企业内 + 保留密码）
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

const targets = [
  { name: 'PlotKityCat-mac-single', label: 'Mac 单 app', key: 'mac-single' },
  { name: 'PlotKityCat-mac-full', label: 'Mac 完整版', key: 'mac-full' },
  { name: 'PlotKityCat-0.0.5.0-windows-amd64', label: 'Win 单 exe', key: 'win-single' },
  { name: 'PlotKityCat-v0.0.5.0', label: 'Win 完整版', key: 'win-full' },
];

async function clickToggle(text) {
  const toggle = page.locator(`.v-dialog__content--active div[role=checkbox][aria-label="${text}"]`);
  const cnt = await toggle.count();
  if (cnt === 0) return `no toggle(${cnt}): ${text}`;
  const before = await toggle.first().getAttribute('aria-checked');
  await toggle.first().click();
  await page.waitForTimeout(600);
  const after = await toggle.first().getAttribute('aria-checked');
  return `${text}: ${before}→${after}`;
}

const results = [];
for (const t of targets) {
  console.log(`\n=== ${t.label} (${t.name}) ===`);
  // 清遮罩 + 关残留弹窗
  await page.evaluate(() => {
    document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove());
    const c = document.querySelector('.v-dialog__content--active button[aria-label="关闭"]');
    if (c) c.click();
  }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);

  // 选中文件
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

  // 1) 开启"限制保存/下载次数"toggle + fill 5
  console.log('  开启限制下载:', await clickToggle('限制保存/下载次数'));
  await page.waitForTimeout(500);
  const dlInput = page.locator('.v-dialog__content--active input[aria-label="download_number_limit_input"]');
  const dlEnabled = await dlInput.isEnabled().catch(() => false);
  console.log('  下载次数 input enabled?', dlEnabled);
  if (dlEnabled) {
    await dlInput.fill('5');
    console.log('  下载次数设 5');
  } else {
    console.log('  ⚠️ 下载次数 input 仍 disabled');
  }

  // 2) "仅企业内用户可访问"：默认就是公开（不点 toggle）。点了反而设私密，所以跳过
  console.log('  仅企业内: 保持默认(公开，不点 toggle)');

  // 3) 有效期永久
  await page.locator('.v-dialog__content--active input[placeholder="选择日期"]').click().catch(() => {});
  await page.waitForTimeout(1500);
  const permRes = await page.evaluate(() => {
    const t = [...document.querySelectorAll('*')].find(el => el.textContent.trim() === '永久有效' && el.getBoundingClientRect().width > 0 && el.children.length === 0);
    if (t) { t.click(); return 'ok'; }
    return 'not found';
  });
  console.log('  有效期永久:', permRes);
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(600);

  // 4) 点创建
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.v-dialog__content--active button')].find(b => b.textContent.trim() === '创建');
    if (btn) btn.click();
  });
  await page.waitForTimeout(3500);

  // 5) 抓链接
  const body = await page.locator('body').innerText().catch(() => '');
  const urls = body.match(/https?:\/\/[^\s，。"'<>]+domainId=[^.\s]+/g);
  console.log('  链接:', urls);
  if (urls && urls.length) results.push({ ...t, url: urls[0] });

  // 关结果弹窗
  await page.evaluate(() => {
    const c = document.querySelector('.v-dialog__content--active button[aria-label="关闭"]');
    if (c) c.click();
  }).catch(() => {});
  await page.waitForTimeout(1200);
}

console.log('\n========== 4 个分享链接 ==========');
console.log(JSON.stringify(results, null, 2));

const { writeFileSync } = await import('fs');
writeFileSync('D:/projects/plotkitycat/tools/aliyunpan/shares.json', JSON.stringify(results, null, 2));

await ctx.close();