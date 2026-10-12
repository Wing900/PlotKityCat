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

// 点添加新话题（a 标签 click，触发折叠展开）
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) a.click();
}).catch(() => {});
await page.waitForTimeout(5000);
console.log('URL:', page.url());

// 等编辑器加载：尝试 focus textarea 触发 Atto
await page.evaluate(() => {
  const ta = document.querySelector('textarea#id_message, textarea[name="message[text]"]');
  if (ta) { ta.focus(); ta.click(); }
}).catch(() => {});
await page.waitForTimeout(3000);

// dump 完整表单（含 hidden）
const form = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('input, textarea, iframe, button, select'));
  return all.map(x => ({ tag: x.tagName, id: x.id, name: x.name||'', type: x.type||'', value: (x.value||'').slice(0,30), visible: x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height > 0, src: (x.src||'').slice(0,50), text: x.textContent?.trim().slice(0,20)||'' }))
    .filter(x => /subject|message|submit|post|发到论坛|发布|取消|reply|forum/.test(x.id + x.name + x.value + x.text + x.type) || x.tag === 'IFRAME');
}).catch(() => []);
console.log('\n=== 表单字段（含hidden）===');
console.log(JSON.stringify(form, null, 1));

// 填主题
await page.locator('input#id_subject').first().fill(subject).catch(() => console.log('subject fail'));
console.log('\n主题已填:', subject);

// 填正文：iframe（Atto）+ textarea value
await page.evaluate((msg) => {
  const html = msg.replace(/\n/g, '<br>');
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  if (iframe && iframe.contentDocument) {
    iframe.contentDocument.body.innerHTML = html;
    iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
    iframe.contentDocument.body.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  const ta = document.querySelector('textarea#id_message, textarea[name="message[text]"]');
  if (ta) {
    ta.value = msg;
    ta.dispatchEvent(new Event('change', { bubbles: true }));
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, message).catch(e => console.log('msg fail:', e.message));
await page.waitForTimeout(2000);

// 验证
const v = await page.evaluate(() => {
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  const ta = document.querySelector('textarea#id_message, textarea[name="message[text]"]');
  return {
    iframe: iframe ? (iframe.contentDocument?.body?.innerText?.slice(0,60) || 'iframe no body') : 'no iframe',
    ta: ta ? ta.value.slice(0, 60) : 'no ta',
    iframeCount: document.querySelectorAll('iframe').length,
  };
}).catch(() => ({}));
console.log('正文验证:', JSON.stringify(v));

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });

// 找提交按钮：优先 input[name=submit]，排除搜索
const submitCandidates = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('input[type=submit], button')).filter(x => x.getBoundingClientRect().width > 0).map(b => ({
    tag: b.tagName, name: b.name||'', id: b.id, value: (b.value||'').slice(0,20), text: b.textContent.trim().slice(0,20), type: b.type,
  })).filter(b => !/search|搜索|登录|取消|清空/.test(b.value + b.text + b.id));
}).catch(() => []);
console.log('\n提交按钮候选(排除搜索):');
console.log(JSON.stringify(submitCandidates, null, 1));

// 点"发到论坛"或 input[name=submit]
const submitted = await page.evaluate(() => {
  // 优先 input[name=submit]
  let b = document.querySelector('input[name=submit][type=submit]');
  if (!b) b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => /发到论坛|发布|Post to forum|提交/i.test(x.textContent + (x.value||'')) && x.getBoundingClientRect().width > 0 && !/搜索|search|登录|取消|清空/.test(x.textContent + (x.value||'')));
  if (b) { b.click(); return (b.textContent.trim() || b.value) + ' [name=' + b.name + ']'; }
  return null;
}).catch(() => null);
console.log('\n点击提交:', submitted);
await page.waitForTimeout(6000);
console.log('提交后 URL:', page.url());

const ok = /discuss\.php\?d=\d+/.test(page.url());
console.log('发帖成功:', ok ? '是 ✓ (URL含discuss)' : '否');
const after = await page.locator('body').innerText().catch(() => '');
console.log('页面含曾艺彬:', after.includes('曾艺彬'));
console.log('页面含我的正文"圆周运动纵坐标":', after.includes('圆周运动纵坐标'));
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });

await page.waitForTimeout(120000);
await ctx.close();