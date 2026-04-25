import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import App from '../App.svelte';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the two-panel shell', () => {
    const { getByLabelText } = render(App);
    expect(getByLabelText('World panel')).toBeInTheDocument();
    expect(getByLabelText('Character panel')).toBeInTheDocument();
    expect(getByLabelText('Settings')).toBeInTheDocument(); // gear button
  });

  it('renders the act marker text', () => {
    const { getByText } = render(App);
    expect(getByText(/Act I/)).toBeInTheDocument();
  });

  it('renders the demo character name in the persona header', () => {
    const { getByText } = render(App);
    expect(getByText('Sir Brendan')).toBeInTheDocument();
  });
});
