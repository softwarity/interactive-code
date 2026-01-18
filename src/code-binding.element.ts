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
export class CodeBindingElement extends HTMLElement {
  static observedAttributes = ['value', 'disabled'];

  private _value: any;
  private _disabled = false;
  private _connected = false;

  // Getters for attributes
  get key(): string { return this.getAttribute('key') || ''; }
  get type(): BindingType { return (this.getAttribute('type') as BindingType) || 'readonly'; }
  get min(): number | undefined {
    const v = this.getAttribute('min');
    return v !== null ? Number(v) : undefined;
  }
  get max(): number | undefined {
    const v = this.getAttribute('max');
    return v !== null ? Number(v) : undefined;
  }
  get step(): number | undefined {
    const v = this.getAttribute('step');
    return v !== null ? Number(v) : undefined;
  }
  get options(): string[] {
    const v = this.getAttribute('options');
    return v ? v.split(',').map(s => s.trim()) : [];
  }

  get value(): any { return this._value; }
  set value(v: any) {
    const oldValue = this._value;
    this._value = this.parseValue(v);
    if (oldValue !== this._value) {
      this.emitChange();
    }
  }

  get disabled(): boolean { return this._disabled; }
  set disabled(v: boolean) {
    this._disabled = v === true || v === 'true' as any;
  }

  connectedCallback() {
    // Parse initial value from attribute
    const valueAttr = this.getAttribute('value');
    if (valueAttr !== null) {
      this._value = this.parseValue(valueAttr);
    }
    // Parse initial disabled state
    this._disabled = this.hasAttribute('disabled');
    this._connected = true;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'value' && newValue !== null) {
      const parsed = this.parseValue(newValue);
      if (this._value !== parsed) {
        this._value = parsed;
        // Only emit change after connected
        if (this._connected) {
          this.emitChange();
        }
      }
    } else if (name === 'disabled') {
      this._disabled = newValue !== null;
    }
  }

  private parseValue(v: any): any {
    if (v === null || v === undefined) return undefined;

    switch (this.type) {
      case 'boolean':
      case 'comment':
      case 'attribute':
        return v === 'true' || v === true;
      case 'number':
        return typeof v === 'number' ? v : Number(v);
      case 'color':
      case 'select':
      default:
        return String(v);
    }
  }

  private emitChange() {
    // Create CustomEvent with value in detail
    const event = new CustomEvent('change', {
      detail: this._value,
      bubbles: true,
      composed: true
    });

    // Support inline onchange attribute: onchange="handler(e)" where e is the CustomEvent
    // Use e.detail to get the value (consistent with addEventListener)
    const onchangeAttr = this.getAttribute('onchange');
    if (onchangeAttr) {
      const fn = new Function('e', onchangeAttr);
      fn.call(this, event);
    }

    // Dispatch for addEventListener
    this.dispatchEvent(event);
  }

  /** Toggle boolean/comment/attribute value or cycle through select options */
  toggle() {
    if (this._disabled) return;
    if (this.type === 'boolean' || this.type === 'comment' || this.type === 'attribute') {
      this.value = !this._value;
    } else if (this.type === 'select') {
      const opts = this.options;
      if (opts.length > 0) {
        const currentIndex = opts.indexOf(this._value);
        const nextIndex = (currentIndex + 1) % opts.length;
        this.value = opts[nextIndex];
      }
    }
  }

  /** Increment number value */
  increment() {
    if (this._disabled) return;
    if (this.type === 'number') {
      const step = this.step ?? 1;
      const max = this.max;
      let newValue = (this._value || 0) + step;
      if (max !== undefined && newValue > max) newValue = max;
      this.value = newValue;
    }
  }

  /** Decrement number value */
  decrement() {
    if (this._disabled) return;
    if (this.type === 'number') {
      const step = this.step ?? 1;
      const min = this.min;
      let newValue = (this._value || 0) - step;
      if (min !== undefined && newValue < min) newValue = min;
      this.value = newValue;
    }
  }
}
