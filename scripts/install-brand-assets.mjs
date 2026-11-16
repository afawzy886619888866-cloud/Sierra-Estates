import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoSrc = 'C:/Users/Sierr/.gemini/antigravity/brain/4f24c6b2-8a5e-412c-86f8-7dbfc95f1c77/.user_uploaded/media_1793985861052_571eef3e.jpg';
const heroSrc = 'C:/Users/Sierr/.gemini/antigravity/brain/4f24c6b2-8a5e-412c-86f8-7dbfc95f1c77/.user_uploaded/media_1793985861063_684e78a4.jpg';

const assetsDir = path.resolve(__dirname, '../apps/sierra-estates-realty/public/assets');
const heroDir = path.resolve(__dirname, '../apps/sierra-estates-realty/public/hero');

async function processAssets() {
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  if (!fs.existsSync(heroDir)) fs.mkdirSync(heroDir, { recursive: true });

  console.log('[brand] Processing Sierra Estates Shield Logo...');
  fs.copyFileSync(logoSrc, path.join(assetsDir, 'sierra-shield-logo.jpg'));
  await sharp(logoSrc)
    .png({ quality: 100 })
    .toFile(path.join(assetsDir, 'sierra-shield-logo.png'));

  await sharp(logoSrc)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(assetsDir, 'logo-shield.png'));

  await sharp(logoSrc)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(assetsDir, 'logo-light.png'));

  await sharp(logoSrc)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(assetsDir, 'sierra-estates-official-logo.png'));

  // Shield mark crop (top 77% height)
  await sharp(logoSrc)
    .extract({ left: 160, top: 40, width: 704, height: 750 })
    .resize(180, 192, { fit: 'contain' })
    .png()
    .toFile(path.join(assetsDir, 'logo-mark.png'));

  await sharp(logoSrc)
    .extract({ left: 160, top: 40, width: 704, height: 750 })
    .resize(96, 96, { fit: 'cover' })
    .png()
    .toFile(path.join(assetsDir, 'logo-mark-96.png'));

  console.log('[brand] Logo assets generated in public/assets/');

  console.log('[hero] Processing Hero Architectural Image...');
  fs.copyFileSync(heroSrc, path.join(heroDir, 'hero-sierra-luxury-ai.jpg'));

  await sharp(heroSrc)
    .webp({ quality: 92 })
    .toFile(path.join(heroDir, 'hero-sierra-luxury-ai.webp'));

  const origHero01 = path.join(heroDir, 'hero-01.webp');
  const backupHero01 = path.join(heroDir, 'hero-01.backup.webp');
  if (fs.existsSync(origHero01) && !fs.existsSync(backupHero01)) {
    fs.copyFileSync(origHero01, backupHero01);
  }

  await sharp(heroSrc)
    .webp({ quality: 92 })
    .toFile(origHero01);

  await sharp(heroSrc)
    .jpeg({ quality: 92 })
    .toFile(path.join(heroDir, 'hero-01.jpg'));

  console.log('[hero] Hero assets generated in public/hero/');
}

processAssets().catch((err) => {
  console.error('[brand] Error:', err);
  process.exit(1);
});
