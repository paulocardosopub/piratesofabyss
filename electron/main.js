const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, Menu, dialog, net, protocol, shell } = require("electron");
const { autoUpdater } = require("electron-updater");

const APP_SCHEME = "pirates";
const APP_HOST = "abyss";
const APP_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;
const PRODUCT_NAME = "Pirates of the Abyss";
const UPDATE_CHECK_DELAY_MS = 12000;

let mainWindow = null;
let updateReadyPromptOpen = false;
let autoUpdateSetupDone = false;

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
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableDifferentialDownload = false;

  autoUpdater.on("checking-for-update", () => writeUpdateLog("info", "Verificando atualizacoes."));
  autoUpdater.on("update-available", info => writeUpdateLog("info", `Atualizacao encontrada: ${info.version}.`));
  autoUpdater.on("update-not-available", info => writeUpdateLog("info", `App atualizado: ${info.version}.`));
  autoUpdater.on("download-progress", progress => {
    const percent = Number(progress.percent || 0).toFixed(1);
    writeUpdateLog("info", `Baixando atualizacao: ${percent}%.`);
  });
  autoUpdater.on("error", error => writeUpdateLog("error", error?.stack || error?.message || error));
  autoUpdater.on("update-downloaded", info => {
    writeUpdateLog("info", `Atualizacao pronta para instalar: ${info.version}.`);
    if (updateReadyPromptOpen) return;
    updateReadyPromptOpen = true;
    dialog.showMessageBox(win, {
      type: "info",
      title: "Atualizacao pronta",
      message: "Uma nova versao de Pirates of the Abyss foi baixada.",
      detail: "Reinicie o jogo para instalar a atualizacao. Seu save online e sua conta serao mantidos.",
      buttons: ["Reiniciar e atualizar", "Depois"],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    }).then(result => {
      updateReadyPromptOpen = false;
      if (result.response === 0) autoUpdater.quitAndInstall(false, true);
    }).catch(error => {
      updateReadyPromptOpen = false;
      writeUpdateLog("error", error?.stack || error?.message || error);
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(error => writeUpdateLog("error", error?.stack || error?.message || error));
  }, UPDATE_CHECK_DELAY_MS);
}

function createWindow() {
  const iconPath = getBuildAssetPath(process.platform === "win32" ? "icon.ico" : "icon.png");
  const win = new BrowserWindow({
    title: PRODUCT_NAME,
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#061421",
    icon: iconPath || undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: [`--pirates-version=${encodeURIComponent(app.getVersion())}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
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

  win.loadURL(APP_URL);
  setupAutoUpdates(win);
  return win;
}

app.setName(PRODUCT_NAME);
app.commandLine.appendSwitch("disable-http-cache");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  mainWindow = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
