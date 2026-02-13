import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('SessionView Fix Tasks', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes the Connect button next to the Query button', async () => {
    // Setup connected state
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockResolvedValue({ success: true, rows: [] })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // The Connect button (btn-add-connection) should NOT be present in the header
    // Currently it is present, so this test should FAIL if we expect it to be gone.
    // Wait, the requirement says "去除 Query 旁边的 Connect". 
    // In the code, both are in the same div: <div className="flex items-center gap-2 shrink-0">
    
    expect(screen.queryByTestId('btn-add-connection')).not.toBeInTheDocument()
  })

  it('adds margin/padding to the pagination page number input box', async () => {
    // Setup connected state with a table to show pagination
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '250' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}] })
      if (sql.includes('SELECT * FROM "public"."users"')) return Promise.resolve({
        success: true,
        rows: Array(10).fill(0).map((_, i) => ({ id: i })),
        fields: [{ name: 'id' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))
    
    const pageInput = await screen.findByTestId('input-page-number')
    
    // Check if it has horizontal margin or padding (e.g., mx-1, mx-2, px-1, etc.)
    // Currently it has: "text-center text-xs font-medium focus:outline-none bg-transparent"
    const className = pageInput.className
    expect(className).toMatch(/\b(p[xy]?-\d+|m[xy]?-\d+)\b/)
  })
})
