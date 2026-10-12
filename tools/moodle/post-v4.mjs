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

await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3500);

// 点添加新话题
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) a.click();
}).catch(() => {});
await page.waitForTimeout(5000);

// 填主题
await page.locator('form#mformforum input#id_subject').first().fill(subject).catch(e => console.log('subject fail:', e.message));
console.log('主题已填');

// 设正文：textarea value + iframe body
await page.evaluate((msg) => {
  const html = msg.replace(/\n/g, '<br>');
  const iframe = document.querySelector('form#mformforum iframe#id_messageeditable, form#mformforum iframe[name*="message"]');
  if (iframe && iframe.contentDocument) {
    iframe.contentDocument.body.innerHTML = html;
    iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const ta = document.querySelector('form#mformforum textarea#id_message, form#mformforum textarea[name="message[text]"]');
  if (ta) {
    ta.value = msg;
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, message).catch(e => console.log('msg fail:', e.message));
await page.waitForTimeout(2000);

// 验证正文
const v = await page.evaluate(() => {
  const ta = document.querySelector('form#mformforum textarea#id_message, form#mformforum textarea[name="message[text]"]');
  const iframe = document.querySelector('form#mformforum iframe#id_messageeditable, form#mformforum iframe[name*="message"]');
  return { ta: ta?.value?.slice(0,60) || 'no ta', iframe: iframe?.contentDocument?.body?.innerText?.slice(0,60) || 'no iframe' };
}).catch(() => ({}));
console.log('正文验证:', JSON.stringify(v));

// dump form#mformforum 提交按钮
const submits = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('form#mformforum input[type=submit], form#mformforum button[type=submit], form#mformforum button')).filter(x => x.getBoundingClientRect().width > 0 || x.type === 'submit').map(b => ({ tag: b.tagName, type: b.type, name: b.name||'', id: b.id, value: (b.value||'').slice(0,25), text: b.textContent.trim().slice(0,25) }));
}).catch(() => []);
console.log('\nform#mformforum 提交按钮:');
console.log(JSON.stringify(submits, null, 1));

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });

// 点 form#mformforum 内提交按钮（优先 input[name=submit]，其次含"发到论坛/发布/Post"）
const submitted = await page.evaluate(() => {
  const form = document.querySelector('form#mformforum');
  if (!form) return 'no form';
  let b = form.querySelector('input[name=submit][type=submit]');
  if (!b) b = Array.from(form.querySelectorAll('input[type=submit], button[type=submit]')).find(x => /发到论坛|发布|Post|提交|保存/i.test(x.textContent + (x.value||'')) && x.getBoundingClientRect().width > 0);
  if (!b) b = form.querySelector('input[type=submit], button[type=submit]');
  if (b) { b.click(); return (b.textContent.trim() || b.value) + ' [name=' + (b.name||'') + ']'; }
  return 'no submit btn';
}).catch(e => 'error: ' + e.message);
console.log('\n点击提交:', submitted);
await page.waitForTimeout(7000);
console.log('提交后 URL:', page.url());

const ok = /discuss\.php\?d=\d+/.test(page.url());
console.log('发帖成功:', ok ? '是 ✓' : '否');
const after = await page.locator('body').innerText().catch(() => '');
console.log('页面含"圆周运动纵坐标":', after.includes('圆周运动纵坐标'));
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });

await page.waitForTimeout(90000);
await ctx.close();