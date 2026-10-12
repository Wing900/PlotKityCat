// probe3: 关新手引导 → 进企业空间 → 找上传/直链入口
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

// 1) 关掉新手引导遮罩（点"知道了"）
console.log('=== 关新手引导 ===');
await page.locator('button:has-text("知道了")').first().click({ timeout: 5000 }).catch(e => console.log('知道了 click fail:', e.message));
await page.waitForTimeout(1500);

// 再兜底：移除遮罩 div
await page.evaluate(() => {
  document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove());
}).catch(() => {});
await page.waitForTimeout(500);

// 2) 进企业空间
console.log('=== 进企业空间 ===');
await page.locator('text=企业空间').first().click({ timeout: 5000 }).catch(e => console.log('企业空间 click fail:', e.message));
await page.waitForTimeout(2500);
console.log('now url:', page.url());

// 3) 重新探 button + input[type=file]
const btns = await page.locator('button').all();
const info = [];
for (const b of btns) {
  const label = await b.getAttribute('aria-label').catch(() => null);
  const title = await b.getAttribute('title').catch(() => null);
  const text = (await b.innerText().catch(() => '')).trim().slice(0, 30);
  if (label || title || text) info.push({ label, title, text });
}
console.log('\n=== 企业空间 button (前 40) ===');
console.log(JSON.stringify(info.slice(0, 40), null, 1));

const hits = info.filter(x => /上传|分享|新建|文件|创建|添加|link|upload|share|目录|文件夹/i.test((x.label||'')+(x.title||'')+(x.text||'')));
console.log('\n=== 命中关键词的 button ===');
console.log(JSON.stringify(hits, null, 1));

console.log('\n=== input[type=file] 个数 ===', await page.locator('input[type=file]').count());

console.log('\n=== body 文本前 1200 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 1200));

await browser.close();