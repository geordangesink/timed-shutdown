#!/bin/bash

# Script to extract installers from zipped artifacts
# This is useful if electron-builder creates zip files that need to be extracted

set -e

DIST_DIR="dist"
ARTIFACTS_DIR="artifacts"

echo "🔍 Looking for installers in $DIST_DIR..."

# Create artifacts directory
mkdir -p "$ARTIFACTS_DIR"

# Function to extract and copy installers from zip
extract_from_zip() {
    local zip_file="$1"
    echo "📦 Extracting $zip_file..."
    
    # Create temp directory for extraction
    TEMP_DIR=$(mktemp -d)
    unzip -q "$zip_file" -d "$TEMP_DIR" || return 1
    
    # Find installers in extracted folder
    find "$TEMP_DIR" -type f \( \
        -name "*.exe" -o \
        -name "*.dmg" -o \
        -name "*.pkg" -o \
        -name "*.AppImage" -o \
        -name "*.deb" -o \
        -name "*.rpm" \
    \) | while read -r installer; do
        filename=$(basename "$installer")
        echo "  ✓ Found: $filename"
        cp "$installer" "$ARTIFACTS_DIR/"
    done
    
    rm -rf "$TEMP_DIR"
}

# Process zip files
if ls "$DIST_DIR"/*.zip 1> /dev/null 2>&1; then
    for zip in "$DIST_DIR"/*.zip; do
        extract_from_zip "$zip"
    done
fi

# Copy direct installers (not in zip files)
echo "📋 Copying direct installers..."
for ext in exe dmg pkg AppImage deb rpm; do
    if ls "$DIST_DIR"/*.$ext 1> /dev/null 2>&1; then
        for file in "$DIST_DIR"/*.$ext; do
            filename=$(basename "$file")
            echo "  ✓ Copying: $filename"
            cp "$file" "$ARTIFACTS_DIR/"
        done
    fi
done

# List final artifacts
echo ""
echo "✅ Installers ready in $ARTIFACTS_DIR/:"
ls -lh "$ARTIFACTS_DIR"/

