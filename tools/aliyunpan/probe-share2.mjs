// probe-share2: 关传输面板 → 精确定位文件列表行 → 选中 → 探分享/直链
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

// 1) 关传输面板（点 transferBtn 切换）
console.log('=== 关传输面板 ===');
await page.locator('button[aria-label="transferBtn"]').first().click({ timeout: 5000 }).catch(e => console.log('transferBtn fail:', e.message));
await page.waitForTimeout(1500);

// 2) dump 文件列表行结构：找文件名所在的行容器
const fileName = 'PlotKityCat-0.0.5.0-windows-amd64.zip';
console.log('\n=== 文件名 span 的 DOM 上下文 ===');
const domInfo = await page.evaluate((fname) => {
  const spans = [...document.querySelectorAll('span')];
  const target = spans.find(s => s.textContent.trim() === fname || s.textContent.replace(/\s/g,'').includes(fname.replace(/\s/g,'')));
  if (!target) return { found: false };
  // 往上找行容器
  let row = target, depth = 0;
  while (row && depth < 8) {
    if (row.getAttribute('role') === 'row' || /row|file-item|list-item/i.test(row.className || '')) break;
    row = row.parentElement; depth++;
  }
  return {
    found: true,
    targetTag: target.tagName,
    targetClass: target.className,
    targetParent: target.parentElement?.className,
    rowTag: row?.tagName, rowClass: row?.className, rowRole: row?.getAttribute('role'),
    rowText: (row?.textContent || '').slice(0, 200)
  };
}, fileName);
console.log(JSON.stringify(domInfo, null, 2));

// 3) 用 evaluate 直接点击文件名所在行（scrollIntoView + click）
console.log('\n=== 通过 evaluate 点击文件行 ===');
const clicked = await page.evaluate((fname) => {
  const spans = [...document.querySelectorAll('span')];
  const target = spans.find(s => s.textContent.trim() === fname || s.textContent.replace(/\s/g,'').includes(fname.replace(/\s/g,'')));
  if (!target) return 'not found';
  // 找最近的行/可点击容器
  let row = target;
  for (let i = 0; i < 8; i++) {
    if (row.parentElement && row.parentElement.querySelectorAll('span,button').length > row.querySelectorAll('span,button').length) row = row.parentElement;
  }
  row.scrollIntoView({ block: 'center' });
  // 单击选中（不进入文件夹）
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return 'clicked: ' + (row.className || '').slice(0, 60);
}, fileName);
console.log(clicked);
await page.waitForTimeout(1500);

// 4) 选中后 dump 顶部操作栏 + 文件行附近按钮
const btns = await page.locator('button:visible').all();
const info = [];
for (const b of btns) {
  const label = await b.getAttribute('aria-label').catch(() => null);
  const text = (await b.innerText().catch(() => '')).trim().slice(0, 20);
  const title = await b.getAttribute('title').catch(() => null);
  if (label || text || title) info.push({ label, text, title });
}
const shareHits = info.filter(x => /分享|链接|直链|复制|下载|重命名|详情|删除|移动|更多|\.\.\./i.test((x.label||'')+(x.text||'')+(x.title||'')));
console.log('\n=== 选中后 命中分享/链接 的可见 button ===');
console.log(JSON.stringify(shareHits, null, 1));
console.log('\n=== 所有可见 button（前 30）===');
console.log(JSON.stringify(info.slice(0, 30), null, 1));

// 5) 右键文件名（用 evaluate 触发 contextmenu）
console.log('\n=== 右键文件名 ===');
await page.evaluate((fname) => {
  const spans = [...document.querySelectorAll('span')];
  const target = spans.find(s => s.textContent.trim() === fname || s.textContent.replace(/\s/g,'').includes(fname.replace(/\s/g,'')));
  if (target) target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 }));
}, fileName);
await page.waitForTimeout(1500);
const menuText = await page.locator('body').innerText().catch(() => '');
const menuItems = ['分享', '复制链接', '复制', '下载', '重命名', '删除', '移动', '详情', '直链', '管理'];
console.log('右键菜单命中:', menuItems.filter(m => menuText.includes(m)));

// dump 弹出的菜单/弹窗 HTML
const menuHtml = await page.evaluate(() => {
  const menus = [...document.querySelectorAll('[role=menu], .v-menu__content--active, [class*=context-menu], [class*=dropdown]')];
  return menus.map(m => ({ cls: m.className.slice(0,80), text: m.textContent.slice(0,300) })).filter(m => m.text.trim());
});
console.log('\n=== 弹出菜单 ===');
console.log(JSON.stringify(menuHtml, null, 1));

await browser.close();