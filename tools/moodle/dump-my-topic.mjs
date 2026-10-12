import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(4000);
console.log('URL:', page.url());

if (page.url().includes('/login') || page.url().includes('enrol')) {
  console.log('未登录/未选课，无法确认');
  await ctx.close(); process.exit(0);
}

// dump 话题列表，找曾艺彬（我）发的话题
const topics = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('tr, .row, [role=row]'));
  // 简单：找所有 discuss.php?d= 链接 + 同行发起人
  const links = Array.from(document.querySelectorAll('a[href*="discuss.php?d="]')).filter(a => a.getBoundingClientRect().width > 0);
  const seen = new Set();
  return links.map(a => {
    const m = a.href.match(/d=(\d+)/);
    if (!m || seen.has(m[1])) return null; seen.add(m[1]);
    // 找同行发起人
    const row = a.closest('tr, .row, [role=row], li, div');
    const rowText = row ? row.textContent.slice(0, 200) : '';
    return { id: m[1], title: a.textContent.trim().slice(0, 40), href: a.href, row: rowText.replace(/\s+/g,' ').slice(0,150) };
  }).filter(Boolean);
}).catch(() => []);

console.log('\n话题列表:');
for (const t of topics) {
  const mine = /曾艺彬|20232221133/.test(t.row);
  console.log((mine ? '★ ' : '  ') + 'd=' + t.id + ' ' + t.title + ' | ' + t.row);
}

const myTopics = topics.filter(t => /曾艺彬|20232221133/.test(t.row));
console.log('\n我发的话题数:', myTopics.length);
if (myTopics.length) {
  console.log('我的话题:');
  for (const t of myTopics) console.log('  d=' + t.id + ' ' + t.title + ' ' + t.href);
  // 进我的话题看正文
  console.log('\n=== 我的话题正文 ===');
  await page.goto(myTopics[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const b = await page.locator('body').innerText().catch(() => '');
  const i = b.indexOf('曾艺彬');
  console.log(b.slice(i >= 0 ? i : 0, (i >= 0 ? i : 0) + 800));
}

await ctx.close();