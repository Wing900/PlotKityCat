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

const url = 'https://jpk.basic.smartedu.cn/yearQualityCourse?courseId=00203a04-ea27-7040-fad8-408360958a89&courseType=elite_lesson&classHourId=lesson_1';
console.log('打开课例1视频:', url);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('goto fail', e.message));
await page.waitForTimeout(5000);
console.log('当前 URL:', page.url());
console.log('浏览器保持开，博士可观看视频。看完告诉博士下一步。');

await page.waitForTimeout(1800000);