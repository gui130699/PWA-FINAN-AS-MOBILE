/**
 * Gera ícone PWA full-bleed via Playwright (fundo sólido, sem cantos brancos).
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

function buildHtml(size) {
  const s = size / 512
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
canvas { display: block; }
</style></head>
<body>
<canvas id="c" width="${size}" height="${size}"></canvas>
<script>
const size = ${size};
const s = ${s};
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// Fundo sólido full-bleed (sem rounded corners no PNG)
const bgGrad = ctx.createLinearGradient(0, 0, size, size);
bgGrad.addColorStop(0, '#0e2241');
bgGrad.addColorStop(1, '#0f3460');
ctx.fillStyle = bgGrad;
ctx.fillRect(0, 0, size, size);

const barW = 90 * s;
const baseY = 400 * s;
const bars = [
  { x: 72 * s, h: 140 * s, color: '#22c55e' },
  { x: 211 * s, h: 240 * s, color: '#16a34a' },
  { x: 350 * s, h: 310 * s, color: '#15803d' },
];

for (const { x, h, color } of bars) {
  const grad = ctx.createLinearGradient(x, baseY - h, x, baseY);
  grad.addColorStop(0, color);
  grad.addColorStop(1, color + '99');
  ctx.fillStyle = grad;
  const r = 12 * s;
  ctx.beginPath();
  ctx.moveTo(x + r, baseY - h);
  ctx.lineTo(x + barW - r, baseY - h);
  ctx.quadraticCurveTo(x + barW, baseY - h, x + barW, baseY - h + r);
  ctx.lineTo(x + barW, baseY);
  ctx.lineTo(x, baseY);
  ctx.lineTo(x, baseY - h + r);
  ctx.quadraticCurveTo(x, baseY - h, x + r, baseY - h);
  ctx.closePath();
  ctx.fill();
}

const pts = [
  [72 * s + barW / 2, (baseY - 140 * s) - 18 * s],
  [211 * s + barW / 2, (baseY - 240 * s) - 18 * s],
  [350 * s + barW / 2, (baseY - 310 * s) - 18 * s],
];
ctx.strokeStyle = '#06b6d4';
ctx.lineWidth = 8 * s;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(pts[0][0], pts[0][1]);
ctx.lineTo(pts[1][0], pts[1][1]);
ctx.lineTo(pts[2][0], pts[2][1]);
ctx.stroke();

for (const [px, py] of pts) {
  ctx.beginPath();
  ctx.arc(px, py, 10 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#06b6d4';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px, py, 5 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

const [ax, ay] = pts[2];
ctx.fillStyle = '#06b6d4';
ctx.beginPath();
ctx.moveTo(ax + 22 * s, ay - 22 * s);
ctx.lineTo(ax + 4 * s, ay - 22 * s);
ctx.lineTo(ax + 22 * s, ay - 4 * s);
ctx.closePath();
ctx.fill();

document.title = 'done';
</script>
</body>
</html>`
}

const publicDir = path.resolve('public')
const browser = await chromium.launch()

async function capture(size, filename) {
  const page = await browser.newPage()
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(buildHtml(size))
  await page.waitForFunction(() => document.title === 'done')
  // screenshot do canvas element — sem fundo branco do body
  const canvas = await page.$('canvas')
  const buf = await canvas.screenshot({ omitBackground: true })
  fs.writeFileSync(path.join(publicDir, filename), buf)
  console.log(`✓ ${filename} (${size}x${size})`)
  await page.close()
}

await capture(512, 'pwa-512x512.png')
await capture(192, 'pwa-192x192.png')
await capture(180, 'apple-touch-icon.png')

await browser.close()
console.log('Ícones gerados com sucesso!')

