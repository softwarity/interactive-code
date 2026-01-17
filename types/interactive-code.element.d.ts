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
export declare class InteractiveCodeElement extends HTMLElement {
    private shadow;
    private codeContainer;
    private templateContent;
    private bindings;
    private _code;
    private _initialized;
    private _internalChange;
    constructor();
    get language(): Language;
    /** Code content (alternative to <textarea> child) */
    get code(): string | null;
    set code(value: string | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private render;
    private extractTemplate;
    private collectBindings;
    private setupEventListeners;
    private handleAction;
    private updateCode;
    private renderTemplate;
    private renderBinding;
    private highlightSyntax;
    private escapeHtml;
    private highlightHtml;
    private highlightScss;
    private highlightTypeScript;
    private highlightShell;
    private getStyles;
}
export {};
