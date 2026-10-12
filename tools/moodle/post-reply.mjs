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

console.log('=== 进课例1讨论区 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForTimeout(3500);

// 点"添加一个新话题"
console.log('点添加新话题...');
const clicked = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a, button')).find(x => /添加.*新话题|添加一个新话题|new discussion/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) { a.click(); return a.textContent.trim().slice(0, 30); }
  return null;
}).catch(() => null);
console.log('点击:', clicked);
if (!clicked) {
  // 备选：找 href 含 discuss.php?action=new
  await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /discuss\.php.*new|reply\.php/.test(x.href || ''));
    if (a) a.click();
  }).catch(() => {});
}
await page.waitForTimeout(3000);
console.log('当前 URL:', page.url());

// 填主题
const subj = page.locator('input#id_subject, input[name=subject]').first();
if (await subj.count()) {
  await subj.fill(subject);
  console.log('主题已填:', subject);
} else {
  console.log('未找到主题输入框，dump 表单:');
  const form = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea, button')).filter(x => x.getBoundingClientRect().width > 0).map(x => ({ tag: x.tagName, id: x.id, name: x.name, type: x.type, value: (x.value||'').slice(0,30) }));
  }).catch(() => []);
  console.log(JSON.stringify(form, null, 1));
}

// 填正文（textarea 或 Atto iframe）
const ta = page.locator('textarea#id_message, textarea[name=message]').first();
if (await ta.count()) {
  await ta.fill(message);
  console.log('正文已填(textarea)');
  // 触发 change 让 Atto 同步
  await ta.dispatchEvent('change').catch(() => {});
  await page.waitForTimeout(1000);
  // 也设置 iframe body（Atto）
  await page.evaluate((msg) => {
    const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*=message]');
    if (iframe && iframe.contentDocument) {
      iframe.contentDocument.body.innerHTML = msg.replace(/\n/g, '<br>');
    }
  }, message).catch(() => {});
}

// 截图发帖前
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });
console.log('截图 before-post.png');

// 提交
console.log('提交...');
const submitted = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /发布|提交|发到论坛|Post|Submit/i.test(x.textContent + (x.value || '')) && x.getBoundingClientRect().width > 0);
  if (b) { b.click(); return b.textContent.trim() || b.value; }
  return null;
}).catch(() => null);
console.log('提交按钮:', submitted);
await page.waitForTimeout(5000);
console.log('提交后 URL:', page.url());

// 确认发帖成功
const after = await page.locator('body').innerText().catch(() => '');
const ok = after.includes(subject) || after.includes('课例分析') || page.url().includes('discuss.php');
console.log('发帖成功:', ok ? '是' : '否');
console.log('页面含"课例分析"或新话题:', after.includes('曾艺彬') || after.includes('20232221133'));

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });
console.log('截图 after-post.png');

// 保持开一会
await page.waitForTimeout(60000);
await ctx.close();