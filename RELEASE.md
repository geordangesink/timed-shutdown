# Release Process

This guide explains how to create releases with installers automatically uploaded to GitHub Releases.

## Automatic Release (GitHub Actions)

When you push a tag like `v1.0.2`, GitHub Actions will automatically:

1. Build the app for all platforms (Windows, macOS, Linux)
2. Extract installers from any zip files
3. Create a GitHub Release with all installers attached

### Steps:

1. **Update version in `package.json`**:
   ```json
   {
     "version": "1.0.2"
   }
   ```

2. **Commit and push**:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.0.2"
   git push
   ```

3. **Create and push a tag**:
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```

4. **GitHub Actions will automatically**:
   - Build for all platforms
   - Extract installers
   - Create a release with installers attached

## Manual Release (Local)

If you prefer to build locally and upload manually:

### Option 1: Using the script

1. **Build for all platforms**:
   ```bash
   npm run build:all
   ```

2. **Extract installers** (if they're in zip files):
   ```bash
   npm run extract-installers
   ```

3. **Upload to GitHub Releases**:
   ```bash
   npm run release v1.0.2
   ```

### Option 2: Manual upload

1. **Build and extract** (same as above)

2. **Create release on GitHub**:
   - Go to your repository on GitHub
   - Click "Releases" → "Create a new release"
   - Tag: `v1.0.2`
   - Upload files from `artifacts/` directory

## Installer Files

The build process creates these installer files:

- **Windows**: `Timed Shutdown Setup X.X.X.exe` (NSIS installer)
- **macOS**: `Timed Shutdown-X.X.X.dmg` (or `.pkg`)
- **Linux**: `Timed Shutdown-X.X.X.AppImage`

These are the **unzipped installers** - ready for direct download from GitHub Releases.

## Website Integration

Once installers are uploaded to GitHub Releases, the website will automatically use them:

1. Update `lib/download-config.ts` with your GitHub username and repo
2. Update `lib/versions-server.ts` with the installer filenames
3. The website will generate download URLs like:
   ```
   https://github.com/USERNAME/REPO/releases/download/v1.0.2/Timed-Shutdown-Setup-1.0.2.exe
   ```

## Notes

- **Tags must start with `v`**: `v1.0.2`, not `1.0.2`
- **Version in package.json**: Should match the tag (without `v`)
- **Installers are unzipped**: The scripts extract installers from zip files if needed
- **Direct downloads**: GitHub Releases provides direct download links (no redirect pages)

