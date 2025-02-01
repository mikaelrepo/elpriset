const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Splash screen sizes for different iOS devices
const SPLASH_SCREENS = [
    { width: 2048, height: 2732, name: 'splash-2048x2732.png' }, // iPad Pro 12.9"
    { width: 1668, height: 2388, name: 'splash-1668x2388.png' }, // iPad Pro 11"
    { width: 1536, height: 2048, name: 'splash-1536x2048.png' }, // iPad Mini/Air
    { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS
    { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max
    { width: 828, height: 1792, name: 'splash-828x1792.png' },   // iPhone XR
    { width: 750, height: 1334, name: 'splash-750x1334.png' },   // iPhone 8/SE
];

// Create splash screen SVG template
function createSplashScreenSVG(width, height) {
    return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3498db;stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grad)"/>
            <g transform="translate(${width/2}, ${height/2})">
                <image 
                    href="icon-source.png" 
                    width="256" 
                    height="256" 
                    x="-128" 
                    y="-128"
                />
            </g>
        </svg>
    `;
}

async function generateSplashScreens() {
    // Ensure icons directory exists
    const iconDir = path.join(__dirname, 'icons');
    try {
        await fs.access(iconDir);
    } catch {
        await fs.mkdir(iconDir);
    }

    console.log('🎨 Generating splash screens...');

    // Generate each splash screen
    for (const screen of SPLASH_SCREENS) {
        const svg = createSplashScreenSVG(screen.width, screen.height);
        const outputPath = path.join(iconDir, screen.name);

        try {
            await sharp(Buffer.from(svg))
                .toFile(outputPath);
            console.log(`✅ Generated ${screen.name}`);
        } catch (error) {
            console.error(`❌ Error generating ${screen.name}:`, error);
        }
    }

    console.log('✨ Splash screen generation complete!');
}

// Run the generator
generateSplashScreens().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
}); 