import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('Keyboard Operations in SessionView', () => {
  const defaultProps = {
    id: 'session-1',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const connectAndOpenTab = async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 't1', table_schema: 'public' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}] })
      if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
      if (sql.includes('SELECT * FROM "public"."t1"')) return Promise.resolve({
        success: true,
        rows: [{ id: 1 }],
        fields: [{ name: 'id' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    const item = await screen.findByTestId('table-item-t1')
    fireEvent.click(item)
    await screen.findByTestId('tab-table-t1')
  }

  it('handles Cmd+T to open new query tab', async () => {
    await connectAndOpenTab()
    fireEvent.keyDown(window, { key: 't', metaKey: true })
    await screen.findByTestId('tab-table-New Query')
  })

  it('handles Cmd+W to close current tab', async () => {
    await connectAndOpenTab()
    const tab = screen.getByTestId('tab-table-t1')
    expect(tab).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'w', metaKey: true })
    await waitFor(() => {
        expect(screen.queryByTestId('tab-table-t1')).not.toBeInTheDocument()
    })
  })

  it('handles Cmd+P to open table search', async () => {
    await connectAndOpenTab()
    fireEvent.keyDown(window, { key: 'p', metaKey: true })
    await screen.findByPlaceholderText(/Search tables.../i)
  })

  it('handles Ctrl+Tab to show tab switcher', async () => {
    await connectAndOpenTab()
    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true })
    await screen.findByText(/Switch Tab/i)
  })

  it('handles Cmd+F to focus first filter input', async () => {
    await connectAndOpenTab()
    // Wait for filter bar to be ready
    const input = await screen.findByTestId('filter-value-input')
    
    // Blur first
    input.blur()
    expect(document.activeElement).not.toBe(input)

    fireEvent.keyDown(window, { key: 'f', metaKey: true })
    await waitFor(() => expect(document.activeElement).toBe(input))
  })

  it('maximizes/restores on tab double click', async () => {
    await connectAndOpenTab()
    const sidebar = screen.getByText(/Tables/i).closest('.bg-gray-50')
    expect(sidebar).not.toHaveClass('hidden')

    const tab = screen.getByTestId('tab-table-t1')
    fireEvent.doubleClick(tab)
    expect(sidebar).toHaveClass('hidden')

    fireEvent.doubleClick(tab)
    expect(sidebar).not.toHaveClass('hidden')
  })
})
