// 连接已运行的 Chrome（CDP 9222），探索阿里云网盘后台页面结构。
// 博士登录后跑这个：先 dump 页面信息，找上传/直链入口。
import { createRequire } from 'module';

const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const pages = ctx.pages();
console.log('open pages:', pages.length);
for (const p of pages) {
  console.log('--- page url:', p.url(), '| title:', await p.title());
}

const page = pages.find(p => p.url().includes('aliyunfile.com')) || pages[0];
if (!page) throw new Error('没有可用页面');

console.log('\n=== current URL ===\n' + page.url());
console.log('\n=== body text (前 2000 字) ===');
const text = await page.locator('body').innerText().catch(() => '');
console.log(text.slice(0, 2000));

console.log('\n=== 可见按钮/链接（含 上传/分享/链接/下载 等关键词）===');
const candidates = await page.locator('button, a, [role=button], [role=menuitem]').allTextContents().catch(() => []);
const hits = candidates.filter(t => /上传|下载|分享|直链|链接|复制|文件|管理|新建|创|菜单/i.test(t)).slice(0, 40);
console.log(JSON.stringify(hits, null, 2));

console.log('\n=== input[type=file] 个数 ===');
const fileInputs = await page.locator('input[type=file]').count();
console.log(fileInputs);

await browser.close(); // connectOverCDP 的 close 只断开连接，不关浏览器