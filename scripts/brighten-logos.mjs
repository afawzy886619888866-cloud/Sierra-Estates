import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const srcDir = 'C:/Users/Sierr/.gemini/antigravity/brain/4f24c6b2-8a5e-412c-86f8-7dbfc95f1c77/.user_uploaded';
const destDir = 'apps/sierra-estates-realty/public/assets';

const srcLight = path.join(srcDir, 'media_1793847025044_28ea4041.jpg');
const srcDark = path.join(srcDir, 'media_1793847025056_8e11ca74.jpg');
const srcShield = path.join(srcDir, 'media_1793847025063_3434b006.jpg');

async function brighten() {
  console.log('Applying +20% brightness to all Sierra Estates logo assets...');

  // 1. Brighten Shield Emblem (20% brighter)
  const shieldBrightBuffer = await sharp(srcShield)
    .modulate({ brightness: 1.2, saturation: 1.05 })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(destDir, 'logo-shield.png'), shieldBrightBuffer);
  fs.writeFileSync(path.join(destDir, 'logo-mark.png'), shieldBrightBuffer);
  fs.writeFileSync(path.join(destDir, 'logo-gold.png'), shieldBrightBuffer);
  fs.writeFileSync(path.join(destDir, 'aistudio/8e9559f6f_image__1__4350f848.png'), shieldBrightBuffer);

  // 96x96 and 32x32 scaled variants
  const mark96 = await sharp(shieldBrightBuffer).resize(96, 96, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(destDir, 'logo-mark-96.png'), mark96);

  const mark32 = await sharp(shieldBrightBuffer).resize(32, 32, { fit: 'contain' }).png().toBuffer();
  fs.writeFileSync(path.join(destDir, 'logo-small.png'), mark32);

  // 2. Brighten Dark Edition (20% brighter)
  const darkBrightBuffer = await sharp(srcDark)
    .modulate({ brightness: 1.2, saturation: 1.05 })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(destDir, 'logo-dark.png'), darkBrightBuffer);
  fs.writeFileSync(path.join(destDir, 'sierra-estates-official-logo.png'), darkBrightBuffer);
  fs.writeFileSync(path.join(destDir, 'aistudio/Image_1_dark_4k.jpeg'), darkBrightBuffer);

  // 3. Brighten Light Edition (20% brighter)
  const lightBrightBuffer = await sharp(srcLight)
    .modulate({ brightness: 1.2, saturation: 1.05 })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(destDir, 'logo-light.png'), lightBrightBuffer);

  console.log('✅ All logo assets successfully brightened by +20%!');
}

brighten().catch(console.error);
