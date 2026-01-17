# @softwarity/interactive-code

A Web Component for displaying syntax-highlighted code with interactive bindings. Perfect for documentation, tutorials, and live demos.

## Features

- **Syntax Highlighting**: HTML, SCSS, TypeScript, and Shell
- **Interactive Bindings**: Click to edit values directly in the code
- **Multiple Types**: boolean, number, string, select, color, comment
- **Framework Agnostic**: Works with Angular, React, Vue, or vanilla JS
- **Zero Dependencies**: Pure Web Components

## Installation

```bash
npm install @softwarity/interactive-code
```

## Usage

```typescript
import '@softwarity/interactive-code';
```

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
| `select` | Option from list | Click to toggle (2 options) or dropdown (3+) |
| `color` | Color value | Click to open color picker |
| `comment` | Line toggle | Checkbox to comment/uncomment line |
| `readonly` | Display only | No interaction |

## API

### `<interactive-code>`

| Attribute | Type | Description |
|-----------|------|-------------|
| `language` | `'html' \| 'scss' \| 'typescript' \| 'shell'` | Syntax highlighting language |

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

| Event | Description |
|-------|-------------|
| `change` | Fired when value changes |

**Inline handler:** Use `onchange` attribute where `e` is the new value directly:

```html
<code-binding key="checked" type="boolean" value="true"
  onchange="document.getElementById('preview').checked = e"></code-binding>
```

**addEventListener:** Use `e.target.value` or `e.detail`:

```javascript
binding.addEventListener('change', (e) => {
  preview.checked = e.target.value;
});
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

## CSS Customization

The component supports CSS custom properties for styling:

| Property | Default | Description |
|----------|---------|-------------|
| `--code-bg` | `#1e1e1e` | Background color of the code block |
| `--code-border-radius` | `8px` | Border radius of the code block |

```css
interactive-code {
  --code-bg: #282c34;
  --code-border-radius: 4px;
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
