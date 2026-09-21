import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const sourceSvg = resolve(projectRoot, 'public/icons/icon.svg');
const outputDir = resolve(projectRoot, 'public/icons');

// Icon sizes needed based on manifest.json and layout.tsx
const iconSizes = [
  // Standard PWA icons from manifest.json
  { name: 'icon-72.png', size: 72, purpose: 'any' },
  { name: 'icon-96.png', size: 96, purpose: 'any' },
  { name: 'icon-128.png', size: 128, purpose: 'any' },
  { name: 'icon-144.png', size: 144, purpose: 'any' },
  { name: 'icon-152.png', size: 152, purpose: 'any' },
  { name: 'icon-192.png', size: 192, purpose: 'any maskable' },
  { name: 'icon-384.png', size: 384, purpose: 'any' },
  { name: 'icon-512.png', size: 512, purpose: 'any maskable' },
  // Apple touch icon (referenced in layout.tsx and manifest.json)
  { name: 'apple-touch-icon.png', size: 180, purpose: 'any' },
  // Badge icon (referenced in manifest.json)
  { name: 'badge-72.png', size: 72, purpose: 'any' },
  // Additional icons found in public/icons/ (not directly referenced but existed)
  { name: 'icon-180.png', size: 180, purpose: 'any' },
  // Maskable variants (separate files that existed)
  { name: 'icon-192-maskable.png', size: 192, purpose: 'maskable', maskable: true },
  { name: 'icon-512-maskable.png', size: 512, purpose: 'maskable', maskable: true },
];

async function generateIcons() {
  console.log('Generating icons from:', sourceSvg);
  console.log('Output directory:', outputDir);

  if (!existsSync(sourceSvg)) {
    console.error('Source SVG not found:', sourceSvg);
    process.exit(1);
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Read SVG content to check it's valid
  const svgBuffer = await sharp(sourceSvg).toBuffer();
  console.log('Source SVG loaded, size:', svgBuffer.length, 'bytes');

  for (const icon of iconSizes) {
    const outputPath = resolve(outputDir, icon.name);

    try {
      let pipeline = sharp(sourceSvg)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
        });

      // For maskable icons, add safe zone padding (content should be within 80% of the image)
      if (icon.maskable) {
        const safeZoneRatio = 0.8; // Content fits in 80% of the image
        const contentSize = Math.round(icon.size * safeZoneRatio);
        const padding = Math.floor((icon.size - contentSize) / 2);

        pipeline = pipeline.resize(contentSize, contentSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        }).extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        });
      }

      await pipeline.png().toFile(outputPath);
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${icon.name}:`, error.message);
    }
  }

  console.log('\nIcon generation complete!');
}

generateIcons().catch(console.error);