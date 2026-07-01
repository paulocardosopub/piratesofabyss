const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = String(packageData.version || "").trim();

if (!version) {
  throw new Error("Versao do package.json nao encontrada.");
}

if (!fs.existsSync(releaseDir)) {
  console.log("Pasta release ainda nao existe.");
  process.exit(0);
}

const currentSetup = `Pirates-of-the-Abyss-Setup-${version}-x64.exe`;
const latestSetup = "Pirates-of-the-Abyss-Setup-latest-x64.exe";
const keep = new Set([
  "latest.yml",
  currentSetup,
  `${currentSetup}.blockmap`,
  `Pirates-of-the-Abyss-${version}-x64-portable.exe`,
  latestSetup
]);
const releaseArtifactPattern = /^Pirates-of-the-Abyss-(?:Setup-(?:latest|\d+\.\d+\.\d+)-x64\.exe(?:\.blockmap)?|\d+\.\d+\.\d+-x64-portable\.exe)$/;
const deleted = [];

for (const entry of fs.readdirSync(releaseDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!releaseArtifactPattern.test(entry.name)) continue;
  if (keep.has(entry.name)) continue;
  fs.rmSync(path.join(releaseDir, entry.name), { force: true });
  deleted.push(entry.name);
}

const currentSetupPath = path.join(releaseDir, currentSetup);
const latestSetupPath = path.join(releaseDir, latestSetup);
if (fs.existsSync(currentSetupPath)) {
  fs.copyFileSync(currentSetupPath, latestSetupPath);
} else if (fs.existsSync(latestSetupPath)) {
  fs.rmSync(latestSetupPath, { force: true });
  deleted.push(latestSetup);
}

if (deleted.length) {
  console.log(`Artifacts antigos removidos: ${deleted.join(", ")}`);
} else {
  console.log("Nenhum artifact antigo para remover.");
}
