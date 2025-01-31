const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir);
}

// Define the sizes we need
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32, 48];

// Create a base SVG icon with a gradient background
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3498db;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2c3e50;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#grad)" rx="100" />
    <text x="256" y="300" font-family="Arial" font-size="240" font-weight="bold" fill="white" text-anchor="middle">⚡</text>
</svg>`;

// Save the base SVG
fs.writeFileSync(path.join(__dirname, 'base-icon.svg'), svgIcon);

// Generate PNG icons in all sizes
async function generateIcons() {
    // Generate app icons
    for (const size of sizes) {
        await sharp(path.join(__dirname, 'base-icon.svg'))
            .resize(size, size)
            .png()
            .toFile(path.join(iconDir, `icon-${size}x${size}.png`));

        console.log(`Generated ${size}x${size} icon`);
    }

    // Generate favicon PNGs
    for (const size of faviconSizes) {
        await sharp(path.join(__dirname, 'base-icon.svg'))
            .resize(size, size)
            .png()
            .toFile(path.join(iconDir, `favicon-${size}x${size}.png`));

        console.log(`Generated ${size}x${size} favicon`);
    }

    // Generate favicon.ico (multi-size ICO file)
    const faviconBuffer = await sharp(path.join(__dirname, 'base-icon.svg'))
        .resize(32, 32)
        .png()
        .toBuffer();

    fs.writeFileSync(path.join(__dirname, 'favicon.ico'), faviconBuffer);
    console.log('Generated favicon.ico');
}

generateIcons().then(() => {
    console.log('All icons and favicons generated successfully!');
}).catch(err => {
    console.error('Error generating icons:', err);
}); 