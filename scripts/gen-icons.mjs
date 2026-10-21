// Generates the PWA icons: a plain bold "P" in a circle (subway-bullet style).
// Pure Node (no deps): supersampled rasterizer + minimal PNG encoder.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const INK = [0x11, 0x11, 0x11];
const PAPER = [0xf6, 0xf6, 0xf4];

// Glyph in a 100-unit design box where the circle is centred at (50,50) with radius 42.
function inP(x, y) {
  x += 1; // optical centring
  const stem = x >= 36 && x <= 47 && y >= 28 && y <= 72;
  const outer = (x >= 36 && x <= 52 && y >= 28 && y <= 56) || (x >= 52 && (x - 52) ** 2 + (y - 42) ** 2 <= 14 ** 2);
  const inner = (x >= 47 && x <= 52 && y >= 37 && y <= 47) || (x >= 52 && (x - 52) ** 2 + (y - 42) ** 2 <= 5 ** 2);
  return stem || (outer && !inner);
}

/** circleR: circle radius as a fraction of half the icon size. bg: square fill or null (transparent). */
function render(size, { circleR, bg }) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  const R = (size / 2) * circleR;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let circ = 0, glyph = 0;
      for (let sj = 0; sj < SS; sj++) {
        for (let si = 0; si < SS; si++) {
          const x = i + (si + 0.5) / SS - size / 2;
          const y = j + (sj + 0.5) / SS - size / 2;
          if (x * x + y * y <= R * R) {
            circ++;
            if (inP(50 + (x * 42) / R, 50 + (y * 42) / R)) glyph++;
          }
        }
      }
      const n = SS * SS;
      const c = circ / n, g = glyph / n;
      // Composite: background → ink circle → paper glyph.
      let rgb = bg ? [...bg] : [...INK];
      let a = bg ? 1 : c;
      const mix = (from, to, t) => from.map((v, k) => v + (to[k] - v) * t);
      if (bg) rgb = mix(rgb, INK, c);
      if (c > 0) rgb = mix(rgb, PAPER, bg ? g : g / c);
      const o = (j * size + i) * 4;
      px[o] = Math.round(rgb[0]); px[o + 1] = Math.round(rgb[1]); px[o + 2] = Math.round(rgb[2]);
      px[o + 3] = Math.round(a * 255);
    }
  }
  return png(size, px);
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/', import.meta.url);
mkdirSync(new URL('icons/', out), { recursive: true });
const files = {
  'icons/icon-192.png': render(192, { circleR: 1, bg: null }),
  'icons/icon-512.png': render(512, { circleR: 1, bg: null }),
  'icons/maskable-512.png': render(512, { circleR: 0.72, bg: PAPER }),
  'apple-touch-icon.png': render(180, { circleR: 0.84, bg: PAPER }),
};
for (const [name, buf] of Object.entries(files)) writeFileSync(new URL(name, out), buf);

// Vector favicon from the same geometry.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#111"/><g transform="translate(50 50) scale(${50 / 42}) translate(-51 -50)"><path fill="#F6F6F4" fill-rule="evenodd" d="M36 28H52A14 14 0 0 1 52 56H47V72H36ZM47 37H52A5 5 0 0 1 52 47H47Z"/></g></svg>\n`;
writeFileSync(new URL('favicon.svg', out), svg);
console.log('icons written:', Object.keys(files).join(', '), 'favicon.svg');
