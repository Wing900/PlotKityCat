// probe-diag: 找真正可见且含文件名的元素 + accessibility snapshot
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

// 1) 所有可见且文本含文件名的元素，dump 精简结构
console.log('=== 可见含文件名元素 ===');
const els = await page.evaluate((np) => {
  const all = [...document.querySelectorAll('*')];
  const hits = all.filter(el => {
    if (el.children.length > 0) return false; // 叶子
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return false;
    return el.textContent.includes(np);
  });
  return hits.slice(0, 10).map(el => {
    // 往上找"行"容器
    let row = el, depth = 0, rowInfo = null;
    while (row && depth < 10) {
      const rr = row.getBoundingClientRect();
      if (rr.height > 30 && rr.height < 100 && rr.width > 200) {
        rowInfo = { tag: row.tagName, cls: (row.className||'').slice(0,80), h: Math.round(rr.height), w: Math.round(rr.width), role: row.getAttribute('role') };
        break;
      }
      row = row.parentElement; depth++;
    }
    return {
      leafTag: el.tagName, leafCls: (el.className||'').slice(0,60), leafText: el.textContent.trim().slice(0,40),
      row: rowInfo
    };
  });
}, namePart);
console.log(JSON.stringify(els, null, 1));

// 2) accessibility snapshot（找文件 + 操作）
console.log('\n=== accessibility snapshot（精简）===');
const snap = await page.accessibility.snapshot().catch(() => null);
const walk = (node, depth = 0, out = []) => {
  if (!node) return out;
  const name = (node.name || '').toString().trim();
  if (name && name.length < 60 && (name.includes('PlotKity') || /分享|上传|下载|新建|链接|直链|详情|管理|删除|重命名|移动/.test(name))) {
    out.push({ depth, role: node.role, name: name.slice(0,50) });
  }
  if (node.children) for (const c of node.children) walk(c, depth + 1, out);
  return out;
};
if (snap) console.log(JSON.stringify(walk(snap), null, 1));

await browser.close();