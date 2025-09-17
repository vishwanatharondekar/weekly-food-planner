# Logo Placement Guide

Place your logos in this directory with the following naming convention:

## Recommended Logo Files

- `logo-main.svg` - Main logo (SVG preferred for scalability)
- `logo-main.png` - Main logo (PNG fallback)
- `logo-icon.svg` - Icon version for favicon and small spaces
- `logo-icon.png` - Icon version (PNG fallback)
- `logo-dark.svg` - Dark theme version
- `logo-light.svg` - Light theme version

## Logo Specifications

### Main Logo
- **Format**: SVG preferred, PNG acceptable
- **Dimensions**: 200x60px minimum
- **Background**: Transparent
- **Colors**: Should work on both light and dark backgrounds

### Icon Logo
- **Format**: SVG preferred, PNG acceptable
- **Dimensions**: 64x64px (square)
- **Background**: Transparent
- **Usage**: Favicon, app icons, small spaces

## Integration

The landing page will automatically use your logos when placed in this directory. Update the landing page component to reference your specific logo files.

## Current Placeholder

The landing page currently uses a gradient icon as a placeholder. Replace the icon references in `app/landing/page.tsx` with your actual logo files.