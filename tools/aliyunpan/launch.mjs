// 启动 headed Chromium，带持久化 profile + CDP 端口，打开阿里云网盘后台。
// 借用 Kity-Tour 已装的 playwright，避免重复装包。
import { spawn } from 'child_process';
import { mkdirSync, existsSync } from 'fs';

// 优先用系统 Chrome（避免 playwright chromium 版本不匹配），独立 profile 不污染日常浏览器
const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', // Edge 兜底
];
const exe = candidates.find(p => existsSync(p));
if (!exe) throw new Error('未找到系统 Chrome/Edge');
const profileDir = 'D:/projects/plotkitycat/tools/aliyunpan/profile';
mkdirSync(profileDir, { recursive: true });

const url = 'https://bj37773.apps.aliyunfile.com/disk/admin/home';
const cdpPort = 9222;

const child = spawn(exe, [
  `--remote-debugging-port=${cdpPort}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  url,
], { detached: true, stdio: 'ignore', windowsHide: false });
child.unref();

console.log(JSON.stringify({
  status: 'launched',
  chromium: exe,
  profileDir,
  cdp: `http://127.0.0.1:${cdpPort}`,
  url,
  pid: child.pid,
}, null, 2));