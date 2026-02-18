import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi } from 'vitest'

describe('SessionView Table Operations', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  // Helper to setup connected state with a table
  const setupConnected = async () => {
    (window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
        if (sql.includes('SELECT table_name')) {
          return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
        }
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ success: true, rows: [{ count: '1' }] })
        }
        if (sql.includes('information_schema.columns')) {
          return Promise.resolve({
            success: true,
            rows: [
              { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: "nextval('users_id_seq'::regclass)", pk_constraint_name: 'users_pkey' },
              { column_name: 'name', data_type: 'text', is_nullable: 'YES', column_default: null, pk_constraint_name: null }
            ]
          })
        }
        if (sql.includes('PRIMARY KEY')) {
          return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
        }
        if (sql.includes('SELECT * FROM "public"."users"')) {
          return Promise.resolve({
            success: true,
            rows: [{ id: 1, name: 'Alice' }],
            fields: [{ name: 'id' }, { name: 'name' }]
          })
        }
        if (sql.includes('INSERT INTO')) {
            return Promise.resolve({ success: true })
        }
        if (sql.includes('DELETE FROM')) {
            return Promise.resolve({ success: true })
        }
        return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
  }

  it('adds a new row', async () => {
    await setupConnected()

    // Click Add Row
    const addRowBtn = screen.getByTestId('btn-add-row')
    fireEvent.click(addRowBtn)

    // Check for phantom row inputs
    const nameInput = screen.getByPlaceholderText('name')
    expect(nameInput).toBeInTheDocument()
    
    // Type 'Bob' into name
    fireEvent.change(nameInput, { target: { value: 'Bob' } })
    
    // Click Save Row button
    const saveRowBtn = screen.getByTestId('btn-save-row')
    fireEvent.click(saveRowBtn)

    // Verify INSERT SQL
    await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining("INSERT INTO \"public\".\"users\" (\"name\") VALUES ('Bob')"))
    })
  })

  it('adds a new row with default values', async () => {
    await setupConnected()

    // Click Add Row
    fireEvent.click(screen.getByTestId('btn-add-row'))

    // Click Save Row directly without input
    fireEvent.click(screen.getByTestId('btn-save-row'))

    // Verify DEFAULT VALUES INSERT
    await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('INSERT INTO "public"."users" DEFAULT VALUES;'))
    })
  })

  it('deletes a row', async () => {
    await setupConnected()

    const aliceCell = screen.getByText('Alice')
    const row = aliceCell.closest('tr')
    expect(row).toBeInTheDocument()

    // Right click
    fireEvent.contextMenu(row!)

    // Expect context menu
    const deleteBtn = await screen.findByText('Delete Row')
    expect(deleteBtn).toBeInTheDocument()

    // Click delete
    fireEvent.click(deleteBtn)

    // Verify confirmation and DELETE SQL
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining("DELETE FROM \"public\".\"users\" WHERE \"id\" = '1'"))
    })
  })
})
