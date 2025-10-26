# VYBE Branding Assets Guide

This document outlines the visual assets that need to be created to complete the VYBE branding transformation.

## Required Assets

### 1. Application Icons

#### macOS (.icns format)
**Location:** `/resources/darwin/code.icns`

**Requirements:**
- Multi-resolution icon set (512x512@2x down to 16x16)
- .icns format for macOS
- Should follow Cursor.ai's minimalist aesthetic
- Recommended: Simple geometric logo in VYBE brand colors

**Creation Tool:** Use `iconutil` (macOS) or Icon Composer

#### Windows (.ico format)
**Location:** `/resources/win32/code.ico`

**Requirements:**
- Multiple sizes: 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
- .ico format for Windows
- Transparent background where appropriate

**Additional Windows Assets:**
- Tile images: `code_150x150.png`, `code_70x70.png` (already exists but needs replacement)
- Install wizard images (inno-*.bmp files in `/resources/win32/`)

#### Linux (.png format)
**Location:** `/resources/linux/code.png`

**Requirements:**
- High resolution PNG (512x512 or higher)
- Transparent background
- SVG source recommended for scalability

### 2. File Type Icons

The following file type icons should be updated to match VYBE branding:

**Locations:**
- macOS: `/resources/darwin/*.icns`
- Windows: `/resources/win32/*.ico`

**Files to update:**
- Default application icon (high priority)
- Optionally update language-specific icons (javascript.icns, python.icns, etc.) for cohesive branding

### 3. Installer Graphics (Windows)

**Location:** `/resources/win32/inno-*.bmp`

These are used in the Windows installer wizard:

**Required files:**
- `inno-big-*.bmp` - Large installer images (various DPI scales 100-250%)
- `inno-small-*.bmp` - Small installer images (various DPI scales 100-250%)

**Specifications:**
- Multiple DPI versions (100%, 125%, 150%, 175%, 200%, 225%, 250%)
- Should feature VYBE branding
- Cursor.ai style: Clean, minimal, modern aesthetic
- Big: 164x314 pixels (at 100%)
- Small: 55x55 pixels (at 100%)

### 4. Splash Screen / Welcome Graphics

**Location:** To be determined in source code

**Purpose:** Shown when VYBE first launches

**Recommendations:**
- Clean, modern design
- VYBE logo prominently displayed
- Optional: Tagline like "Agentic Application Development Interface"
- Cursor.ai aesthetic: Dark theme with accent colors

### 5. In-App Graphics

**Location:** `/src/vs/workbench/contrib/welcomeGettingStarted/common/media/`

SVG graphics used in the welcome/getting started experience:
- `multi-file-edits.svg`
- `extensions.svg`
- `extensions-web.svg`
- `settings.svg`
- `learn.svg`
- `commandPalette.svg`
- `openFolder.svg`

**Note:** These currently reference "VS Code" visually and should be updated to reflect VYBE branding

## Design Guidelines

### Cursor.ai Aesthetic

VYBE should follow Cursor.ai's design language:

1. **Color Scheme:**
   - Dark, sophisticated base colors
   - Subtle accent colors (blues, purples, or custom brand colors)
   - High contrast for accessibility
   - Modern gradients (optional)

2. **Typography:**
   - Clean, modern sans-serif fonts
   - Good readability at all sizes
   - Consistent with tech/development tools aesthetic

3. **Icon Style:**
   - Minimalist geometric shapes
   - Flat or subtle 3D effects
   - Recognizable at small sizes
   - Professional and modern

4. **General Principles:**
   - Less is more - avoid clutter
   - Focus on functionality
   - Professional appearance
   - Developer-friendly aesthetic

### Brand Colors

**To be defined by your design team. Suggested placeholder:**
- Primary: `#2D2D30` (dark gray, current VS Code base)
- Accent: Custom color for VYBE (e.g., purple, blue, teal)
- Update in `/resources/win32/VisualElementsManifest.xml` (BackgroundColor)

## Asset Creation Checklist

- [ ] Design VYBE logo concept
- [ ] Create macOS icon set (.icns)
- [ ] Create Windows icon (.ico)
- [ ] Create Linux PNG icon
- [ ] Create Windows tile images (150x150, 70x70)
- [ ] Create Windows installer graphics (all DPI versions)
- [ ] Update in-app SVG graphics
- [ ] Design splash screen
- [ ] Create marketing/website assets
- [ ] Update screenshots in documentation

## Tools and Resources

### Icon Creation
- **macOS:** iconutil, Icon Composer
- **Cross-platform:** Electron Icon Maker, Figma, Sketch, Adobe Illustrator
- **Online:** favicon.io, app-icon.co

### Image Editing
- Adobe Photoshop
- Figma
- GIMP (free alternative)
- Inkscape (for SVG)

### Testing
After creating assets, test on all platforms:
- macOS: App icon in Dock, Finder
- Windows: Taskbar, File Explorer, installer
- Linux: Application menu, desktop

## Current Status

✅ **Completed:**
- Product name changes in configuration files
- Platform manifest updates
- Welcome page text content updated
- Launch scripts updated

⏳ **Pending (requires design work):**
- All visual assets listed above
- Screenshots for documentation
- Marketing materials

## Notes

The current codebase uses placeholder paths that point to VS Code assets. Once your VYBE assets are ready:

1. Replace icon files in their respective locations
2. Ensure file names match what's referenced in product.json and manifest files
3. Test build process to verify assets are properly included
4. Update this document with final asset specifications and brand guidelines

