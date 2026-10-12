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
await page.evaluate(() => {
  const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
  if (a) a.click();
}).catch(() => {});
await page.waitForTimeout(5000);

// 填主题 + 正文
await page.locator('form#mformforum input#id_subject').first().fill(subject).catch(() => {});
await page.evaluate((msg) => {
  const ta = document.querySelector('form#mformforum textarea#id_message, form#mformforum textarea[name="message[text]"]');
  if (ta) { ta.value = msg; ta.dispatchEvent(new Event('change', { bubbles: true })); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  const iframe = document.querySelector('form#mformforum iframe#id_messageeditable, form#mformforum iframe[name*="message"]');
  if (iframe && iframe.contentDocument) { iframe.contentDocument.body.innerHTML = msg.replace(/\n/g, '<br>'); iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true })); }
}, message).catch(() => {});
await page.waitForTimeout(2000);
console.log('主题+正文已填');

// dump form#mformforum 所有 type=submit + name=submit
const allSubmits = await page.evaluate(() => {
  const form = document.querySelector('form#mformforum');
  if (!form) return [];
  return Array.from(form.querySelectorAll('input, button')).filter(x => x.type === 'submit' || x.name === 'submit' || /发到论坛|发布|Post|提交|保存/.test(x.textContent + (x.value||''))).map(b => ({ tag: b.tagName, type: b.type, name: b.name, id: b.id, value: (b.value||'').slice(0,25), text: b.textContent.trim().slice(0,25), visible: b.getBoundingClientRect().width>0 }));
}).catch(() => []);
console.log('\n所有 submit 类按钮:');
console.log(JSON.stringify(allSubmits, null, 1));

// 提交
const result = await page.evaluate(() => {
  const form = document.querySelector('form#mformforum');
  if (!form) return 'no form';
  // 1) 找 type=submit
  let b = Array.from(form.querySelectorAll('input, button')).find(x => x.type === 'submit' && x.getBoundingClientRect().width > 0 && !/search|搜索|取消/.test(x.textContent + (x.value||'')));
  if (b) { b.click(); return 'clicked submit: ' + (b.textContent.trim() || b.value); }
  // 2) 找 name=submit
  b = form.querySelector('[name=submit]');
  if (b) { b.click(); return 'clicked name=submit'; }
  // 3) requestSubmit
  if (form.requestSubmit) { form.requestSubmit(); return 'requestSubmit()'; }
  form.submit(); return 'form.submit()';
}).catch(e => 'error: ' + e.message);
console.log('\n提交:', result);
await page.waitForTimeout(7000);
console.log('提交后 URL:', page.url());

const ok = /discuss\.php\?d=\d+/.test(page.url());
console.log('发帖成功:', ok ? '是 ✓' : '否');
const after = await page.locator('body').innerText().catch(() => '');
console.log('页面含"圆周运动纵坐标":', after.includes('圆周运动纵坐标'));
await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/after-post.png' });

await page.waitForTimeout(60000);
await ctx.close();