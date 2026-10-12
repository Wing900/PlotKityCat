import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check'],
});
const page = ctx.pages()[0] || await ctx.newPage();

// 进课程 2026年数学科学学院课堂教学工作坊（邵铭宇）id=970
console.log('=== 进课程 id=970 ===');
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('goto fail', e.message));
await page.waitForTimeout(4000);

const url = page.url();
console.log('当前 URL:', url);
console.log('是否在登录页:', url.includes('/login') ? '是（未登录）' : '否（已登录）');

if (url.includes('/login')) {
  console.log('未登录，需博士登录。');
  // dump 登录方式
  const body = await page.locator('body').innerText().catch(() => '');
  console.log('登录页文本前500:', body.slice(0, 500));
} else {
  // 已登录，dump 课程内容
  console.log('\n=== 课程页面文本（找课例/讨论区/一师一优）===');
  const body = await page.locator('body').innerText().catch(() => '');
  const lines = body.split('\n').filter(l => l.trim()).filter(l => /课例|讨论|论坛|一师|研习|三角|有理数|指数|邵|话题|优课|观看|视频|添加新话题/.test(l));
  console.log(lines.slice(0, 40).join('\n'));

  console.log('\n=== 课程页面链接（讨论区/论坛/课例）===');
  const links = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a'));
    return a.filter(x => x.getBoundingClientRect().width > 0).map(x => ({ text: x.textContent.trim().slice(0, 50), href: x.getAttribute('href') }))
      .filter(x => /forum|discuss|课例|讨论|一师|研习|三角|有理数|指数|topic|view/.test(x.text + x.href));
  }).catch(() => []);
  console.log(JSON.stringify(links.slice(0, 30), null, 1));
}

await ctx.close();