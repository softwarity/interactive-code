type Language = 'html' | 'scss' | 'typescript' | 'shell' | 'json';
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
    private _gutterActive;
    private _foldState;
    private _observer;
    private _fallbackTimeout;
    private _copyTimeout;
    private _boundChangeHandler;
    private _boundShadowMousedownHandler;
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
    /** Whether to show the download button */
    get showDownload(): boolean;
    /** File name used by the download button (defaults to snippet.<ext>) */
    get downloadName(): string;
    /** File extension matching the current language */
    private get fileExtension();
    /** MIME type matching the current language */
    private get mimeType();
    /** Color scheme (light or dark mode) */
    get colorScheme(): string;
    /** Code content (alternative to <textarea> child) */
    get code(): string | null;
    set code(value: string | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    private render;
    private extractTemplate;
    private updateTemplateContent;
    private evaluateCondition;
    private collectBindings;
    /** Check if a binding key is used in any conditional textarea */
    private hasConditionDependency;
    private setupEventListeners;
    private _handleChange;
    private _handleShadowMousedown;
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
    private isOpeningStyleTag;
    private isClosingStyleTag;
    private isOpeningScriptTag;
    private isClosingScriptTag;
    private renderTemplate;
    /** Build a collapsible group: a clickable band (shown when collapsed) wrapping the section lines */
    private buildFoldGroup;
    /** SVG chevron icon used by the fold controls (stroke-based, scales crisply) */
    private foldIconSvg;
    /** Insert a fold chevron into the gutter of a rendered line (absolute-positioned, no layout shift) */
    private injectFoldChevron;
    /** Render a single line of code with bindings, highlighting, and optional line number */
    private renderLine;
    /** Replace binding markers and block comment markers, apply syntax highlighting, then restore markers */
    private processMarkers;
    /** Build the final HTML for a single line */
    private buildLineHtml;
    private renderBinding;
    /**
     * Extract plain text from the rendered code for copy/download.
     * Collapsed (folded) lines are still included — folding is purely visual, the export is complete.
     * For JSON, comments are stripped so the exported content stays valid (RFC 8259).
     */
    private getPlainText;
    /** Toggle the collapsed state of a fold group (CSS class only — no re-render) and remember it */
    private toggleFold;
    /** Download the code content as a file (full content, valid JSON when language="json") */
    private downloadFile;
    /** Copy code content to clipboard with visual feedback */
    private copyToClipboard;
    private highlightSyntax;
    private escapeHtml;
    private highlightHtml;
    private highlightScss;
    private highlightTypeScript;
    private highlightShell;
    private highlightJson;
    private getStyles;
}
export {};
