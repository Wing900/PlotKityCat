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
console.log('讨论区 URL:', page.url());

// 找"添加新话题"链接 href
const newTopicLink = await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  return a ? { text: a.textContent.trim(), href: a.href } : null;
}).catch(() => null);
console.log('添加新话题链接:', JSON.stringify(newTopicLink));

if (newTopicLink) {
  await page.goto(newTopicLink.href, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(5000);
  console.log('表单页 URL:', page.url());
}

// dump 表单结构
const form = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input, textarea, iframe, button, select')).filter(x => x.getBoundingClientRect().width > 0 || x.tagName === 'IFRAME' || x.type === 'hidden');
  return inputs.map(x => ({ tag: x.tagName, id: x.id, name: x.name || '', type: x.type || '', value: (x.value||'').slice(0,20), visible: x.getBoundingClientRect().width > 0, src: x.src || '' }))
    .filter(x => /subject|message|submit|post|发到论坛|发布|取消|messageeditable/.test(x.id + x.name + x.value + (x.type||'')) || x.tag === 'IFRAME' || x.tag === 'BUTTON');
}).catch(() => []);
console.log('\n表单字段:');
console.log(JSON.stringify(form, null, 1));

// 填主题
const subj = page.locator('input#id_subject').first();
if (await subj.count()) { await subj.fill(subject); console.log('\n主题已填'); }

// 填正文：iframe（Atto）或 textarea
await page.evaluate((msg) => {
  const html = msg.replace(/\n/g, '<br>');
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  if (iframe && iframe.contentDocument) {
    iframe.contentDocument.body.innerHTML = html;
    iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const ta = document.querySelector('textarea#id_message, textarea[name="message[text]"]');
  if (ta) {
    ta.value = msg;
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, message).catch(e => console.log('msg fail:', e.message));
await page.waitForTimeout(2000);

// 验证
const v = await page.evaluate(() => {
  const iframe = document.querySelector('iframe#id_messageeditable, iframe[name*="message"]');
  return {
    iframe: iframe ? iframe.contentDocument?.body?.innerText.slice(0, 60) : 'no iframe',
    textarea: document.querySelector('textarea#id_message, textarea[name="message[text]"]')?.value?.slice(0, 60) || 'no ta',
  };
}).catch(() => ({}));
console.log('正文验证:', JSON.stringify(v));

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/before-post.png' });

// 找正确提交按钮（"发到论坛"/"发布"，排除搜索）
const submitInfo = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('input[type=submit], button')).filter(x => x.getBoundingClientRect().width > 0);
  return btns.map(b => ({ tag: b.tagName, text: b.textContent.trim().slice(0,20), value: (b.value||'').slice(0,20), name: b.name, id: b.id })).filter(b => /发到论坛|发布|提交|Post|Submit|保存/i.test(b.text + b.value));
}).catch(() => []);
console.log('\n提交按钮候选:', JSON.stringify(submitInfo, null, 1));

// 点"发到论坛"或"发布"（不是搜索）
const submitted = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('input[type=submit], button')).find(x => {
    const t = (x.textContent + (x.value||'')).trim();
    return /发到论坛|发布|Post to forum|Submit/i.test(t) && x.getBoundingClientRect().width > 0 && !/搜索|search|登录|取消/i.test(t);
  });
  if (b) { b.click(); return b.textContent.trim() || b.value; }
  return null;
}).catch(() => null);
console.log('点击提交:', submitted);
await page.waitForTimeout(6000);
console.log('提交后 URL:', page.url());

const after = await page.locator('body').innerText().catch(() => '');
// 真正成功：URL 含 discuss.php?d= 新话题
const ok = /discuss\.php\?d=\d+/.test(page.url()) || /曾艺彬.*课例分析|课例分析.*曾艺彬/.test(after);
console.log('发帖成功:', ok ? '是 ✓' : '需确认');
console.log('URL 含 discuss:', /discuss\.php/.test(page.url()));
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });
console.log('截图 after-post.png');

await page.waitForTimeout(120000);
await ctx.close();