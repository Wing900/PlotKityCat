import { createRequire } from 'module';
const require = createRequire('D:/projects/Kity-Tour/');
const { chromium } = require('playwright');

const profileDir = 'D:/projects/plotkitycat/tools/moodle/profile';
const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
});
const page = ctx.pages()[0] || await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

const subject = '课例分析';
const message = `本课例从单位圆定义出发推导正弦函数图像，整体思路通顺，能讲明白图像怎么画。五点作图法讲解详细，余弦函数图像由正弦平移引出，避开了重复作图，基本达成教学目标。

但课堂偏重图像绘制，缺少对"图像为何如此形成"的原理揭示。单位圆上点连续转动时纵坐标的变化没有充分对应到图像的连续起伏，学生能掌握画图技能，但对圆周运动纵坐标变化的函数化表达理解不够到位。`;

// 1) 登录
console.log('=== 打开 tws 登录页，点 sso ===');
await page.goto('https://tws.scnu.edu.cn/login/index.php', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(2500);
const sso = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /统一身份认证|sso/.test(x.textContent));
  return a ? a.href : null;
}).catch(() => null);
if (sso) { await page.goto(sso, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {}); }
console.log('请在浏览器登录 sso（最多3分钟），登录后脚本自动继续...');
console.log('当前 URL:', page.url());
try {
  await page.waitForFunction(() => location.hostname.includes('tws.scnu.edu.cn') && !location.href.includes('/login'), { timeout: 180000 });
  console.log('✓ 登录成功:', page.url());
} catch (e) { console.log('登录等待超时，当前:', page.url()); }
await page.waitForTimeout(2000);

// 2) 选课
console.log('\n=== 选课 enrol/index.php?id=970 ===');
await page.goto('https://tws.scnu.edu.cn/enrol/index.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
await page.waitForTimeout(3000);
const enrolBtn = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /自选|选课|self|enrol|加入/.test(x.textContent + (x.href || '')) && x.getBoundingClientRect().width > 0 && !/login/.test(x.href||''));
  return a ? { text: a.textContent.trim(), href: a.href } : null;
}).catch(() => null);
console.log('选课按钮:', JSON.stringify(enrolBtn));
if (enrolBtn) {
  await page.goto(enrolBtn.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|注册|确认|submit/i.test(x.textContent + (x.value || '')));
    if (b) b.click();
  }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('选课后 URL:', page.url());
}

// 3) 进讨论区
console.log('\n=== 进讨论区 forum/view.php?id=26446 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('讨论区 URL:', page.url());

if (page.url().includes('enrol') || page.url().includes('/login')) {
  console.log('未进入讨论区，失败。dump:');
  console.log((await page.locator('body').innerText().catch(() => '')).slice(0, 500));
  await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/fail.png' });
  await page.waitForTimeout(30000);
  await ctx.close(); process.exit(0);
}

// 4) 添加新话题
const clicked = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a, button')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) { a.click(); return a.textContent.trim(); }
  return null;
}).catch(() => null);
console.log('添加新话题:', clicked);
await page.waitForTimeout(3000);
console.log('表单 URL:', page.url());

const subj = page.locator('input#id_subject, input[name=subject]').first();
if (await subj.count()) { await subj.fill(subject); console.log('主题已填'); }
const ta = page.locator('textarea#id_message, textarea[name=message]').first();
if (await ta.count()) {
  await ta.fill(message);
  await ta.dispatchEvent('change').catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate((msg) => {
    const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*=message]');
    if (iframe && iframe.contentDocument) iframe.contentDocument.body.innerHTML = msg.replace(/\n/g, '<br>');
  }, message).catch(() => {});
  console.log('正文已填');
}
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });

// 5) 提交
const submitted = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /发布|提交|发到论坛|Post|Submit/i.test(x.textContent + (x.value || '')) && x.getBoundingClientRect().width > 0 && !/搜索|search|登录/i.test(x.textContent + (x.value||'')));
  if (b) { b.click(); return b.textContent.trim() || b.value; }
  return null;
}).catch(() => null);
console.log('提交按钮:', submitted);
await page.waitForTimeout(5000);
console.log('提交后 URL:', page.url());

const after = await page.locator('body').innerText().catch(() => '');
const ok = after.includes('曾艺彬') || /课例分析.*曾艺彬/.test(after);
console.log('发帖成功:', ok ? '是 ✓' : '需确认');
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });
console.log('截图 after-post.png，浏览器保持开2分钟供博士查看');
await page.waitForTimeout(120000);
await ctx.close();