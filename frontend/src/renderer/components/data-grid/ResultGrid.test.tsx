import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultGrid } from './ResultGrid';

describe('ResultGrid Component', () => {
  const fields = [{ name: 'id' }, { name: 'name' }];
  const rows = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
    { id: 4, name: 'David' },
    { id: 5, name: 'Eve' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getSelection to return empty by default
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => '',
    });
  });

  it('handles single click selection', () => {
    const onSelectionChange = vi.fn();
    render(<ResultGrid rows={rows} fields={fields} onSelectionChange={onSelectionChange} />);

    const row2 = screen.getByText('Bob').closest('tr')!;
    fireEvent.click(row2);

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
  });

  it('handles shift-click multi-selection', () => {
    const onSelectionChange = vi.fn();
    render(<ResultGrid rows={rows} fields={fields} onSelectionChange={onSelectionChange} />);

    const row1 = screen.getByText('Alice').closest('tr')!;
    const row4 = screen.getByText('David').closest('tr')!;

    // First click Alice
    fireEvent.click(row1);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([0]));

    // Shift-click David
    fireEvent.click(row4, { shiftKey: true });

    // Should select 0, 1, 2, 3
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([0, 1, 2, 3]));
  });

  it('allows selection even if text is selected when shift is pressed', () => {
    const onSelectionChange = vi.fn();
    render(<ResultGrid rows={rows} fields={fields} onSelectionChange={onSelectionChange} />);

    const row1 = screen.getByText('Alice').closest('tr')!;
    const row3 = screen.getByText('Charlie').closest('tr')!;

    // First click Alice
    fireEvent.click(row1);

    // Mock that text is now selected
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'some selected text',
    });

    // Shift-click Charlie
    fireEvent.click(row3, { shiftKey: true });

    // Should still trigger selection because shiftKey is true
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([0, 1, 2]));
  });

  it('handles cmd/ctrl multi-selection', () => {
    const onSelectionChange = vi.fn();
    render(<ResultGrid rows={rows} fields={fields} onSelectionChange={onSelectionChange} />);

    const row1 = screen.getByText('Alice').closest('tr')!;
    const row3 = screen.getByText('Charlie').closest('tr')!;

    // First click Alice
    fireEvent.click(row1);
    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([0]));

    // Cmd/Ctrl-click Charlie
    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    fireEvent.click(row3, { [isMac ? 'metaKey' : 'ctrlKey']: true });

    expect(onSelectionChange).toHaveBeenLastCalledWith(new Set([0, 2]));
  });

  it('prevents selection if text is selected when NO modifiers are pressed', () => {
    const onSelectionChange = vi.fn();
    render(<ResultGrid rows={rows} fields={fields} onSelectionChange={onSelectionChange} />);

    const row2 = screen.getByText('Bob').closest('tr')!;

    // Mock that text is selected
    window.getSelection = vi.fn().mockReturnValue({
      toString: () => 'some selected text',
    });

    fireEvent.click(row2);

    // Should NOT trigger selection
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
