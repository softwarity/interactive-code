# CLAUDE.md - Interactive Code Web Component

This file provides guidance to Claude Code when working with this repository.

## Interaction Rules

- **Answer questions first**: When the user asks questions, ALWAYS answer them before starting any implementation.
- **Confirm understanding**: When the user proposes an idea or asks for feedback, respond with analysis and clarification questions before implementing.
- **Be conversational**: Treat discussions as a dialogue, not as immediate action items.

## Code Style Guidelines

- **Comments in code**: Always in English
- **Communication with user**: In French
- **Variable/function names**: In English (standard convention)
- **Indentation**: 2 spaces (not tabs)

## Release Notes Workflow

**IMPORTANT**: Do NOT add new version headers (`## v1.0.x`) to RELEASE_NOTES.md manually. The CI workflow adds them automatically.

**How it works**:
1. After releasing v1.0.2, the CI adds `## v1.0.3` as a placeholder for the next release
2. Developers add their changes UNDER the existing `## v1.0.3` section
3. When releasing v1.0.3, the CI adds `## v1.0.4` as the new placeholder

**During development**: Add changes under the existing version placeholder (already created by CI):
```markdown
# Release Notes

## v1.0.3   <-- placeholder added by CI after 1.0.2 release, add your changes here

### Features
- New feature description

### Bug Fixes
- Bug fix description

---

## v1.0.2   <-- previous release (do not modify)
```

**Never remove the version placeholder** - it was added by CI after the previous release.

## Project Overview

**@softwarity/interactive-code** is a Web Component for displaying syntax-highlighted code with interactive bindings. It allows users to click on values in code snippets to edit them directly.

### Key Features

1. **Syntax Highlighting**: HTML, SCSS, TypeScript, Shell
2. **Interactive Bindings**: Click-to-edit values in code
3. **Multiple Binding Types**: boolean, number, string, select, color, comment, attribute
4. **Framework Agnostic**: Works with any framework or vanilla JS
5. **Shadow DOM**: Encapsulated styles

### File Structure

```
src/
├── index.ts                    # Entry point, registers custom elements
├── code-binding.element.ts     # <code-binding> custom element
└── interactive-code.element.ts # <interactive-code> custom element

demo/
└── index.html                  # Demo page (uses component to document itself)
```

### Binding Types

| Type | Description |
|------|-------------|
| `boolean` | Click to toggle true/false |
| `number` | Click to edit, supports min/max/step |
| `string` | Click to edit text |
| `select` | Toggle (2 options) or dropdown (3+) |
| `color` | Opens native color picker |
| `comment` | Click indicator (`//`, `#`, `<!-- -->`, `/* */`) to comment/uncomment |
| `attribute` | Toggle HTML attribute on/off (strikethrough when disabled) |
| `readonly` | Display only |

### Comment Syntax

- **Line comment**: `${key}content` - click indicator to toggle line comment
- **Block comment**: `${key}...${/key}` - click `/*` or `<!--` to toggle block around content
- **Language-aware**: `//` for TS/SCSS, `#` for Shell, `<!-- -->` for HTML, `/* */` for blocks
- **Visual states**: grayed when active (code visible), green when commented

### Attribute Syntax

- **Without value**: `${disabled}` - toggles `disabled` attribute
- **With value**: `${title}="My Title"` - toggles entire `title="My Title"`

### Template Syntax

Use `${key}` in the template to mark where bindings should appear:

```html
<interactive-code language="scss">
  <textarea>
:root {
  --width: ${width}px;
}
  </textarea>
  <code-binding key="width" type="number" value="72"></code-binding>
</interactive-code>
```

### Content Sources

The component can get its template from:
1. `<textarea>` child (recommended - content preserved as raw text)
2. `<template>` child (alternative)
3. `code` property (programmatic)

### Events

`<code-binding>` emits a `change` event when its value changes:

```javascript
element.addEventListener('change', (e) => {
  console.log('New value:', e.detail);
});
```

## Development Commands

```bash
npm run dev       # Start dev server with HMR (opens demo/index.html)
npm run build     # Build for production
npm run typecheck # TypeScript type checking
```

## Architecture Notes

### Shadow DOM

`<interactive-code>` uses Shadow DOM for style encapsulation. The styles are injected via `getStyles()` method.

### MutationObserver

The component uses MutationObserver to handle framework timing issues (e.g., Angular content projection). It waits for child elements to be available before rendering.

### Internal Change Flag

The `_internalChange` flag prevents infinite loops when updating values:
- External changes (from `<code-binding>`) trigger a full re-render
- Internal changes (from inline inputs) update only the display without re-render

### Marker System

When rendering, bindings are replaced with temporary markers (`__BINDING_0__`, etc.) before syntax highlighting, then restored after. This prevents the highlighter from corrupting binding HTML.
