const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, Menu, ipcMain, net, protocol, screen, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const APP_SCHEME = "pirates";
const APP_HOST = "abyss";
const APP_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;
const PRODUCT_NAME = "Pirates of the Abyss";
const UPDATE_CHECK_DELAY_MS = 12000;

let mainWindow = null;
let autoUpdateSetupDone = false;
let manualUpdateCheckPromise = null;
let desktopUpdateReady = false;
let desktopUpdateInfo = null;
let normalWindowState = null;
let miniOverlayWindowBounds = null;
let miniOverlayAlwaysOnTop = true;
let miniOverlayTopPulseTimer = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function getAppRoot() {
  if (!app.isPackaged) return app.getAppPath();
  const packagedRoot = path.join(app.getAppPath(), "dist-web");
  if (fs.existsSync(path.join(packagedRoot, "index.html"))) return packagedRoot;
  return app.getAppPath();
}

function getBuildAssetPath(fileName) {
  const candidates = [
    path.join(app.getAppPath(), "build", fileName),
    path.join(process.resourcesPath || "", "build", fileName)
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || "";
}

function resolveAppFile(requestUrl) {
  const root = getAppRoot();
  const parsed = new URL(requestUrl);
  let pathname = decodeURIComponent(parsed.pathname || "/");
  if (pathname === "/" || pathname.endsWith("/")) pathname = `${pathname}index.html`;
  const relativePath = pathname.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

function registerAppProtocol() {
  protocol.handle(APP_SCHEME, request => {
    const filePath = resolveAppFile(request.url);
    if (!filePath || !fs.existsSync(filePath)) {
      return new Response("Arquivo nao encontrado.", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

function isAppUrl(url) {
  return url.startsWith(`${APP_SCHEME}://${APP_HOST}/`);
}

function getInitialAppUrl() {
  const query = !app.isPackaged ? String(process.env.PIRATES_DESKTOP_START_QUERY || "").trim() : "";
  if (!query) return APP_URL;
  return `${APP_URL}${query.startsWith("?") ? query : `?${query}`}`;
}

function openExternalUrl(url) {
  if (!/^https?:\/\//i.test(url)) return;
  shell.openExternal(url).catch(() => {});
}

function writeUpdateLog(level, message) {
  const line = `[${new Date().toISOString()}] ${level}: ${String(message)}\n`;
  try {
    const logPath = path.join(app.getPath("userData"), "updates.log");
    fs.appendFile(logPath, line, () => {});
  } catch (_) {}
}

function sendDesktopUpdateStatus(win, status, message, extra = {}) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("desktop-update-status", { status, message, ...extra });
}

function getUpdateLogger() {
  return {
    info: message => writeUpdateLog("info", message),
    warn: message => writeUpdateLog("warn", message),
    error: message => writeUpdateLog("error", message),
    debug: message => writeUpdateLog("debug", message)
  };
}

function setupAutoUpdates(win) {
  if (autoUpdateSetupDone) return;
  autoUpdateSetupDone = true;
  if (!app.isPackaged || process.env.PIRATES_DISABLE_AUTO_UPDATE === "1") {
    writeUpdateLog("info", "Atualizacao automatica ignorada fora do app instalado.");
    return;
  }
  if (process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR) {
    writeUpdateLog("info", "Atualizacao automatica ignorada na versao portatil.");
    return;
  }

  autoUpdater.logger = getUpdateLogger();
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.disableDifferentialDownload = false;

  autoUpdater.on("checking-for-update", () => {
    desktopUpdateReady = false;
    desktopUpdateInfo = null;
    writeUpdateLog("info", "Verificando atualizacoes.");
    sendDesktopUpdateStatus(win, "checking", "Verificando atualizacoes...");
  });
  autoUpdater.on("update-available", info => {
    desktopUpdateReady = false;
    desktopUpdateInfo = info || null;
    writeUpdateLog("info", `Atualizacao encontrada: ${info.version}.`);
    sendDesktopUpdateStatus(win, "available", `Atualizacao ${info.version || ""} encontrada. Baixando...`.trim(), { version: info.version || "" });
  });
  autoUpdater.on("update-not-available", info => {
    desktopUpdateReady = false;
    desktopUpdateInfo = null;
    writeUpdateLog("info", `App atualizado: ${info.version}.`);
    sendDesktopUpdateStatus(win, "current", "Seu jogo ja esta atualizado.", { version: info.version || "" });
  });
  autoUpdater.on("download-progress", progress => {
    const percent = Number(progress.percent || 0).toFixed(1);
    writeUpdateLog("info", `Baixando atualizacao: ${percent}%.`);
    sendDesktopUpdateStatus(win, "downloading", `Baixando atualizacao: ${percent}%.`, { percent: Number(progress.percent || 0) });
  });
  autoUpdater.on("error", error => {
    desktopUpdateReady = false;
    writeUpdateLog("error", error?.stack || error?.message || error);
    sendDesktopUpdateStatus(win, "error", "Nao foi possivel verificar atualizacoes agora.");
  });
  autoUpdater.on("update-downloaded", info => {
    desktopUpdateReady = true;
    desktopUpdateInfo = info || null;
    writeUpdateLog("info", `Atualizacao pronta para instalar: ${info.version}.`);
    sendDesktopUpdateStatus(win, "ready", `Atualizacao ${info.version || ""} pronta. Reinicie pelo jogo.`.trim(), { version: info.version || "", canInstall: true });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(error => writeUpdateLog("error", error?.stack || error?.message || error));
  }, UPDATE_CHECK_DELAY_MS);
}

function getMiniOverlayBounds(win) {
  const display = screen.getDisplayMatching(win.getBounds());
  const workArea = display?.workArea || screen.getPrimaryDisplay().workArea;
  const width = Math.max(280, Math.min(420, Math.round(workArea.width * 0.22)));
  const height = Math.max(78, Math.min(118, Math.round(width * 0.28)));
  const margin = Math.max(8, Math.round(Math.min(workArea.width, workArea.height) * 0.012));
  return {
    width,
    height,
    x: Math.round(workArea.x + workArea.width - width - margin),
    y: Math.round(workArea.y + workArea.height - height - margin)
  };
}

function clampToDisplay(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampMiniOverlayBounds(bounds) {
  const display = screen.getDisplayMatching(bounds);
  const area = miniOverlayAlwaysOnTop
    ? (display?.bounds || screen.getPrimaryDisplay().bounds)
    : (display?.workArea || screen.getPrimaryDisplay().workArea);
  const width = Math.max(1, Math.round(Number(bounds?.width) || 1));
  const height = Math.max(1, Math.round(Number(bounds?.height) || 1));
  const maxX = area.x + Math.max(0, area.width - width);
  const maxY = area.y + Math.max(0, area.height - height);
  return {
    width,
    height,
    x: clampToDisplay(Math.round(Number(bounds?.x) || area.x), area.x, maxX),
    y: clampToDisplay(Math.round(Number(bounds?.y) || area.y), area.y, maxY)
  };
}

function getMiniOverlayEnterBounds(win) {
  const fallback = getMiniOverlayBounds(win);
  if (!miniOverlayWindowBounds) return fallback;
  return clampMiniOverlayBounds({
    ...fallback,
    width: miniOverlayWindowBounds.width || fallback.width,
    height: miniOverlayWindowBounds.height || fallback.height,
    x: miniOverlayWindowBounds.x ?? fallback.x,
    y: miniOverlayWindowBounds.y ?? fallback.y
  });
}

function clampMiniOverlayPosition(win, x, y) {
  const bounds = win.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: Math.round(x + bounds.width / 2),
    y: Math.round(y + bounds.height / 2)
  });
  const displayBounds = miniOverlayAlwaysOnTop
    ? (display?.bounds || screen.getPrimaryDisplay().bounds)
    : (display?.workArea || screen.getPrimaryDisplay().workArea);
  const maxX = displayBounds.x + Math.max(0, displayBounds.width - bounds.width);
  const maxY = displayBounds.y + Math.max(0, displayBounds.height - bounds.height);
  return {
    x: clampToDisplay(Math.round(x), displayBounds.x, maxX),
    y: clampToDisplay(Math.round(y), displayBounds.y, maxY)
  };
}

function keepMiniOverlayAboveTaskbar(win) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  const next = clampMiniOverlayPosition(win, bounds.x, bounds.y);
  if (next.x !== bounds.x || next.y !== bounds.y) {
    win.setBounds({ ...bounds, ...next }, true);
  }
}

function isMiniOverlayActive(win) {
  return Boolean(normalWindowState && win && !win.isDestroyed());
}

function pulseMiniOverlayTopPriority(win) {
  if (!isMiniOverlayActive(win) || !miniOverlayAlwaysOnTop) return;
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setSkipTaskbar(false);
  if (typeof win.moveTop === "function") win.moveTop();
}

function stopMiniOverlayTopPulse() {
  if (!miniOverlayTopPulseTimer) return;
  clearInterval(miniOverlayTopPulseTimer);
  miniOverlayTopPulseTimer = null;
}

function startMiniOverlayTopPulse(win) {
  stopMiniOverlayTopPulse();
  if (!isMiniOverlayActive(win) || !miniOverlayAlwaysOnTop) return;
  miniOverlayTopPulseTimer = setInterval(() => pulseMiniOverlayTopPriority(win), 350);
  if (typeof miniOverlayTopPulseTimer.unref === "function") miniOverlayTopPulseTimer.unref();
}

function applyMiniOverlayTopState(win) {
  if (!win || win.isDestroyed()) return;
  win.setAlwaysOnTop(Boolean(miniOverlayAlwaysOnTop), "screen-saver");
  win.setVisibleOnAllWorkspaces(Boolean(miniOverlayAlwaysOnTop), { visibleOnFullScreen: true });
  win.setSkipTaskbar(false);
  keepMiniOverlayAboveTaskbar(win);
  if (miniOverlayAlwaysOnTop && typeof win.moveTop === "function") win.moveTop();
  if (miniOverlayAlwaysOnTop && isMiniOverlayActive(win)) startMiniOverlayTopPulse(win);
  else stopMiniOverlayTopPulse();
}

function keepMiniOverlayOnTop(win) {
  applyMiniOverlayTopState(win);
}

function notifyMiniOverlayState(win, active) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("desktop-mini-overlay-state", { active: Boolean(active) });
}

function showMiniOverlayContextMenu(win) {
  if (!win || win.isDestroyed()) return { ok: false, message: "Janela indisponivel." };
  const menu = Menu.buildFromTemplate([
    {
      label: "Fixar On Top",
      type: "checkbox",
      checked: Boolean(miniOverlayAlwaysOnTop),
      click: item => {
        miniOverlayAlwaysOnTop = Boolean(item.checked);
        applyMiniOverlayTopState(win);
      }
    }
  ]);
  menu.popup({ window: win });
  return { ok: true };
}

function captureNormalWindowState(win) {
  return {
    bounds: win.getBounds(),
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
    resizable: win.isResizable()
  };
}

async function enterMiniOverlay(win) {
  if (!win || win.isDestroyed()) return { ok: false, message: "Janela indisponivel." };
  if (!normalWindowState) normalWindowState = captureNormalWindowState(win);
  if (win.isFullScreen()) win.setFullScreen(false);
  if (win.isMaximized()) win.unmaximize();
  win.setMovable(true);
  win.setResizable(false);
  win.setMinimumSize(280, 70);
  win.setSkipTaskbar(false);
  keepMiniOverlayOnTop(win);
  win.setHasShadow(false);
  win.setBackgroundColor("#00000000");
  win.setBounds(getMiniOverlayEnterBounds(win), true);
  win.show();
  keepMiniOverlayOnTop(win);
  win.focus();
  notifyMiniOverlayState(win, true);
  return { ok: true };
}

async function exitMiniOverlay(win) {
  if (!win || win.isDestroyed()) return { ok: false, message: "Janela indisponivel." };
  const restore = normalWindowState;
  miniOverlayWindowBounds = win.getBounds();
  normalWindowState = null;
  stopMiniOverlayTopPulse();
  win.setAlwaysOnTop(false);
  win.setVisibleOnAllWorkspaces(false);
  win.setSkipTaskbar(false);
  win.setHasShadow(true);
  win.setResizable(restore?.resizable ?? true);
  win.setMinimumSize(960, 600);
  if (restore?.bounds) win.setBounds(restore.bounds, true);
  if (restore?.maximized) win.maximize();
  if (restore?.fullscreen) win.setFullScreen(true);
  win.show();
  win.focus();
  notifyMiniOverlayState(win, false);
  return { ok: true };
}

function moveMiniOverlay(win, delta = {}) {
  if (!win || win.isDestroyed()) return { ok: false, message: "Janela indisponivel." };
  const dx = Math.round(Number(delta?.dx) || 0);
  const dy = Math.round(Number(delta?.dy) || 0);
  if (!dx && !dy) return { ok: true };
  const [x, y] = win.getPosition();
  const next = clampMiniOverlayPosition(win, x + dx, y + dy);
  keepMiniOverlayOnTop(win);
  win.setPosition(next.x, next.y, false);
  miniOverlayWindowBounds = win.getBounds();
  keepMiniOverlayOnTop(win);
  return { ok: true };
}

async function checkForUpdatesFromRenderer(win) {
  if (!win || win.isDestroyed()) return { ok: false, status: "error", message: "Janela indisponivel." };
  if (!app.isPackaged || process.env.PIRATES_DISABLE_AUTO_UPDATE === "1") {
    const message = "Busca de atualizacao disponivel somente no app instalado.";
    sendDesktopUpdateStatus(win, "unavailable", message);
    return { ok: false, status: "unavailable", message };
  }
  if (process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR) {
    const message = "A versao portatil nao instala atualizacoes automaticas.";
    sendDesktopUpdateStatus(win, "unavailable", message);
    return { ok: false, status: "unavailable", message };
  }
  setupAutoUpdates(win);
  if (desktopUpdateReady) {
    const version = desktopUpdateInfo?.version || "";
    const message = `Atualizacao ${version} pronta. Reinicie pelo jogo.`.trim();
    sendDesktopUpdateStatus(win, "ready", message, { version, canInstall: true });
    return { ok: true, status: "ready", message, version, canInstall: true };
  }
  if (manualUpdateCheckPromise) {
    return { ok: true, status: "checking", message: "Verificacao de atualizacao ja em andamento." };
  }
  sendDesktopUpdateStatus(win, "checking", "Verificando atualizacoes...");
  manualUpdateCheckPromise = autoUpdater.checkForUpdates()
    .then(() => ({ ok: true, status: "checking", message: "Busca de atualizacao iniciada." }))
    .catch(error => {
      writeUpdateLog("error", error?.stack || error?.message || error);
      const message = "Nao foi possivel verificar atualizacoes agora.";
      sendDesktopUpdateStatus(win, "error", message);
      return { ok: false, status: "error", message };
    })
    .finally(() => {
      manualUpdateCheckPromise = null;
    });
  return manualUpdateCheckPromise;
}

function installDownloadedUpdateFromRenderer(win) {
  if (!win || win.isDestroyed()) return { ok: false, status: "error", message: "Janela indisponivel." };
  if (!app.isPackaged || process.env.PIRATES_DISABLE_AUTO_UPDATE === "1") {
    const message = "Atualizacao automatica disponivel somente no app instalado.";
    sendDesktopUpdateStatus(win, "unavailable", message);
    return { ok: false, status: "unavailable", message };
  }
  if (process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR) {
    const message = "A versao portatil nao instala atualizacoes automaticas.";
    sendDesktopUpdateStatus(win, "unavailable", message);
    return { ok: false, status: "unavailable", message };
  }
  if (!desktopUpdateReady) {
    const message = "Nenhuma atualizacao baixada ainda.";
    sendDesktopUpdateStatus(win, "idle", message);
    return { ok: false, status: "idle", message };
  }
  const message = "Reiniciando para aplicar atualizacao...";
  sendDesktopUpdateStatus(win, "installing", message);
  writeUpdateLog("info", "Instalando atualizacao silenciosa solicitada pelo jogo.");
  setTimeout(() => {
    try {
      autoUpdater.quitAndInstall(true, true);
    } catch (error) {
      writeUpdateLog("error", error?.stack || error?.message || error);
      sendDesktopUpdateStatus(win, "error", "Nao foi possivel reiniciar para atualizar.");
    }
  }, 250);
  return { ok: true, status: "installing", message };
}

function registerDesktopIpcHandlers() {
  ipcMain.handle("desktop-enter-mini-overlay", event => enterMiniOverlay(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle("desktop-exit-mini-overlay", event => exitMiniOverlay(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle("desktop-move-mini-overlay", (event, delta) => moveMiniOverlay(BrowserWindow.fromWebContents(event.sender), delta));
  ipcMain.handle("desktop-show-mini-overlay-menu", event => showMiniOverlayContextMenu(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle("desktop-check-for-updates", event => checkForUpdatesFromRenderer(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle("desktop-install-update", event => installDownloadedUpdateFromRenderer(BrowserWindow.fromWebContents(event.sender)));
  ipcMain.handle("desktop-window-action", (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return { ok: false };
    if (action === "minimize") return enterMiniOverlay(win);
    else if (action === "maximize") win.isMaximized() ? win.unmaximize() : win.maximize();
    else if (action === "close") win.close();
    return { ok: true };
  });
}

function createWindow() {
  const iconPath = getBuildAssetPath(process.platform === "win32" ? "icon.ico" : "icon.png");
  const win = new BrowserWindow({
    title: PRODUCT_NAME,
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    icon: iconPath || undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: [`--pirates-version=${encodeURIComponent(app.getVersion())}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAppUrl(url)) openExternalUrl(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", event => {
    const url = event.url || "";
    if (!isAppUrl(url)) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.on("blur", () => {
    if (!isMiniOverlayActive(win) || !miniOverlayAlwaysOnTop) return;
    setTimeout(() => pulseMiniOverlayTopPriority(win), 20);
  });
  win.on("focus", () => pulseMiniOverlayTopPriority(win));
  win.on("show", () => pulseMiniOverlayTopPriority(win));
  win.on("minimize", event => {
    event.preventDefault();
    if (isMiniOverlayActive(win)) {
      pulseMiniOverlayTopPriority(win);
      return;
    }
    enterMiniOverlay(win).catch(error => writeUpdateLog("error", error?.stack || error?.message || error));
  });
  win.on("closed", stopMiniOverlayTopPulse);

  win.loadURL(getInitialAppUrl());
  setupAutoUpdates(win);
  return win;
}

app.setName(PRODUCT_NAME);
app.commandLine.appendSwitch("disable-http-cache");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  registerDesktopIpcHandlers();
  mainWindow = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
