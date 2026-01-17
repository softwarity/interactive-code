import { CodeBindingElement } from './code-binding.element';
import { InteractiveCodeElement } from './interactive-code.element';

// Register custom elements
export function registerInteractiveCode() {
  if (!customElements.get('code-binding')) {
    customElements.define('code-binding', CodeBindingElement);
  }
  if (!customElements.get('interactive-code')) {
    customElements.define('interactive-code', InteractiveCodeElement);
  }
}

// Auto-register when module is imported
registerInteractiveCode();

// Re-export for type usage
export { CodeBindingElement, InteractiveCodeElement };
export type { BindingType } from './code-binding.element';
