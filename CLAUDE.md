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

## Project Overview

**@softwarity/interactive-code** is a Web Component for displaying syntax-highlighted code with interactive bindings. It allows users to click on values in code snippets to edit them directly.

### Key Features

1. **Syntax Highlighting**: HTML, SCSS, TypeScript, Shell
2. **Interactive Bindings**: Click-to-edit values in code
3. **Multiple Binding Types**: boolean, number, string, select, color, comment
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
| `comment` | Checkbox to comment/uncomment line |
| `readonly` | Display only |

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
