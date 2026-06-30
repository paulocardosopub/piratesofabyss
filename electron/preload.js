const { contextBridge } = require("electron");

const versionArgument = process.argv.find(argument => argument.startsWith("--pirates-version="));
const version = versionArgument ? decodeURIComponent(versionArgument.slice("--pirates-version=".length)) : "";

contextBridge.exposeInMainWorld("PiratesDesktop", {
  isDesktop: true,
  platform: process.platform,
  version
});
