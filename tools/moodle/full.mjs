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
console.log('=== 登录 ===');
await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3000);
if (page.url().includes('/login') || page.url().includes('enrol')) {
  const sso = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /统一身份认证|sso/.test(x.textContent));
    return a ? a.href : null;
  }).catch(() => null);
  if (sso) await page.goto(sso, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  console.log('请博士登录 sso（最多2分钟）...当前:', page.url());
  try {
    await page.waitForFunction(() => location.hostname.includes('tws.scnu.edu.cn') && !location.href.includes('/login'), { timeout: 120000 });
    console.log('✓ 登录成功');
  } catch (e) { console.log('登录超时'); }
  await page.goto('https://tws.scnu.edu.cn/course/view.php?id=970', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

// 2) 进讨论区 + dump 我的话题
console.log('\n=== 进讨论区 ===');
await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(4000);
console.log('URL:', page.url());

if (page.url().includes('/login') || page.url().includes('enrol')) {
  console.log('仍未进入，失败'); await page.waitForTimeout(60000); await ctx.close(); process.exit(0);
}

const topics = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('tr, [role=row]'));
  const result = [];
  for (const row of rows) {
    const a = row.querySelector('a[href*="discuss.php?d="]');
    if (!a) continue;
    const m = a.href.match(/d=(\d+)/);
    if (!m || result.find(r => r.id === m[1])) continue;
    result.push({ id: m[1], title: a.textContent.trim().slice(0, 40), href: a.href, row: row.textContent.replace(/\s+/g,' ').slice(0,200) });
  }
  return result;
}).catch(() => []);

console.log('话题数:', topics.length);
const mine = topics.filter(t => /曾艺彬|20232221133/.test(t.row));
console.log('我发的话题:', mine.length, '条');
for (const t of mine) console.log('  ★ d=' + t.id + ' ' + t.title);

if (mine.length === 1) {
  console.log('\n✓ 已发1条，进话题看正文');
  await page.goto(mine[0].href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const b = await page.locator('body').innerText().catch(() => '');
  const i = b.indexOf('曾艺彬');
  console.log(b.slice(i>=0?i:0, (i>=0?i:0)+700));
} else if (mine.length >= 2) {
  console.log('\n发了' + mine.length + '条，删多余的（保留第1条）');
  for (let i = 1; i < mine.length; i++) {
    await page.goto(mine[i].href, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const del = await page.evaluate(() => {
      const d = Array.from(document.querySelectorAll('a, button')).find(x => /删除|Delete/.test(x.textContent) && x.getBoundingClientRect().width > 0);
      if (d) { d.click(); return d.textContent.trim(); } return null;
    }).catch(() => null);
    console.log('d=' + mine[i].id + ' 删除按钮:', del);
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('button, input')).find(x => /确认|确定|Yes|Delete/i.test(x.textContent + (x.value||'')));
      if (c) c.click();
    }).catch(() => {});
    await page.waitForTimeout(2000);
  }
} else {
  console.log('\n=== 0条，发帖 ===');
  await page.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => /添加.*新话题|添加一个新话题/.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (a) a.click();
  }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.locator('form#mformforum input#id_subject').first().fill(subject).catch(() => {});
  await page.evaluate((msg) => {
    const ta = document.querySelector('form#mformforum textarea#id_message, form#mformforum textarea[name="message[text]"]');
    if (ta) { ta.value = msg; ta.dispatchEvent(new Event('change', { bubbles: true })); ta.dispatchEvent(new Event('input', { bubbles: true })); }
    const iframe = document.querySelector('form#mformforum iframe#id_messageeditable, form#mformforum iframe[name*="message"]');
    if (iframe && iframe.contentDocument) { iframe.contentDocument.body.innerHTML = msg.replace(/\n/g, '<br>'); iframe.contentDocument.body.dispatchEvent(new Event('input', { bubbles: true })); }
  }, message).catch(() => {});
  await page.waitForTimeout(2000);
  await page.locator('form#mformforum input#id_submitbutton').first().click().catch(e => console.log('submit fail:', e.message));
  console.log('点击"发到讨论区"');
  await page.waitForTimeout(6000);
  console.log('提交后 URL:', page.url());
  const after = await page.locator('body').innerText().catch(() => '');
  console.log('发帖成功:', after.includes('圆周运动纵坐标') ? '是 ✓' : '需确认');
}

await page.screenshot({ path: 'D:/projects/plotkitycat/tools/moodle/final.png' });
console.log('\n截图 final.png，浏览器保持开2分钟');
await page.waitForTimeout(120000);
await ctx.close();