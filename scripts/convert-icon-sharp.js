// Run this with: node scripts/convert-icon-sharp.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error('SVG file not found:', svgPath);
  process.exit(1);
}

// Sizes needed for different platforms
const sizes = {
  'icon.png': 512,      // Main icon
  'icon-16.png': 16,
  'icon-32.png': 32,
  'icon-48.png': 48,
  'icon-64.png': 64,
  'icon-128.png': 128,
  'tray-icon.png': 256  // Tray icon (will be resized in code)
};

// Convert SVG to PNG for each size
Promise.all(
  Object.entries(sizes).map(async ([filename, size]) => {
    try {
      const outputPath = path.join(__dirname, '../assets', filename);
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`Created ${filename} (${size}x${size})`);
    } catch (error) {
      console.error(`Failed to create ${filename}:`, error.message);
    }
  })
).then(() => {
  console.log('Icon conversion complete!');
}).catch(error => {
  console.error('Conversion failed:', error);
  process.exit(1);
});

