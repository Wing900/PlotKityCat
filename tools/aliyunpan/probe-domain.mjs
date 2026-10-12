// probe-domain: 进"专属登录配置"，找分享页语言/品牌/外观设置
import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().find(p => p.url().includes('aliyunfile.com')) || ctx.pages()[0];

if (!page.url().includes('/disk/admin')) {
  await page.goto('https://bj37773.apps.aliyunfile.com/disk/admin/home', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
}
await page.evaluate(() => document.querySelectorAll('.novice-guidance-box, .fixed-999').forEach(el => el.remove())).catch(() => {});

// 展开"专属登录配置"
await page.locator('text=专属登录配置').first().click({ timeout: 5000 }).catch(() => {});
await page.waitForTimeout(1500);

const subItems = await page.evaluate(() => {
  return [...document.querySelectorAll('*')].filter(el => {
    if (el.children.length > 0) return false;
    const r = el.getBoundingClientRect(); if (r.width === 0) return false;
    const t = el.textContent.trim();
    return t && t.length < 20 && /登录|域名|品牌|外观|语言|中文|英文|主题|配置|页面|分享|定制|logo|名称|标语/i.test(t);
  }).map(el => el.textContent.trim());
});
console.log('专属登录配置子项:', JSON.stringify([...new Set(subItems)], null, 1));

// 逐个点子项 dump
const items = [...new Set(subItems)].slice(0, 8);
for (const item of items) {
  console.log(`\n=== 点"${item}" ===`);
  await page.locator(`text=${item}`).first().click({ timeout: 4000 }).catch(e => console.log('click fail:', e.message));
  await page.waitForTimeout(2500);
  console.log('url:', page.url());
  const body = await page.locator('body').innerText().catch(() => '');
  // 截取主体（跳过左侧菜单）
  const lines = body.split('\n').filter(l => l.trim());
  // 找语言相关
  const langHits = lines.filter(l => /语言|中文|英文|中文|英文|Language|locale|zh|en/i.test(l)).slice(0, 10);
  console.log('语言相关:', JSON.stringify(langHits));
  // body 前 1500（主体内容）
  console.log('body:', lines.slice(0, 40).join(' | ').slice(0, 1500));
}

await browser.close();