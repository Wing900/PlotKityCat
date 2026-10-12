const get = id => document.getElementById(id);
const backend = window.go.setup.Installer;
let state = "ready", legacy = "";

function showError(error) {
  get("description").textContent = String(error?.message || error);
}

function setOptionsOpen(open) {
  get("toggle-options").setAttribute("aria-expanded", open);
  get("options-panel").classList.toggle("open", open);
  get("options-panel").inert = !open;
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
  }
});

backend.Configuration().then(config => {
  get("install-location").value = config.installDir;
  get("legacy-row").hidden = config.hasData;
}).catch(showError);
