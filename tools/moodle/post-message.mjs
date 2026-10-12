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

console.log('=== 进讨论区 forum/view.php?id=26446 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);
console.log('URL:', page.url());

if (page.url().includes('/login') || page.url().includes('enrol')) {
  console.log('未登录或未选课，需重新登录。URL:', page.url());
  await page.waitForTimeout(30000); await ctx.close(); process.exit(0);
}

// 点添加新话题
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a, button')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) a.click();
}).catch(() => {});
await page.waitForTimeout(3000);
console.log('表单 URL:', page.url());

// 填主题
await page.locator('input#id_subject').first().fill(subject).catch(() => console.log('subject fill fail'));
console.log('主题已填');

// 填正文：设 iframe body + textarea value（Atto 编辑器）
await page.evaluate((msg) => {
  const html = msg.replace(/\n/g, '<br>');
  // Atto iframe
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  if (iframe && iframe.contentDocument) {
    iframe.contentDocument.body.innerHTML = html;
    iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
    iframe.contentDocument.body.dispatchEvent(new Event('change', { bubbles: true }));
  }
  // textarea（hidden，同步 value）
  const ta = document.querySelector('textarea#id_message, textarea[name="message[text]"]');
  if (ta) {
    ta.value = msg;
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, message).catch(e => console.log('msg set fail:', e.message));
await page.waitForTimeout(1500);
console.log('正文已设');

// 验证 iframe 内容
const check = await page.evaluate(() => {
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  return iframe && iframe.contentDocument ? iframe.contentDocument.body.innerText.slice(0, 80) : 'no iframe';
}).catch(() => 'check fail');
console.log('iframe 内容预览:', check);

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });

// 提交
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
console.log('页面含曾艺彬:', after.includes('曾艺彬'));
console.log('页面含课例分析:', after.includes('课例分析'));

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });
console.log('截图 after-post.png，浏览器保持开2分钟供博士查看');
await page.waitForTimeout(120000);
await ctx.close();