const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist-web");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const runtimeFiles = [
  ".nojekyll",
  "index.html",
  "styles.css",
  "game.js",
  "auth.js",
  "version.js",
  "online-config.js",
  "service-worker.js",
  "manifest.webmanifest",
  "icon.svg"
];
const runtimeDirectories = ["assets"];
const buildOnlyExcludes = [
  "assets/ui/icon_ataque_especial.png",
  "assets/ui/icon_avancar_mapa.png",
  "assets/ui/icon_boss.png",
  "assets/ui/icon_reparos_emergencia.png",
  "assets/ui/icon_retroceder_mapa.png",
  "assets/ui/icon_upgrade_equipamento_recomendado.png",
  "assets/ui/icon_upgrade_melhoria_recomendada.png"
];

try {
  fs.rmSync(output, { recursive: true, force: true });
} catch (error) {
  if (error?.code !== "EPERM" && error?.code !== "EBUSY") throw error;
  console.warn(`Nao foi possivel recriar ${path.relative(root, output)}; os arquivos existentes serao sobrescritos.`);
}
fs.mkdirSync(output, { recursive: true });

for (const file of runtimeFiles) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, file));
}

fs.writeFileSync(
  path.join(output, "version.js"),
  `window.PIRATES_APP_VERSION = ${JSON.stringify(packageData.version || "0.0.0")};\n`
);

for (const directory of runtimeDirectories) {
  const source = path.join(root, directory);
  const target = path.join(output, directory);
  if (fs.existsSync(source)) fs.cpSync(source, target, { recursive: true });
}

for (const relativePath of buildOnlyExcludes) {
  fs.rmSync(path.join(output, relativePath), { force: true });
}

console.log(`Build web pronto em ${path.relative(root, output)}`);
