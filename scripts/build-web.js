const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist-web");
const runtimeFiles = [
  ".nojekyll",
  "index.html",
  "styles.css",
  "game.js",
  "auth.js",
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

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of runtimeFiles) {
  const source = path.join(root, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, file));
}

for (const directory of runtimeDirectories) {
  const source = path.join(root, directory);
  const target = path.join(output, directory);
  if (fs.existsSync(source)) fs.cpSync(source, target, { recursive: true });
}

for (const relativePath of buildOnlyExcludes) {
  fs.rmSync(path.join(output, relativePath), { force: true });
}

console.log(`Build web pronto em ${path.relative(root, output)}`);
