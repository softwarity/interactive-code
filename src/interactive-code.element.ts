import { CodeBindingElement } from './code-binding.element';

type Language = 'html' | 'scss' | 'typescript' | 'shell' | 'json';

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
interface ConditionalContent {
  content: string;
  condition: string | null; // null means always show
}

interface CommentStyle {
  line: string;
  lineIndicator: string;
  blockStart: string;
  blockIndicator: string;
  blockEnd: string;
  blockEndIndicator: string;
}

export class InteractiveCodeElement extends HTMLElement {
  static observedAttributes = ['show-line-numbers', 'color-scheme'];

  private shadow: ShadowRoot;
  private codeContainer!: HTMLElement;
  private templateContent = '';
  private conditionalContents: ConditionalContent[] = [];
  private bindings = new Map<string, CodeBindingElement>();
  private _code: string | null = null;
  private _initialized = false;
  private _internalChange = false;
  private _gutterActive = false;
  private _foldState = new Map<string, boolean>(); // fold id → collapsed (user override, persisted across re-renders)

  // References for cleanup
  private _observer: MutationObserver | null = null;
  private _fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private _copyTimeout: ReturnType<typeof setTimeout> | null = null;

  // Bound event handlers for proper cleanup
  private _boundChangeHandler: (e: Event) => void;
  private _boundShadowMousedownHandler: (e: Event) => void;
  private _boundShadowClickHandler: (e: Event) => void;
  private _boundShadowChangeHandler: (e: Event) => void;
  private _boundShadowInputHandler: (e: Event) => void;
  private _boundShadowKeydownHandler: (e: Event) => void;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this._boundChangeHandler = this._handleChange.bind(this);
    this._boundShadowMousedownHandler = this._handleShadowMousedown.bind(this);
    this._boundShadowClickHandler = this._handleShadowClick.bind(this);
    this._boundShadowChangeHandler = this._handleShadowChange.bind(this);
    this._boundShadowInputHandler = this._handleShadowInput.bind(this);
    this._boundShadowKeydownHandler = this._handleShadowKeydown.bind(this);
  }

  get language(): Language {
    return (this.getAttribute('language') as Language) || 'html';
  }

  /** Whether to show separators between concatenated textarea sections */
  get showSeparators(): boolean {
    return this.hasAttribute('show-separators');
  }

  /** Whether to show line numbers */
  get showLineNumbers(): boolean {
    return this.hasAttribute('show-line-numbers');
  }

  /** Whether to show the copy button */
  get showCopy(): boolean {
    return this.hasAttribute('show-copy');
  }

  /** Whether to show the download button */
  get showDownload(): boolean {
    return this.hasAttribute('show-download');
  }

  /** File name used by the download button (defaults to snippet.<ext>) */
  get downloadName(): string {
    return this.getAttribute('download') || `snippet.${this.fileExtension}`;
  }

  /** File extension matching the current language */
  private get fileExtension(): string {
    switch (this.language) {
      case 'json': return 'json';
      case 'typescript': return 'ts';
      case 'scss': return 'scss';
      case 'shell': return 'sh';
      case 'html':
      default: return 'html';
    }
  }

  /** MIME type matching the current language */
  private get mimeType(): string {
    switch (this.language) {
      case 'json': return 'application/json';
      case 'typescript': return 'text/typescript';
      case 'scss': return 'text/x-scss';
      case 'shell': return 'text/x-shellscript';
      case 'html':
      default: return 'text/html';
    }
  }

  /** Color scheme (light or dark mode) */
  get colorScheme(): string {
    return this.getAttribute('color-scheme') || '';
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
      this._observer = new MutationObserver(() => {
        this.extractTemplate();
        this.collectBindings();
        if (this.templateContent) {
          this._observer?.disconnect();
          this._observer = null;
          this.updateCode();
          this._initialized = true;
        }
      });
      this._observer.observe(this, { childList: true, subtree: true });

      // Fallback timeout
      this._fallbackTimeout = setTimeout(() => {
        this._observer?.disconnect();
        this._observer = null;
        this._fallbackTimeout = null;
        this.extractTemplate();
        this.collectBindings();
        this.updateCode();
        this._initialized = true;
      }, 100);
    }
  }

  disconnectedCallback() {
    // Clean up MutationObserver
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    // Clean up fallback timeout
    if (this._fallbackTimeout) {
      clearTimeout(this._fallbackTimeout);
      this._fallbackTimeout = null;
    }
    // Clean up copy feedback timeout
    if (this._copyTimeout) {
      clearTimeout(this._copyTimeout);
      this._copyTimeout = null;
    }
    // Remove event listeners
    this.removeEventListener('change', this._boundChangeHandler);
    this.shadow.removeEventListener('mousedown', this._boundShadowMousedownHandler);
    this.shadow.removeEventListener('click', this._boundShadowClickHandler);
    this.shadow.removeEventListener('change', this._boundShadowChangeHandler);
    this.shadow.removeEventListener('input', this._boundShadowInputHandler);
    this.shadow.removeEventListener('keydown', this._boundShadowKeydownHandler);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue !== newValue && this._initialized) {
      // color-scheme is handled purely by CSS, no re-render needed
      if (name === 'color-scheme') return;
      this.updateCode();
    }
  }

  private render() {
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <pre class="code-block"><div class="code-actions"><button class="action-button download-button" aria-label="Download code" tabindex="0"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="action-button copy-button" aria-label="Copy code to clipboard" tabindex="0"><svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><svg class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button></div><code></code></pre>
    `;
    this.codeContainer = this.shadow.querySelector('code')!;
  }

  private extractTemplate() {
    // Don't override if code property was set
    if (this._code !== null) return;

    // Try <textarea> elements (content preserved as raw text)
    const textareas = this.querySelectorAll('textarea');
    if (textareas.length > 0) {
      this.conditionalContents = [];

      textareas.forEach(textarea => {
        // Hide the textarea
        textarea.style.display = 'none';
        const content = textarea.value
          .replace(/^\n/, '')  // Remove leading newline
          .replace(/\n\s*$/, '') // Remove trailing whitespace
          || '';
        const condition = textarea.getAttribute('condition');
        this.conditionalContents.push({ content, condition });
      });

      // For backwards compatibility, also set templateContent from first unconditional or all
      this.updateTemplateContent();
      return;
    }

    // Fallback to <template>
    const template = this.querySelector('template');
    if (template) {
      this.templateContent = template.innerHTML
        .replace(/^\n/, '')
        .replace(/\n\s*$/, '');
      this.conditionalContents = [{ content: this.templateContent, condition: null }];
    }
  }

  private updateTemplateContent() {
    // Evaluate conditions and concatenate matching content
    const parts: string[] = [];

    for (const { content, condition } of this.conditionalContents) {
      if (this.evaluateCondition(condition)) {
        parts.push(content);
      }
    }

    // Join with separator marker if show-separators is enabled and multiple parts
    if (this.showSeparators && parts.length > 1) {
      this.templateContent = parts.join('\n__SECTION_SEPARATOR__\n');
    } else {
      this.templateContent = parts.join('\n');
    }
  }

  private evaluateCondition(condition: string | null): boolean {
    // No condition means always show
    if (condition === null || condition === '') return true;

    // Handle negation: "!key" or "!key=value"
    const isNegated = condition.startsWith('!');
    const expr = isNegated ? condition.slice(1).trim() : condition.trim();

    // Handle value comparison: "key=value"
    const eqIndex = expr.indexOf('=');
    if (eqIndex !== -1) {
      const key = expr.slice(0, eqIndex).trim();
      const expectedValue = expr.slice(eqIndex + 1).trim();
      const binding = this.bindings.get(key);
      if (!binding) return isNegated;
      const matches = String(binding.value) === expectedValue;
      return isNegated ? !matches : matches;
    }

    // Truthy/falsy check
    const key = expr;
    const binding = this.bindings.get(key);
    if (!binding) {
      // If binding doesn't exist yet, treat as falsy
      return isNegated;
    }

    const value = binding.value;

    // For select type, 'undefined' string is falsy
    const isTruthy = value !== undefined && value !== null && value !== false && value !== 'undefined';

    return isNegated ? !isTruthy : isTruthy;
  }

  private collectBindings() {
    const bindingElements = this.querySelectorAll('code-binding') as NodeListOf<CodeBindingElement>;
    let buttonIndex = 0;
    bindingElements.forEach(el => {
      if (el.key) {
        this.bindings.set(el.key, el);
      }
      // Synthesize a default label/detail for value-less button bindings (button0, button1, ...)
      if (el.type === 'button') {
        el.setDefaultValue(`button${buttonIndex}`);
        buttonIndex++;
      }
    });
  }

  /** Check if a binding key is used in any conditional textarea */
  private hasConditionDependency(key: string): boolean {
    return this.conditionalContents.some(cc => {
      if (!cc.condition) return false;
      const expr = cc.condition.startsWith('!') ? cc.condition.slice(1).trim() : cc.condition.trim();
      // Handle value comparison: "key=value" — extract just the key part
      const eqIndex = expr.indexOf('=');
      const condKey = eqIndex !== -1 ? expr.slice(0, eqIndex).trim() : expr;
      return condKey === key;
    });
  }

  private setupEventListeners() {
    // Listen to change events from code-binding children
    this.addEventListener('change', this._boundChangeHandler);

    // Handle clicks on interactive elements and copy button
    this.shadow.addEventListener('mousedown', this._boundShadowMousedownHandler);
    this.shadow.addEventListener('click', this._boundShadowClickHandler);

    // Handle select changes
    this.shadow.addEventListener('change', this._boundShadowChangeHandler);

    // Handle number, string, and color input changes (consolidated)
    this.shadow.addEventListener('input', this._boundShadowInputHandler);

    // Handle keyboard navigation
    this.shadow.addEventListener('keydown', this._boundShadowKeydownHandler);
  }

  private _handleChange(e: Event) {
    const target = e.target as CodeBindingElement;
    if (target.tagName === 'CODE-BINDING' && !this._internalChange) {
      // Buttons fire fire-and-forget actions: nothing in the displayed code changes,
      // so skip the re-render and keep the current fold/inline state intact.
      if (target.type === 'button') return;
      this.updateCode();
    }
  }

  private _handleShadowMousedown(e: Event) {
    const me = e as MouseEvent;
    if (me.shiftKey) {
      const target = me.target as HTMLElement;
      if (target.closest('.inline-select-carousel')) {
        e.preventDefault();
      }
    }
  }

  private _handleShadowClick(e: Event) {
    const target = e.target as HTMLElement;

    // Handle copy button
    if (target.closest('.copy-button')) {
      this.copyToClipboard();
      return;
    }

    // Handle download button
    if (target.closest('.download-button')) {
      this.downloadFile();
      return;
    }

    // Handle fold band / gutter chevrons (toggle collapsed state, no re-render)
    const foldToggle = target.closest('[data-fold-toggle]') as HTMLElement;
    if (foldToggle) {
      this.toggleFold(foldToggle.dataset['foldToggle']);
      return;
    }

    // Ignore clicks directly on inputs (let them handle their own events)
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT') return;

    const interactive = target.closest('[data-binding]') as HTMLElement;
    if (!interactive) return;

    const key = interactive.dataset['binding'];
    const action = interactive.dataset['action'];
    if (!key) return;

    const binding = this.bindings.get(key);
    if (!binding) return;

    const shiftKey = (e as MouseEvent).shiftKey || false;
    this.handleAction(binding, action, shiftKey);
  }

  private _handleShadowChange(e: Event) {
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
          try {
            binding.value = newValue;
          } finally {
            this._internalChange = false;
          }
          // Re-evaluate conditions if this binding is used in a condition
          if (this.hasConditionDependency(key)) {
            this.updateCode();
          }
        }
      }
    }
  }

  /** Consolidated input handler for number, string, and color inputs */
  private _handleShadowInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('inline-number-input')) {
      e.stopPropagation();
      this._handleInlineNumberInput(target);
    } else if (target.classList.contains('inline-string-input')) {
      e.stopPropagation();
      this._handleInlineStringInput(target);
    } else if (target.type === 'color') {
      e.stopPropagation();
      this._handleInlineColorInput(target);
    }
  }

  private _handleInlineNumberInput(target: HTMLInputElement) {
    const key = target.dataset['binding'];
    if (!key) return;
    const binding = this.bindings.get(key);
    if (!binding) return;
    const newValue = target.valueAsNumber || 0;
    const valueSpan = target.parentElement?.querySelector('.token-number');
    if (valueSpan) {
      valueSpan.textContent = String(newValue);
    }
    this._internalChange = true;
    try {
      binding.value = newValue;
    } finally {
      this._internalChange = false;
    }
    if (this.hasConditionDependency(key)) {
      this.updateCode();
    }
  }

  private _handleInlineStringInput(target: HTMLInputElement) {
    const key = target.dataset['binding'];
    if (!key) return;
    const binding = this.bindings.get(key);
    if (!binding) return;
    const newValue = target.value;
    const valueSpan = target.parentElement?.querySelector('.token-string');
    if (valueSpan) {
      valueSpan.textContent = newValue;
    }
    this._internalChange = true;
    try {
      binding.value = newValue;
    } finally {
      this._internalChange = false;
    }
    if (this.hasConditionDependency(key)) {
      this.updateCode();
    }
  }

  private _handleInlineColorInput(target: HTMLInputElement) {
    const key = target.dataset['binding'];
    if (!key) return;
    const binding = this.bindings.get(key);
    if (!binding) return;
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
    try {
      binding.value = newValue;
    } finally {
      this._internalChange = false;
    }
    if (this.hasConditionDependency(key)) {
      this.updateCode();
    }
  }

  /** Keyboard navigation for interactive controls */
  private _handleShadowKeydown(e: Event) {
    const event = e as KeyboardEvent;
    const target = event.target as HTMLElement;

    // Handle copy button
    if (target.classList.contains('copy-button') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.copyToClipboard();
      return;
    }

    // Handle fold band / gutter chevrons (Enter/Space). Native <button> handles its own keys.
    const foldToggle = target.closest('[data-fold-toggle]') as HTMLElement;
    if (foldToggle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.toggleFold(foldToggle.dataset['foldToggle']);
      return;
    }

    const interactive = target.closest('[data-binding]') as HTMLElement;
    if (!interactive) return;

    const key = interactive.dataset['binding'];
    if (!key) return;

    const binding = this.bindings.get(key);
    if (!binding) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const action = interactive.dataset['action'];
      this.handleAction(binding, action);
    } else if (event.key === 'ArrowUp' && binding.type === 'number') {
      event.preventDefault();
      binding.increment();
    } else if (event.key === 'ArrowDown' && binding.type === 'number') {
      event.preventDefault();
      binding.decrement();
    } else if (event.key === 'ArrowUp' && binding.type === 'select' && binding.carousel) {
      event.preventDefault();
      binding.toggle();
    } else if (event.key === 'ArrowDown' && binding.type === 'select' && binding.carousel) {
      event.preventDefault();
      binding.previous();
    }
  }

  private handleAction(binding: CodeBindingElement, action: string | undefined, shiftKey: boolean = false) {
    switch (action) {
      case 'toggle':
        if (shiftKey && binding.carousel) {
          binding.previous();
        } else {
          binding.toggle();
        }
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
      case 'trigger':
        binding.trigger();
        break;
    }
  }

  private updateCode() {
    // Re-evaluate conditional content before rendering
    if (this.conditionalContents.length > 0) {
      this.updateTemplateContent();
    }
    // The left gutter rail is reserved when there are line numbers, fold markers,
    // or comment toggles. The control column (fold chevrons + comment toggles,
    // before the numbers) only exists for folds/comments.
    const hasNumbers = this.showLineNumbers;
    const hasControls = /\$\{fold(:open)?\}/.test(this.templateContent)
      || Array.from(this.bindings.values()).some(b => b.type === 'comment');
    this._gutterActive = hasNumbers || hasControls;
    const html = this.renderTemplate();
    this.codeContainer.innerHTML = html;
    const cl = this.codeContainer.classList;
    cl.toggle('has-gutter', this._gutterActive);
    cl.toggle('has-controls', hasControls);
    cl.toggle('has-numbers', hasNumbers);
    cl.toggle('lang-html', this.language === 'html');
  }

  private getCommentStyle(language: Language): CommentStyle {
    // Use HTML entities for < and > to prevent browser interpreting as real comments
    switch (language) {
      case 'html':
        return { line: '&lt;!-- ', lineIndicator: '&lt;!--', blockStart: '&lt;!-- ', blockIndicator: '&lt;!--', blockEnd: ' --&gt;', blockEndIndicator: '--&gt;' };
      case 'shell':
        return { line: '# ', lineIndicator: '#', blockStart: '# ', blockIndicator: '#', blockEnd: '', blockEndIndicator: '' };
      case 'typescript':
      case 'scss':
      case 'json': // JSONC-style comments (stripped from copy/download to keep valid JSON)
      default:
        return { line: '// ', lineIndicator: '//', blockStart: '/* ', blockIndicator: '/*', blockEnd: ' */', blockEndIndicator: '*/' };
    }
  }

  /** Extract the set of binding keys that have block comment end markers ${/key} */
  private findBlockCommentKeys(): Set<string> {
    const keys = new Set<string>();
    const pattern = /\$\{\/([\w-]+)\}/g;
    let match;
    while ((match = pattern.exec(this.templateContent)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  }

  private isOpeningStyleTag(line: string): boolean {
    return /<style[\s>]/i.test(line);
  }

  private isClosingStyleTag(line: string): boolean {
    return /<\/style>/i.test(line);
  }

  private isOpeningScriptTag(line: string): boolean {
    return /<script[\s>]/i.test(line);
  }

  private isClosingScriptTag(line: string): boolean {
    return /<\/script>/i.test(line);
  }

  private renderTemplate(): string {
    const lines = this.templateContent.split('\n');
    const commentStyle = this.getCommentStyle(this.language);
    const blockCommentKeys = this.findBlockCommentKeys();

    // Track which block comments are currently open (for multi-line block comments)
    const openBlockComments = new Set<string>();
    const renderedLines: string[] = [];
    let lineNumber = 1;

    // Track mixed content zones for HTML language
    let currentZone: Language = this.language;

    // Buffer used to collect the lines of a ${fold} section before wrapping them
    let foldBuffer: string[] | null = null;
    let foldId = '';
    let foldCollapsed = false;
    let markerFoldCount = 0; // ids for public ${fold} markers

    for (const line of lines) {
      // Fold markers (any language, usable in textareas or the `code` property):
      // ${fold} … ${/fold} → collapsed by default; ${fold:open} … ${/fold} → expanded by default.
      // The marker lines are removed from the output (and from copy/download). No nesting.
      const foldStart = line.match(/^\s*\$\{fold(:open)?\}\s*$/);
      if (foldStart && foldBuffer === null) {
        foldId = `f${markerFoldCount++}`;
        foldCollapsed = !foldStart[1]; // collapsed unless ":open"
        foldBuffer = [];
        continue;
      }
      if (/^\s*\$\{\/fold\}\s*$/.test(line) && foldBuffer !== null) {
        renderedLines.push(this.buildFoldGroup(foldId, foldCollapsed, foldBuffer));
        foldBuffer = null;
        continue;
      }

      // Handle section separator
      if (line === '__SECTION_SEPARATOR__') {
        const sep = '<span class="section-separator"></span>';
        (foldBuffer ?? renderedLines).push(sep);
        continue;
      }

      let effectiveLanguage: Language = currentZone;

      if (this.language === 'html') {
        // Strip binding markers for tag detection
        const stripped = line.replace(/\$\{[\w-]+\}/g, '').replace(/\$\{\/[\w-]+\}/g, '').trim();

        // Closing tags: transition back to HTML
        if (currentZone === 'scss' && this.isClosingStyleTag(stripped)) {
          effectiveLanguage = 'html';
          currentZone = 'html';
        } else if (currentZone === 'typescript' && this.isClosingScriptTag(stripped)) {
          effectiveLanguage = 'html';
          currentZone = 'html';
        }

        // Opening tags: transition after this line
        if (currentZone === 'html') {
          if (this.isOpeningStyleTag(stripped) && !this.isClosingStyleTag(stripped)) {
            effectiveLanguage = 'html'; // the tag line itself is HTML
            currentZone = 'scss';
          } else if (this.isOpeningScriptTag(stripped) && !this.isClosingScriptTag(stripped)) {
            effectiveLanguage = 'html';
            currentZone = 'typescript';
          }
        }
      }

      const lineHtml = this.renderLine(line, commentStyle, blockCommentKeys, openBlockComments, this.showLineNumbers ? lineNumber : 0, effectiveLanguage);
      (foldBuffer ?? renderedLines).push(lineHtml);
      lineNumber++;
    }

    // Flush an unterminated fold buffer (defensive: malformed markers)
    if (foldBuffer) {
      renderedLines.push(this.buildFoldGroup(foldId, foldCollapsed, foldBuffer));
    }

    return renderedLines.join('');
  }

  /** Build a collapsible group: a clickable band (shown when collapsed) wrapping the section lines */
  private buildFoldGroup(id: string, collapsed: boolean, lines: string[]): string {
    const count = lines.length;
    const decorated = [...lines];
    // Preserve the user's expand/collapse choice across re-renders (binding edits re-render the
    // whole code); fall back to the marker default (${fold} collapsed / ${fold:open} expanded).
    const isCollapsed = this._foldState.has(id) ? this._foldState.get(id)! : collapsed;
    // Add a collapse chevron in the gutter of the first and last line of the block
    if (decorated.length > 0) {
      decorated[0] = this.injectFoldChevron(decorated[0], id, 'top');
      decorated[decorated.length - 1] = this.injectFoldChevron(decorated[decorated.length - 1], id, 'bottom');
    }
    // Band is a flex row [expand icon][text] so the icon and "⋯ N lines" can never overlap,
    // regardless of the gutter width. The icon is a double chevron (unfold), clearer than a caret.
    const band = `<span class="fold-band" role="button" tabindex="0" data-fold-toggle="${id}" aria-label="Expand ${count} hidden lines">` +
      `<span class="fold-band-icon" aria-hidden="true">${this.foldIconSvg('expand')}</span>` +
      `<span class="fold-band-text">&#8943; ${count} lines</span></span>`;
    return `<span class="fold-group${isCollapsed ? ' collapsed' : ''}" data-fold="${id}">${band}${decorated.join('')}</span>`;
  }

  /** SVG chevron icon used by the fold controls (stroke-based, scales crisply) */
  private foldIconSvg(kind: 'expand' | 'top' | 'bottom'): string {
    const polylines = {
      expand: '<polyline points="6 9 12 4 18 9"/><polyline points="6 15 12 20 18 15"/>', // up + down (unfold)
      top: '<polyline points="6 10 12 16 18 10"/>',    // points down
      bottom: '<polyline points="6 14 12 8 18 14"/>',  // points up
    }[kind];
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${polylines}</svg>`;
  }

  /** Insert a fold chevron into the gutter of a rendered line (absolute-positioned, no layout shift) */
  private injectFoldChevron(lineHtml: string, id: string, position: 'top' | 'bottom'): string {
    const chevron = `<span class="fold-chevron-gutter" role="button" tabindex="0" data-fold-toggle="${id}" aria-label="Collapse section">${this.foldIconSvg(position)}</span>`;
    return lineHtml.replace(/^(<span class="code-line[^"]*">)/, `$1${chevron}`);
  }

  /** Render a single line of code with bindings, highlighting, and optional line number */
  private renderLine(
    line: string,
    commentStyle: CommentStyle,
    blockCommentKeys: Set<string>,
    openBlockComments: Set<string>,
    lineNumber: number,
    effectiveLanguage: Language
  ): string {
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    let content = line.slice(indent.length);

    // Check if line starts with a comment binding (line toggle)
    // Only treat as line toggle if there's no corresponding ${/key} (not a block)
    let lineToggleBinding: CodeBindingElement | undefined;
    const lineToggleMatch = content.match(/^\$\{([\w-]+)\}/);
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

    // Process binding markers, block comments, and syntax highlighting
    const { processedContent, blockStartsOnLine, blockEndsOnLine } = this.processMarkers(content, commentStyle, blockCommentKeys, openBlockComments, effectiveLanguage);

    // Determine if line content should be grayed
    const hasActiveBlockStart = blockStartsOnLine.some(key => this.bindings.get(key)?.value === false);
    const hasActiveBlockEnd = blockEndsOnLine.some(key => this.bindings.get(key)?.value === false);
    const shouldGrayLine = isInsideActiveBlock || hasActiveBlockStart || hasActiveBlockEnd;

    return this.buildLineHtml(indent, processedContent, lineToggleBinding, shouldGrayLine, commentStyle, lineNumber);
  }

  /** Replace binding markers and block comment markers, apply syntax highlighting, then restore markers */
  private processMarkers(
    content: string,
    commentStyle: CommentStyle,
    blockCommentKeys: Set<string>,
    openBlockComments: Set<string>,
    effectiveLanguage: Language
  ): { processedContent: string; blockStartsOnLine: string[]; blockEndsOnLine: string[] } {
    let markerIndex = 0;
    const markers = new Map<string, string>();
    const blockStartsOnLine: string[] = [];
    const blockEndsOnLine: string[] = [];

    // Escaped markers: `\${...}` renders the literal `${...}` instead of being interpreted
    // (binding, block comment or fold). Used to document the component's own syntax.
    let processed = content.replace(/\\\$\{([^}]*)\}/g, (_, inner) => {
      const marker = `__ESCAPED_${markerIndex++}__`;
      markers.set(marker, `<span class="token-unknown">\${${this.escapeHtml(inner)}}</span>`);
      return marker;
    });

    // Handle bindings - capture optional ="value" for attribute type
    processed = processed.replace(/\$\{([\w-]+)\}(="[^"]*")?/g, (_, key, attrValue) => {
      const binding = this.bindings.get(key);
      if (binding?.type === 'comment' && blockCommentKeys.has(key)) {
        // This is a block comment start marker
        blockStartsOnLine.push(key);
        openBlockComments.add(key);
        const marker = `__COMMENT_START_${markerIndex++}__`;
        const isEnabled = binding.value === true;
        const toggleClass = isEnabled ? 'block-toggle-inactive' : 'block-toggle-active';
        const toggleHtml = `<span class="block-toggle inline-control ${toggleClass}" part="interactive" data-binding="${key}" data-action="toggle" role="button" tabindex="0" aria-label="Toggle block comment ${key}">${commentStyle.blockIndicator}</span>`;
        // The cosmetic space after "/* " is only useful when the toggle is inline;
        // in gutter mode the toggle moves to the rail, so the space would shift the indent.
        if (isEnabled || this._gutterActive) {
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
    processed = processed.replace(/\$\{\/([\w-]+)\}/g, (_, key) => {
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
      const marker = `__BINDING_${markerIndex++}__`;
      markers.set(marker, `<span class="token-unknown">\${/${key}}</span>`);
      return marker;
    });

    // Apply syntax highlighting
    processed = this.highlightSyntax(processed, effectiveLanguage);

    // Restore markers
    for (const [marker, html] of markers) {
      processed = processed.replace(marker, html);
    }

    return { processedContent: processed, blockStartsOnLine, blockEndsOnLine };
  }

  /** Build the final HTML for a single line */
  private buildLineHtml(
    indent: string,
    processedContent: string,
    lineToggleBinding: CodeBindingElement | undefined,
    shouldGrayLine: boolean,
    commentStyle: CommentStyle,
    lineNumber: number
  ): string {
    const lineNumHtml = lineNumber > 0 ? `<span class="line-number">${lineNumber}</span>` : '';

    if (lineToggleBinding) {
      const isEnabled = lineToggleBinding.value === true;
      const toggleClass = isEnabled ? 'line-toggle-inactive' : 'line-toggle-active';
      const toggleHtml = `<span class="line-toggle inline-control ${toggleClass}" part="interactive" data-binding="${lineToggleBinding.key}" data-action="toggle" role="button" tabindex="0" aria-label="Toggle line comment ${lineToggleBinding.key}">${commentStyle.lineIndicator}</span>`;
      const commentSuffix = this.language === 'html' && !isEnabled ? `<span class="token-comment">${commentStyle.blockEnd}</span>` : '';
      return `<span class="code-line${isEnabled ? '' : ' line-disabled'}">${lineNumHtml}<span class="indent">${indent}</span>${toggleHtml}${processedContent}${commentSuffix}</span>`;
    } else if (shouldGrayLine) {
      return `<span class="code-line line-disabled">${lineNumHtml}<span class="indent">${indent}</span>${processedContent}</span>`;
    } else {
      return `<span class="code-line">${lineNumHtml}<span class="indent">${indent}</span>${processedContent}</span>`;
    }
  }

  private renderBinding(binding: CodeBindingElement, attrValue?: string): string {
    const value = binding.value;
    const key = binding.key;
    const disabledClass = binding.disabled ? ' disabled' : '';
    const tabindex = binding.disabled ? '-1' : '0';

    // Escape values for safe HTML insertion (XSS prevention)
    const escValue = this.escapeHtml(String(value ?? ''));
    const escKey = this.escapeHtml(key);

    switch (binding.type) {
      case 'boolean':
        return `<span class="inline-control inline-boolean${disabledClass}" part="interactive" data-binding="${escKey}" data-action="toggle" role="button" tabindex="${tabindex}" aria-label="Toggle ${escKey}: ${escValue}">` +
          `<span class="token-keyword">${escValue}</span></span>`;

      case 'number':
        return `<span class="inline-control inline-number${disabledClass}" part="interactive" data-binding="${escKey}" data-action="edit-number" role="spinbutton" tabindex="${tabindex}" aria-label="Edit ${escKey}" aria-valuenow="${escValue}"${binding.min !== undefined ? ` aria-valuemin="${binding.min}"` : ''}${binding.max !== undefined ? ` aria-valuemax="${binding.max}"` : ''}>` +
          `<span class="token-number">${escValue}</span>` +
          `<input type="number" class="inline-number-input" id="num-${escKey}" data-binding="${escKey}" ` +
          `value="${escValue}" ${binding.min !== undefined ? `min="${binding.min}"` : ''} ` +
          `${binding.max !== undefined ? `max="${binding.max}"` : ''} ` +
          `${binding.step !== undefined ? `step="${binding.step}"` : ''}></span>`;

      case 'string':
        return `<span class="inline-control inline-string${disabledClass}" part="interactive" data-binding="${escKey}" data-action="edit-string" role="textbox" tabindex="${tabindex}" aria-label="Edit ${escKey}">` +
          `<span class="token-string">${escValue}</span>` +
          `<input type="text" class="inline-string-input" id="str-${escKey}" data-binding="${escKey}" ` +
          `value="${escValue}"></span>`;

      case 'select': {
        const options = binding.options;
        // Carousel mode: click to cycle through all options
        if (binding.carousel) {
          return `<span class="inline-control inline-select-carousel${disabledClass}" part="interactive" data-binding="${escKey}" data-action="toggle" role="button" tabindex="${tabindex}" aria-label="Cycle ${escKey}: ${escValue}">` +
            `<span class="token-string">${escValue}</span></span>`;
        }
        // For 2 options, render as toggle (like boolean)
        if (options.length === 2) {
          return `<span class="inline-control inline-select-toggle${disabledClass}" part="interactive" data-binding="${escKey}" data-action="toggle" role="button" tabindex="${tabindex}" aria-label="Toggle ${escKey}: ${escValue}">` +
            `<span class="token-string">${escValue}</span></span>`;
        }
        // For 3+ options, render as hidden dropdown that shows on click
        const optionsHtml = options
          .map(opt => {
            const escOpt = this.escapeHtml(opt);
            return `<option value="${escOpt}"${opt === value ? ' selected' : ''}>${escOpt}</option>`;
          })
          .join('');
        return `<span class="inline-control inline-select-wrapper${disabledClass}" part="interactive" data-binding="${escKey}" data-action="edit-select" role="listbox" tabindex="${tabindex}" aria-label="Select ${escKey}">` +
          `<span class="token-string">${escValue}</span>` +
          `<select class="inline-select-input" id="sel-${escKey}" data-binding="${escKey}">${optionsHtml}</select></span>`;
      }

      case 'color': {
        const escColor = this.escapeHtml(String(value || '#000000'));
        return `<span class="inline-control inline-color${disabledClass}" part="interactive" data-binding="${escKey}" data-action="edit-color" role="button" tabindex="${tabindex}" aria-label="Pick color ${escKey}: ${escValue}">` +
          `<span class="color-preview" style="background:${escColor}"></span>` +
          `<span class="token-string">${escValue}</span>` +
          `<input type="color" id="color-${escKey}" data-binding="${escKey}" value="${escColor}"></span>`;
      }

      case 'attribute': {
        const isActive = value === true;
        // If attrValue is provided (e.g., ="Mon Titre"), include it in the display
        const attrDisplay = attrValue
          ? `<span class="token-attr-name">${escKey}</span><span class="token-punctuation">=</span><span class="token-attr-value">${this.escapeHtml(attrValue.slice(1))}</span>`
          : `<span class="token-attr-name">${escKey}</span>`;
        return `<span class="inline-control inline-attribute${disabledClass}${isActive ? '' : ' attribute-disabled'}" part="interactive" data-binding="${escKey}" data-action="toggle" role="button" tabindex="${tabindex}" aria-label="Toggle attribute ${escKey}">${attrDisplay}</span>`;
      }

      case 'button':
        // Clickable action token — fires `change` on click (no value to edit).
        // `value` is the label (synthesized as `button<index>` when omitted).
        return `<span class="inline-control inline-button${disabledClass}" part="interactive" data-binding="${escKey}" data-action="trigger" role="button" tabindex="${tabindex}" aria-label="Run ${escKey}">` +
          `<span class="token-function">${escValue}</span></span>`;

      case 'readonly':
        return `<span class="token-value">${escValue}</span>`;

      default:
        return `${escValue}`;
    }
  }

  /**
   * Extract plain text from the rendered code for copy/download.
   * Collapsed (folded) lines are still included — folding is purely visual, the export is complete.
   * For JSON, comments are stripped so the exported content stays valid (RFC 8259).
   */
  private getPlainText(): string {
    const isJson = this.language === 'json';
    const lines: string[] = [];
    // querySelectorAll keeps document order, including lines nested inside fold groups.
    const lineEls = this.codeContainer.querySelectorAll('.code-line');
    lineEls.forEach(el => {
      // JSON: a commented-out line (line/block comment active) is dropped entirely.
      if (isJson && el.classList.contains('line-disabled')) return;
      const hadComment = isJson && el.querySelector('.token-comment, .line-toggle, .block-toggle, .block-end') !== null;
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.line-number, .fold-chevron-gutter').forEach(n => n.remove());
      // JSON: remove comment indicators/annotations from otherwise active lines.
      if (isJson) {
        clone.querySelectorAll('.line-toggle, .block-toggle, .block-end, .token-comment').forEach(n => n.remove());
      }
      const text = clone.textContent || '';
      // JSON: skip lines that became empty after stripping a comment (e.g. a full-line annotation).
      if (isJson && hadComment && text.trim() === '') return;
      lines.push(text);
    });
    return lines.join('\n');
  }

  /** Toggle the collapsed state of a fold group (CSS class only — no re-render) and remember it */
  private toggleFold(id: string | undefined) {
    if (!id) return;
    const group = this.shadow.querySelector(`.fold-group[data-fold="${id}"]`);
    if (!group) return;
    group.classList.toggle('collapsed');
    // Persist so a later re-render (e.g. editing a binding) keeps the user's choice
    this._foldState.set(id, group.classList.contains('collapsed'));
  }

  /** Download the code content as a file (full content, valid JSON when language="json") */
  private downloadFile() {
    const text = this.getPlainText();
    const blob = new Blob([text], { type: this.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Copy code content to clipboard with visual feedback */
  private copyToClipboard() {
    const text = this.getPlainText();
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.shadow.querySelector('.copy-button');
      if (!btn) return;
      btn.classList.add('copied');
      btn.setAttribute('aria-label', 'Copied!');
      if (this._copyTimeout) {
        clearTimeout(this._copyTimeout);
      }
      this._copyTimeout = setTimeout(() => {
        btn.classList.remove('copied');
        btn.setAttribute('aria-label', 'Copy code to clipboard');
        this._copyTimeout = null;
      }, 2000);
    }).catch(() => {
      // Clipboard access denied — fail silently
    });
  }

  private highlightSyntax(text: string, language: Language): string {
    switch (language) {
      case 'html':
        return this.highlightHtml(text);
      case 'scss':
        return this.highlightScss(text);
      case 'typescript':
        return this.highlightTypeScript(text);
      case 'shell':
        return this.highlightShell(text);
      case 'json':
        return this.highlightJson(text);
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
    // Highlight other attributes (spans use real " not &quot; so no conflict)
    result = result.replace(
      /(\[[\w.-]+\]|\([\w.-]+\)|[\w-]+)(=)(&quot;.*?&quot;)/g,
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

  private highlightJson(text: string): string {
    const markers = new Map<string, string>();
    let markerIndex = 0;

    // Protect strings first (markers contain only word chars, so later regexes skip them).
    // A string followed by a colon is a property key; otherwise it is a value.
    let processed = text.replace(/"(?:[^"\\]|\\.)*"(?=\s*:)/g, (match) => {
      const marker = `__JSONKEY_${markerIndex++}__`;
      markers.set(marker, `<span class="token-property">${this.escapeHtml(match)}</span>`);
      return marker;
    });
    processed = processed.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
      const marker = `__JSONVAL_${markerIndex++}__`;
      markers.set(marker, `<span class="token-string">${this.escapeHtml(match)}</span>`);
      return marker;
    });

    let result = this.escapeHtml(processed);
    // JSONC comments (display only — stripped from copy/download by getPlainText)
    result = result.replace(/(\/\/.*)$/gm, '<span class="token-comment">$1</span>');
    result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token-comment">$1</span>');
    // Literals
    result = result.replace(/\b(true|false|null)\b/g, '<span class="token-keyword">$1</span>');
    // Numbers (including negatives, decimals, exponents)
    result = result.replace(/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, '<span class="token-number">$&</span>');
    // Punctuation
    result = result.replace(/([{}\[\],:])/g, '<span class="token-punctuation">$1</span>');

    for (const [marker, html] of markers) {
      result = result.replace(marker, html);
    }
    return result;
  }

  private getStyles(): string {
    return `
      /* Color-scheme: inherit from parent by default, attribute overrides */
      :host([color-scheme="light"]) { color-scheme: light; }
      :host([color-scheme="dark"]) { color-scheme: dark; }

      :host {
        display: block;
        --code-interactive-color: inherit;
        --code-interactive-bg-color: transparent;
        --code-interactive-border-color: var(--code-interactive-highlight, light-dark(#20999d, #769aa5));
      }

      .code-block {
        margin: 0;
        padding: 16px;
        background: var(--code-bg, light-dark(#ffffff, #2b2d30));
        color: var(--code-text, light-dark(#000000, #a9b7c6));
        border-radius: var(--code-border-radius, 8px);
        overflow-x: auto;
        font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
        font-size: 13px;
        line-height: 1.5;
        position: relative;
      }

      .code-block code {
        display: block;
        /* Gutter rail = [control slot][number slot]. The control slot (fold chevrons +
           comment toggles) widens for HTML to fit "<!--". Slots collapse to 0 when unused. */
        --_ctrl-slot: 1.8em;
        --_num-slot: 2.4em;
        --_ctrl: 0em;
        --_num: 0em;
      }

      .code-block code.lang-html {
        --_ctrl-slot: 3.2em; /* room for the wider <!-- indicator */
      }

      .code-block code.has-controls {
        --_ctrl: var(--code-gutter-width, var(--_ctrl-slot));
      }

      .code-block code.has-numbers {
        --_num: var(--_num-slot);
      }

      .code-line {
        display: block;
        min-height: 1.5em;
        position: relative;
      }

      /* When the component has line numbers, folds or comment toggles, every line reserves
         a fixed-width left gutter: control column first, then numbers, then the code (which
         keeps its natural indentation regardless of comment state). */
      code.has-gutter .code-line {
        padding-left: calc(var(--_ctrl) + var(--_num));
      }

      .section-separator {
        display: block;
        height: 1px;
        background: var(--code-separator-color, light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1)));
        margin: 8px 0;
      }

      .indent {
        white-space: pre;
      }

      .line-disabled {
        color: var(--code-comment-color, #808080);
      }

      .line-disabled [class*="token-"] {
        color: inherit;
      }

      /* Token colors — IntelliJ (Light / Darcula) defaults */
      .token-keyword { color: var(--token-keyword, light-dark(#000080, #cc7832)); }
      .token-string { color: var(--token-string, light-dark(#008000, #6a8759)); }
      .token-number { color: var(--token-number, light-dark(#0000ff, #6897bb)); }
      .token-comment { color: var(--token-comment, #808080); }
      .token-tag { color: var(--token-tag, light-dark(#000080, #e8bf6a)); }
      .token-attr-name { color: var(--token-attr-name, light-dark(#0000ff, #bababa)); }
      .token-attr-value { color: var(--token-attr-value, light-dark(#008000, #6a8759)); }
      .token-punctuation { color: var(--token-punctuation, light-dark(#000000, #a9b7c6)); }
      .token-property { color: var(--token-property, light-dark(#660e7a, #9876aa)); }
      .token-variable { color: var(--token-variable, light-dark(#000000, #a9b7c6)); }
      .token-function { color: var(--token-function, light-dark(#00627a, #ffc66d)); }
      .token-decorator { color: var(--token-decorator, light-dark(#808000, #bbb529)); }
      .token-type { color: var(--token-type, light-dark(#20999d, #769aa5)); }
      .token-class-name { color: var(--token-class-name, light-dark(#20999d, #769aa5)); }
      .token-template-string { color: var(--token-template-string, light-dark(#008000, #6a8759)); }
      .token-value { color: var(--token-value, light-dark(#000000, #a9b7c6)); }
      .token-unknown { color: var(--token-unknown, light-dark(#20999d, #769aa5)); }
      .token-binding-key { color: var(--token-binding-key, light-dark(#20999d, #769aa5)); }

      /* Interactive controls — decoration customizable via CSS custom properties and ::part(interactive) */
      .inline-control {
        cursor: pointer;
        transition: background 0.15s ease;
        color: var(--code-interactive-color, inherit);
        text-decoration: var(--code-interactive-text-decoration, underline wavy var(--code-interactive-highlight, light-dark(#20999d, #769aa5)));
        text-underline-offset: var(--code-interactive-text-underline-offset, 3px);
        border-radius: var(--code-interactive-border-radius, 3px);
        border: var(--code-interactive-border, none);
        outline: var(--code-interactive-outline, none);
        outline-offset: var(--code-interactive-outline-offset, 0px);
        background: var(--code-interactive-background, transparent);
      }

      .inline-control:hover {
        background: var(--code-hover-bg, light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.1)));
        box-shadow: var(--code-interactive-hover-shadow, none);
      }

      .inline-control:focus-visible {
        outline: 2px solid var(--code-focus-outline, light-dark(#0065a9, #214283));
        outline-offset: 1px;
      }

      .inline-control.disabled {
        opacity: 0.5;
        text-decoration: none;
        cursor: default;
      }

      .inline-control.disabled:hover {
        background: transparent;
      }

      .line-toggle,
      .block-toggle {
        margin-right: 4px;
        padding: var(--code-interactive-padding, 0 2px);
      }

      /* In gutter mode, comment/block toggles move into the control column at the far left
         of the rail (before the line numbers), out of flow so the code keeps its indentation.
         They are gutter chrome, so external ::part(interactive) box decoration (padding/border)
         is neutralized to keep their width predictable — an internal !important beats outer ::part. */
      code.has-gutter .line-toggle,
      code.has-gutter .block-toggle {
        position: absolute;
        left: 0.2em;
        white-space: pre;
        margin: 0 !important;
        padding: 0 2px !important;
        border: none !important;
      }

      .block-end {
        margin-left: 4px;
        padding: 0 2px;
      }

      .line-toggle-inactive,
      .block-toggle-inactive,
      .block-end.block-toggle-inactive {
        opacity: 0.3;
        color: var(--code-comment-color, #808080);
      }

      .line-toggle-active,
      .block-toggle-active,
      .block-end.block-toggle-active {
        color: var(--code-interactive-highlight, light-dark(#20999d, #769aa5));
      }

      /* Attribute binding - strikethrough when disabled */
      .inline-attribute {
        padding: var(--code-interactive-padding, 0 2px);
      }

      .inline-attribute.attribute-disabled {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .inline-boolean,
      .inline-number,
      .inline-string,
      .inline-select-toggle,
      .inline-select-carousel,
      .inline-button {
        padding: var(--code-interactive-padding, 0 4px);
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
        background: var(--code-input-bg, light-dark(#f2f2f2, #313335));
        border: 1px solid var(--code-input-border, light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)));
        color: var(--token-number, light-dark(#0000ff, #6897bb));
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
        border-color: var(--code-focus-outline, light-dark(#0065a9, #214283));
      }

      .inline-string-input {
        width: 120px;
        color: var(--token-string, light-dark(#008000, #6a8759));
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
        background: var(--code-input-bg, light-dark(#f2f2f2, #313335));
        border: 1px solid var(--code-input-border, light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.2)));
        color: var(--token-string, light-dark(#008000, #6a8759));
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
        border-color: var(--code-focus-outline, light-dark(#0065a9, #214283));
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
        border: 1px solid var(--code-color-preview-border, light-dark(rgba(0,0,0,0.2), rgba(255,255,255,0.3)));
        vertical-align: middle;
      }

      /* Action buttons (copy / download) - top-right corner, hidden by default */
      .code-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        gap: 4px;
        z-index: 10;
      }

      .action-button {
        background: transparent;
        border: 1px solid var(--code-copy-border, light-dark(rgba(0,0,0,0.15), rgba(255,255,255,0.2)));
        border-radius: 4px;
        color: var(--code-copy-color, light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5)));
        cursor: pointer;
        padding: 4px;
        display: none;
        align-items: center;
        justify-content: center;
        transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        line-height: 0;
      }

      :host([show-copy]) .copy-button {
        display: flex;
      }

      :host([show-download]) .download-button {
        display: flex;
      }

      .action-button:hover {
        color: var(--code-text, light-dark(#000000, #a9b7c6));
        border-color: var(--code-copy-color, light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5)));
        background: var(--code-hover-bg, light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.1)));
      }

      .action-button:focus-visible {
        outline: 2px solid var(--code-focus-outline, light-dark(#0065a9, #214283));
        outline-offset: 1px;
      }

      .copy-button .check-icon {
        display: none;
      }

      .copy-button.copied .copy-icon {
        display: none;
      }

      .copy-button.copied .check-icon {
        display: block;
      }

      .copy-button.copied {
        color: var(--code-copy-accent, light-dark(#20999d, #769aa5));
        border-color: var(--code-copy-accent, light-dark(#20999d, #769aa5));
      }

      /* Fold sections (rendered from fold markers) */
      .fold-group {
        display: block;
      }

      /* Flex row [icon][text] — icon and "⋯ N lines" can never overlap, whatever the gutter width */
      .fold-band {
        display: none;
        align-items: center;
        gap: 0.45em;
        cursor: pointer;
        user-select: none;
        color: var(--code-line-number, light-dark(rgba(0,0,0,0.5), rgba(255,255,255,0.45)));
        padding: 1px 6px 1px 0.1em;
        border-radius: var(--code-interactive-border-radius, 3px);
      }

      .fold-band-icon {
        display: inline-flex;
        align-items: center;
      }

      .fold-band-icon svg {
        width: 15px;
        height: 15px;
      }

      .fold-band:hover {
        background: var(--code-hover-bg, light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.1)));
        color: var(--code-text, light-dark(#000000, #a9b7c6));
      }

      .fold-band:focus-visible {
        outline: 2px solid var(--code-focus-outline, light-dark(#0065a9, #214283));
        outline-offset: 1px;
      }

      .fold-group.collapsed > .code-line {
        display: none;
      }

      /* flex (not inline-flex) so the band fills the whole row — the entire line is clickable */
      .fold-group.collapsed > .fold-band {
        display: flex;
      }

      /* Collapse chevrons sit at the far left of the gutter rail, without shifting line content */
      .fold-chevron-gutter {
        position: absolute;
        left: 0.15em;
        top: 50%;
        transform: translateY(-50%);
        display: inline-flex;
        cursor: pointer;
        user-select: none;
        color: var(--code-line-number, light-dark(rgba(0,0,0,0.5), rgba(255,255,255,0.4)));
      }

      .fold-chevron-gutter svg {
        width: 13px;
        height: 13px;
      }

      .fold-chevron-gutter:hover {
        color: var(--code-text, light-dark(#000000, #a9b7c6));
      }

      .fold-chevron-gutter:focus-visible {
        outline: 2px solid var(--code-focus-outline, light-dark(#0065a9, #214283));
        outline-offset: 1px;
      }

      /* Line numbers — absolutely positioned in the left part of the gutter rail */
      .line-number {
        color: var(--code-line-number, light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.25)));
        user-select: none;
        font-variant-numeric: tabular-nums;
      }

      code.has-gutter .line-number {
        position: absolute;
        left: var(--_ctrl);
        width: calc(var(--_num) - 0.6em);
        text-align: right;
      }
    `;
  }
}
