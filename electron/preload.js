const { contextBridge, ipcRenderer } = require("electron");

const versionArgument = process.argv.find(argument => argument.startsWith("--pirates-version="));
const version = versionArgument ? decodeURIComponent(versionArgument.slice("--pirates-version=".length)) : "";

contextBridge.exposeInMainWorld("PiratesDesktop", {
  isDesktop: true,
  platform: process.platform,
  version,
  enterMiniOverlay: () => ipcRenderer.invoke("desktop-enter-mini-overlay"),
  exitMiniOverlay: () => ipcRenderer.invoke("desktop-exit-mini-overlay"),
  moveMiniOverlay: delta => ipcRenderer.invoke("desktop-move-mini-overlay", delta),
  showMiniOverlayMenu: () => ipcRenderer.invoke("desktop-show-mini-overlay-menu"),
  checkForUpdates: () => ipcRenderer.invoke("desktop-check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("desktop-install-update"),
  windowAction: action => ipcRenderer.invoke("desktop-window-action", action),
  onMiniOverlayState: callback => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-mini-overlay-state", listener);
    return () => ipcRenderer.removeListener("desktop-mini-overlay-state", listener);
  },
  onUpdateStatus: callback => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("desktop-update-status", listener);
    return () => ipcRenderer.removeListener("desktop-update-status", listener);
  }
});
