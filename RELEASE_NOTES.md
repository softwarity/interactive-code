# Release Notes

## 1.0.4

---

## v1.0.3

### Bug Fixes

- Fix `onchange` attribute handlers not being called for number, string, and color inputs
- Color picker preview and text now update in real-time when color changes

### Improvements

- Changed `${key}` binding placeholders from red to green for better visibility
- `key` attribute values in `<code-binding>` now highlighted in matching green color
- Demo: Responsive layout for "Seen by user" sections (stacked vertically)
- Demo: Replaced checkbox with icons for better preview
- Demo: Replaced box-shadow with border in comment type example for better visibility

---

## v1.0.2

### Features

- Add unit tests for `CodeBindingElement` and `InteractiveCodeElement` (89 tests)
- Add Vitest configuration with happy-dom environment

---

## v1.0.1

### Bug Fixes

- Fix TypeScript build error with unused `oldValue` parameter in `attributeChangedCallback`

## v1.0.0

### Features

- `<interactive-code>` Web Component for displaying syntax-highlighted code
- `<code-binding>` Web Component for interactive value bindings
- Syntax highlighting for HTML, SCSS, TypeScript, and Shell
- Binding types: boolean, number, string, select, color, comment, readonly
- Shadow DOM encapsulation for style isolation
- Framework agnostic (vanilla JS, Angular, React, Vue, etc.)
- Template syntax with `${key}` markers
- Multiple content sources: `<textarea>`, `<template>`, or `code` property
- Change events emitted on binding value updates
