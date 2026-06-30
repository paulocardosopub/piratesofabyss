const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("PiratesDesktop", {
  isDesktop: true,
  platform: process.platform
});
