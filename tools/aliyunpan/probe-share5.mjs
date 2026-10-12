// probe-share5: 精确定位文件名 span（排除传输面板 taskFileName）→ 右键 → 点分享
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

// 诊断：dump 所有 .item-name 的 box+文本
console.log('=== .item-name 实例诊断 ===');
const diag = await page.evaluate(() => {
  return [...document.querySelectorAll('.item-name')].map(el => {
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width), text: el.textContent.trim().slice(0,50), visible: el.offsetParent !== null };
  });
});
console.log(JSON.stringify(diag, null, 1));

// 精确：文件名 span，排除传输面板 taskFileName
console.log('\n=== 定位文件名 span ===');
const nameSpan = page.locator(`span.text-truncate:not([aria-label="taskFileName"])`).filter({ hasText: namePart }).first();
const cnt = await page.locator(`span.text-truncate:not([aria-label="taskFileName"])`).filter({ hasText: namePart }).count();
console.log('匹配数:', cnt);

if (cnt === 0) { console.log('找不到，退出'); await browser.close(); process.exit(0); }

const box = await nameSpan.boundingBox();
console.log('span box:', JSON.stringify(box));

// 右键
console.log('\n=== 右键文件名 span ===');
await nameSpan.scrollIntoViewIfNeeded();
await nameSpan.click({ button: 'right', timeout: 8000 }).catch(e => console.log('right click fail:', e.message));
await page.waitForTimeout(1500);

// dump 右键菜单（找新出现的、含"分享"且非侧边栏的容器）
console.log('\n=== 右键后 查找菜单 ===');
const menuInfo = await page.evaluate(() => {
  // 找含"分享"的叶子元素（精确文本"分享"）
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const t = el.textContent.trim();
    return t === '分享' || t === '下载' || t === '详情';
  });
  return leaves.map(el => {
    let node = el;
    for (let i = 0; i < 6 && node; i++) {
      if (/menu|context|popover|dropdown/i.test(node.className || '')) break;
      node = node.parentElement;
    }
    return {
      leafText: el.textContent.trim(),
      leafTag: el.tagName,
      menuCls: node?.className?.slice(0,80) || '',
      menuText: node?.textContent?.trim().slice(0,200) || ''
    };
  });
});
console.log(JSON.stringify(menuInfo, null, 1));

// 点"分享"叶子
console.log('\n=== 点"分享" ===');
const clickRes = await page.evaluate(() => {
  const leaves = [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return false;
    return el.textContent.trim() === '分享';
  });
  if (!leaves.length) return 'no leaf';
  let node = leaves[0];
  // 找最近的可点击祖先（li / menuitem / list-item）
  for (let i = 0; i < 6; i++) {
    if (!node.parentElement) break;
    const p = node.parentElement;
    if (p.tagName === 'LI' || /menu-item|list-item|menuitem/i.test(p.className || '') || p.getAttribute('role') === 'menuitem') { node = p; break; }
    node = p;
  }
  node.click();
  return 'clicked ancestor: ' + node.tagName + '.' + (node.className||'').slice(0,50);
});
console.log(clickRes);
await page.waitForTimeout(2500);

// dump 分享弹窗
console.log('\n=== 分享弹窗 body 前 2500 ===');
console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 2500));

const inputs = await page.locator('input:visible').all();
console.log('\n=== 可见 input ===');
for (const inp of inputs) {
  const val = await inp.inputValue().catch(() => '');
  if (val) console.log('value:', val.slice(0,300));
}

await browser.close();