# Release Notes

## 1.0.3

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
