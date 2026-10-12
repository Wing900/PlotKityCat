// probe-share: 等上传完成 → 选中文件 → 探分享/直链入口
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 确保在个人空间
if (!page.url().includes('/disk/drive/user')) {
  await page.locator('text=个人空间').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

const fileName = 'PlotKityCat-0.0.5.0-windows-amd64.zip';

// 1) 等上传真正完成：传输任务里无该文件 & 文件列表有该文件
console.log('=== 等上传完成 ===');
const start = Date.now();
let done = false;
while (Date.now() - start < 180000) {
  const body = await page.locator('body').innerText().catch(() => '');
  const inList = body.includes(fileName);
  // 传输面板里该文件名是否还带进度
  const transferring = /剩余上传任务 \([1-9]/.test(body) || /\d+(\.\d+)?MB\/\d+(\.\d+)?MB/.test(body);
  if (inList && !transferring) { done = true; break; }
  await page.waitForTimeout(2000);
}
console.log('done?', done, '耗时', Math.round((Date.now()-start)/1000), 's');

// 2) dump 文件列表行
console.log('\n=== 文件列表区文本 ===');
const listText = await page.locator('body').innerText().catch(() => '');
// 截取"上传 新建 全选"之后的部分
const idx = listText.indexOf('全选');
console.log(listText.slice(idx, idx + 800));

// 3) 尝试点击该文件行选中
console.log('\n=== 点击文件行 ===');
const fileRow = page.locator(`text=${fileName}`).first();
await fileRow.click({ timeout: 5000 }).catch(e => console.log('click row fail:', e.message));
await page.waitForTimeout(1500);

// 4) 选中后看顶部/右键有无"分享"按钮
const btns = await page.locator('button').all();
const info = [];
for (const b of btns) {
  const label = await b.getAttribute('aria-label').catch(() => null);
  const text = (await b.innerText().catch(() => '')).trim().slice(0, 20);
  if (label || text) info.push({ label, text });
}
const shareHits = info.filter(x => /分享|链接|直链|复制|下载|rename|重命名|详情|删除/i.test((x.label||'')+(x.text||'')));
console.log('\n=== 选中后 命中分享/链接/直链 的 button ===');
console.log(JSON.stringify(shareHits, null, 1));

// 5) 右键文件看菜单
console.log('\n=== 右键文件 ===');
await fileRow.click({ button: 'right', timeout: 5000 }).catch(e => console.log('right click fail:', e.message));
await page.waitForTimeout(1500);
const menuText = await page.locator('body').innerText().catch(() => '');
// 找右键菜单项
const menuHits = ['分享', '复制', '下载', '重命名', '删除', '移动', '详情', '链接'];
const found = menuHits.filter(m => menuText.includes(m));
console.log('右键菜单命中:', found);
// dump 菜单容器文本
const menuBox = await page.locator('[role=menu], .v-menu, .context-menu, [class*=menu]').first().innerText().catch(() => '');
console.log('菜单容器文本:\n', menuBox.slice(0, 500));

await browser.close();