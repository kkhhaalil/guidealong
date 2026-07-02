#!/usr/bin/env node
/**
 * Generate solid-color PWA icons (192 + 512) without native deps.
 * Writes raw PNG with minimal IHDR/IDAT/IEND chunks (single RGBA color).
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../public/icons');

// Yellowstone geyser teal #1a6b5c
const R = 0x1a;
const G = 0x6b;
const B = 0x5c;
const A = 0xff;

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function solidPng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const row = Buffer.alloc(1 + size * 4);
  for (let x = 0; x < size; x++) {
    const o = 1 + x * 4;
    row[o] = R;
    row[o + 1] = G;
    row[o + 2] = B;
    row[o + 3] = A;
  }
  const raw = Buffer.alloc((1 + size * 4) * size);
  for (let y = 0; y < size; y++) row.copy(raw, y * row.length);
  const compressed = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(outDir, { recursive: true });
for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  await writeFile(file, solidPng(size));
  console.log(`wrote ${file} (${size}x${size})`);
}
