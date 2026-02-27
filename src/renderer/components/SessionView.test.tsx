import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi } from 'vitest'

describe('SessionView Component', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders connection form initially', () => {
    render(<SessionView {...defaultProps} />)
    expect(screen.getByTestId('connection-form')).toBeInTheDocument()
  })

  it('handles connection success', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
  })

  describe('New Data Table Features', () => {
    beforeEach(async () => {
      ;(window.api.connect as any).mockResolvedValue({ success: true })
      ;(window.api.query as any).mockImplementation((id, sql) => {
        if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }, { table_name: 'events', table_schema: 'public' }] })
        if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}, {column_name: 'created_at', data_type: 'timestamp'}] })
        if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
        if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '1' }] })
        if (sql.includes('FROM "public"')) return Promise.resolve({ success: true, rows: [{ id: 1, created_at: '2023-10-27 10:00:00' }], fields: [{ name: 'id' }, { name: 'created_at' }] })
        return Promise.resolve({ success: true, rows: [] })
      })

      render(<SessionView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('btn-connect'))
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    })

    it('opens a new tab when a table is clicked', async () => {
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
    })

    it('does not open a second tab when the same table is clicked twice', async () => {
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getAllByTestId('tab-table-users')).toHaveLength(1))
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      // Wait to ensure no second tab appears
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(screen.getAllByTestId('tab-table-users')).toHaveLength(1)
    })

    it('does not open duplicate structure tabs for the same table', async () => {
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      
      const structureBtn = await screen.findByTestId('tab-structure')
      fireEvent.click(structureBtn)
      await waitFor(() => expect(screen.getByTestId('tab-table-Structure: users')).toBeInTheDocument())
      
      // Click again
      fireEvent.click(structureBtn)
      // Wait to ensure no second tab appears
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(screen.getAllByTestId('tab-table-Structure: users')).toHaveLength(1)
    })

    it('displays column data types in the table header', async () => {
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => {
        expect(screen.getByText(/integer/i)).toBeInTheDocument()
      })
    })

    it('can close a table tab', async () => {
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('close-tab-users'))
      await waitFor(() => expect(screen.queryByTestId('tab-table-users')).not.toBeInTheDocument())
    })

    it('formats timestamp data correctly in the grid', async () => {
      fireEvent.click(screen.getByTestId('table-item-events'))
      const cell = await screen.findByTestId('cell-created_at-0')
      expect(cell.textContent).toBe('2023-10-27 10:00:00')
    })
  })

  describe('Fix Tasks Verification', () => {
    it('removes the Connect button next to the Query button', async () => {
      ;(window.api.connect as any).mockResolvedValue({ success: true })
      ;(window.api.query as any).mockResolvedValue({ success: true, rows: [] })
      render(<SessionView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('btn-connect'))
      await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
      expect(screen.queryByTestId('btn-add-connection')).not.toBeInTheDocument()
    })
  })
})
