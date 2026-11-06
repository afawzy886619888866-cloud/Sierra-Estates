import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'apps/sierra-estates-realty/public/assets');
const SRC_SHIELD = 'C:/Users/Sierr/.gemini/antigravity/brain/4f24c6b2-8a5e-412c-86f8-7dbfc95f1c77/.user_uploaded/media_1793847025063_3434b006.jpg';

async function extractTransparentShield() {
  console.log('Extracting transparent shield emblem from source...');
  
  const { data, info } = await sharp(SRC_SHIELD)
    .raw()
    .toBuffer({ resolveWithObject: true });
    
  const { width, height } = info;
  const totalPixels = width * height;
  const isBackground = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels * 2);
  let qHead = 0;
  let qTail = 0;

  // Background threshold: cream-white perimeter (R>225, G>220, B>210)
  function isBgColor(r, g, b) {
    return r > 225 && g > 220 && b > 210 && Math.abs(r - g) < 20 && Math.abs(r - b) < 30;
  }

  // Push all perimeter pixels
  for (let x = 0; x < width; x++) {
    const topIdx = x;
    const botIdx = (height - 1) * width + x;
    if (isBgColor(data[topIdx * 3], data[topIdx * 3 + 1], data[topIdx * 3 + 2])) {
      isBackground[topIdx] = 1;
      queue[qTail++] = x;
      queue[qTail++] = 0;
    }
    if (isBgColor(data[botIdx * 3], data[botIdx * 3 + 1], data[botIdx * 3 + 2])) {
      isBackground[botIdx] = 1;
      queue[qTail++] = x;
      queue[qTail++] = height - 1;
    }
  }

  for (let y = 1; y < height - 1; y++) {
    const leftIdx = y * width;
    const rightIdx = y * width + width - 1;
    if (isBgColor(data[leftIdx * 3], data[leftIdx * 3 + 1], data[leftIdx * 3 + 2])) {
      isBackground[leftIdx] = 1;
      queue[qTail++] = 0;
      queue[qTail++] = y;
    }
    if (isBgColor(data[rightIdx * 3], data[rightIdx * 3 + 1], data[rightIdx * 3 + 2])) {
      isBackground[rightIdx] = 1;
      queue[qTail++] = width - 1;
      queue[qTail++] = y;
    }
  }

  // 4-way Flood Fill BFS
  while (qHead < qTail) {
    const cx = queue[qHead++];
    const cy = queue[qHead++];

    const neighbors = [
      cx + 1, cy,
      cx - 1, cy,
      cx, cy + 1,
      cx, cy - 1
    ];

    for (let i = 0; i < 8; i += 2) {
      const nx = neighbors[i];
      const ny = neighbors[i + 1];
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (isBackground[nIdx] === 0) {
          const p = nIdx * 3;
          if (isBgColor(data[p], data[p + 1], data[p + 2])) {
            isBackground[nIdx] = 1;
            queue[qTail++] = nx;
            queue[qTail++] = ny;
          }
        }
      }
    }
  }

  // Create RGBA buffer with clean anti-aliasing on edges
  const rgba = Buffer.alloc(totalPixels * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const srcP = idx * 3;
      const dstP = idx * 4;

      let r = data[srcP];
      let g = data[srcP + 1];
      let b = data[srcP + 2];

      if (isBackground[idx] === 1) {
        rgba[dstP] = 0;
        rgba[dstP + 1] = 0;
        rgba[dstP + 2] = 0;
        rgba[dstP + 3] = 0; // Fully transparent
      } else {
        // Check if adjacent to background for anti-aliasing
        let bgNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (isBackground[ny * width + nx] === 1) bgNeighbors++;
            }
          }
        }

        if (bgNeighbors > 0) {
          // De-fringe: blend edge pixels
          const alpha = Math.max(0, Math.min(255, Math.round(255 - (bgNeighbors / 8) * 140)));
          rgba[dstP] = Math.min(255, Math.round(r * 1.15));
          rgba[dstP + 1] = Math.min(255, Math.round(g * 1.15));
          rgba[dstP + 2] = Math.min(255, Math.round(b * 1.15));
          rgba[dstP + 3] = alpha;
        } else {
          // Inside shield: 20% brighter + punchy gold saturation
          rgba[dstP] = Math.min(255, Math.round(r * 1.2));
          rgba[dstP + 1] = Math.min(255, Math.round(g * 1.2));
          rgba[dstP + 2] = Math.min(255, Math.round(b * 1.2));
          rgba[dstP + 3] = 255;
        }
      }
    }
  }

  // Trim transparent padding to get centered emblem
  const shieldRaw = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 5 })
    .png()
    .toBuffer();

  return shieldRaw;
}

async function main() {
  const shieldBuffer = await extractTransparentShield();
  console.log('✅ Transparent shield extracted! Size:', shieldBuffer.length, 'bytes');

  // 1. Save core shield marks
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-shield.png'), shieldBuffer);
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-mark.png'), shieldBuffer);
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-gold.png'), shieldBuffer);
  fs.writeFileSync(path.join(ASSETS_DIR, 'aistudio/8e9559f6f_image__1__4350f848.png'), shieldBuffer);

  // Scaled marks for favicons & navbars
  const mark96 = await sharp(shieldBuffer).resize(96, 96, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-mark-96.png'), mark96);

  const mark32 = await sharp(shieldBuffer).resize(32, 32, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-small.png'), mark32);

  // 2. Generate Vertical Brand Lockup: Dark Mode (1200 x 1400, Transparent PNG)
  const darkCanvasW = 1200;
  const darkCanvasH = 1400;
  const shieldDarkSize = 750;

  const shieldDarkResized = await sharp(shieldBuffer)
    .resize(shieldDarkSize, shieldDarkSize, { fit: 'contain' })
    .toBuffer();

  const darkTypographySvg = Buffer.from(`
    <svg width="${darkCanvasW}" height="${darkCanvasH}" viewBox="0 0 ${darkCanvasW} ${darkCanvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF3D1" />
          <stop offset="40%" stop-color="#EAB308" />
          <stop offset="70%" stop-color="#D4AF37" />
          <stop offset="100%" stop-color="#A16207" />
        </linearGradient>
      </defs>

      <!-- Brand Name -->
      <text x="600" y="930" 
        font-family="'Cinzel', 'Playfair Display', 'Trajan Pro', 'Georgia', serif" 
        font-size="82" 
        font-weight="900" 
        fill="#FFFFFF" 
        text-anchor="middle" 
        letter-spacing="10">SIERRA ESTATES</text>

      <!-- Official Slogan -->
      <text x="600" y="1010" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="28" 
        font-weight="800" 
        fill="url(#goldGrad)" 
        text-anchor="middle" 
        letter-spacing="12">FUTURE OF REAL ESTATE</text>

      <!-- Domain & Authority Bar -->
      <line x1="380" y1="1065" x2="820" y2="1065" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.6" />
      <text x="600" y="1115" 
        font-family="monospace" 
        font-size="18" 
        font-weight="700" 
        fill="#38BDF8" 
        text-anchor="middle" 
        letter-spacing="4">NEW CAIRO · GOLDEN SQUARE · 2026</text>
    </svg>
  `);

  const logoDark = await sharp(darkTypographySvg)
    .composite([
      {
        input: shieldDarkResized,
        top: 80,
        left: (darkCanvasW - shieldDarkSize) / 2,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-dark.png'), logoDark);
  fs.writeFileSync(path.join(ASSETS_DIR, 'sierra-estates-official-logo.png'), logoDark);

  // 3. Generate Vertical Brand Lockup: Light Mode (1200 x 1400, Transparent PNG)
  const lightTypographySvg = Buffer.from(`
    <svg width="${darkCanvasW}" height="${darkCanvasH}" viewBox="0 0 ${darkCanvasW} ${darkCanvasH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#C2410C" />
          <stop offset="50%" stop-color="#B45309" />
          <stop offset="100%" stop-color="#78350F" />
        </linearGradient>
      </defs>

      <!-- Brand Name -->
      <text x="600" y="930" 
        font-family="'Cinzel', 'Playfair Display', 'Trajan Pro', 'Georgia', serif" 
        font-size="82" 
        font-weight="900" 
        fill="#061122" 
        text-anchor="middle" 
        letter-spacing="10">SIERRA ESTATES</text>

      <!-- Official Slogan -->
      <text x="600" y="1010" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="28" 
        font-weight="800" 
        fill="url(#bronzeGrad)" 
        text-anchor="middle" 
        letter-spacing="12">FUTURE OF REAL ESTATE</text>

      <!-- Domain & Authority Bar -->
      <line x1="380" y1="1065" x2="820" y2="1065" stroke="url(#bronzeGrad)" stroke-width="1.5" opacity="0.6" />
      <text x="600" y="1115" 
        font-family="monospace" 
        font-size="18" 
        font-weight="700" 
        fill="#0284C7" 
        text-anchor="middle" 
        letter-spacing="4">NEW CAIRO · GOLDEN SQUARE · 2026</text>
    </svg>
  `);

  const logoLight = await sharp(lightTypographySvg)
    .composite([
      {
        input: shieldDarkResized,
        top: 80,
        left: (darkCanvasW - shieldDarkSize) / 2,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-light.png'), logoLight);

  // 4. Generate Horizontal Header Lockup (1400 x 360, Transparent PNG)
  const horizW = 1400;
  const horizH = 360;
  const shieldHorizSize = 300;

  const shieldHorizResized = await sharp(shieldBuffer)
    .resize(shieldHorizSize, shieldHorizSize, { fit: 'contain' })
    .toBuffer();

  const horizDarkSvg = Buffer.from(`
    <svg width="${horizW}" height="${horizH}" viewBox="0 0 ${horizW} ${horizH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldGradH" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF3D1" />
          <stop offset="50%" stop-color="#EAB308" />
          <stop offset="100%" stop-color="#A16207" />
        </linearGradient>
      </defs>

      <text x="350" y="170" 
        font-family="'Cinzel', 'Playfair Display', serif" 
        font-size="68" 
        font-weight="900" 
        fill="#FFFFFF" 
        letter-spacing="6">SIERRA ESTATES</text>

      <text x="355" y="235" 
        font-family="'Inter', sans-serif" 
        font-size="24" 
        font-weight="800" 
        fill="url(#goldGradH)" 
        letter-spacing="10">FUTURE OF REAL ESTATE</text>

      <text x="355" y="290" 
        font-family="monospace" 
        font-size="16" 
        font-weight="700" 
        fill="#38BDF8" 
        letter-spacing="2">NEW CAIRO MASTER PLAN · 2026</text>
    </svg>
  `);

  const logoHorizDark = await sharp(horizDarkSvg)
    .composite([
      {
        input: shieldHorizResized,
        top: 30,
        left: 20,
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ASSETS_DIR, 'logo-horizontal-dark.png'), logoHorizDark);

  console.log('✅ All transparent logos, lockups, and slogan badges created successfully!');
}

main().catch(console.error);
