const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "icon.svg");
const outputDir = path.join(root, "build");
const sizes = [16, 24, 32, 48, 64, 128, 256];

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const base = index * 16;
    directory[base] = image.size >= 256 ? 0 : image.size;
    directory[base + 1] = image.size >= 256 ? 0 : image.size;
    directory[base + 2] = 0;
    directory[base + 3] = 0;
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(image.buffer.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += image.buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map(image => image.buffer)]);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const images = [];

  for (const size of sizes) {
    const buffer = await sharp(source)
      .resize(size, size)
      .png()
      .toBuffer();
    images.push({ size, buffer });
    fs.writeFileSync(path.join(outputDir, `icon-${size}.png`), buffer);
  }

  fs.copyFileSync(path.join(outputDir, "icon-256.png"), path.join(outputDir, "icon.png"));
  fs.writeFileSync(path.join(outputDir, "icon.ico"), createIco(images));
  console.log("Icones desktop prontos em build/");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
