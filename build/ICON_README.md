# Custom App Icon

## Current Icon

The app currently uses an SVG icon located at `build/icon.svg`. This icon features a flashcard design with a purple gradient.

## To Use a Custom Icon

### Option 1: Use the provided SVG (Recommended)
The SVG icon will be automatically converted by electron-builder during packaging.

### Option 2: Replace with your own PNG
1. Create or find a 1024x1024 PNG image
2. Save it as `build/icon.png`
3. Rebuild the app with `npm run package`

### Option 3: Use macOS ICNS format
1. Convert your icon to .icns format using:
   - Online tool: https://cloudconvert.com/png-to-icns
   - Command line: `sips -s format icns icon.png --out icon.icns`
2. Save as `build/icon.icns`
3. Rebuild with `npm run package`

## Icon Guidelines

- **Size**: 1024x1024 pixels minimum
- **Format**: PNG, ICNS, or SVG
- **Style**: Simple, clear design that works at small sizes
- **Background**: Can be transparent or solid

## Current Icon Design

The default icon features:
- Purple gradient background (#667eea to #764ba2)
- Stacked flashcard design
- Book icon for learning theme
- Modern, clean aesthetic
