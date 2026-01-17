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

    it('should show checked state when enabled', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle');
      expect(toggle?.textContent).toBe('☑');
    });

    it('should show unchecked state when disabled', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${toggle}color: red;</textarea>
        <code-binding key="toggle" type="comment" value="false"></code-binding>
      `;
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 150));

      const toggle = element.shadowRoot?.querySelector('.line-toggle');
      expect(toggle?.textContent).toBe('☐');
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
});
