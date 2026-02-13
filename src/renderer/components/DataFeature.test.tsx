import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('SessionView Data Features', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock for Dialog/Portal if needed, but here we assume standard DOM
  })

  it('renders json type as formatted string', async () => {
    const jsonData = { foo: "bar", baz: 123 }
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'logs', table_schema: 'public' }] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '1' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'payload', data_type: 'json'}] })
      if (sql.includes('SELECT * FROM "public"."logs"')) return Promise.resolve({
        success: true,
        rows: [{ payload: jsonData }],
        fields: [{ name: 'payload' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-logs')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-logs'))

    // Should be formatted (e.g. contains newlines or specific spacing if formatted)
    // Or at least correctly stringified if it was an object
    await waitFor(() => {
      const cell = screen.getByTestId('cell-payload-0')
      expect(cell.textContent).toContain('"foo": "bar"')
    })
  })

  it('renders timestamp without timezone', async () => {
    const timestamp = "2023-01-01 12:00:00+08"
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'events', table_schema: 'public' }] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '1' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'created_at', data_type: 'timestamp with time zone'}] })
      if (sql.includes('SELECT * FROM "public"."events"')) return Promise.resolve({
        success: true,
        rows: [{ created_at: timestamp }],
        fields: [{ name: 'created_at' }]
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-events')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-events'))

    await waitFor(() => {
      const cell = screen.getByTestId('cell-created_at-0')
      expect(cell.textContent).not.toMatch(/[+-]\d{2}$/)
      expect(cell.textContent).toBe("2023-01-01 12:00:00")
    })
  })

  it('supports double click to open edit dialog for all data types', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '1' }] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}, {column_name: 'name', data_type: 'text'}] })
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

    const cell = await screen.findByTestId('cell-name-0')
    fireEvent.doubleClick(cell.firstChild!)

    // Check for dialog (we need to implement this dialog first)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Data')).toBeInTheDocument()
    })
  })
})
