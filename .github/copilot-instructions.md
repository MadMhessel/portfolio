# AI Agent Instructions for portfolio

## Project Overview
This is a portfolio website for a design studio (Atmosphere) built with vanilla JavaScript and modern web standards. The site features a content management system with both visual editing capabilities and a headless CMS approach using JSON data files.

## Key Architecture Concepts

### Data Management
- Site configuration stored in `data/site.json` (theme, contacts)
- Homepage content in `data/home.json` (hero section, CTAs)
- Page-specific content in `data/pages/{slug}.json`
- Editor states saved as drafts in localStorage

### Core Components
- Block system (`js/blocks-core.js`): Handles dynamic content blocks (hero, cards, galleries)
- Content management (`js/content.js`): Loads and applies site-wide data
- Editor modes:
  - Inline editing (`js/editmode.js`): Simple text/theme editing
  - Pro editor (`js/editor-pro.js`): Full block management

### Content Structure 
Each block follows an Abstract Syntax Tree (AST) pattern:
```js
{
  type: 'block_type',
  data: {
    selector: '.css-selector', // Optional
    container: '.parent-selector', // Optional
    // Block-specific data
  }
}
```

## Developer Workflows

### Local Development
1. Edit HTML/CSS/JS files directly
2. Test with a local server (use your preferred static file server)
3. Use the editor UI by appending `?edit=1` to any page URL

### Content Updates
Two approaches available:
1. Visual Editor:
   - Navigate to `/editor.html`
   - Make changes and use "Download JSON" or "Save to GitHub" (requires token)
2. Direct JSON:
   - Edit files in `data/` directory
   - Follow the AST structure for page content

### Asset Management
- Images should be placed in appropriate subdirectories of `img/`
- Reference paths should be relative to site root
- Image optimizations are recommended before committing

## Common Patterns

### Theme Customization
```js
// CSS custom properties controlled via site.theme
const themeProps = {
  c_bg: '--c-bg',
  c_text: '--c-text',
  c_primary: '--c-primary',
  c_primary_hover: '--c-primary-hover'
  // etc.
};
```

### Block Creation
```js
// Example of adding a new block type
Blocks.myBlock = {
  selector: '.my-block',
  containerSelectors: ['.my-container'],
  fromData(blocks, root) { /* Render from JSON */ },
  toDataItem(el) { /* Serialize to JSON */ },
  create(data) { /* Create new instance */ }
};
```

### Security Headers
See `docs/SECURITY_HEADERS.md` for Content-Security-Policy and other security configurations.

## Integration Points
- GitHub API for content updates (via personal access token)
- Netlify Functions for serverless operations
- FormSubmit.co for contact form handling

## Best Practices
1. Always validate block structure against `blocks-core.js` patterns
2. Use semantic HTML elements and maintain accessibility features
3. Follow progressive enhancement - core content works without JS
4. Keep page-specific JSON minimal, prefer site-wide settings
5. Test visual editor changes across multiple pages

## Common Pitfalls
- Avoid direct DOM manipulation outside block system
- Don't mix inline and pro editor modes
- Always provide fallback content for dynamic blocks
- Check block selector uniqueness when adding new types