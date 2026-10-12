import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');
import { writeFileSync } from 'fs';

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);

// 提取话题链接（d=xxx，不含 parent=）
const topics = await page.evaluate(() => {
  const seen = new Set();
  return Array.from(document.querySelectorAll('a[href*="discuss.php?d="]')).filter(x => x.getBoundingClientRect().width > 0).map(x => {
    const href = x.href;
    const m = href.match(/d=(\d+)/);
    if (!m || seen.has(m[1])) return null;
    seen.add(m[1]);
    return { id: m[1], title: x.textContent.trim().slice(0, 40), href };
  }).filter(Boolean);
}).catch(() => []);
console.log('话题数:', topics.length);

const all = [];
for (const t of topics) {
  console.log('\n=== 话题 d=' + t.id + ' ' + t.title + ' ===');
  await page.goto('https://tws.scnu.edu.cn/mod/forum/discuss.php?d=' + t.id, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // 提取正文：找发起人+日期+回帖数后的正文
  const data = await page.evaluate(() => {
    const body = document.body.innerText;
    // 找 "回帖数：X" 后的内容到 "永久链接" 前
    const m = body.match(/(\d{4}年\d+月\d+日[\s\S]*?回帖数：\d+)([\s\S]*?)(永久链接|回复|◄)/);
    const author = body.match(/(\d{8}\S*|邵铭宇|20230102\S*)\s*-\s*\d{4}年/);
    return {
      author: author ? author[1] : '',
      date: m ? m[1].slice(0, 60) : '',
      content: m ? m[2].trim().slice(0, 2000) : body.slice(0, 1500),
    };
  }).catch(() => ({}));
  console.log('发起人:', data.author);
  console.log('正文:', data.content.slice(0, 800));
  all.push({ id: t.id, title: t.title, ...data });
}

writeFileSync('D:/projects/plotkitycat/tools/moodle/all-topics.json', JSON.stringify(all, null, 2));
console.log('\n已写 all-topics.json，共', all.length, '个话题');

await ctx.close();