#!/usr/bin/env node
/**
 * Generate PWA icons from public/icons/icon.svg
 * Run with: node scripts/generate-icons.mjs
 * Requires: sharp (already a devDependency)
 */

import { promises as fs } from 'fs';
import path from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(process.cwd(), 'public/icons/icon.svg');
const OUTPUT_DIR = path.join(process.cwd(), 'public/icons');

async function generateIcons() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp not installed. Run: npm install sharp --save-dev');
    process.exitCode = 1;
    return;
  }

  const svgBuffer = await fs.readFile(INPUT_SVG);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`Generated ${outputPath}`);
  }

  // Maskable versions: artwork scaled to 80% inside a full-bleed square,
  // so launchers can crop to any shape without cutting the glyph.
  for (const size of [192, 512]) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}-maskable.png`);
    const padding = Math.floor(size * 0.1);
    await sharp(svgBuffer)
      .resize(Math.floor(size * 0.8), Math.floor(size * 0.8), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated ${outputPath} (maskable)`);
  }

  // Notification badge (must be monochrome-friendly; 72x72 is the spec max)
  const badgePath = path.join(OUTPUT_DIR, 'badge-72.png');
  await sharp(svgBuffer).resize(72, 72).png().toFile(badgePath);
  console.log(`Generated ${badgePath}`);

  // Apple touch icon (iOS home-screen icon size)
  const applePath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
  await sharp(svgBuffer).resize(180, 180).png().toFile(applePath);
  console.log(`Generated ${applePath}`);

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((error) => {
  console.error('Error generating icons:', error);
  process.exitCode = 1;
});
