const sharp = require('sharp');

// Create an SVG with a lightning bolt and chart design
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3498db;stop-opacity:1" />
        </linearGradient>
    </defs>
    
    <!-- Background circle -->
    <circle cx="256" cy="256" r="240" fill="url(#grad)" />
    
    <!-- Lightning bolt -->
    <path d="M280 120 L160 280 L240 280 L200 392 L360 220 L280 220 L320 120 Z" 
          fill="#f1c40f" 
          stroke="#fff" 
          stroke-width="8"/>
    
    <!-- Price chart lines -->
    <path d="M160 340 Q200 300 240 320 T320 280 T400 260" 
          fill="none" 
          stroke="#fff" 
          stroke-width="8" 
          stroke-linecap="round"/>
</svg>
`;

// Convert SVG to PNG
sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .toFile('icon-source.png')
    .then(() => {
        console.log('✅ Source icon created successfully!');
        console.log('Now you can run: node generate-icons.js icon-source.png');
    })
    .catch(err => {
        console.error('❌ Error creating source icon:', err);
    }); 