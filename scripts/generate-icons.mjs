/** Rebuild Draai's opaque, code-native app icons with Node only. No downloads. */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
const destination = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(destination, { recursive: true });
const colors = {
  paper: [244, 241, 233],
  ink: [41, 43, 37],
  groove: [70, 73, 63],
  coral: [227, 97, 67],
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f4f1e9"/><circle cx="256" cy="256" r="190" fill="#292b25"/><g fill="none" stroke="#46493f" stroke-width="2">${[176, 164, 151, 138, 125, 112, 99].map((r) => `<circle cx="256" cy="256" r="${r}"/>`).join("")}</g><circle cx="256" cy="256" r="72" fill="#e36143"/><circle cx="256" cy="256" r="11" fill="#f4f1e9"/></svg>\n`;
await writeFile(join(destination, "icon.svg"), svg);
await writeFile(
  fileURLToPath(new URL("../public/favicon.svg", import.meta.url)),
  svg,
);
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    body = Buffer.concat([name, data]),
    size = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([size, body, checksum]);
}
function pixel(x, y) {
  const r = Math.hypot(x - 256, y - 256);
  if (r < 11) return colors.paper;
  if (r < 72) return colors.coral;
  if (r < 190) {
    if (
      [176, 164, 151, 138, 125, 112, 99].some((ring) => Math.abs(r - ring) < 1)
    )
      return colors.groove;
    return colors.ink;
  }
  return colors.paper;
}
function raster(size) {
  const samples = 4,
    rows = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const offset = y * (1 + size * 3);
    rows[offset] = 0;
    for (let x = 0; x < size; x++) {
      const rgb = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++)
        for (let sx = 0; sx < samples; sx++) {
          const color = pixel(
            ((x + (sx + 0.5) / samples) * 512) / size,
            ((y + (sy + 0.5) / samples) * 512) / size,
          );
          for (let c = 0; c < 3; c++) rgb[c] += color[c];
        }
      for (let c = 0; c < 3; c++)
        rows[offset + 1 + x * 3 + c] = Math.round(rgb[c] / (samples * samples));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
for (const size of [32, 180, 192, 512]) {
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await writeFile(join(destination, name), raster(size));
  console.log(`${name}: ${size}×${size}, opaque RGB`);
}
