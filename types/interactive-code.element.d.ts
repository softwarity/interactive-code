type Language = 'html' | 'scss' | 'typescript' | 'shell';
export declare class InteractiveCodeElement extends HTMLElement {
    private shadow;
    private codeContainer;
    private templateContent;
    private conditionalContents;
    private bindings;
    private _code;
    private _initialized;
    private _internalChange;
    constructor();
    get language(): Language;
    /** Whether to show separators between concatenated textarea sections */
    get showSeparators(): boolean;
    /** Code content (alternative to <textarea> child) */
    get code(): string | null;
    set code(value: string | null);
    connectedCallback(): void;
    disconnectedCallback(): void;
    private render;
    private extractTemplate;
    private updateTemplateContent;
    private evaluateCondition;
    private collectBindings;
    private setupEventListeners;
    private handleAction;
    private updateCode;
    private getCommentStyle;
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
