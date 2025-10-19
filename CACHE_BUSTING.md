# Cache Busting Solution

## Problem
Browser caching was preventing users from seeing updates to `script.js` and `styles.css` when they refreshed the page. Even with cache control meta tags in the HTML, browsers would still serve cached versions of these files.

## Solution
This project implements **cache busting** using file hash-based version parameters in the script and stylesheet URLs.

### How It Works

1. **Automatic Version Generation**: The `update-version.js` script generates MD5 hashes of `script.js` and `styles.css`
2. **URL Parameters**: These hashes are appended as query parameters to the file URLs in `index.html`:
   ```html
   <link rel="stylesheet" href="styles.css?v=a1b2c3d4">
   <script src="script.js?v=e5f6g7h8"></script>
   ```
3. **Cache Invalidation**: When either file changes, its hash changes, forcing browsers to download the new version
4. **Automatic Updates**: The script runs automatically before builds and starts

### Usage

#### Manual Update
```bash
npm run update-version
```

#### Automatic Updates
The script runs automatically before:
- `npm run prebuild` - Before any build process
- `npm run prestart` - Before starting the development server

#### For GitHub Pages / CI/CD
Add this to your deployment workflow before pushing:
```bash
node update-version.js
```

### Implementation Details

**File**: `update-version.js`
- Reads `script.js` and `styles.css`
- Generates 8-character MD5 hashes
- Updates `index.html` with new version parameters
- Logs the updated versions

**Modified Files**:
- `index.html`: Added `?v=` parameters to stylesheet and script tags
- `package.json`: Added npm scripts for automatic version updates

### Benefits

✅ **Automatic**: No manual version management needed
✅ **Reliable**: Hash-based versioning ensures accuracy
✅ **Transparent**: Users always get the latest code
✅ **Simple**: Works with any hosting platform
✅ **No Server Config**: No special server configuration required

### Example Workflow

1. You update `script.js` with bug fixes or new features
2. Before deploying, run: `npm run update-version`
3. The script generates a new hash for `script.js`
4. `index.html` is updated with the new version parameter
5. Users' browsers detect the new URL and download the updated file
6. No more stale cache issues!

### Verification

To verify the cache busting is working:

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Check the `script.js` and `styles.css` requests
5. You should see the `?v=` parameter in the URL
6. Each time you update the files and run `update-version`, the parameter changes

### Troubleshooting

**Issue**: Version parameters not updating
- **Solution**: Make sure you run `npm run update-version` after making changes

**Issue**: Users still seeing old version
- **Solution**: 
  - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
  - Clear browser cache
  - Wait for service worker to update (if using PWA)

**Issue**: Script not finding files
- **Solution**: Ensure `update-version.js` is in the project root directory alongside `index.html`, `script.js`, and `styles.css`