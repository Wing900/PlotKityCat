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

// tab1: 课例1视频链接（1.1 国家智教平台精品课）
console.log('打开课例1视频链接...');
await page.goto('https://tws.scnu.edu.cn/mod/url/view.php?id=26447', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('课例1链接页 URL:', page.url());

// tab2: 讨论区
const page2 = await ctx.newPage();
await page2.goto('https://tws.scnu.edu.cn/mod/forum/view.php?id=26446', { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
console.log('讨论区已打开（第2个tab）');

console.log('\n浏览器保持开，博士可在两个tab查看：');
console.log('  tab1: 课例1视频链接（点进国家中小学平台看视频）');
console.log('  tab2: 课例1讨论区（邵老师点评+同学回帖）');
console.log('看完了告诉博士下一步（发帖内容已草稿，等博士确认）');

// 保持开 30 分钟
await page.waitForTimeout(1800000);