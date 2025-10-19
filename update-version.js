#!/usr/bin/env node

/**
 * Cache Busting Version Updater
 * 
 * This script automatically updates version numbers in index.html
 * to bust browser caches when script.js or styles.css are modified.
 * 
 * Usage: node update-version.js
 * 
 * Add to package.json scripts:
 * "prebuild": "node update-version.js"
 * "prestart": "node update-version.js"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get file hashes
function getFileHash(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return 'unknown';
    }
}

// Update version in HTML
function updateVersionInHTML() {
    const indexPath = path.join(__dirname, 'index.html');
    const scriptPath = path.join(__dirname, 'script.js');
    const stylesPath = path.join(__dirname, 'styles.css');

    try {
        let html = fs.readFileSync(indexPath, 'utf8');

        // Get hashes for cache busting
        const scriptHash = getFileHash(scriptPath);
        const stylesHash = getFileHash(stylesPath);

        // Update script.js version
        html = html.replace(
            /src="script\.js\?v=[^"]*"/,
            `src="script.js?v=${scriptHash}"`
        );

        // Update styles.css version
        html = html.replace(
            /href="styles\.css\?v=[^"]*"/,
            `href="styles.css?v=${stylesHash}"`
        );

        fs.writeFileSync(indexPath, html, 'utf8');
        console.log('✓ Cache busting versions updated');
        console.log(`  script.js: v=${scriptHash}`);
        console.log(`  styles.css: v=${stylesHash}`);
    } catch (error) {
        console.error('Error updating versions:', error.message);
        process.exit(1);
    }
}

// Run the update
updateVersionInHTML();