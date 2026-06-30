const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const targetDir = path.resolve(root, process.argv[2] || "dist-web/assets");
const minBytes = 1024;
const gifMaxWidth = 1280;
const gifColours = 96;

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (/\.(png|gif)$/i.test(entry.name)) files.push(fullPath);
  }
  return files;
}

async function optimizePng(filePath) {
  const original = fs.readFileSync(filePath);
  if (original.length < minBytes) return { changed: false, before: original.length, after: original.length };

  const optimized = await sharp(original, { animated: false })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10
    })
    .toBuffer();

  if (optimized.length >= original.length) {
    return { changed: false, before: original.length, after: original.length };
  }

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, optimized);
  fs.renameSync(tempPath, filePath);
  return { changed: true, before: original.length, after: optimized.length };
}

function targetFrameCountForGif(filePath, pages) {
  const fileName = path.basename(filePath).toLowerCase();
  if (fileName === "mapa_idle_animado_barquinho_agua_vento.gif") return Math.min(pages, 24);
  if (pages >= 16) return 9;
  return pages;
}

function selectGifPages(pages, targetFrames) {
  const selected = [];
  for (let index = 0; index < targetFrames; index += 1) {
    const page = Math.floor((index * pages) / targetFrames);
    if (!selected.includes(page)) selected.push(page);
  }
  return selected;
}

async function optimizeGif(filePath) {
  const original = fs.readFileSync(filePath);
  if (original.length < minBytes) return { changed: false, before: original.length, after: original.length, pagesBefore: 0, pagesAfter: 0 };

  const metadata = await sharp(original, { animated: true, limitInputPixels: false }).metadata();
  const pages = Number(metadata.pages || 1);
  const pageHeight = Number(metadata.pageHeight || metadata.height || 0);
  const width = Number(metadata.width || 0);
  if (pages <= 1 || !pageHeight || !width) return { changed: false, before: original.length, after: original.length, pagesBefore: pages, pagesAfter: pages };

  const targetWidth = Math.min(width, gifMaxWidth);
  const targetHeight = Math.max(1, Math.round(pageHeight * (targetWidth / width)));
  const selectedPages = selectGifPages(pages, targetFrameCountForGif(filePath, pages));

  const frames = [];
  const delays = [];
  for (let index = 0; index < selectedPages.length; index += 1) {
    const page = selectedPages[index];
    const nextPage = selectedPages[index + 1] ?? pages;
    let delay = 0;
    for (let frame = page; frame < nextPage; frame += 1) {
      delay += Number(metadata.delay?.[frame] || metadata.delay?.[0] || 100);
    }
    delays.push(Math.max(20, Math.min(65535, delay)));

    const frameBuffer = await sharp(original, { page, pages: 1, limitInputPixels: false })
      .resize({ width: targetWidth, height: targetHeight, fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer();
    frames.push(frameBuffer);
  }

  const optimized = await sharp(Buffer.concat(frames), {
    raw: {
      width: targetWidth,
      height: targetHeight * selectedPages.length,
      channels: 4,
      pageHeight: targetHeight
    },
    limitInputPixels: false
  })
    .gif({
      loop: Number.isInteger(metadata.loop) ? metadata.loop : 0,
      delay: delays,
      colours: gifColours,
      effort: 10,
      dither: 0.6
    })
    .toBuffer();

  if (optimized.length >= original.length) {
    return { changed: false, before: original.length, after: original.length, pagesBefore: pages, pagesAfter: pages };
  }

  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, optimized);
  fs.renameSync(tempPath, filePath);
  return {
    changed: true,
    before: original.length,
    after: optimized.length,
    pagesBefore: pages,
    pagesAfter: selectedPages.length
  };
}

async function main() {
  const files = walk(targetDir);
  const pngFiles = files.filter(file => /\.png$/i.test(file));
  const gifFiles = files.filter(file => /\.gif$/i.test(file));
  let pngChanged = 0;
  let pngBefore = 0;
  let pngAfter = 0;
  let gifChanged = 0;
  let gifBefore = 0;
  let gifAfter = 0;

  for (const file of pngFiles) {
    const result = await optimizePng(file);
    pngBefore += result.before;
    pngAfter += result.after;
    if (result.changed) pngChanged += 1;
  }

  for (const file of gifFiles) {
    const result = await optimizeGif(file);
    gifBefore += result.before;
    gifAfter += result.after;
    if (result.changed) gifChanged += 1;
  }

  const pngSaved = pngBefore - pngAfter;
  const pngPercent = pngBefore ? ((pngSaved / pngBefore) * 100).toFixed(1) : "0.0";
  console.log(`PNGs otimizados: ${pngChanged}/${pngFiles.length}. Economia: ${(pngSaved / 1024 / 1024).toFixed(1)} MB (${pngPercent}%).`);

  const gifSaved = gifBefore - gifAfter;
  const gifPercent = gifBefore ? ((gifSaved / gifBefore) * 100).toFixed(1) : "0.0";
  console.log(`GIFs otimizados: ${gifChanged}/${gifFiles.length}. Economia: ${(gifSaved / 1024 / 1024).toFixed(1)} MB (${gifPercent}%).`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
