// probe2: 列所有 button 的可识别属性 + 进"我的分享"页看直链生成
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

console.log('=== 所有 button 的 aria-label / title / text ===');
const btns = await page.locator('button').all();
const info = [];
for (const b of btns) {
  const label = await b.getAttribute('aria-label').catch(() => null);
  const title = await b.getAttribute('title').catch(() => null);
  const text = (await b.innerText().catch(() => '')).trim().slice(0, 30);
  const cls = (await b.getAttribute('class').catch(() => '') || '').slice(0, 40);
  if (label || title || text) info.push({ label, title, text, cls });
}
console.log(JSON.stringify(info.slice(0, 60), null, 1));

console.log('\n=== 含 上传/分享/新建/文件 的 button ===');
const hits = info.filter(x => /上传|分享|新建|文件|创建|添加|link|upload|share/i.test((x.label||'')+(x.title||'')+(x.text||'')));
console.log(JSON.stringify(hits, null, 1));

// 点"我的分享"看直链页
console.log('\n=== 点击"我的分享" ===');
await page.locator('text=我的分享').first().click().catch(e => console.log('click failed:', e.message));
await page.waitForTimeout(2000);
console.log('now url:', page.url());
const shareText = await page.locator('body').innerText().catch(() => '');
console.log('=== 我的分享页 body 文本(前 1500) ===\n' + shareText.slice(0, 1500));

await browser.close();