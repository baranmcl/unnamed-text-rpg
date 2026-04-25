import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Divider from '../Divider.svelte';

const KEY = 'heroicchronicle.ui.dividerWidth';

describe('Divider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders with default world fraction of 0.62', () => {
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.dataset.worldFraction).toBe('0.62');
  });

  it('reads stored fraction from localStorage on mount', () => {
    localStorage.setItem(KEY, '0.5');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.5');
  });

  it('clamps stored fraction to [0.25, 0.75]', () => {
    localStorage.setItem(KEY, '0.05');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.25');
  });

  it('ignores non-numeric stored values', () => {
    localStorage.setItem(KEY, 'banana');
    const { container } = render(Divider);
    const el = container.querySelector('[data-testid="divider"]') as HTMLElement;
    expect(el.dataset.worldFraction).toBe('0.62');
  });
});
