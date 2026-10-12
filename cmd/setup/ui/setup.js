const get = id => document.getElementById(id);
const backend = window.go.setup.Installer;
let state = "ready", legacy = "", requested = 0, fitTimer = 0;

// 安装选项一展开，内容就高出约 150px。WebView2 渲染器布局用的缩放可能与 Wails
// 建窗时的 DPI 不一致（本机 1.755 vs 1.5），CSS 视口并不等于请求高度，所以不能
// 写死一个高度。用「上次请求高度 × 实测内容高 ÷ 当前 CSS 视口高」自标定，
// 一步收敛到不动点，任何机器、任何缩放下都刚好贴住内容。
function fitWindow() {
  const need = Math.ceil(
    document.querySelector(".titlebar").getBoundingClientRect().height +
    document.querySelector("main").getBoundingClientRect().height);
  const viewport = document.documentElement.clientHeight;
  if (!requested || !viewport || need <= 0) return;
  // +2: clientHeight 是取整值，留一点余量免得亚像素差把滚动条勾出来。
  const next = Math.ceil((requested * (need + 2)) / viewport);
  if (Math.abs(next - requested) < 3) return; // 已贴合，避免来回抖
  requested = next;
  backend.FitWindow(next).catch(() => {});
}

// 选项面板有 260ms 过渡，量之前先让布局落定。
function scheduleFit() {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitWindow, 320);
}

function showError(error) {
  get("description").textContent = String(error?.message || error);
  scheduleFit(); // 错误文案可能多折一行
}

function setOptionsOpen(open) {
  get("toggle-options").setAttribute("aria-expanded", open);
  get("options-panel").classList.toggle("open", open);
  get("options-panel").inert = !open;
  scheduleFit();
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
    scheduleFit(); // “已选”多出一行
  } catch (error) { showError(error); }
});
get("clear-folder").addEventListener("click", () => {
  legacy = "";
  get("import-selected").hidden = true;
  get("choose-folder").textContent = "选择文件夹";
  scheduleFit();
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
  scheduleFit();
  try {
    await backend.Install(get("install-location").value, legacy);
    state = "done";
    get("heading").textContent = "安装完成";
    get("description").textContent = "PlotKityCat 已准备好，开始创作吧。";
    get("install").textContent = "完成";
  } catch (error) {
    state = "ready";
    get("options").hidden = false;
    setOptionsOpen(true);
    showError(error);
  } finally {
    setBusy(false);
    get("progress").hidden = true;
    get("install").hidden = false;
    scheduleFit();
  }
});

backend.Configuration().then(config => {
  get("install-location").value = config.installDir;
  get("legacy-row").hidden = config.hasData;
  requested = config.windowHeight; // 标定起点：Wails 建窗时用的高度
  scheduleFit();
}).catch(showError);
