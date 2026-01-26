# Release Notes

## 1.0.7

### Features

- **Theme system**: Built-in IntelliJ default theme with 4 external CSS themes (vscode, github, solarized, catppuccin). Themes use CSS custom properties with `light-dark()` for automatic light/dark support. External themes are published as CSS files and available via CDN.
- **Color scheme**: `color-scheme` attribute to override light/dark mode per element (inherits from parent by default).
- **Mixed content highlighting**: When `language="html"`, `<style>` blocks use SCSS highlighting and `<script>` blocks use TypeScript highlighting automatically.
- **CSS custom properties**: All 18 token colors and 10 UI colors exposed as `--token-*` and `--code-*` variables for external customization.
- **Interactive zone styling**: Interactive controls expose `part="interactive"` for external CSS styling (supports `:hover`). Themes provide color hooks: `--code-interactive-highlight` (accent), `--code-interactive-color` (text), `--code-interactive-bg-color` (background), `--code-interactive-border-color` (border). Shadow DOM decoration customizable via `--code-interactive-text-decoration`, `--code-interactive-border`, etc. Built-in styles: wavy (default), dotted, dashed, highlight, outline, pill, hand-drawn, none.
- **Condition value matching**: Conditional textareas now support `condition="key=value"` syntax to show content when a binding equals a specific value (in addition to existing truthy/falsy checks).
- **Select carousel mode**: New `carousel` boolean attribute on `<code-binding type="select">` cycles through options on click instead of opening a dropdown. Supports keyboard navigation (ArrowUp/ArrowDown).

### Bug Fixes

- **Conditional content not updated for inline controls**: When a select (3+ options), number, string, or color binding was modified via inline controls, the `_internalChange` flag prevented `updateCode()` from being called, so conditional textareas were not re-evaluated. Now checks for condition dependencies after inline changes.
- **Memory leak - empty `disconnectedCallback()`**: MutationObserver, setTimeout, and event listeners were never cleaned up when the element was removed from the DOM. All resources are now properly disposed in `disconnectedCallback()`.
- **XSS risk in binding rendering**: String, number, color, and select values were inserted into HTML attributes without escaping. All dynamic values are now escaped with `escapeHtml()`.
- **Fragile `_internalChange` flag**: If `binding.value = newValue` threw an error, the flag remained stuck at `true`. Now wrapped in `try/finally` blocks.

### Features

- **Copy to clipboard button**: New `show-copy` attribute displays a copy button (top-right corner) with SVG clipboard/check icons and visual feedback (green check for 2 seconds after copy). Hidden by default.
- **Line numbers**: New `show-line-numbers` attribute displays line numbers in the gutter. Numbers are excluded from copy/paste via `user-select: none`. Section separators have no line number.
- **Hyphenated binding keys**: Binding keys now support hyphens (e.g., `${show-line-numbers}`) for use with the `attribute` binding type on HTML attributes.
- **Accessibility**: Interactive controls now have `role`, `aria-label`, and `tabindex` attributes. Keyboard navigation supports Enter/Space for toggle actions, ArrowUp/Down for number increment/decrement. Focus-visible outline on all interactive elements.

### Improvements

- **Consolidated input listeners**: Three separate `input` event listeners merged into a single `_handleShadowInput()` with extracted helper methods (`_handleInlineNumberInput`, `_handleInlineStringInput`, `_handleInlineColorInput`)
- **Refactored `renderTemplate()`**: Decomposed into smaller methods: `findBlockCommentKeys()`, `renderLine()`, `processMarkers()`, `buildLineHtml()`
- **Named event handlers**: All anonymous event handlers converted to bound named methods for proper cleanup in `disconnectedCallback()`
- **`CommentStyle` interface**: Extracted return type of `getCommentStyle()` into a named interface

### Tests

- Added 52 new tests: cleanup (3), XSS (3), conditional inline (1), copy button (8), line numbers (5), accessibility (6), condition value matching (5), part="interactive" (5), interactive zone CSS (4), carousel (6 rendering + 6 code-binding)
- Updated tests: theme system (7), mixed content highlighting (7) — 177 tests total

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
