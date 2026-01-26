# @softwarity/interactive-code

A Web Component for displaying syntax-highlighted code with interactive bindings. Perfect for documentation, tutorials, and live demos.

## Features

- **Syntax Highlighting**: HTML, SCSS, TypeScript, and Shell
- **Interactive Bindings**: Click to edit values directly in the code
- **Multiple Types**: boolean, number, string, select, color, comment, attribute
- **Theme System**: Built-in IntelliJ default + 4 external CSS themes (vscode, github, solarized, catppuccin) with light/dark variants
- **Mixed Content Highlighting**: HTML with embedded `<style>` (SCSS) and `<script>` (TypeScript) blocks
- **Copy to Clipboard**: Optional copy button with visual feedback
- **Line Numbers**: Optional gutter line numbers
- **Accessibility**: ARIA attributes, keyboard navigation (Enter/Space, ArrowUp/Down)
- **Framework Agnostic**: Works with Angular, React, Vue, or vanilla JS
- **Zero Dependencies**: Pure Web Components

## Installation

### npm

```bash
npm install @softwarity/interactive-code
```

```typescript
import '@softwarity/interactive-code';
```

### CDN

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@softwarity/interactive-code"></script>
```

No build step required — the custom elements `<interactive-code>` and `<code-binding>` are registered automatically.

## Usage

```html
<interactive-code language="scss">
  <textarea>
:root {
  --width: ${width}px;
  --enabled: ${enabled};
}
  </textarea>
  <code-binding key="width" type="number" value="72" min="48" max="120"></code-binding>
  <code-binding key="enabled" type="boolean" value="true"></code-binding>
</interactive-code>
```

## Binding Types

| Type | Description | Interaction |
|------|-------------|-------------|
| `boolean` | true/false value | Click to toggle |
| `number` | Numeric value | Click to edit, supports min/max/step |
| `string` | Text value | Click to edit |
| `select` | Option from list | Click to toggle (2 options), dropdown (3+), or carousel (`carousel` attribute) |
| `color` | Color value | Click to open color picker |
| `comment` | Line/block toggle | Click indicator to comment/uncomment (`//`, `#`, `<!-- -->`, `/* */`) |
| `attribute` | HTML attribute toggle | Click to toggle (strikethrough when disabled) |
| `readonly` | Display only | No interaction |

## API

### `<interactive-code>`

| Attribute | Type | Description |
|-----------|------|-------------|
| `language` | `'html' \| 'scss' \| 'typescript' \| 'shell'` | Syntax highlighting language |
| `color-scheme` | `'light' \| 'dark'` | Color scheme override (inherits from parent by default) |
| `show-separators` | `boolean` | Show visual separators between textarea sections |
| `show-copy` | `boolean` | Show copy-to-clipboard button (top-right corner) |
| `show-line-numbers` | `boolean` | Show line numbers in the gutter |

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string \| null` | Set code content programmatically |

### `<code-binding>`

| Attribute | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Binding identifier (matches `${key}` in template) |
| `type` | `BindingType` | Type of binding |
| `value` | `any` | Initial value |
| `disabled` | `boolean` | Disable editing |
| `min` | `number` | Minimum value (for `number` type) |
| `max` | `number` | Maximum value (for `number` type) |
| `step` | `number` | Step increment (for `number` type) |
| `options` | `string` | Comma-separated options (for `select` type) |
| `carousel` | `boolean` | Cycle through options on click instead of dropdown (for `select` type) |

| Event | Description |
|-------|-------------|
| `change` | Fired when value changes (CustomEvent with `detail` = new value) |

**Inline handler:** Use `onchange` attribute where `e` is the CustomEvent:

```html
<code-binding key="checked" type="boolean" value="true"
  onchange="document.getElementById('preview').checked = e.detail"></code-binding>
```

**addEventListener / Framework binding:**

```javascript
// Vanilla JS
binding.addEventListener('change', (e) => {
  preview.checked = e.detail;
});

// Angular: (change)="handler($event.detail)"
// React: onChange={(e) => handler(e.detail)}
// Vue: @change="handler($event.detail)"
```

## Examples

### Boolean Toggle

```html
<interactive-code language="html">
  <textarea>
<nav [autoCollapse]="${autoCollapse}">...</nav>
  </textarea>
  <code-binding key="autoCollapse" type="boolean" value="true"></code-binding>
</interactive-code>
```

### Number with Constraints

```html
<interactive-code language="scss">
  <textarea>
:root {
  --width: ${width}px;
}
  </textarea>
  <code-binding key="width" type="number" value="72" min="48" max="120" step="4"></code-binding>
</interactive-code>
```

### Color Picker

```html
<interactive-code language="scss">
  <textarea>
:root {
  --primary: ${primary};
}
  </textarea>
  <code-binding key="primary" type="color" value="#6750a4"></code-binding>
</interactive-code>
```

### Comment Toggle (Line Enable/Disable)

Comment style adapts to language: `//` for TypeScript/SCSS, `#` for Shell, `<!-- -->` for HTML.

```html
<interactive-code language="scss">
  <textarea>
:root {
  ${enableWidth}--custom-width: 280px;
}
  </textarea>
  <code-binding key="enableWidth" type="comment" value="true"></code-binding>
</interactive-code>
```

### Block Comment

Use `${key}...${/key}` syntax for multi-line or inline block comments:

```html
<interactive-code language="typescript">
  <textarea>
const config = {
  name: 'app',
  ${debug}debug: true,
  verbose: true,${/debug}
};
  </textarea>
  <code-binding key="debug" type="comment" value="true"></code-binding>
</interactive-code>
```

### Attribute Toggle

Toggle HTML attributes on/off. Supports attributes with or without values:

```html
<interactive-code language="html">
  <textarea>
<button ${disabled}>Submit</button>
<input ${placeholder}="Enter name" ${required}>
  </textarea>
  <code-binding key="disabled" type="attribute" value="true"></code-binding>
  <code-binding key="placeholder" type="attribute" value="true"></code-binding>
  <code-binding key="required" type="attribute" value="false"></code-binding>
</interactive-code>
```

### Conditional Textareas

Show different code sections based on binding values. Multiple `<textarea>` elements are concatenated, and the `condition` attribute controls visibility:

```html
<interactive-code language="typescript" show-separators>
  <textarea>const result = provider.complete(input, { groupBy: ${groupBy} });</textarea>
  <textarea condition="!groupBy">// Use result.items for flat list
console.log(result.items);</textarea>
  <textarea condition="groupBy">// Use result.groups for grouped display
console.log(result.groups);</textarea>
  <code-binding key="groupBy" type="select" options="undefined,'continent'" value="undefined"></code-binding>
</interactive-code>
```

- `condition="key"` - Show when binding value is truthy
- `condition="!key"` - Show when binding value is falsy
- `condition="key=value"` - Show when binding value equals a specific value
- `condition="!key=value"` - Show when binding value does NOT equal a specific value
- `show-separators` - Add visual separators between sections (customizable via `--code-separator-color`)

## Themes

The built-in default is IntelliJ (Light/Darcula). Four external CSS themes are available as separate stylesheets:

| Theme | File | Light | Dark |
|-------|------|-------|------|
| VS Code | `themes/vscode.css` | Light+ | Dark+ |
| GitHub | `themes/github.css` | Light | Dark |
| Solarized | `themes/solarized.css` | Light | Dark |
| Catppuccin | `themes/catppuccin.css` | Latte | Mocha |

Load a theme by adding a `<link>` stylesheet:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@softwarity/interactive-code/themes/vscode.css">
```

Use `color-scheme` to override light/dark mode per element:

```html
<interactive-code language="typescript" color-scheme="light">
  ...
</interactive-code>
```

## CSS Customization

The component exposes CSS custom properties for styling. Themes and custom overrides use these variables.

### UI Variables

| Property | Description |
|----------|-------------|
| `--code-bg` | Background color |
| `--code-text` | Foreground text color |
| `--code-border-radius` | Border radius |
| `--code-line-number` | Line number color |
| `--code-separator-color` | Separator color between textarea sections |
| `--code-focus-outline` | Focus ring color |
| `--code-input-bg` | Inline input background |
| `--code-input-border` | Inline input border |
| `--code-hover-bg` | Hover background |
| `--code-copy-color` | Copy button color |
| `--code-copy-border` | Copy button border |
| `--code-copy-accent` | Copy success accent |
| `--code-color-preview-border` | Color swatch border |
| `--code-interactive-highlight` | Interactive zone accent color |
| `--code-interactive-color` | Interactive zone text color |
| `--code-interactive-bg-color` | Interactive zone background |
| `--code-interactive-border-color` | Interactive zone border color |
| `--code-comment-color` | Comment indicator color |

### Token Variables

All syntax token colors: `--token-keyword`, `--token-string`, `--token-number`, `--token-comment`, `--token-tag`, `--token-attr-name`, `--token-attr-value`, `--token-punctuation`, `--token-property`, `--token-variable`, `--token-function`, `--token-decorator`, `--token-type`, `--token-class-name`, `--token-template-string`, `--token-value`, `--token-unknown`, `--token-binding-key`

### Interactive Zone Styling

Interactive controls expose `part="interactive"` for external CSS styling:

```css
interactive-code::part(interactive) {
  text-decoration: underline wavy var(--code-interactive-highlight);
}
interactive-code::part(interactive):hover {
  background: var(--code-interactive-bg-color);
}
```

Built-in styles: wavy (default), dotted, dashed, highlight, outline, pill, hand-drawn, none.

```css
interactive-code {
  --code-bg: #282c34;
  --code-border-radius: 4px;
  --code-separator-color: rgba(100, 100, 100, 0.5);
}
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## License

MIT - [Softwarity](https://www.softwarity.io/)
