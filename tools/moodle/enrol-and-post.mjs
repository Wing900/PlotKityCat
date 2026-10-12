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

// 1) 选课
console.log('=== 选课页 enrol/index.php?id=970 ===');
await page.goto('https://tws.scnu.edu.cn/enrol/index.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('URL:', page.url());

// 如果是登录页，点 sso + 等博士登录
if (page.url().includes('/login')) {
  console.log('未登录，点 sso，请博士登录（2分钟）...');
  const sso = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /统一身份认证|sso/.test(x.textContent));
    return a ? a.href : null;
  }).catch(() => null);
  if (sso) await page.goto(sso, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(120000);
  await page.goto('https://tws.scnu.edu.cn/enrol/index.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

// dump 选课方法
const opt = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a, button, input[type=submit]')).filter(x => x.getBoundingClientRect().width > 0)
    .map(x => ({ tag: x.tagName, text: x.textContent.trim().slice(0, 40), href: x.href, value: x.value || '' }))
    .filter(x => x.text || x.value || (x.href && /enrol|self|guest/.test(x.href)));
}).catch(() => []);
console.log('选课方法:', JSON.stringify(opt, null, 1));

// 点自选课程/选课
const enrolBtn = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /自选|选课|self|enrol|加入/.test(x.textContent + (x.href || '')) && x.getBoundingClientRect().width > 0);
  return a ? { text: a.textContent.trim(), href: a.href } : null;
}).catch(() => null);
console.log('选课按钮:', JSON.stringify(enrolBtn));
if (enrolBtn) {
  await page.goto(enrolBtn.href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // 确认选课
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /选课|加入|enrol|注册|确认|submit/i.test(x.textContent + (x.value || '')));
    if (b) b.click();
  }).catch(() => {});
  await page.waitForTimeout(3000);
  console.log('选课后 URL:', page.url());
}

// 2) 进讨论区发帖
console.log('\n=== 进讨论区 forum/view.php?id=26446 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('讨论区 URL:', page.url());

if (page.url().includes('enrol') || page.url().includes('/login')) {
  console.log('仍未进入讨论区（选课/登录失败），dump:');
  const b = await page.locator('body').innerText().catch(() => '');
  console.log(b.slice(0, 800));
  await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/fail.png' });
  await page.waitForTimeout(60000);
  await ctx.close();
  process.exit(0);
}

// 点添加新话题
const clicked = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a, button')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) { a.click(); return a.textContent.trim().slice(0, 30); }
  return null;
}).catch(() => null);
console.log('添加新话题:', clicked);
await page.waitForTimeout(3000);
console.log('表单 URL:', page.url());

// 填主题
const subj = page.locator('input#id_subject, input[name=subject]').first();
if (await subj.count()) { await subj.fill(subject); console.log('主题已填'); }

// 填正文
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

// 提交
const submitted = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /发布|提交|发到论坛|Post|Submit/i.test(x.textContent + (x.value || '')) && x.getBoundingClientRect().width > 0 && !/搜索|search/i.test(x.textContent + (x.value||'')));
  if (b) { b.click(); return b.textContent.trim() || b.value; }
  return null;
}).catch(() => null);
console.log('提交按钮:', submitted);
await page.waitForTimeout(5000);
console.log('提交后 URL:', page.url());

const after = await page.locator('body').innerText().catch(() => '');
console.log('发帖成功:', (after.includes('曾艺彬') || after.includes('课例分析')) ? '可能' : '未知');
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });
console.log('截图 after-post.png');

await page.waitForTimeout(60000);
await ctx.close();