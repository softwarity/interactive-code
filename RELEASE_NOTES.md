# Release Notes

## 1.0.7

---

## 1.0.6

### Features

- **Conditional textareas**: Multiple `<textarea>` elements can now have a `condition` attribute to conditionally show/hide code sections based on binding values
  - `condition="key"` → show when binding is truthy
  - `condition="!key"` → show when binding is falsy
  - Useful for showing different code patterns based on user selection
- **Section separators**: Optional `show-separators` attribute on `<interactive-code>` adds subtle visual separators between concatenated textarea sections
  - Customizable via `--code-separator-color` CSS variable

### Example

```html
<interactive-code language="typescript" show-separators>
  <textarea>const result = provider.complete(input, { groupBy: ${groupBy} });</textarea>
  <textarea condition="!groupBy">// Use result.items for flat list</textarea>
  <textarea condition="groupBy">// Use result.groups for grouped display</textarea>
  <code-binding key="groupBy" type="select" options="undefined,'continent'" value="undefined"></code-binding>
</interactive-code>
```

### Tests

- Added 7 new tests for conditional textareas and separators (110 tests total)

---

## 1.0.5

### Bug Fixes

- Multi-line block comments now correctly gray out all lines (not just the first line)

---

## v1.0.4

### Features

- Comment style adapts to language: `//` for TypeScript/SCSS, `#` for Shell, `<!-- -->` for HTML
- Block comment syntax with `${key}...${/key}` for multi-line comments (`/* */` or `<!-- -->`)
- Attribute type now supports attributes with values: `${title}="My Title"` (whole attribute is toggled/strikethrough)
- Comment toggle: replaced checkbox with clickable comment indicator (`//`, `#`, `<!-- -->`, `/* */`) - grayed when active (code visible), highlighted in green when commented
- New `attribute` binding type for toggling HTML attributes (displays with strikethrough when disabled)
- Wavy underline on editable elements to make them more visible
- Comment checkbox color now matches the editable underline color

### Bug Fixes

- **Breaking**: `onchange` attribute now receives `CustomEvent` instead of value directly
  - Before: `onchange="handler(e)"` where `e` was the value
  - After: `onchange="handler(e.detail)"` where `e.detail` is the value
  - This makes behavior consistent with `addEventListener('change', ...)` and frameworks (Angular, React, Vue)
- Fix `onchange` attribute handlers not being called for number, string, and color inputs
- Color picker preview and text now update in real-time when color changes

### Improvements

- Changed `${key}` binding placeholders from red to green for better visibility
- `key` attribute values in `<code-binding>` now highlighted in matching green color
- Demo: Responsive layout for "Seen by user" sections (stacked vertically)
- Demo: Replaced checkbox with icons for better preview
- Demo: Replaced box-shadow with border in comment type example for better visibility
- Demo: Added example for new `attribute` binding type
- Demo: Added examples for all comment styles per language
- Demo: Updated attribute type examples with boolean and value-based attributes

### Tests

- Added 14 new tests for comment and attribute features (103 tests total)

---

## 1.0.3

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
