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
    const className = pageInput.className
    expect(className).toMatch(/\b(p[xy]?-\d+|m[xy]?-\d+)\b/)
  })

  it('hides arrows in the pagination page number input', async () => {
    // Setup connected state with a table to show pagination
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '250' }] })
      if (sql.includes('SELECT * FROM "public"."users"')) return Promise.resolve({
        success: true,
        rows: [{ id: 1 }],
        fields: [{ name: 'id' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))
    
    const pageInput = await screen.findByTestId('input-page-number')
    
    // Check if it has the utility class to hide arrows (typically [appearance:textfield] or similar in Tailwind)
    // Or we check if it has a specific custom class we'll define
    expect(pageInput.className).toContain('no-arrows')
  })

  it('formats timestamp data correctly (no timezone, no "without time zone")', async () => {
    const rawTimestamp = '2023-10-27 10:00:00+08'
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'events', table_schema: 'public' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'created_at', data_type: 'timestamp without time zone'}] })
      if (sql.includes('SELECT * FROM "public"."events"')) return Promise.resolve({
        success: true,
        rows: [{ created_at: rawTimestamp }],
        fields: [{ name: 'created_at' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-events')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-events'))

    // The header should just show 'timestamp' not 'timestamp without time zone'
    await waitFor(() => {
      const typeLabel = screen.getByText('timestamp')
      expect(typeLabel).toBeInTheDocument()
      expect(screen.queryByText('timestamp without time zone')).not.toBeInTheDocument()
    })

    // The cell value should not have timezone or milliseconds
    const cell = screen.getByTestId('cell-created_at-0')
    expect(cell.textContent).toBe('2023-10-27 10:00:00')
  })

  it('highlights the row when a cell is double-clicked for editing', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
      if (sql.includes('SELECT * FROM "public"."users"')) return Promise.resolve({
        success: true,
        rows: [{ id: 1, name: 'Alice' }],
        fields: [{ name: 'id' }, { name: 'name' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))

    // Wait for PK to be loaded so the table becomes editable and the badge appears
    await screen.findByText(/Editable \(PK: id\)/)

    const cell = await screen.findByTestId('cell-name-0')
    fireEvent.doubleClick(cell)

    // The row (tr) should have a highlight class
    const row = cell.closest('tr')
    await waitFor(() => expect(row).toHaveClass('bg-blue-100'))
  })

  it('removes focus effect from the edit modal textarea', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
      if (sql.includes('SELECT * FROM "public"."users"')) return Promise.resolve({
        success: true,
        rows: [{ id: 1, name: 'Alice' }],
        fields: [{ name: 'id' }, { name: 'name' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))

    // Wait for PK to be loaded
    await screen.findByText(/Editable \(PK: id\)/)

    const cell = await screen.findByTestId('cell-name-0')
    fireEvent.doubleClick(cell)

    const textarea = await screen.findByTestId('edit-textarea')
    expect(textarea.className).toContain('focus:ring-0')
    expect(textarea.className).toContain('outline-none')
  })
})
