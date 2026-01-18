export type BindingType = 'boolean' | 'number' | 'string' | 'select' | 'color' | 'comment' | 'attribute' | 'readonly';
/**
 * <code-binding> Web Component
 *
 * Represents a binding in interactive code. Emits 'change' events when value changes.
 *
 * @example
 * <code-binding
 *   key="width"
 *   type="number"
 *   value="72"
 *   min="56"
 *   max="120">
 * </code-binding>
 *
 * @fires change - Fired when value changes, detail contains the new value
 */
export declare class CodeBindingElement extends HTMLElement {
    static observedAttributes: string[];
    private _value;
    private _disabled;
    private _connected;
    get key(): string;
    get type(): BindingType;
    get min(): number | undefined;
    get max(): number | undefined;
    get step(): number | undefined;
    get options(): string[];
    get value(): any;
    set value(v: any);
    get disabled(): boolean;
    set disabled(v: boolean);
    connectedCallback(): void;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    private parseValue;
    private emitChange;
    /** Toggle boolean/comment/attribute value or cycle through select options */
    toggle(): void;
    /** Increment number value */
    increment(): void;
    /** Decrement number value */
    decrement(): void;
}
