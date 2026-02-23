
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StructureView } from './StructureView'
import { vi } from 'vitest'

describe('StructureView Component', () => {
  const defaultProps = {
    connectionId: 'test-conn',
    schema: 'public',
    tableName: 'users',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    if (!global.crypto.randomUUID) {
       (global.crypto as any).randomUUID = () => Math.random().toString(36).substring(2)
    }
  })

  it('renders columns and indexes correctly', async () => {
    ;(window as any).api.query.mockImplementation((id, sql) => {
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({
          success: true,
          rows: [
            { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: "nextval('users_id_seq')", pk_constraint_name: 'users_pkey' },
            { column_name: 'email', data_type: 'varchar', is_nullable: 'YES', column_default: null, pk_constraint_name: null }
          ]
        })
      }
      if (sql.includes('pg_class t')) {
        return Promise.resolve({
          success: true,
          rows: [
            { index_name: 'users_email_idx', column_names: ['email'], is_unique: true }
          ]
        })
      }
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<StructureView {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

    expect(screen.getByDisplayValue('id')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('email').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByDisplayValue('users_email_idx')).toBeInTheDocument()
  })

  it('handles index columns returned as Postgres array strings', async () => {
    ;(window as any).api.query.mockImplementation((id, sql) => {
      if (sql.includes('pg_class t')) {
        return Promise.resolve({
          success: true,
          rows: [
            { index_name: 'string_idx', column_names: '{col1,col2}', is_unique: false }
          ]
        })
      }
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<StructureView {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

    expect(screen.getByDisplayValue('string_idx')).toBeInTheDocument()
    expect(screen.getByDisplayValue('col1, col2')).toBeInTheDocument()
  })

  it('handles adding and deleting columns', async () => {
     ;(window as any).api.query.mockResolvedValue({ success: true, rows: [] })
     
     render(<StructureView {...defaultProps} />)
     await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

     const addBtn = screen.getByRole('button', { name: /Add Column/i })
     fireEvent.click(addBtn)
     
     await waitFor(() => {
       expect(screen.getByDisplayValue(/new_column_/)).toBeInTheDocument()
     })

     const colName = screen.getByDisplayValue(/new_column_/).getAttribute('value')
     const deleteBtn = screen.getByTestId(`delete-column-${colName}`)
     fireEvent.click(deleteBtn)
     
     await waitFor(() => {
       expect(screen.queryByDisplayValue(/new_column_/)).not.toBeInTheDocument()
     })
  })

  it('handles adding and deleting indexes', async () => {
    ;(window as any).api.query.mockResolvedValue({ success: true, rows: [] })
    
    render(<StructureView {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

    fireEvent.click(screen.getByTestId('btn-add-index'))
    
    await waitFor(() => {
      expect(screen.getByDisplayValue(/idx_users_/)).toBeInTheDocument()
    })

    const idxName = screen.getByDisplayValue(/idx_users_/).getAttribute('value')
    const deleteBtn = screen.getByTestId(`delete-index-${idxName}`)
    fireEvent.click(deleteBtn)
    
    await waitFor(() => {
      expect(screen.queryByDisplayValue(/idx_users_/)).not.toBeInTheDocument()
    })
  })

  it('generates and executes SQL for changes', async () => {
    ;(window as any).api.query.mockImplementation((id, sql) => {
        if (sql.includes('information_schema.columns')) {
            return Promise.resolve({
              success: true,
              rows: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: null, pk_constraint_name: 'pk' }]
            })
        }
        return Promise.resolve({ success: true, rows: [] })
    })

    render(<StructureView {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

    const addBtn = screen.getByRole('button', { name: /Add Column/i })
    fireEvent.click(addBtn)
    
    const nameInput = await screen.findByDisplayValue(/new_column_/i)
    fireEvent.change(nameInput, { target: { value: 'age' } })
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('age')).toBeInTheDocument()
    })

    // Click Save
    fireEvent.click(screen.getByText('Save Changes'))

    // Should show SQL Preview Modal
    await waitFor(() => expect(screen.getByText('Preview SQL')).toBeInTheDocument())
    expect(screen.getByText(/ADD COLUMN "age"/)).toBeInTheDocument()

    // Click Execute
    fireEvent.click(screen.getByText('Execute'))

    await waitFor(() => {
        expect((window as any).api.query).toHaveBeenCalledWith('test-conn', expect.stringContaining('ADD COLUMN "age"'))
    })
  })

  it('validates column names', async () => {
    ;(window as any).api.query.mockResolvedValue({ success: true, rows: [] })
    render(<StructureView {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/Loading structure/i)).not.toBeInTheDocument())

    const addBtn = screen.getByRole('button', { name: /Add Column/i })
    fireEvent.click(addBtn)

    const nameInput = await screen.findByDisplayValue(/new_column_/i)
    fireEvent.change(nameInput, { target: { value: '1startWithNumber' } })
    
    await waitFor(() => {
      expect(screen.getByText(/cannot start with a number/i)).toBeInTheDocument()
    })

    fireEvent.change(nameInput, { target: { value: 'select' } })
    await waitFor(() => {
      expect(screen.getByText(/Reserved SQL keyword/i)).toBeInTheDocument()
    })
  })
})
