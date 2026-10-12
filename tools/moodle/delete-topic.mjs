import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const ctx = await chromium.launchPersistentContext('D:/projects/plotkitycat/tools/moodle/profile', {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

console.log('=== 进 d=161632 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=161632', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3500);

// dump 删除元素
const dels = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a, button, img, i')).filter(x => x.getBoundingClientRect().width > 0).map(x => ({ tag: x.tagName, text: x.textContent.trim().slice(0,20), href: x.href||'', title: x.title||'', aria: x.getAttribute('aria-label')||'' })).filter(x => /删除|Delete|trash|删/.test(x.text + x.title + x.aria + x.href));
}).catch(() => []);
console.log('删除元素:', JSON.stringify(dels, null, 1));

// 点删除
await page.evaluate(() => {
  const d = Array.from(document.querySelectorAll('a, button, img, i')).find(x => /删除|Delete/.test(x.textContent + x.title + (x.getAttribute('aria-label')||'') + (x.href||'')) && x.getBoundingClientRect().width > 0);
  if (d) d.click();
}).catch(() => {});
console.log('点删除');
await page.waitForTimeout(4000);
console.log('URL:', page.url());

// dump 当前页（confirm 页或 dialog）
const body = await page.locator('body').innerText().catch(() => '');
console.log('页面文本前400:', body.slice(0, 400));

// 找确认按钮（confirm 页或 dialog）
const confirmed = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('input[type=submit], button')).filter(x => x.getBoundingClientRect().width > 0);
  const b = btns.find(x => /确认|确定|Yes|Delete|删除/i.test(x.textContent + (x.value||'')));
  if (b) { b.click(); return (b.textContent.trim() || b.value); }
  return null;
}).catch(() => null);
console.log('确认按钮:', confirmed);
await page.waitForTimeout(4000);
console.log('确认后 URL:', page.url());

// 验证
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3500);
const t = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('tr,[role=row]'));
  const r = [];
  for (const row of rows) {
    const a = row.querySelector('a[href*="discuss.php?d="]');
    if (!a) continue;
    const m = a.href.match(/d=(\d+)/);
    if (!m || r.find(x => x.id === m[1])) continue;
    r.push({ id: m[1], row: row.textContent.replace(/\s+/g,' ').slice(0,150) });
  }
  return r;
}).catch(() => []);
const mine = t.filter(x => /曾艺彬|20232221133/.test(x.row));
console.log('\n删除后我的话题:', mine.length, '条');
for (const x of mine) console.log('  ★ d=' + x.id);

if (mine.length === 1) {
  console.log('\n✓ 删除成功！进保留的话题看正文');
  await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=' + mine[0].id, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const b = await page.locator('body').innerText().catch(() => '');
  const i = b.indexOf('曾艺彬');
  console.log(b.slice(i>=0?i:0, (i>=0?i:0)+600));
}

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-delete.png' });
console.log('截图 after-delete.png，保持开1分钟');
await page.waitForTimeout(60000);
await ctx.close();