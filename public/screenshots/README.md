# Screenshots for Schema.org

## Required Screenshots

Add these screenshots to improve SEO and Google search appearance:

### For Brand Insight Pages
- `bubble-chart.png` - Bubble chart visualization (1200x630px)
- `keyword-analysis.png` - Keyword analysis view (1200x630px)
- `bar-chart.png` - Bar chart view (1200x630px)
- `treemap.png` - Treemap visualization (1200x630px)

### For Homepage/Explore
- `homepage-hero.png` - Main landing view (1200x630px)
- `data-visualization.png` - Interactive charts showcase (1200x630px)

## Recommended Specs

- **Dimensions**: 1200x630px (2:1 ratio) - Google's recommended OG image size
- **Format**: PNG or JPG
- **File size**: < 200KB (use compression)
- **Content**: Show the tool in action with data
- **Text**: Minimal, let the visuals speak

## How to Capture

### Quick Method (Manual)
1. Open your tool in browser
2. Resize window to 1200x630 or use browser dev tools
3. Take screenshot using browser tools
4. Save to this folder

### Programmatic Method
Use the screenshot helper:

```typescript
import { captureScreenshot } from '../utils/screenshotHelper';

// In your component
const handleCaptureScreenshot = async () => {
  const element = document.querySelector('.chart-container');
  if (element) {
    await captureScreenshot(element as HTMLElement, 'bubble-chart.png');
  }
};
```

## Optimization Tools

- [TinyPNG](https://tinypng.com/) - Compress PNG files
- [Squoosh](https://squoosh.app/) - Google's image optimizer
- [ImageOptim](https://imageoptim.com/) - Mac tool for optimization

## Testing

After adding screenshots, validate with:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

## Current Schema Implementation

Screenshots are automatically included in:
- BrandInsightPage (lines 818-821)
- ExplorePage (lines 240-244)

Update the URLs in these files to match your screenshot filenames.
