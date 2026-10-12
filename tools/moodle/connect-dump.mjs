import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] || await ctx.newPage();

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('goto fail', e.message));
await page.waitForTimeout(4000);
console.log('URL:', page.url());

if (page.url().includes('/login') || page.url().includes('enrol')) {
  console.log('未登录/未选课，需博士登录');
  await browser.close(); process.exit(0);
}

const topics = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a[href*="discuss.php?d="]')).filter(a => a.getBoundingClientRect().width > 0);
  const seen = new Set();
  return links.map(a => {
    const m = a.href.match(/d=(\d+)/);
    if (!m || seen.has(m[1])) return null; seen.add(m[1]);
    const row = a.closest('tr, [role=row], .discussion, li, div');
    return { id: m[1], title: a.textContent.trim().slice(0,40), row: (row?.textContent||'').replace(/\s+/g,' ').slice(0,180) };
  }).filter(Boolean);
}).catch(() => []);

console.log('\n话题列表:');
for (const t of topics) {
  const mine = /曾艺彬|20232221133/.test(t.row);
  console.log((mine?'★ ':'  ') + 'd=' + t.id + ' ' + t.title + ' | ' + t.row.slice(0,120));
}

const mine = topics.filter(t => /曾艺彬|20232221133/.test(t.row));
console.log('\n我发的话题:', mine.length, '条');
for (const t of mine) console.log('  d=' + t.id + ' ' + t.href);

// 进我的话题看正文
if (mine.length) {
  console.log('\n=== 我的话题正文（第1条）===');
  await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=' + mine[0].id, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const b = await page.locator('body').innerText().catch(() => '');
  const i = b.indexOf('曾艺彬');
  console.log(b.slice(i>=0?i:0, (i>=0?i:0)+800));
}

await browser.close();