import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { CodeBindingElement } from './code-binding.element';

// Register custom element before tests
beforeAll(() => {
  if (!customElements.get('code-binding')) {
    customElements.define('code-binding', CodeBindingElement);
  }
});

describe('CodeBindingElement', () => {
  let element: CodeBindingElement;

  beforeEach(() => {
    element = document.createElement('code-binding') as CodeBindingElement;
  });

  describe('attribute getters', () => {
    it('should return empty string for key when not set', () => {
      expect(element.key).toBe('');
    });

    it('should return key attribute value', () => {
      element.setAttribute('key', 'myKey');
      expect(element.key).toBe('myKey');
    });

    it('should return "readonly" as default type', () => {
      expect(element.type).toBe('readonly');
    });

    it('should return type attribute value', () => {
      element.setAttribute('type', 'number');
      expect(element.type).toBe('number');
    });

    it('should return undefined for min when not set', () => {
      expect(element.min).toBeUndefined();
    });

    it('should return min attribute as number', () => {
      element.setAttribute('min', '10');
      expect(element.min).toBe(10);
    });

    it('should return undefined for max when not set', () => {
      expect(element.max).toBeUndefined();
    });

    it('should return max attribute as number', () => {
      element.setAttribute('max', '100');
      expect(element.max).toBe(100);
    });

    it('should return undefined for step when not set', () => {
      expect(element.step).toBeUndefined();
    });

    it('should return step attribute as number', () => {
      element.setAttribute('step', '5');
      expect(element.step).toBe(5);
    });

    it('should return empty array for options when not set', () => {
      expect(element.options).toEqual([]);
    });

    it('should parse options attribute as array', () => {
      element.setAttribute('options', 'a, b, c');
      expect(element.options).toEqual(['a', 'b', 'c']);
    });
  });

  describe('value parsing', () => {
    it('should parse boolean type as boolean', () => {
      element.setAttribute('type', 'boolean');
      element.setAttribute('value', 'true');
      document.body.appendChild(element);
      expect(element.value).toBe(true);
      document.body.removeChild(element);
    });

    it('should parse "false" string as false for boolean', () => {
      element.setAttribute('type', 'boolean');
      element.setAttribute('value', 'false');
      document.body.appendChild(element);
      expect(element.value).toBe(false);
      document.body.removeChild(element);
    });

    it('should parse number type as number', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '42');
      document.body.appendChild(element);
      expect(element.value).toBe(42);
      document.body.removeChild(element);
    });

    it('should parse string type as string', () => {
      element.setAttribute('type', 'string');
      element.setAttribute('value', 'hello');
      document.body.appendChild(element);
      expect(element.value).toBe('hello');
      document.body.removeChild(element);
    });

    it('should parse color type as string', () => {
      element.setAttribute('type', 'color');
      element.setAttribute('value', '#ff0000');
      document.body.appendChild(element);
      expect(element.value).toBe('#ff0000');
      document.body.removeChild(element);
    });

    it('should parse comment type as boolean', () => {
      element.setAttribute('type', 'comment');
      element.setAttribute('value', 'true');
      document.body.appendChild(element);
      expect(element.value).toBe(true);
      document.body.removeChild(element);
    });

    it('should parse select type as string', () => {
      element.setAttribute('type', 'select');
      element.setAttribute('value', 'option1');
      document.body.appendChild(element);
      expect(element.value).toBe('option1');
      document.body.removeChild(element);
    });
  });

  describe('value setter', () => {
    it('should emit change event when value changes', () => {
      element.setAttribute('type', 'number');
      document.body.appendChild(element);

      const changeSpy = vi.fn();
      element.addEventListener('change', changeSpy);

      element.value = 10;

      expect(changeSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy.mock.calls[0][0].detail).toBe(10);

      document.body.removeChild(element);
    });

    it('should not emit change event when value is the same', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '10');
      document.body.appendChild(element);

      const changeSpy = vi.fn();
      element.addEventListener('change', changeSpy);

      element.value = 10;

      expect(changeSpy).not.toHaveBeenCalled();

      document.body.removeChild(element);
    });
  });

  describe('disabled property', () => {
    it('should default to false', () => {
      expect(element.disabled).toBe(false);
    });

    it('should be true when disabled attribute is present', () => {
      element.setAttribute('disabled', '');
      document.body.appendChild(element);
      expect(element.disabled).toBe(true);
      document.body.removeChild(element);
    });

    it('should be settable via property', () => {
      element.disabled = true;
      expect(element.disabled).toBe(true);
    });
  });

  describe('toggle()', () => {
    it('should toggle boolean value from false to true', () => {
      element.setAttribute('type', 'boolean');
      element.setAttribute('value', 'false');
      document.body.appendChild(element);

      element.toggle();

      expect(element.value).toBe(true);
      document.body.removeChild(element);
    });

    it('should toggle boolean value from true to false', () => {
      element.setAttribute('type', 'boolean');
      element.setAttribute('value', 'true');
      document.body.appendChild(element);

      element.toggle();

      expect(element.value).toBe(false);
      document.body.removeChild(element);
    });

    it('should toggle comment value', () => {
      element.setAttribute('type', 'comment');
      element.setAttribute('value', 'false');
      document.body.appendChild(element);

      element.toggle();

      expect(element.value).toBe(true);
      document.body.removeChild(element);
    });

    it('should cycle through select options', () => {
      element.setAttribute('type', 'select');
      element.setAttribute('options', 'a, b, c');
      element.setAttribute('value', 'a');
      document.body.appendChild(element);

      element.toggle();
      expect(element.value).toBe('b');

      element.toggle();
      expect(element.value).toBe('c');

      element.toggle();
      expect(element.value).toBe('a');

      document.body.removeChild(element);
    });

    it('should not toggle when disabled', () => {
      element.setAttribute('type', 'boolean');
      element.setAttribute('value', 'false');
      element.setAttribute('disabled', '');
      document.body.appendChild(element);

      element.toggle();

      expect(element.value).toBe(false);
      document.body.removeChild(element);
    });
  });

  describe('increment()', () => {
    it('should increment number value by 1 (default step)', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      document.body.appendChild(element);

      element.increment();

      expect(element.value).toBe(6);
      document.body.removeChild(element);
    });

    it('should increment by custom step', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      element.setAttribute('step', '10');
      document.body.appendChild(element);

      element.increment();

      expect(element.value).toBe(15);
      document.body.removeChild(element);
    });

    it('should not exceed max value', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '95');
      element.setAttribute('max', '100');
      element.setAttribute('step', '10');
      document.body.appendChild(element);

      element.increment();

      expect(element.value).toBe(100);
      document.body.removeChild(element);
    });

    it('should not increment when disabled', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      element.setAttribute('disabled', '');
      document.body.appendChild(element);

      element.increment();

      expect(element.value).toBe(5);
      document.body.removeChild(element);
    });

    it('should do nothing for non-number types', () => {
      element.setAttribute('type', 'string');
      element.setAttribute('value', 'test');
      document.body.appendChild(element);

      element.increment();

      expect(element.value).toBe('test');
      document.body.removeChild(element);
    });
  });

  describe('decrement()', () => {
    it('should decrement number value by 1 (default step)', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      document.body.appendChild(element);

      element.decrement();

      expect(element.value).toBe(4);
      document.body.removeChild(element);
    });

    it('should decrement by custom step', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '15');
      element.setAttribute('step', '10');
      document.body.appendChild(element);

      element.decrement();

      expect(element.value).toBe(5);
      document.body.removeChild(element);
    });

    it('should not go below min value', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      element.setAttribute('min', '0');
      element.setAttribute('step', '10');
      document.body.appendChild(element);

      element.decrement();

      expect(element.value).toBe(0);
      document.body.removeChild(element);
    });

    it('should not decrement when disabled', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '5');
      element.setAttribute('disabled', '');
      document.body.appendChild(element);

      element.decrement();

      expect(element.value).toBe(5);
      document.body.removeChild(element);
    });
  });

  describe('attributeChangedCallback', () => {
    it('should update value when value attribute changes', () => {
      element.setAttribute('type', 'number');
      document.body.appendChild(element);

      element.setAttribute('value', '42');

      expect(element.value).toBe(42);
      document.body.removeChild(element);
    });

    it('should update disabled when disabled attribute changes', () => {
      document.body.appendChild(element);

      element.setAttribute('disabled', '');
      expect(element.disabled).toBe(true);

      element.removeAttribute('disabled');
      expect(element.disabled).toBe(false);

      document.body.removeChild(element);
    });
  });

  describe('onchange attribute', () => {
    it('should execute onchange handler when value changes', () => {
      element.setAttribute('type', 'number');
      element.setAttribute('value', '0');

      const handler = vi.fn();
      (window as any).testHandler = handler;
      element.setAttribute('onchange', 'testHandler(e)');

      document.body.appendChild(element);

      element.value = 10;

      expect(handler).toHaveBeenCalledWith(10);

      delete (window as any).testHandler;
      document.body.removeChild(element);
    });
  });

  describe('change event', () => {
    it('should bubble', () => {
      element.setAttribute('type', 'number');
      document.body.appendChild(element);

      const bubbleSpy = vi.fn();
      document.body.addEventListener('change', bubbleSpy);

      element.value = 10;

      expect(bubbleSpy).toHaveBeenCalled();

      document.body.removeEventListener('change', bubbleSpy);
      document.body.removeChild(element);
    });

    it('should be composed (cross shadow DOM)', () => {
      element.setAttribute('type', 'number');
      document.body.appendChild(element);

      let isComposed = false;
      element.addEventListener('change', (e) => {
        isComposed = e.composed;
      });

      element.value = 10;

      expect(isComposed).toBe(true);
      document.body.removeChild(element);
    });
  });
});
