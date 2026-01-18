import { CodeBindingElement } from './code-binding.element';

type Language = 'html' | 'scss' | 'typescript' | 'shell';

/**
 * <interactive-code> Web Component
 *
 * Displays syntax-highlighted code with interactive bindings.
 * Uses ${key} as binding delimiter.
 *
 * @example
 * // With textarea (recommended - content preserved as raw text)
 * <interactive-code language="scss">
 *   <textarea>
 *     :root {
 *       --width: ${width}px;
 *     }
 *   </textarea>
 *   <code-binding key="width" type="number" value="72" min="56" max="120"></code-binding>
 * </interactive-code>
 *
 * @example
 * // With code property (dynamic code from JS)
 * const el = document.querySelector('interactive-code');
 * el.code = ':root { --width: ${width}px; }';
 *
 * @example
 * // With template child (alternative)
 * <interactive-code language="html">
 *   <template>...</template>
 * </interactive-code>
 */
export class InteractiveCodeElement extends HTMLElement {
  private shadow: ShadowRoot;
  private codeContainer!: HTMLElement;
  private templateContent = '';
  private bindings = new Map<string, CodeBindingElement>();
  private _code: string | null = null;
  private _initialized = false;
  private _internalChange = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  get language(): Language {
    return (this.getAttribute('language') as Language) || 'html';
  }

  /** Code content (alternative to <textarea> child) */
  get code(): string | null {
    return this._code;
  }

  set code(value: string | null) {
    this._code = value;
    if (value !== null) {
      this.templateContent = value;
      if (this._initialized) {
        this.updateCode();
      }
    }
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();

    // Try to extract content immediately
    this.extractTemplate();
    this.collectBindings();

    if (this.templateContent) {
      this.updateCode();
      this._initialized = true;
    } else {
      // Wait for content to be projected (framework timing)
      const observer = new MutationObserver(() => {
        this.extractTemplate();
        this.collectBindings();
        if (this.templateContent) {
          observer.disconnect();
          this.updateCode();
          this._initialized = true;
        }
      });
      observer.observe(this, { childList: true, subtree: true });

      // Fallback timeout
      setTimeout(() => {
        observer.disconnect();
        this.extractTemplate();
        this.collectBindings();
        this.updateCode();
        this._initialized = true;
      }, 100);
    }
  }

  disconnectedCallback() {
    // Cleanup if needed
  }

  private render() {
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <pre class="code-block"><code></code></pre>
    `;
    this.codeContainer = this.shadow.querySelector('code')!;
  }

  private extractTemplate() {
    // Don't override if code property was set
    if (this._code !== null) return;

    // Try <textarea> first (content preserved as raw text)
    const textarea = this.querySelector('textarea');
    if (textarea) {
      // Hide the textarea
      textarea.style.display = 'none';
      this.templateContent = textarea.value
        .replace(/^\n/, '')  // Remove leading newline
        .replace(/\n\s*$/, '') // Remove trailing whitespace
        || '';
      return;
    }

    // Fallback to <template>
    const template = this.querySelector('template');
    if (template) {
      this.templateContent = template.innerHTML
        .replace(/^\n/, '')
        .replace(/\n\s*$/, '');
    }
  }

  private collectBindings() {
    const bindingElements = this.querySelectorAll('code-binding') as NodeListOf<CodeBindingElement>;
    bindingElements.forEach(el => {
      if (el.key) {
        this.bindings.set(el.key, el);
      }
    });
  }

  private setupEventListeners() {
    // Listen to change events from code-binding children
    this.addEventListener('change', (e: Event) => {
      const target = e.target as CodeBindingElement;
      if (target.tagName === 'CODE-BINDING' && !this._internalChange) {
        this.updateCode();
      }
    });

    // Handle clicks on interactive elements
    this.shadow.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;

      // Ignore clicks directly on inputs (let them handle their own events)
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return;

      const interactive = target.closest('[data-binding]') as HTMLElement;
      if (!interactive) return;

      const key = interactive.dataset['binding'];
      const action = interactive.dataset['action'];
      if (!key) return;

      const binding = this.bindings.get(key);
      if (!binding) return;

      this.handleAction(binding, action);
    });

    // Handle select changes
    this.shadow.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLSelectElement;
      if (target.classList.contains('inline-select-input')) {
        const key = target.dataset['binding'];
        if (key) {
          const binding = this.bindings.get(key);
          if (binding) {
            const newValue = target.value;
            // Update the display span
            const valueSpan = target.parentElement?.querySelector('.token-string');
            if (valueSpan) {
              valueSpan.textContent = newValue;
            }
            this._internalChange = true;
            binding.value = newValue;
            this._internalChange = false;
          }
        }
      }
    });

    // Handle number input changes - update value and display without full re-render
    this.shadow.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('inline-number-input')) {
        e.stopPropagation();
        const key = target.dataset['binding'];
        if (key) {
          const binding = this.bindings.get(key);
          if (binding) {
            const newValue = target.valueAsNumber || 0;
            const valueSpan = target.parentElement?.querySelector('.token-number');
            if (valueSpan) {
              valueSpan.textContent = String(newValue);
            }
            this._internalChange = true;
            binding.value = newValue;
            this._internalChange = false;
          }
        }
      }
    });

    // Handle string input changes
    this.shadow.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.classList.contains('inline-string-input')) {
        const key = target.dataset['binding'];
        if (key) {
          const binding = this.bindings.get(key);
          if (binding) {
            const newValue = target.value;
            const valueSpan = target.parentElement?.querySelector('.token-string');
            if (valueSpan) {
              valueSpan.textContent = newValue;
            }
            this._internalChange = true;
            binding.value = newValue;
            this._internalChange = false;
          }
        }
      }
    });

    // Handle color input changes
    this.shadow.addEventListener('input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'color') {
        const key = target.dataset['binding'];
        if (key) {
          const binding = this.bindings.get(key);
          if (binding) {
            const newValue = target.value;
            // Update color preview and text display
            const colorPreview = target.parentElement?.querySelector('.color-preview') as HTMLElement;
            const colorText = target.parentElement?.querySelector('.token-string');
            if (colorPreview) {
              colorPreview.style.background = newValue;
            }
            if (colorText) {
              colorText.textContent = newValue;
            }
            this._internalChange = true;
            binding.value = newValue;
            this._internalChange = false;
          }
        }
      }
    });
  }

  private handleAction(binding: CodeBindingElement, action: string | undefined) {
    switch (action) {
      case 'toggle':
        binding.toggle();
        break;
      case 'edit-number':
        const numInput = this.shadow.querySelector(`#num-${binding.key}`) as HTMLInputElement;
        if (numInput) {
          numInput.focus();
          numInput.select();
        }
        break;
      case 'edit-string':
        const strInput = this.shadow.querySelector(`#str-${binding.key}`) as HTMLInputElement;
        if (strInput) {
          strInput.focus();
          strInput.select();
        }
        break;
      case 'edit-color':
        const colorInput = this.shadow.querySelector(`#color-${binding.key}`) as HTMLInputElement;
        if (colorInput) colorInput.click();
        break;
      case 'edit-select':
        const selectInput = this.shadow.querySelector(`#sel-${binding.key}`) as HTMLSelectElement;
        if (selectInput) selectInput.focus();
        break;
    }
  }

  private updateCode() {
    const html = this.renderTemplate();
    this.codeContainer.innerHTML = html;
  }

  private getCommentStyle(language: Language): { line: string; lineIndicator: string; blockStart: string; blockIndicator: string; blockEnd: string; blockEndIndicator: string } {
    // Use HTML entities for < and > to prevent browser interpreting as real comments
    switch (language) {
      case 'html':
        return { line: '&lt;!-- ', lineIndicator: '&lt;!--', blockStart: '&lt;!-- ', blockIndicator: '&lt;!--', blockEnd: ' --&gt;', blockEndIndicator: '--&gt;' };
      case 'shell':
        return { line: '# ', lineIndicator: '#', blockStart: '# ', blockIndicator: '#', blockEnd: '', blockEndIndicator: '' };
      case 'typescript':
      case 'scss':
      default:
        return { line: '// ', lineIndicator: '//', blockStart: '/* ', blockIndicator: '/*', blockEnd: ' */', blockEndIndicator: '*/' };
    }
  }

  private renderTemplate(): string {
    const lines = this.templateContent.split('\n');
    const commentStyle = this.getCommentStyle(this.language);

    // Find which comment bindings have a closing tag ${/key} (block comments)
    const blockCommentKeys = new Set<string>();
    const blockEndPattern = /\$\{\/(\w+)\}/g;
    let match;
    while ((match = blockEndPattern.exec(this.templateContent)) !== null) {
      blockCommentKeys.add(match[1]);
    }

    // Track which block comments are currently open (for multi-line block comments)
    const openBlockComments = new Set<string>();

    const renderedLines: string[] = [];

    for (const line of lines) {
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      let content = line.slice(indent.length);

      // Check if line starts with a comment binding (line toggle)
      // Only treat as line toggle if there's no corresponding ${/key} (not a block)
      let lineToggleBinding: CodeBindingElement | undefined;
      const lineToggleMatch = content.match(/^\$\{(\w+)\}/);
      if (lineToggleMatch) {
        const binding = this.bindings.get(lineToggleMatch[1]);
        // Only treat as line toggle if it's a comment type AND not a block comment
        if (binding?.type === 'comment' && !blockCommentKeys.has(lineToggleMatch[1])) {
          lineToggleBinding = binding;
          content = content.slice(lineToggleMatch[0].length);
        }
      }

      // Check if this line is inside an active (commented) block comment
      const isInsideActiveBlock = Array.from(openBlockComments).some(key => {
        const binding = this.bindings.get(key);
        return binding?.value === false; // false means commented (active)
      });

      // Replace bindings with markers, then highlight, then restore
      let markerIndex = 0;
      const markers = new Map<string, string>();

      // Track block comment state changes on this line
      const blockStartsOnLine: string[] = [];
      const blockEndsOnLine: string[] = [];

      // Handle bindings - capture optional ="value" for attribute type
      // Pattern matches ${key} optionally followed by ="value"
      let processedContent = content.replace(/\$\{(\w+)\}(="[^"]*")?/g, (_, key, attrValue) => {
        const binding = this.bindings.get(key);
        if (binding?.type === 'comment' && blockCommentKeys.has(key)) {
          // This is a block comment start marker
          blockStartsOnLine.push(key);
          openBlockComments.add(key);
          const marker = `__COMMENT_START_${markerIndex++}__`;
          const isEnabled = binding.value === true;
          const toggleClass = isEnabled ? 'block-toggle-inactive' : 'block-toggle-active';
          const toggleHtml = `<span class="block-toggle inline-control ${toggleClass}" data-binding="${key}" data-action="toggle">${commentStyle.blockIndicator}</span>`;
          if (isEnabled) {
            markers.set(marker, toggleHtml);
          } else {
            markers.set(marker, toggleHtml + ' ');
          }
          return marker;
        }
        const marker = `__BINDING_${markerIndex++}__`;
        if (!binding) {
          markers.set(marker, `<span class="token-unknown">\${${key}}</span>`);
        } else {
          markers.set(marker, this.renderBinding(binding, attrValue));
        }
        return marker;
      });

      // Handle block comment end markers ${/key}
      processedContent = processedContent.replace(/\$\{\/(\w+)\}/g, (_, key) => {
        const binding = this.bindings.get(key);
        if (binding?.type === 'comment' && commentStyle.blockEndIndicator) {
          blockEndsOnLine.push(key);
          openBlockComments.delete(key);
          const marker = `__COMMENT_END_${markerIndex++}__`;
          const isEnabled = binding.value === true;
          const toggleClass = isEnabled ? 'block-toggle-inactive' : 'block-toggle-active';
          const endHtml = `<span class="block-end ${toggleClass}">${commentStyle.blockEndIndicator}</span>`;
          markers.set(marker, (isEnabled ? '' : ' ') + endHtml);
          return marker;
        }
        return `\${/${key}}`;
      });

      // Apply syntax highlighting
      processedContent = this.highlightSyntax(processedContent, this.language);

      // Restore markers
      for (const [marker, html] of markers) {
        processedContent = processedContent.replace(marker, html);
      }

      // Determine if line content should be grayed
      // Gray if: inside active block OR block starts/ends on this line and is active
      const hasActiveBlockStart = blockStartsOnLine.some(key => this.bindings.get(key)?.value === false);
      const hasActiveBlockEnd = blockEndsOnLine.some(key => this.bindings.get(key)?.value === false);
      const shouldGrayLine = isInsideActiveBlock || hasActiveBlockStart || hasActiveBlockEnd;

      // Build line HTML
      if (lineToggleBinding) {
        const isEnabled = lineToggleBinding.value === true;
        const toggleClass = isEnabled ? 'line-toggle-inactive' : 'line-toggle-active';
        const toggleHtml = `<span class="line-toggle inline-control ${toggleClass}" data-binding="${lineToggleBinding.key}" data-action="toggle">${commentStyle.lineIndicator}</span>`;
        const commentSuffix = this.language === 'html' && !isEnabled ? `<span class="token-comment">${commentStyle.blockEnd}</span>` : '';
        renderedLines.push(`<span class="code-line${isEnabled ? '' : ' line-disabled'}"><span class="indent">${indent}</span>${toggleHtml}${processedContent}${commentSuffix}</span>`);
      } else if (shouldGrayLine) {
        renderedLines.push(`<span class="code-line line-disabled"><span class="indent">${indent}</span>${processedContent}</span>`);
      } else {
        renderedLines.push(`<span class="code-line"><span class="indent">${indent}</span>${processedContent}</span>`);
      }
    }

    return renderedLines.join('');
  }

  private renderBinding(binding: CodeBindingElement, attrValue?: string): string {
    const value = binding.value;
    const key = binding.key;
    const disabledClass = binding.disabled ? ' disabled' : '';

    switch (binding.type) {
      case 'boolean':
        return `<span class="inline-control inline-boolean${disabledClass}" data-binding="${key}" data-action="toggle">` +
          `<span class="token-keyword">${value}</span></span>`;

      case 'number':
        return `<span class="inline-control inline-number${disabledClass}" data-binding="${key}" data-action="edit-number">` +
          `<span class="token-number">${value ?? ''}</span>` +
          `<input type="number" class="inline-number-input" id="num-${key}" data-binding="${key}" ` +
          `value="${value ?? ''}" ${binding.min !== undefined ? `min="${binding.min}"` : ''} ` +
          `${binding.max !== undefined ? `max="${binding.max}"` : ''} ` +
          `${binding.step !== undefined ? `step="${binding.step}"` : ''}></span>`;

      case 'string':
        return `<span class="inline-control inline-string${disabledClass}" data-binding="${key}" data-action="edit-string">` +
          `<span class="token-string">${value ?? ''}</span>` +
          `<input type="text" class="inline-string-input" id="str-${key}" data-binding="${key}" ` +
          `value="${value ?? ''}"></span>`;

      case 'select':
        const options = binding.options;
        // For 2 options, render as toggle (like boolean)
        if (options.length === 2) {
          return `<span class="inline-control inline-select-toggle${disabledClass}" data-binding="${key}" data-action="toggle">` +
            `<span class="token-string">${value}</span></span>`;
        }
        // For 3+ options, render as hidden dropdown that shows on click
        const optionsHtml = options
          .map(opt => `<option value="${opt}"${opt === value ? ' selected' : ''}>${opt}</option>`)
          .join('');
        return `<span class="inline-control inline-select-wrapper${disabledClass}" data-binding="${key}" data-action="edit-select">` +
          `<span class="token-string">${value}</span>` +
          `<select class="inline-select-input" id="sel-${key}" data-binding="${key}">${optionsHtml}</select></span>`;

      case 'color':
        return `<span class="inline-control inline-color${disabledClass}" data-binding="${key}" data-action="edit-color">` +
          `<span class="color-preview" style="background:${value}"></span>` +
          `<span class="token-string">${value}</span>` +
          `<input type="color" id="color-${key}" data-binding="${key}" value="${value || '#000000'}"></span>`;

      case 'attribute':
        const isActive = value === true;
        // If attrValue is provided (e.g., ="Mon Titre"), include it in the display
        const attrDisplay = attrValue
          ? `<span class="token-attr-name">${key}</span><span class="token-punctuation">=</span><span class="token-attr-value">${this.escapeHtml(attrValue.slice(1))}</span>`
          : `<span class="token-attr-name">${key}</span>`;
        return `<span class="inline-control inline-attribute${disabledClass}${isActive ? '' : ' attribute-disabled'}" data-binding="${key}" data-action="toggle">${attrDisplay}</span>`;

      case 'readonly':
        return `<span class="token-value">${value}</span>`;

      default:
        return `${value ?? ''}`;
    }
  }

  private highlightSyntax(text: string, language: Language): string {
    switch (language) {
      case 'html':
        return this.highlightHtml(text);
      case 'typescript':
        return this.highlightTypeScript(text);
      case 'shell':
        return this.highlightShell(text);
      default:
        return this.highlightScss(text);
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private highlightHtml(text: string): string {
    let result = this.escapeHtml(text);
    result = result.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="token-comment">$1</span>');
    result = result.replace(/(&lt;\/?)([\w-]+)/g, '<span class="token-tag">$1$2</span>');
    result = result.replace(/(\/?&gt;)/g, '<span class="token-tag">$1</span>');
    // Highlight key attribute with special binding color (only the value, not quotes)
    result = result.replace(
      /(key)(=)(&quot;)(.*?)(&quot;)/g,
      '<span class="token-attr-name">$1</span><span class="token-punctuation">$2</span><span class="token-attr-value">$3</span><span class="token-binding-key">$4</span><span class="token-attr-value">$5</span>'
    );
    // Highlight other attributes
    result = result.replace(
      /(\[[\w.-]+\]|\([\w.-]+\)|[\w-]+)(=)(&quot;[^"]*&quot;)(?![^<]*<\/span>)/g,
      '<span class="token-attr-name">$1</span><span class="token-punctuation">$2</span><span class="token-attr-value">$3</span>'
    );
    return result;
  }

  private highlightScss(text: string): string {
    let result = this.escapeHtml(text);
    result = result.replace(/(\/\/.*)$/gm, '<span class="token-comment">$1</span>');
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    result = result.replace(/(@[\w-]+)/g, '<span class="token-keyword">$1</span>');
    result = result.replace(/(\$[\w-]+)/g, '<span class="token-variable">$1</span>');
    result = result.replace(/(&#39;.*?&#39;)/g, '<span class="token-string">$1</span>');
    result = result.replace(/([\w-]+)(\()/g, '<span class="token-function">$1</span><span class="token-punctuation">$2</span>');
    result = result.replace(/([\w-]+)(\s*:)(?![^<]*<\/span>)/g, '<span class="token-property">$1</span><span class="token-punctuation">$2</span>');
    result = result.replace(/(\))/g, '<span class="token-punctuation">$1</span>');
    result = result.replace(/([{},])/g, '<span class="token-punctuation">$1</span>');
    result = result.replace(/(\d+(?:\.\d+)?)(px|em|rem|%)/g, '<span class="token-number">$1$2</span>');
    return result;
  }

  private highlightTypeScript(text: string): string {
    const stringMarkers = new Map<string, string>();
    let markerIndex = 0;

    let processed = text.replace(/'([^'\\]|\\.)*'/g, (match) => {
      const marker = `__STRING_${markerIndex++}__`;
      stringMarkers.set(marker, `<span class="token-string">${this.escapeHtml(match)}</span>`);
      return marker;
    });

    processed = processed.replace(/"([^"\\]|\\.)*"/g, (match) => {
      const marker = `__STRING_${markerIndex++}__`;
      stringMarkers.set(marker, `<span class="token-string">${this.escapeHtml(match)}</span>`);
      return marker;
    });

    processed = processed.replace(/`[^`]*`/g, (match) => {
      const marker = `__STRING_${markerIndex++}__`;
      let inner = this.escapeHtml(match);
      inner = inner.replace(/(&lt;\/?)([\w-]+)/g, '<span class="token-tag">$1$2</span>');
      inner = inner.replace(/(\/?&gt;)/g, '<span class="token-tag">$1</span>');
      inner = inner.replace(/([\w-]+)(=)(&quot;[^&]*&quot;)/g,
        '<span class="token-attr-name">$1</span><span class="token-punctuation">$2</span><span class="token-attr-value">$3</span>');
      stringMarkers.set(marker, `<span class="token-template-string">${inner}</span>`);
      return marker;
    });

    let result = this.escapeHtml(processed);
    result = result.replace(/(\/\/.*)$/gm, '<span class="token-comment">$1</span>');
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    result = result.replace(/(&#64;\w+)/g, '<span class="token-decorator">$1</span>');

    const keywords = ['import', 'export', 'from', 'class', 'interface', 'type', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'this', 'extends', 'implements', 'public', 'private', 'protected', 'readonly', 'static', 'async', 'await', 'as'];
    const keywordPattern = new RegExp(`\\b(${keywords.join('|')})\\b(?!=)`, 'g');
    result = result.replace(keywordPattern, '<span class="token-keyword">$1</span>');
    result = result.replace(/(:\s*)([A-Z][\w&lt;&gt;\[\]]+)/g, '$1<span class="token-type">$2</span>');
    result = result.replace(/(class|interface|extends|implements)(\s+)([A-Z]\w*)/g, '$1$2<span class="token-class-name">$3</span>');
    result = result.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
    result = result.replace(/([{}\[\]().,:])/g, '<span class="token-punctuation">$1</span>');

    for (const [marker, html] of stringMarkers) {
      result = result.replace(marker, html);
    }

    return result;
  }

  private highlightShell(text: string): string {
    let result = this.escapeHtml(text);
    result = result.replace(/(#.*)$/gm, '<span class="token-comment">$1</span>');
    result = result.replace(/^(\s*)(\w+)/gm, '$1<span class="token-function">$2</span>');
    result = result.replace(/(\s)(--?[\w-]+)/g, '$1<span class="token-variable">$2</span>');
    result = result.replace(/(&#39;.*?&#39;)/g, '<span class="token-string">$1</span>');
    result = result.replace(/(&quot;.*?&quot;)/g, '<span class="token-string">$1</span>');
    result = result.replace(/(install|add)(\s+)([@\w\/-]+)/g, '$1$2<span class="token-string">$3</span>');
    return result;
  }

  private getStyles(): string {
    return `
      :host {
        display: block;
      }

      .code-block {
        margin: 0;
        padding: 16px;
        background: var(--code-bg, #1e1e1e);
        border-radius: var(--code-border-radius, 8px);
        overflow-x: auto;
        font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
      }

      .code-block code {
        display: block;
      }

      .code-line {
        display: block;
        min-height: 1.5em;
      }

      .indent {
        white-space: pre;
      }

      .inline-control.disabled {
        opacity: 0.5;
        cursor: default;
      }

      .inline-control.disabled:hover {
        background: transparent;
      }

      .line-disabled,
      .block-content-disabled {
        opacity: 0.3;
      }

      /* Token colors */
      .token-keyword { color: #c586c0; }
      .token-string { color: #ce9178; }
      .token-number { color: #b5cea8; }
      .token-comment { color: #6a9955; }
      .token-tag { color: #569cd6; }
      .token-attr-name { color: #9cdcfe; }
      .token-attr-value { color: #ce9178; }
      .token-punctuation { color: #d4d4d4; }
      .token-property { color: #9cdcfe; }
      .token-variable { color: #4fc1ff; }
      .token-function { color: #dcdcaa; }
      .token-decorator { color: #dcdcaa; }
      .token-type { color: #4ec9b0; }
      .token-class-name { color: #4ec9b0; }
      .token-template-string { color: #ce9178; }
      .token-value { color: #d4d4d4; }
      .token-unknown { color: #4ec9b0; }
      .token-binding-key { color: #4ec9b0; }

      /* Interactive controls */
      .inline-control {
        cursor: pointer;
        border-radius: 3px;
        transition: background 0.15s ease;
        text-decoration: underline wavy var(--code-editable-underline, #4ec9b0);
        text-underline-offset: 3px;
      }

      .inline-control:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .inline-control.disabled {
        text-decoration: none;
        cursor: default;
      }

      .line-toggle,
      .block-toggle {
        margin-right: 4px;
        padding: 0 2px;
      }

      .block-end {
        margin-left: 4px;
        padding: 0 2px;
      }

      .line-toggle-inactive,
      .block-toggle-inactive,
      .block-end.block-toggle-inactive {
        opacity: 0.3;
        color: var(--code-comment-color, #6a9955);
      }

      .line-toggle-active,
      .block-toggle-active,
      .block-end.block-toggle-active {
        color: var(--code-editable-underline, #4ec9b0);
      }

      /* Attribute binding - strikethrough when disabled */
      .inline-attribute {
        padding: 0 2px;
      }

      .inline-attribute.attribute-disabled {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .inline-boolean,
      .inline-number,
      .inline-string,
      .inline-select-toggle {
        padding: 0 4px;
        position: relative;
      }

      .inline-number-input,
      .inline-string-input {
        position: absolute;
        opacity: 0;
        width: 60px;
        left: 0;
        top: 0;
        height: 100%;
        font: inherit;
        background: #2d2d2d;
        border: 1px solid #555;
        color: #b5cea8;
        border-radius: 3px;
        padding: 0 4px;
        pointer-events: none;
      }

      .inline-number:focus-within .inline-number-input,
      .inline-number-input:focus,
      .inline-string:focus-within .inline-string-input,
      .inline-string-input:focus {
        opacity: 1;
        pointer-events: auto;
        outline: none;
        border-color: #007acc;
      }

      .inline-string-input {
        width: 120px;
        color: #ce9178;
      }

      .inline-select-wrapper {
        padding: 0 4px;
        position: relative;
        display: inline-block;
      }

      .inline-select-input {
        position: absolute;
        opacity: 0;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        min-width: 120px;
        font: inherit;
        background: #2d2d2d;
        border: 1px solid #555;
        color: #ce9178;
        border-radius: 3px;
        padding: 2px 4px;
        pointer-events: none;
        cursor: pointer;
      }

      .inline-select-wrapper:focus-within .inline-select-input,
      .inline-select-input:focus {
        opacity: 1;
        pointer-events: auto;
        outline: none;
        border-color: #007acc;
        z-index: 10;
      }

      .inline-color {
        padding: 0 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .inline-color input[type="color"] {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
      }

      .color-preview {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 2px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        vertical-align: middle;
      }
    `;
  }
}
