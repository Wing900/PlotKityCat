// probe-share4: elementHandles 选可见 .item-name 行 → 真实右键 → dump 菜单结构 → 点分享
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

// 1) 找可见的 .item-name 文件行
console.log('=== 找可见文件行 ===');
const handles = await page.locator('.item-name').filter({ hasText: namePart }).elementHandles();
let target = null;
for (const h of handles) {
  if (await h.isVisible()) { target = h; break; }
}
if (!target) {
  // 兜底：找文件列表区任何可见含文件名的行
  const all = await page.locator(`:visible:has-text("${namePart}")`).elementHandles();
  for (const h of all) {
    const tag = await h.evaluate(el => el.tagName + '.' + (el.className||'').slice(0,40));
    if (/item-name|file|row|list-item/i.test(tag)) { target = h; break; }
  }
}
console.log('target found:', !!target);
if (!target) { console.log('找不到可见文件行，退出'); await browser.close(); process.exit(0); }

// 2) 真实右键
console.log('\n=== 右键文件行 ===');
await target.scrollIntoViewIfNeeded();
const box = await target.boundingBox();
console.log('row box:', JSON.stringify(box));
await target.click({ button: 'right' }).catch(e => console.log('right click fail:', e.message));
await page.waitForTimeout(1500);

// 3) dump 所有新出现的菜单容器（含"分享"文本且可见）
console.log('\n=== 右键菜单 DOM 结构 ===');
const menus = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div, ul, [role=menu], [role=menuitem]')];
  return all.filter(el => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    // 含"分享"且文本较短（菜单容器），排除侧边栏"我的分享"
    return t.includes('分享') && t.length < 60 && !t.includes('我的分享');
  }).slice(0, 8).map(el => ({
    tag: el.tagName, cls: (el.className||'').slice(0,60),
    text: el.textContent.trim().slice(0,100),
    items: [...el.querySelectorAll('*')].filter(c => c.children.length === 0 && c.textContent.trim()).slice(0,12).map(c => c.textContent.trim()).filter(Boolean)
  }));
});
console.log(JSON.stringify(menus, null, 1));

// 4) 点"分享"：找菜单里精确文本"分享"的叶子元素
console.log('\n=== 点菜单"分享" ===');
const clicked = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const t = el.textContent.trim();
    const r = el.getBoundingClientRect();
    return t === '分享' && r.width > 0;
  });
  if (!leaves.length) return 'no share leaf';
  // 找最近的可点击祖先
  let node = leaves[0];
  while (node && node.tagName !== 'LI' && !/menu|item/i.test(node.className||'')) node = node.parentElement;
  (node || leaves[0]).click();
  return 'clicked: ' + (leaves[0].textContent);
});
console.log(clicked);
await page.waitForTimeout(2000);

// 5) dump 分享弹窗
console.log('\n=== 分享弹窗 body 文本前 2500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2500));

// 可见 input（链接框）
const inputs = await page.locator('input:visible').all();
console.log('\n=== 可见 input ===');
for (const inp of inputs) {
  const val = await inp.inputValue().catch(() => '');
  if (val) console.log('value:', val.slice(0,300));
}

await browser.close();