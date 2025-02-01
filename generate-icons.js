const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Icon sizes needed for PWA
const ICON_SIZES = [
    16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512
];

// Ensure the icons directory exists
async function ensureIconsDirectory() {
    const iconDir = path.join(__dirname, 'icons');
    try {
        await fs.access(iconDir);
    } catch {
        await fs.mkdir(iconDir);
    }
    return iconDir;
}

// Generate icons for all sizes
async function generateIcons(sourceImage) {
    const iconDir = await ensureIconsDirectory();
    
    console.log('🎨 Generating PWA icons...');
    
    // Process each size in parallel
    await Promise.all(ICON_SIZES.map(async (size) => {
        const outputPath = path.join(iconDir, `icon-${size}x${size}.png`);
        
        try {
            await sharp(sourceImage)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(outputPath);
            
            console.log(`✅ Generated ${size}x${size} icon`);
        } catch (error) {
            console.error(`❌ Error generating ${size}x${size} icon:`, error);
        }
    }));
    
    console.log('✨ Icon generation complete!');
}

// Check if source image is provided
const sourceImage = process.argv[2];
if (!sourceImage) {
    console.error('❌ Please provide a source image path!');
    console.log('Usage: node generate-icons.js <path-to-source-image>');
    process.exit(1);
}

// Run the icon generation
generateIcons(sourceImage).catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
}); 