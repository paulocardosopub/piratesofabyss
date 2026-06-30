const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");

const APP_SCHEME = "pirates";
const APP_HOST = "abyss";
const APP_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;
const PRODUCT_NAME = "Pirates of the Abyss";

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
  return win;
}

app.setName(PRODUCT_NAME);
app.commandLine.appendSwitch("disable-http-cache");

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
