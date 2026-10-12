// share-final: 右键 .row-list_row 文件行 → 点"分享" → dump 分享弹窗找直链
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

if (!page.url().includes('/disk/drive/user')) {
  await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

const namePart = 'PlotKityCat-0.0.5.0-windows-amd64';

// 1) 右键文件行
const fileRow = page.locator('.row-list_row').filter({ hasText: namePart }).first();
console.log('匹配行数:', await page.locator('.row-list_row').filter({ hasText: namePart }).count());
await fileRow.scrollIntoViewIfNeeded();
console.log('box:', JSON.stringify(await fileRow.boundingBox()));
console.log('=== 右键 ===');
await fileRow.click({ button: 'right', timeout: 8000 }).catch(e => console.log('right fail:', e.message));
await page.waitForTimeout(1800);

// 2) 找右键菜单"分享"叶子并点击
console.log('\n=== 菜单叶子项 ===');
const menuLeaves = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    return /^(分享|下载|详情|管理|重命名|删除|移动|复制|打开)$/.test(t);
  });
  return leaves.map(el => ({ text: el.textContent.trim(), tag: el.tagName, cls: (el.className||'').slice(0,40) }));
});
console.log(JSON.stringify(menuLeaves, null, 1));

// 点"分享"
console.log('\n=== 点"分享" ===');
const clicked = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return false;
    return el.textContent.trim() === '分享';
  });
  if (!leaves.length) return 'no 分享 leaf';
  // 找最近可点击祖先
  let node = leaves[0];
  for (let i = 0; i < 6; i++) {
    const p = node.parentElement; if (!p) break;
    if (p.tagName === 'LI' || /menu|item/i.test(p.className || '') || p.getAttribute('role') === 'menuitem') { node = p; break; }
    node = p;
  }
  node.click();
  return 'ok: ' + node.tagName + '.' + (node.className||'').slice(0,50);
});
console.log(clicked);
await page.waitForTimeout(2500);

// 3) dump 分享弹窗
console.log('\n=== 分享弹窗 body 前 3000 ===');
const bodyText = await page.locator('body').innerText().catch(() => '');
// 截取分享相关部分
const idx = bodyText.indexOf('分享');
console.log(bodyText.slice(Math.max(0, idx - 100), idx + 2500));

// 可见 input（链接框）
const inputs = await page.locator('input:visible, textarea:visible').all();
console.log('\n=== 可见 input/textarea ===');
for (let i = 0; i < inputs.length; i++) {
  const val = await inputs[i].inputValue().catch(() => '');
  const ph = await inputs[i].getAttribute('placeholder').catch(() => '');
  console.log(i, 'value:', val.slice(0,250), '| ph:', ph);
}

// 命中 创建/复制/链接 的 button
const btns = await page.locator('button:visible').all();
const info = [];
for (const b of btns) {
  const t = (await b.innerText().catch(() => '')).trim().slice(0, 20);
  const l = await b.getAttribute('aria-label').catch(() => '');
  if (t || l) info.push({ t, l });
}
console.log('\n=== 命中 创建/链接/复制 的 button ===');
console.log(JSON.stringify(info.filter(x => /创建|生成|链接|复制|分享|直链|有效期|提取|下载|确定|取消/i.test((x.t||'')+(x.l||''))), null, 1));

await browser.close();