type Language = 'html' | 'scss' | 'typescript' | 'shell';
export declare class InteractiveCodeElement extends HTMLElement {
    static observedAttributes: string[];
    private shadow;
    private codeContainer;
    private templateContent;
    private conditionalContents;
    private bindings;
    private _code;
    private _initialized;
    private _internalChange;
    private _observer;
    private _fallbackTimeout;
    private _copyTimeout;
    private _boundChangeHandler;
    private _boundShadowClickHandler;
    private _boundShadowChangeHandler;
    private _boundShadowInputHandler;
    private _boundShadowKeydownHandler;
    constructor();
    get language(): Language;
    /** Whether to show separators between concatenated textarea sections */
    get showSeparators(): boolean;
    /** Whether to show line numbers */
    get showLineNumbers(): boolean;
    /** Whether to show the copy button */
    get showCopy(): boolean;
    /** Code content (alternative to <textarea> child) */
    get code(): string | null;
    set code(value: string | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void;
    private render;
    private extractTemplate;
    private updateTemplateContent;
    private evaluateCondition;
    private collectBindings;
    /** Check if a binding key is used in any conditional textarea */
    private hasConditionDependency;
    private setupEventListeners;
    private _handleChange;
    private _handleShadowClick;
    private _handleShadowChange;
    /** Consolidated input handler for number, string, and color inputs */
    private _handleShadowInput;
    private _handleInlineNumberInput;
    private _handleInlineStringInput;
    private _handleInlineColorInput;
    /** Keyboard navigation for interactive controls */
    private _handleShadowKeydown;
    private handleAction;
    private updateCode;
    private getCommentStyle;
    /** Extract the set of binding keys that have block comment end markers ${/key} */
    private findBlockCommentKeys;
    private renderTemplate;
    /** Render a single line of code with bindings, highlighting, and optional line number */
    private renderLine;
    /** Replace binding markers and block comment markers, apply syntax highlighting, then restore markers */
    private processMarkers;
    /** Build the final HTML for a single line */
    private buildLineHtml;
    private renderBinding;
    /** Extract plain text from the rendered code, excluding line numbers */
    private getPlainText;
    /** Copy code content to clipboard with visual feedback */
    private copyToClipboard;
    private highlightSyntax;
    private escapeHtml;
    private highlightHtml;
    private highlightScss;
    private highlightTypeScript;
    private highlightShell;
    private getStyles;
}
export {};
