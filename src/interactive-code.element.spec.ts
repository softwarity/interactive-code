import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';
import { InteractiveCodeElement } from './interactive-code.element';
import { CodeBindingElement } from './code-binding.element';

// Register custom elements before tests
beforeAll(() => {
  if (!customElements.get('code-binding')) {
    customElements.define('code-binding', CodeBindingElement);
  }
  if (!customElements.get('interactive-code')) {
    customElements.define('interactive-code', InteractiveCodeElement);
  }
});

describe('InteractiveCodeElement', () => {
  let element: InteractiveCodeElement;

  beforeEach(() => {
    element = document.createElement('interactive-code') as InteractiveCodeElement;
  });

  afterEach(() => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  describe('language attribute', () => {
    it('should default to "html"', () => {
      expect(element.language).toBe('html');
    });

    it('should return the language attribute value', () => {
      element.setAttribute('language', 'typescript');
      expect(element.language).toBe('typescript');
    });
  });

  describe('code property', () => {
    it('should be null by default', () => {
      expect(element.code).toBeNull();
    });

    it('should update template content when set', () => {
      element.code = 'const x = 1;';
      expect(element.code).toBe('const x = 1;');
    });

    it('should render code when set after connected', async () => {
      document.body.appendChild(element);
      element.code = 'const x = 1;';

      await new Promise(resolve => setTimeout(resolve, 150));

      const shadowCode = element.shadowRoot?.querySelector('code');
      expect(shadowCode?.textContent).toContain('const');
    });
  });

  describe('Shadow DOM', () => {
    it('should have a shadow root', () => {
      document.body.appendChild(element);
      expect(element.shadowRoot).not.toBeNull();
    });

    it('should contain a pre > code structure', () => {
      document.body.appendChild(element);
      const pre = element.shadowRoot?.querySelector('pre.code-block');
      const code = pre?.querySelector('code');
      expect(pre).not.toBeNull();
      expect(code).not.toBeNull();
    });

    it('should contain styles', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('.code-block');
    });
  });

  describe('template extraction', () => {
    it('should extract content from textarea', async () => {
      element.innerHTML = `
        <textarea>const x = 1;</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const shadowCode = element.shadowRoot?.querySelector('code');
      expect(shadowCode?.textContent).toContain('const');
    });

    it('should hide the textarea', async () => {
      element.innerHTML = `
        <textarea>const x = 1;</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const textarea = element.querySelector('textarea');
      expect(textarea?.style.display).toBe('none');
    });

    it('should extract content from template element', async () => {
      element.innerHTML = `
        <template>const y = 2;</template>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const shadowCode = element.shadowRoot?.querySelector('code');
      expect(shadowCode?.textContent).toContain('const');
    });

    it('should prefer code property over textarea', async () => {
      element.innerHTML = `
        <textarea>const x = 1;</textarea>
      `;
      element.code = 'let z = 3;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const shadowCode = element.shadowRoot?.querySelector('code');
      expect(shadowCode?.textContent).toContain('let');
      expect(shadowCode?.textContent).not.toContain('const x');
    });
  });

  describe('binding integration', () => {
    it('should collect code-binding children', async () => {
      element.innerHTML = `
        <textarea>\${myVar}</textarea>
        <code-binding key="myVar" type="string" value="hello"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const shadowCode = element.shadowRoot?.querySelector('code');
      expect(shadowCode?.textContent).toContain('hello');
    });

    it('should render boolean binding as keyword', async () => {
      element.innerHTML = `
        <textarea>\${enabled}</textarea>
        <code-binding key="enabled" type="boolean" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyword = element.shadowRoot?.querySelector('.token-keyword');
      expect(keyword?.textContent).toBe('true');
    });

    it('should render number binding with input', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="42"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const numberToken = element.shadowRoot?.querySelector('.token-number');
      expect(numberToken?.textContent).toBe('42');

      const input = element.shadowRoot?.querySelector('input[type="number"]');
      expect(input).not.toBeNull();
    });

    it('should render string binding with input', async () => {
      element.innerHTML = `
        <textarea>\${name}</textarea>
        <code-binding key="name" type="string" value="test"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const stringToken = element.shadowRoot?.querySelector('.token-string');
      expect(stringToken?.textContent).toContain('test');

      const input = element.shadowRoot?.querySelector('input[type="text"]');
      expect(input).not.toBeNull();
    });

    it('should render select binding with 2 options as toggle', async () => {
      element.innerHTML = `
        <textarea>\${size}</textarea>
        <code-binding key="size" type="select" options="small, large" value="small"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.inline-select-toggle');
      expect(toggle).not.toBeNull();
    });

    it('should render select binding with 3+ options as dropdown', async () => {
      element.innerHTML = `
        <textarea>\${size}</textarea>
        <code-binding key="size" type="select" options="small, medium, large" value="small"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const select = element.shadowRoot?.querySelector('select');
      expect(select).not.toBeNull();
      expect(select?.options.length).toBe(3);
    });

    it('should render color binding with color input', async () => {
      element.innerHTML = `
        <textarea>\${color}</textarea>
        <code-binding key="color" type="color" value="#ff0000"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const colorInput = element.shadowRoot?.querySelector('input[type="color"]');
      expect(colorInput).not.toBeNull();

      const colorPreview = element.shadowRoot?.querySelector('.color-preview');
      expect(colorPreview).not.toBeNull();
    });

    it('should render attribute binding when true', async () => {
      element.innerHTML = `
        <textarea>\${disabled}</textarea>
        <code-binding key="disabled" type="attribute" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const attrControl = element.shadowRoot?.querySelector('.inline-attribute');
      expect(attrControl).not.toBeNull();
      expect(attrControl?.classList.contains('attribute-disabled')).toBe(false);

      const attrName = element.shadowRoot?.querySelector('.token-attr-name');
      expect(attrName?.textContent).toBe('disabled');
    });

    it('should render attribute binding with strikethrough when false', async () => {
      element.innerHTML = `
        <textarea>\${disabled}</textarea>
        <code-binding key="disabled" type="attribute" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const attrControl = element.shadowRoot?.querySelector('.inline-attribute');
      expect(attrControl).not.toBeNull();
      expect(attrControl?.classList.contains('attribute-disabled')).toBe(true);
    });

    it('should render readonly binding as simple value', async () => {
      element.innerHTML = `
        <textarea>\${info}</textarea>
        <code-binding key="info" type="readonly" value="static"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const value = element.shadowRoot?.querySelector('.token-value');
      expect(value?.textContent).toBe('static');
    });

    it('should render unknown binding with error style', async () => {
      element.innerHTML = `
        <textarea>\${unknown}</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const unknown = element.shadowRoot?.querySelector('.token-unknown');
      expect(unknown?.textContent).toContain('unknown');
    });
  });

  describe('syntax highlighting - HTML', () => {
    it('should highlight HTML tags', async () => {
      element.setAttribute('language', 'html');
      element.code = '<div class="test">Hello</div>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const tags = element.shadowRoot?.querySelectorAll('.token-tag');
      expect(tags?.length).toBeGreaterThan(0);
    });

    it('should highlight HTML attributes', async () => {
      element.setAttribute('language', 'html');
      element.code = '<div class="test"></div>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const attrName = element.shadowRoot?.querySelector('.token-attr-name');
      const attrValue = element.shadowRoot?.querySelector('.token-attr-value');
      expect(attrName).not.toBeNull();
      expect(attrValue).not.toBeNull();
    });

    it('should highlight HTML comments', async () => {
      element.setAttribute('language', 'html');
      element.code = '<!-- comment -->';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const comment = element.shadowRoot?.querySelector('.token-comment');
      expect(comment).not.toBeNull();
    });
  });

  describe('syntax highlighting - SCSS', () => {
    it('should highlight SCSS variables', async () => {
      element.setAttribute('language', 'scss');
      element.code = '$color: red;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const variable = element.shadowRoot?.querySelector('.token-variable');
      expect(variable?.textContent).toContain('$color');
    });

    it('should highlight SCSS keywords (@import, @mixin, etc.)', async () => {
      element.setAttribute('language', 'scss');
      element.code = '@import "file";';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyword = element.shadowRoot?.querySelector('.token-keyword');
      expect(keyword?.textContent).toContain('@import');
    });

    it('should highlight SCSS properties', async () => {
      element.setAttribute('language', 'scss');
      element.code = 'color: red;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const property = element.shadowRoot?.querySelector('.token-property');
      expect(property).not.toBeNull();
    });

    it('should highlight SCSS comments', async () => {
      element.setAttribute('language', 'scss');
      element.code = '// comment';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const comment = element.shadowRoot?.querySelector('.token-comment');
      expect(comment).not.toBeNull();
    });
  });

  describe('syntax highlighting - TypeScript', () => {
    it('should highlight TypeScript keywords', async () => {
      element.setAttribute('language', 'typescript');
      element.code = 'const x = 1;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const keyword = element.shadowRoot?.querySelector('.token-keyword');
      expect(keyword?.textContent).toBe('const');
    });

    it('should highlight TypeScript strings', async () => {
      element.setAttribute('language', 'typescript');
      element.code = "const x = 'hello';";
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const string = element.shadowRoot?.querySelector('.token-string');
      expect(string).not.toBeNull();
    });

    it('should highlight TypeScript numbers', async () => {
      element.setAttribute('language', 'typescript');
      element.code = 'const x = 42;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const number = element.shadowRoot?.querySelector('.token-number');
      expect(number?.textContent).toBe('42');
    });

    it('should highlight TypeScript comments', async () => {
      element.setAttribute('language', 'typescript');
      element.code = '// comment';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const comment = element.shadowRoot?.querySelector('.token-comment');
      expect(comment).not.toBeNull();
    });
  });

  describe('syntax highlighting - Shell', () => {
    it('should highlight shell commands', async () => {
      element.setAttribute('language', 'shell');
      element.code = 'npm install package';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const func = element.shadowRoot?.querySelector('.token-function');
      expect(func?.textContent).toContain('npm');
    });

    it('should highlight shell flags', async () => {
      element.setAttribute('language', 'shell');
      element.code = 'npm install --save-dev';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const variable = element.shadowRoot?.querySelector('.token-variable');
      expect(variable?.textContent).toContain('--save-dev');
    });

    it('should highlight shell comments', async () => {
      element.setAttribute('language', 'shell');
      element.code = '# comment';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const comment = element.shadowRoot?.querySelector('.token-comment');
      expect(comment).not.toBeNull();
    });
  });

  describe('comment binding (line toggle)', () => {
    it('should render checkbox for comment binding', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle');
      expect(toggle).not.toBeNull();
    });

    it('should show inactive (grayed) indicator when line is not commented', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle-inactive');
      expect(toggle).not.toBeNull();
      expect(toggle?.textContent).toContain('//');
    });

    it('should show active (visible) indicator when line is commented', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle-active');
      expect(toggle).not.toBeNull();
      expect(toggle?.textContent).toContain('//');
    });

    it('should add comment prefix when disabled', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const line = element.shadowRoot?.querySelector('.line-disabled');
      expect(line).not.toBeNull();
      expect(line?.textContent).toContain('//');
    });

    it('should use # for shell line comments', async () => {
      element.setAttribute('language', 'shell');
      element.innerHTML = `
        <textarea>\${toggle}echo hello</textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const line = element.shadowRoot?.querySelector('.line-disabled');
      expect(line).not.toBeNull();
      expect(line?.textContent).toContain('#');
      expect(line?.textContent).not.toContain('//');
    });

    it('should use <!-- --> for HTML line comments', async () => {
      element.setAttribute('language', 'html');
      element.innerHTML = `
        <textarea>\${toggle}<div>content</div></textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const line = element.shadowRoot?.querySelector('.line-disabled');
      expect(line).not.toBeNull();
      expect(line?.textContent).toContain('<!--');
      expect(line?.textContent).toContain('-->');
    });

    it('should use // for typescript line comments', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>\${toggle}const x = 1;</textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const line = element.shadowRoot?.querySelector('.line-disabled');
      expect(line).not.toBeNull();
      expect(line?.textContent).toContain('//');
    });
  });

  describe('block comment syntax', () => {
    it('should render block comment delimiters when disabled', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>\${block}const x = 1;\${/block}</textarea>
        <code-binding key="block" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code');
      expect(code?.textContent).toContain('/*');
      expect(code?.textContent).toContain('*/');
    });

    it('should show inactive block indicators when enabled (not commented)', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>\${block}const x = 1;\${/block}</textarea>
        <code-binding key="block" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggleStart = element.shadowRoot?.querySelector('.block-toggle-inactive');
      expect(toggleStart).not.toBeNull();
      expect(toggleStart?.textContent).toContain('/*');
      // */ should also be visible but grayed (inactive)
      const toggleEnd = element.shadowRoot?.querySelector('.block-end.block-toggle-inactive');
      expect(toggleEnd).not.toBeNull();
      expect(toggleEnd?.textContent).toContain('*/');
      const code = element.shadowRoot?.querySelector('code');
      expect(code?.textContent).toContain('const x = 1;');
    });

    it('should use <!-- --> for HTML block comments', async () => {
      element.setAttribute('language', 'html');
      element.innerHTML = `
        <textarea>\${block}<div>content</div>\${/block}</textarea>
        <code-binding key="block" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code');
      expect(code?.textContent).toContain('<!--');
      expect(code?.textContent).toContain('-->');
    });

    it('should use # for shell block comments (no block syntax)', async () => {
      element.setAttribute('language', 'shell');
      element.innerHTML = `
        <textarea>\${block}echo hello\${/block}</textarea>
        <code-binding key="block" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code');
      expect(code?.textContent).toContain('#');
    });
  });

  describe('disabled bindings', () => {
    it('should add disabled class to disabled bindings', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="42" disabled></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const control = element.shadowRoot?.querySelector('.inline-control.disabled');
      expect(control).not.toBeNull();
    });
  });

  describe('event handling', () => {
    it('should update display when binding value changes', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="1"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const binding = element.querySelector('code-binding') as CodeBindingElement;
      binding.value = 99;

      await new Promise(resolve => setTimeout(resolve, 50));

      const numberToken = element.shadowRoot?.querySelector('.token-number');
      expect(numberToken?.textContent).toBe('99');
    });
  });

  describe('CSS custom properties', () => {
    it('should use --code-bg for background color', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('--code-bg');
    });

    it('should use --code-border-radius for border radius', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('--code-border-radius');
    });
  });

  describe('number input constraints', () => {
    it('should set min attribute on number input', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="5" min="0"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const input = element.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input?.min).toBe('0');
    });

    it('should set max attribute on number input', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="5" max="100"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const input = element.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input?.max).toBe('100');
    });

    it('should set step attribute on number input', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="5" step="5"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const input = element.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input?.step).toBe('5');
    });
  });

  describe('conditional textareas', () => {
    it('should show only unconditional textarea when no conditions match', async () => {
      element.innerHTML = `
        <textarea>always shown</textarea>
        <textarea condition="showExtra">extra content</textarea>
        <code-binding key="showExtra" type="boolean" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('always shown');
      expect(code).not.toContain('extra content');
    });

    it('should show conditional textarea when condition is true', async () => {
      element.innerHTML = `
        <textarea>always shown</textarea>
        <textarea condition="showExtra">extra content</textarea>
        <code-binding key="showExtra" type="boolean" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('always shown');
      expect(code).toContain('extra content');
    });

    it('should show negated conditional textarea when value is falsy', async () => {
      element.innerHTML = `
        <textarea condition="!grouped">flat list</textarea>
        <textarea condition="grouped">grouped list</textarea>
        <code-binding key="grouped" type="boolean" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('flat list');
      expect(code).not.toContain('grouped list');
    });

    it('should update displayed content when binding value changes', async () => {
      element.innerHTML = `
        <textarea condition="!grouped">flat list</textarea>
        <textarea condition="grouped">grouped list</textarea>
        <code-binding key="grouped" type="boolean" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      let code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('flat list');
      expect(code).not.toContain('grouped list');

      // Toggle the binding
      const binding = element.querySelector('code-binding') as any;
      binding.value = true;

      await new Promise(resolve => setTimeout(resolve, 50));

      code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).not.toContain('flat list');
      expect(code).toContain('grouped list');
    });

    it('should work with select type binding', async () => {
      element.innerHTML = `
        <textarea>const result = provider.complete(input, { groupBy: \${groupBy} });</textarea>
        <textarea condition="!groupBy">// Use result.items</textarea>
        <textarea condition="groupBy">// Use result.groups</textarea>
        <code-binding key="groupBy" type="select" options="undefined,'continent'" value="undefined"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      let code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('result.items');
      expect(code).not.toContain('result.groups');

      // Change to continent
      const binding = element.querySelector('code-binding') as any;
      binding.value = "'continent'";

      await new Promise(resolve => setTimeout(resolve, 50));

      code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).not.toContain('result.items');
      expect(code).toContain('result.groups');
    });

    it('should show separators between sections when show-separators attribute is set', async () => {
      element.setAttribute('show-separators', '');
      element.innerHTML = `
        <textarea>section 1</textarea>
        <textarea>section 2</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const separator = element.shadowRoot?.querySelector('.section-separator');
      expect(separator).toBeTruthy();
    });

    it('should not show separators when show-separators attribute is not set', async () => {
      element.innerHTML = `
        <textarea>section 1</textarea>
        <textarea>section 2</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const separator = element.shadowRoot?.querySelector('.section-separator');
      expect(separator).toBeFalsy();
    });
  });

  describe('disconnectedCallback cleanup (Bug 2)', () => {
    it('should clean up MutationObserver on disconnect', async () => {
      element.innerHTML = `
        <textarea>const x = 1;</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not throw when disconnected
      element.parentNode?.removeChild(element);
    });

    it('should clean up fallback timeout on disconnect', () => {
      // Connect and immediately disconnect before timeout fires
      document.body.appendChild(element);
      element.parentNode?.removeChild(element);
      // No error should occur
    });

    it('should be safe to call disconnectedCallback multiple times', async () => {
      element.innerHTML = `
        <textarea>const x = 1;</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      element.parentNode?.removeChild(element);
      // Manually calling again should not throw
      (element as any).disconnectedCallback();
    });
  });

  describe('XSS prevention (Bug 3)', () => {
    it('should escape HTML in string binding values', async () => {
      element.innerHTML = `
        <textarea>\${name}</textarea>
        <code-binding key="name" type="string" value="<script>alert(1)</script>"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const code = element.shadowRoot?.querySelector('code');
      // Should not contain unescaped script tag
      expect(code?.innerHTML).not.toContain('<script>');
      // Should contain escaped version
      expect(code?.innerHTML).toContain('&lt;script&gt;');
    });

    it('should escape HTML in number binding attributes', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="42"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const input = element.shadowRoot?.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      // Value should be properly set
      expect(input?.value).toBe('42');
    });

    it('should escape select option values', async () => {
      element.innerHTML = `
        <textarea>\${size}</textarea>
        <code-binding key="size" type="select" options='small, "big"&bold, large' value="small"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const select = element.shadowRoot?.querySelector('select');
      expect(select).not.toBeNull();
      // Options should be properly escaped in HTML
      const html = select?.innerHTML || '';
      expect(html).not.toContain('&bold');
    });
  });

  describe('conditional content with inline controls (Bug 1)', () => {
    it('should update conditional content when select dropdown changes', async () => {
      element.innerHTML = `
        <textarea>mode: \${mode}</textarea>
        <textarea condition="mode">mode is active</textarea>
        <textarea condition="!mode">mode is inactive</textarea>
        <code-binding key="mode" type="select" options="undefined,active,inactive" value="undefined"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      let code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('mode is inactive');
      expect(code).not.toContain('mode is active');

      // Simulate changing the select to 'active'
      const binding = element.querySelector('code-binding') as any;
      binding.value = 'active';

      await new Promise(resolve => setTimeout(resolve, 50));

      code = element.shadowRoot?.querySelector('code')?.textContent;
      expect(code).toContain('mode is active');
      expect(code).not.toContain('mode is inactive');
    });
  });

  describe('copy button (Phase 3)', () => {
    it('should render a copy button in the shadow DOM', async () => {
      document.body.appendChild(element);

      const copyBtn = element.shadowRoot?.querySelector('.copy-button');
      expect(copyBtn).not.toBeNull();
    });

    it('should have an aria-label on the copy button', async () => {
      document.body.appendChild(element);

      const copyBtn = element.shadowRoot?.querySelector('.copy-button');
      expect(copyBtn?.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });

    it('should have copy and check SVG icons', async () => {
      document.body.appendChild(element);

      const copyIcon = element.shadowRoot?.querySelector('.copy-icon');
      const checkIcon = element.shadowRoot?.querySelector('.check-icon');
      expect(copyIcon).not.toBeNull();
      expect(checkIcon).not.toBeNull();
    });

    it('should have tabindex on copy button', async () => {
      document.body.appendChild(element);

      const copyBtn = element.shadowRoot?.querySelector('.copy-button');
      expect(copyBtn?.getAttribute('tabindex')).toBe('0');
    });

    it('should add copied class after clipboard write', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true
      });

      element.code = 'const x = 1;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const copyBtn = element.shadowRoot?.querySelector('.copy-button') as HTMLElement;
      copyBtn?.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(writeTextMock).toHaveBeenCalled();
      expect(copyBtn?.classList.contains('copied')).toBe(true);
      expect(copyBtn?.getAttribute('aria-label')).toBe('Copied!');
    });

    it('should hide copy button by default (no show-copy attribute)', async () => {
      element.code = 'const x = 1;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const copyBtn = element.shadowRoot?.querySelector('.copy-button') as HTMLElement;
      const styles = window.getComputedStyle(copyBtn);
      expect(styles.display).toBe('none');
    });

    it('should show copy button when show-copy attribute is set', async () => {
      element.setAttribute('show-copy', '');
      element.code = 'const x = 1;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const copyBtn = element.shadowRoot?.querySelector('.copy-button') as HTMLElement;
      expect(copyBtn).not.toBeNull();
    });

    it('should return showCopy getter value correctly', () => {
      expect(element.showCopy).toBe(false);
      element.setAttribute('show-copy', '');
      expect(element.showCopy).toBe(true);
      element.removeAttribute('show-copy');
      expect(element.showCopy).toBe(false);
    });
  });

  describe('line numbers (Phase 4)', () => {
    it('should not show line numbers by default', async () => {
      element.code = 'line 1\nline 2';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lineNumbers = element.shadowRoot?.querySelectorAll('.line-number');
      expect(lineNumbers?.length).toBe(0);
    });

    it('should show line numbers when show-line-numbers is set', async () => {
      element.setAttribute('show-line-numbers', '');
      element.code = 'line 1\nline 2\nline 3';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lineNumbers = element.shadowRoot?.querySelectorAll('.line-number');
      expect(lineNumbers?.length).toBe(3);
      expect(lineNumbers?.[0].textContent).toBe('1');
      expect(lineNumbers?.[1].textContent).toBe('2');
      expect(lineNumbers?.[2].textContent).toBe('3');
    });

    it('should not assign line numbers to section separators', async () => {
      element.setAttribute('show-line-numbers', '');
      element.setAttribute('show-separators', '');
      element.innerHTML = `
        <textarea>section 1</textarea>
        <textarea>section 2</textarea>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lineNumbers = element.shadowRoot?.querySelectorAll('.line-number');
      // Two lines (one per section), separator has no line number
      expect(lineNumbers?.length).toBe(2);
      expect(lineNumbers?.[0].textContent).toBe('1');
      expect(lineNumbers?.[1].textContent).toBe('2');
    });

    it('should have user-select none on line numbers', async () => {
      document.body.appendChild(element);

      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('user-select: none');
    });

    it('should return showLineNumbers getter correctly', () => {
      expect(element.showLineNumbers).toBe(false);
      element.setAttribute('show-line-numbers', '');
      expect(element.showLineNumbers).toBe(true);
    });
  });

  describe('accessibility (Phase 5)', () => {
    it('should add role="button" and tabindex to boolean controls', async () => {
      element.innerHTML = `
        <textarea>\${enabled}</textarea>
        <code-binding key="enabled" type="boolean" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const control = element.shadowRoot?.querySelector('.inline-boolean');
      expect(control?.getAttribute('role')).toBe('button');
      expect(control?.getAttribute('tabindex')).toBe('0');
      expect(control?.getAttribute('aria-label')).toContain('Toggle enabled');
    });

    it('should add role="spinbutton" to number controls', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="5" min="0" max="10"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const control = element.shadowRoot?.querySelector('.inline-number');
      expect(control?.getAttribute('role')).toBe('spinbutton');
      expect(control?.getAttribute('aria-valuenow')).toBe('5');
      expect(control?.getAttribute('aria-valuemin')).toBe('0');
      expect(control?.getAttribute('aria-valuemax')).toBe('10');
    });

    it('should add role="textbox" to string controls', async () => {
      element.innerHTML = `
        <textarea>\${name}</textarea>
        <code-binding key="name" type="string" value="test"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const control = element.shadowRoot?.querySelector('.inline-string');
      expect(control?.getAttribute('role')).toBe('textbox');
      expect(control?.getAttribute('tabindex')).toBe('0');
    });

    it('should set tabindex="-1" for disabled controls', async () => {
      element.innerHTML = `
        <textarea>\${count}</textarea>
        <code-binding key="count" type="number" value="5" disabled></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const control = element.shadowRoot?.querySelector('.inline-number');
      expect(control?.getAttribute('tabindex')).toBe('-1');
    });

    it('should add ARIA attributes to comment toggle controls', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle');
      expect(toggle?.getAttribute('role')).toBe('button');
      expect(toggle?.getAttribute('tabindex')).toBe('0');
      expect(toggle?.getAttribute('aria-label')).toContain('Toggle line comment');
    });

    it('should include focus-visible styles', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('focus-visible');
    });
  });

  describe('theme system', () => {
    it('should use CSS variables for token colors', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('var(--token-keyword,');
      expect(style?.textContent).toContain('var(--token-string,');
      expect(style?.textContent).toContain('var(--token-number,');
    });

    it('should default colorScheme to empty string (inherits)', () => {
      expect(element.colorScheme).toBe('');
    });

    it('should return the color-scheme attribute value', () => {
      element.setAttribute('color-scheme', 'light');
      expect(element.colorScheme).toBe('light');
    });

    it('should not call updateCode when color-scheme changes', async () => {
      element.code = 'const x = 1;';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const codeBefore = element.shadowRoot?.querySelector('code')?.innerHTML;
      element.setAttribute('color-scheme', 'light');

      await new Promise(resolve => setTimeout(resolve, 50));

      const codeAfter = element.shadowRoot?.querySelector('code')?.innerHTML;
      expect(codeAfter).toBe(codeBefore);
    });

    it('should include color-scheme CSS selectors', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain(':host([color-scheme="light"])');
      expect(style?.textContent).toContain(':host([color-scheme="dark"])');
    });

    it('should use light-dark() for built-in default values', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      expect(style?.textContent).toContain('light-dark(');
    });

    it('should use var() with light-dark() fallbacks for token colors', () => {
      document.body.appendChild(element);
      const style = element.shadowRoot?.querySelector('style');
      // Token colors use var(--token-*, light-dark(...)) pattern
      expect(style?.textContent).toMatch(/var\(--token-keyword,\s*light-dark\(/);
      expect(style?.textContent).toMatch(/var\(--code-bg,\s*light-dark\(/);
    });
  });

  describe('mixed content highlighting (HTML)', () => {
    it('should use SCSS highlighting inside <style> blocks', async () => {
      element.setAttribute('language', 'html');
      element.code = '<style>\n.test { color: red; }\n</style>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 2 should have SCSS-style property highlighting
      const line2 = lines?.[1];
      const property = line2?.querySelector('.token-property');
      expect(property).not.toBeNull();
    });

    it('should use TypeScript highlighting inside <script> blocks', async () => {
      element.setAttribute('language', 'html');
      element.code = '<script>\nconst x = 1;\n</script>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 2 should have TypeScript-style keyword highlighting
      const line2 = lines?.[1];
      const keyword = line2?.querySelector('.token-keyword');
      expect(keyword).not.toBeNull();
      expect(keyword?.textContent).toBe('const');
    });

    it('should keep HTML highlighting for <style> tag line itself', async () => {
      element.setAttribute('language', 'html');
      element.code = '<style>\n.test { color: red; }\n</style>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 1 (<style>) should have HTML tag highlighting
      const line1 = lines?.[0];
      const tag = line1?.querySelector('.token-tag');
      expect(tag).not.toBeNull();
    });

    it('should keep HTML highlighting for </style> tag line', async () => {
      element.setAttribute('language', 'html');
      element.code = '<style>\n.test { color: red; }\n</style>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 3 (</style>) should have HTML tag highlighting
      const line3 = lines?.[2];
      const tag = line3?.querySelector('.token-tag');
      expect(tag).not.toBeNull();
    });

    it('should handle multiple <style> blocks', async () => {
      element.setAttribute('language', 'html');
      element.code = '<style>\n.a { color: red; }\n</style>\n<div>text</div>\n<style>\n.b { color: blue; }\n</style>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 2 (.a { color: red; }) should have SCSS property
      expect(lines?.[1]?.querySelector('.token-property')).not.toBeNull();
      // Line 4 (<div>text</div>) should have HTML tags
      expect(lines?.[3]?.querySelector('.token-tag')).not.toBeNull();
      // Line 6 (.b { color: blue; }) should have SCSS property
      expect(lines?.[5]?.querySelector('.token-property')).not.toBeNull();
    });

    it('should detect <style type="text/css"> with attributes', async () => {
      element.setAttribute('language', 'html');
      element.code = '<style type="text/css">\n.test { color: red; }\n</style>';
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const lines = element.shadowRoot?.querySelectorAll('.code-line');
      // Line 2 should have SCSS property highlighting
      expect(lines?.[1]?.querySelector('.token-property')).not.toBeNull();
    });

    it('should NOT activate mixed highlighting for non-HTML languages', async () => {
      element.setAttribute('language', 'typescript');
      element.code = "const style = '<style>.test { color: red; }</style>';";
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should have TypeScript keyword, not SCSS property
      const keyword = element.shadowRoot?.querySelector('.token-keyword');
      expect(keyword).not.toBeNull();
      expect(keyword?.textContent).toBe('const');
    });
  });
});
