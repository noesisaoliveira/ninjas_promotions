import sharp from 'sharp';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

await sharp(fileURLToPath(new URL('../brand/mark.svg', import.meta.url))).resize(128, 128).png().toFile(fileURLToPath(new URL('../icon.png', import.meta.url)));
await sharp(fileURLToPath(new URL('../brand/logo.svg', import.meta.url))).resize(750, 250).png().toFile(fileURLToPath(new URL('../logo.png', import.meta.url)));
await copyFile(new URL('../icon.png', import.meta.url), new URL('../../icon.png', import.meta.url));
await copyFile(new URL('../logo.png', import.meta.url), new URL('../../logo.png', import.meta.url));
console.log('Generated icon.png (128x128) and logo.png (750x250).');