import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { InteractiveCodeElement } from './interactive-code.element';
import { CodeBindingElement } from './code-binding.element';

beforeAll(() => {
  if (!customElements.get('code-binding')) {
    customElements.define('code-binding', CodeBindingElement);
  }
  if (!customElements.get('interactive-code')) {
    customElements.define('interactive-code', InteractiveCodeElement);
  }
});

// Wait for the connectedCallback fallback timeout (100ms) plus margin
const settle = () => new Promise(resolve => setTimeout(resolve, 150));

describe('New features', () => {
  let element: InteractiveCodeElement;

  beforeEach(() => {
    element = document.createElement('interactive-code') as InteractiveCodeElement;
  });

  afterEach(() => {
    element.parentNode?.removeChild(element);
  });

  describe('JSON language', () => {
    it('highlights keys, string values, literals and numbers distinctly', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
  "name": "interactive-code",
  "count": 3,
  "enabled": true,
  "extra": null
}</textarea>
      `;
      document.body.appendChild(element);
      await settle();

      const code = element.shadowRoot!.querySelector('code')!;
      // A quoted string followed by ":" is a property key
      const keys = [...code.querySelectorAll('.token-property')].map(n => n.textContent);
      expect(keys).toContain('"name"');
      // A quoted string value (not a key)
      const strings = [...code.querySelectorAll('.token-string')].map(n => n.textContent);
      expect(strings).toContain('"interactive-code"');
      // Literals true/null
      const keywords = [...code.querySelectorAll('.token-keyword')].map(n => n.textContent);
      expect(keywords).toEqual(expect.arrayContaining(['true', 'null']));
      // Number
      const numbers = [...code.querySelectorAll('.token-number')].map(n => n.textContent);
      expect(numbers).toContain('3');
    });

    it('strips JSONC comments from the exported text but keeps them on display', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
  // this annotation must not be exported
  "a": "\${a}"
}</textarea>
        <code-binding key="a" type="string" value="x"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const code = element.shadowRoot!.querySelector('code')!;
      // Shown on display
      expect(code.textContent).toContain('// this annotation must not be exported');

      // Stripped from export
      const exported = (element as any).getPlainText() as string;
      expect(exported).not.toContain('//');
      expect(exported).not.toContain('annotation');
      expect(exported).toContain('"a": "x"');
    });

    it('uses snippet.json as the default download name and matches the override', () => {
      element.setAttribute('language', 'json');
      expect(element.downloadName).toBe('snippet.json');
      element.setAttribute('download', 'config.json');
      expect(element.downloadName).toBe('config.json');
    });
  });

  describe('Collapsible sections', () => {
    it('renders a collapsed fold group with the hidden line count, keeping lines in the DOM', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
  "id": "\${id}",
\${fold}
  "x": 1,
  "y": 2,
  "z": 3,
\${/fold}
  "ok": \${ok}
}</textarea>
        <code-binding key="id" type="string" value="api"></code-binding>
        <code-binding key="ok" type="boolean" value="true"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const shadow = element.shadowRoot!;
      const group = shadow.querySelector('.fold-group')!;
      expect(group).not.toBeNull();
      expect(group.classList.contains('collapsed')).toBe(true);

      // Band advertises the 3 hidden lines
      const band = group.querySelector('.fold-band')!;
      expect(band.textContent).toContain('3 lines');

      // The 3 folded lines remain in the DOM (folding is visual only)
      const linesInGroup = group.querySelectorAll('.code-line');
      expect(linesInGroup.length).toBe(3);

      // Gutter chevrons on first and last folded line; the band has its own expand icon
      expect(group.querySelectorAll('.code-line .fold-chevron-gutter').length).toBe(2);
      expect(band.querySelector('.fold-band-icon svg')).not.toBeNull();

      // Export contains the full content, including folded lines
      const exported = (element as any).getPlainText() as string;
      expect(exported).toContain('"x": 1');
      expect(exported).toContain('"z": 3');
      expect(exported).toContain('"ok": true');
    });

    it('supports public ${fold} markers (collapsed by default) and ${fold:open} (expanded)', async () => {
      element.setAttribute('language', 'json');
      document.body.appendChild(element);
      await settle();
      element.code = [
        '{',
        '  "a": {',
        '${fold}',
        '    "x": 1,',
        '    "y": 2',
        '${/fold}',
        '  },',
        '  "b": [',
        '${fold:open}',
        '    1, 2, 3',
        '${/fold}',
        '  ]',
        '}',
      ].join('\n');
      await settle();

      const code = element.shadowRoot!.querySelector('code')!;
      const groups = code.querySelectorAll('.fold-group');
      expect(groups.length).toBe(2);
      expect(groups[0].classList.contains('collapsed')).toBe(true);   // ${fold}
      expect(groups[1].classList.contains('collapsed')).toBe(false);  // ${fold:open}
      // Marker lines themselves are not rendered and are absent from the export
      const exported = (element as any).getPlainText() as string;
      expect(exported).not.toContain('${fold');
      expect(exported).toContain('"x": 1');
    });

    it('shows escaped markers (\\${fold}, \\${binding}) literally without interpreting them', async () => {
      element.setAttribute('language', 'json');
      document.body.appendChild(element);
      await settle();
      element.code = '{\n\\${fold}\n  "id": "\\${id}"\n\\${/fold}\n}';
      await settle();

      const code = element.shadowRoot!.querySelector('code')!;
      // Escaped markers do not create a fold and are not bindings
      expect(code.querySelector('.fold-group')).toBeNull();
      expect(code.textContent).toContain('${fold}');
      expect(code.textContent).toContain('${id}');
      // No stray backslash is shown
      expect(code.textContent).not.toContain('\\${');
    });

    it('keeps interactive bindings inside a fold (rendered in the group, editable once expanded)', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
\${fold}
  "count": \${count}
\${/fold}
}</textarea>
        <code-binding key="count" type="number" value="42"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const group = element.shadowRoot!.querySelector('.fold-group')!;
      // The number control is rendered inside the folded group
      const control = group.querySelector('.inline-number');
      expect(control).not.toBeNull();
      expect(control!.querySelector('.token-number')!.textContent).toBe('42');
    });

    it('preserves the user expand/collapse choice across re-renders (editing a binding)', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
\${fold}
  "trace": \${trace}
\${/fold}
}</textarea>
        <code-binding key="trace" type="boolean" value="true"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const shadow = element.shadowRoot!;
      let group = shadow.querySelector('.fold-group')!;
      expect(group.classList.contains('collapsed')).toBe(true);

      // Expand it like the user clicking the band
      (group.querySelector('.fold-band') as HTMLElement)
        .dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(group.classList.contains('collapsed')).toBe(false);

      // Editing the binding inside the fold triggers a full re-render
      (element.querySelector('code-binding') as CodeBindingElement).value = false;
      await settle();

      // The fold must stay expanded (not snap back to the ${fold} default)
      group = shadow.querySelector('.fold-group')!;
      expect(group.classList.contains('collapsed')).toBe(false);
    });

    it('reserves the control column for folds set via the code property', async () => {
      element.setAttribute('language', 'json');
      document.body.appendChild(element);
      await settle();
      // ${fold} markers work straight from the code string too (programmatic content)
      element.code = '{\n${fold}\n  "a": 1,\n  "b": 2\n${/fold}\n}';
      await settle();

      const code = element.shadowRoot!.querySelector('code')!;
      expect(code.classList.contains('has-controls')).toBe(true);
      const group = code.querySelector('.fold-group');
      expect(group).not.toBeNull();
      expect(group!.querySelector('.fold-band-icon svg')).not.toBeNull();
    });

    it('toggles the collapsed state when the band is clicked (no re-render)', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
\${fold}
  "a": 1
\${/fold}
}</textarea>
      `;
      document.body.appendChild(element);
      await settle();

      const shadow = element.shadowRoot!;
      const group = shadow.querySelector('.fold-group')!;
      const updateSpy = vi.spyOn(element as any, 'updateCode');

      const band = group.querySelector('.fold-band') as HTMLElement;
      band.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(group.classList.contains('collapsed')).toBe(false);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Button binding type', () => {
    it('renders the value as the action label', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>provider.\${refresh}();</textarea>
        <code-binding key="refresh" type="button" value="refresh()"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const button = element.shadowRoot!.querySelector('.inline-button')!;
      expect(button).not.toBeNull();
      expect(button.textContent).toBe('refresh()');
      expect(button.getAttribute('data-action')).toBe('trigger');
    });

    it('synthesizes a button<index> label when value is omitted', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>\${a} \${b}</textarea>
        <code-binding key="a" type="button"></code-binding>
        <code-binding key="b" type="button"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const labels = [...element.shadowRoot!.querySelectorAll('.inline-button')].map(n => n.textContent);
      expect(labels).toEqual(['button0', 'button1']);
    });

    it('emits change with detail = value on every click, without re-render', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `
        <textarea>\${save}</textarea>
        <code-binding key="save" type="button" value="save()"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();

      const binding = element.querySelector('code-binding') as CodeBindingElement;
      const details: any[] = [];
      binding.addEventListener('change', (e: any) => details.push(e.detail));

      const updateSpy = vi.spyOn(element as any, 'updateCode');
      const button = element.shadowRoot!.querySelector('.inline-button') as HTMLElement;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      button.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(details).toEqual(['save()', 'save()']);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('Download button', () => {
    it('exposes showDownload and the download button is present', async () => {
      element.setAttribute('language', 'json');
      element.setAttribute('show-download', '');
      element.innerHTML = `<textarea>{}</textarea>`;
      document.body.appendChild(element);
      await settle();

      expect(element.showDownload).toBe(true);
      expect(element.shadowRoot!.querySelector('.download-button')).not.toBeNull();
    });
  });

  describe('Gutter rail', () => {
    const hasGutter = (el: InteractiveCodeElement) =>
      el.shadowRoot!.querySelector('code')!.classList.contains('has-gutter');

    it('reserves the gutter when line numbers are shown', async () => {
      element.setAttribute('show-line-numbers', '');
      element.innerHTML = `<textarea>a\nb</textarea>`;
      document.body.appendChild(element);
      await settle();
      expect(hasGutter(element)).toBe(true);
    });

    it('reserves the gutter when a comment toggle exists, even without line numbers', async () => {
      element.setAttribute('language', 'scss');
      element.innerHTML = `
        <textarea>\${c}color: red;</textarea>
        <code-binding key="c" type="comment" value="true"></code-binding>
      `;
      document.body.appendChild(element);
      await settle();
      expect(element.showLineNumbers).toBe(false);
      expect(hasGutter(element)).toBe(true);
    });

    it('reserves the gutter when a fold marker exists', async () => {
      element.setAttribute('language', 'json');
      element.innerHTML = `
        <textarea>{
\${fold}
  "a": 1
\${/fold}
}</textarea>
      `;
      document.body.appendChild(element);
      await settle();
      expect(hasGutter(element)).toBe(true);
    });

    it('does not reserve the gutter for a plain block (no numbers, folds or comments)', async () => {
      element.setAttribute('language', 'typescript');
      element.innerHTML = `<textarea>const x = 1;</textarea>`;
      document.body.appendChild(element);
      await settle();
      expect(hasGutter(element)).toBe(false);
    });
  });
});
