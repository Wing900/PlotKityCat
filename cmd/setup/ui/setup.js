const get = id => document.getElementById(id);
const backend = window.go.setup.Installer;
const optionsPanel = () => get("options-panel");
const optionsOpen = () => optionsPanel().classList.contains("open");
let state = "ready", legacy = "", requested = 0, scale = 0, raf = 0, closeTimer = 0;
let openHeight = 0; // 展开态预留高度，加载时算一次

const contentHeight = () => Math.ceil(
  document.querySelector(".titlebar").getBoundingClientRect().height +
  document.querySelector("main").getBoundingClientRect().height);
const viewportHeight = () => document.documentElement.clientHeight;

// Wails 用建窗时的 DPI 换算逻辑像素，而 WebView2 渲染器布局用的缩放可能不同
// （本机 1.5 vs 1.755），所以 CSS 视口 ≠ 请求高度，不能写死任何常数。
// 用「当前视口 ÷ 上次请求」持续自标定，任何机器、任何缩放下都成立。
function calibrate() {
  const viewport = viewportHeight();
  if (requested > 0 && viewport > 0) scale = viewport / requested;
}

// +2 抵消 clientHeight 取整带来的亚像素差。
function requestHeight(cssHeight) {
  return scale > 0 ? Math.ceil((cssHeight + 2) / scale) : requested;
}

function applyHeight(height) {
  if (height === requested) return;
  requested = height;
  backend.FitWindow(height).catch(() => {});
}

function resizeNow(cssHeight) {
  calibrate();
  applyHeight(requestHeight(cssHeight));
}

// 窗口高度缓动。缓动期间内容不动，避免「窗口在跳 + 内容在动」叠成抖动。
// 只用于展开/收起选项和安装进度切换，其他时候不重算，减少窗口动作。
function resizeAnimated(cssHeight, done) {
  if (!Number.isFinite(cssHeight) || cssHeight <= 0) { if (done) done(); return; }
  calibrate();
  cancelAnimationFrame(raf);
  const from = requested, to = requestHeight(cssHeight), start = performance.now(), duration = 140;
  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    applyHeight(Math.round(from + (to - from) * eased));
    if (progress < 1) raf = requestAnimationFrame(tick);
    else if (done) done();
  };
  raf = requestAnimationFrame(tick);
}

// 展开态可能出现的最高内容：面板展开 +（可选）已选行 + 状态折两行 + 描述折两行。
// 展开期间内容再怎么变都落在这个预留高度内，于是展开后完全不需要再动窗口。
// 同一帧内临时改 DOM、量完复原，浏览器不会绘制，也不会触发过渡。
function measureOpenHeight(includeSelectedRow) {
  const panel = optionsPanel(), selected = get("import-selected");
  const status = get("import-status"), description = get("description");
  const was = {
    open: optionsOpen(), selected: selected.hidden,
    status: status.textContent, title: status.title, description: description.textContent,
  };
  panel.style.transition = "none";
  panel.classList.add("open");
  if (includeSelectedRow) selected.hidden = false;
  status.textContent = "X".repeat(120); // CSS 已把状态行封顶 2 行，这里取到该上限
  description.textContent = '安装未完成：使用"3"个参数调用"Replace"时发生异常:"路径的形式不合法。" 请选择有写入权限的目录后重试。';
  const height = contentHeight();
  panel.classList.toggle("open", was.open);
  selected.hidden = was.selected;
  status.textContent = was.status;
  status.title = was.title;
  description.textContent = was.description;
  // 复原后必须趁过渡仍关闭时先落定一次布局，否则重新开启过渡会把这次复原
  // 当成一次可过渡变化、从展开态倒着动画回去，紧接着的读数就落在动画起点上。
  contentHeight();
  panel.style.transition = "";
  return height;
}

function showError(error) {
  get("description").textContent = String(error?.message || error);
  // 展开态的预留高度已含两行描述；只有面板还收着时才需要调窗口。
  if (!optionsOpen()) resizeAnimated(contentHeight());
}

function setOptionsOpen(open) {
  if (open === (get("toggle-options").getAttribute("aria-expanded") === "true")) return;
  get("toggle-options").setAttribute("aria-expanded", open);
  clearTimeout(closeTimer);
  if (open) {
    // 先把窗口长到展开态预留高度，到位后再放内容进来：中间任何一帧都不会有滚动条。
    resizeAnimated(openHeight, () => {
      optionsPanel().inert = false;
      optionsPanel().classList.add("open");
    });
    return;
  }
  optionsPanel().inert = true;
  optionsPanel().classList.remove("open");
  // 先收内容，等过渡结束（260ms）再缩窗口：内容已不可见，缩窗口不会露出滚动条。
  // 量当下的内容而不是加载时的值：报错文案会在收起态多折一行，用旧值会短一截。
  closeTimer = setTimeout(() => resizeAnimated(contentHeight()), 300);
}

function setBusy(busy) {
  get("reset").disabled = busy;
  get("close").disabled = busy;
  get("install-location").disabled = busy;
  get("browse-location").disabled = busy;
  get("choose-folder").disabled = busy;
}

get("toggle-options").addEventListener("click", () => {
  setOptionsOpen(get("toggle-options").getAttribute("aria-expanded") !== "true");
});
get("reset").addEventListener("click", () => backend.Minimize());
get("close").addEventListener("click", () => backend.Close());
get("browse-location").addEventListener("click", async () => {
  try {
    const path = await backend.SelectInstallDirectory();
    if (path) get("install-location").value = path;
  } catch (error) { showError(error); }
});
get("choose-folder").addEventListener("click", async () => {
  try {
    const path = await backend.SelectLegacyDirectory();
    if (!path) return;
    legacy = path;
    get("import-selected").hidden = false;
    get("import-status").textContent = path.split(/[\\/]/).filter(Boolean).pop();
    get("import-status").title = path;
    get("choose-folder").textContent = "重新选择";
    get("description").textContent = "安装完成后，即可从桌面打开。";
    // 已选行的高度已含在 openHeight 预留里，这里不需要动窗口。
  } catch (error) { showError(error); }
});
get("clear-folder").addEventListener("click", () => {
  legacy = "";
  get("import-selected").hidden = true;
  get("choose-folder").textContent = "选择文件夹";
});

window.runtime.EventsOn("setup:progress", progress => {
  get("progress-message").textContent = progress.message;
  const uncertain = progress.percent < 0;
  get("track").classList.toggle("indeterminate", uncertain);
  get("percentage").textContent = uncertain ? "" : `${progress.percent}%`;
  if (uncertain) {
    get("track").removeAttribute("aria-valuenow");
  } else {
    get("fill").style.width = `${progress.percent}%`;
    get("track").setAttribute("aria-valuenow", progress.percent);
  }
});

get("install").addEventListener("click", async () => {
  if (state === "installing") return;
  if (state === "done") {
    try { await backend.OpenApplication(); } catch (error) { showError(error); }
    return;
  }
  state = "installing";
  setBusy(true);
  get("options").hidden = true;
  get("progress").hidden = false;
  get("install").hidden = true;
  get("description").textContent = "很快就好，请稍候。";
  resizeAnimated(contentHeight()); // 变小：内容先落地再收窗口，不会露出滚动条
  try {
    await backend.Install(get("install-location").value, legacy);
    state = "done";
    setBusy(false);
    get("progress").hidden = true;
    get("install").hidden = false;
    get("heading").textContent = "安装完成";
    get("description").textContent = "PlotKityCat 已准备好，开始创作吧。";
    get("install").textContent = "完成";
    resizeAnimated(contentHeight());
  } catch (error) {
    state = "ready";
    setBusy(false);
    showError(error);
    // 选项区要回来。先长到预留高度，再一起显示，否则会闪一帧滚动条。
    resizeAnimated(openHeight, () => {
      get("progress").hidden = true;
      get("install").hidden = false;
      get("options").hidden = false;
      setOptionsOpen(true);
    });
  }
});

backend.Configuration().then(config => {
  get("install-location").value = config.installDir;
  get("legacy-row").hidden = config.hasData;
  requested = config.windowHeight; // 标定起点：Wails 建窗时用的逻辑高度
  requestAnimationFrame(() => {
    openHeight = measureOpenHeight(!get("legacy-row").hidden);
    resizeNow(contentHeight());
  });
}).catch(showError);
