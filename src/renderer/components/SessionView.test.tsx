import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    expect(screen.getByTestId('input-host')).toHaveValue('localhost')
  })

  it('handles connection success', async () => {
    // Mock successful connect
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    // Mock fetching tables
    ;(window.api.query as any).mockResolvedValue({ success: true, rows: [] })

    render(<SessionView {...defaultProps} />)

    // Fill form (defaults are already filled, just click connect)
    fireEvent.click(screen.getByTestId('btn-connect'))

    await waitFor(() => {
      expect(window.api.connect).toHaveBeenCalledWith('test-session', expect.objectContaining({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        database: 'postgres'
      }))
    })

    // Expect form to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument()
    })
    
    // Expect Tables to be fetched
    expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('SELECT table_name'))
  })

  it('handles connection failure', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: false, error: 'Connection refused' })

    render(<SessionView {...defaultProps} />)

    fireEvent.click(screen.getByTestId('btn-connect'))

    await waitFor(() => {
      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    })
    
    // Form should still be visible
    expect(screen.getByTestId('connection-form')).toBeInTheDocument()
  })

  it('executes sql query', async () => {
    // Setup connected state
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{table_name: 'users', table_schema: 'public'}] })
      if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [] })
      if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [] })
      if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{count: '0'}] })
      if (sql === 'SELECT * FROM users') return Promise.resolve({  
        success: true, 
        rows: [{ id: 1, name: 'Alice' }], 
        fields: [{ name: 'id' }, { name: 'name' }] 
      })
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // MUST open a query tab to see the editor
    // Open a New Query tab via Cmd+T
    fireEvent.keyDown(window, { key: 't', metaKey: true })
    await waitFor(() => expect(screen.getByText(/New Query/i)).toBeInTheDocument())

    // Enter query
    const editors = screen.getAllByTestId('monaco-editor-mock')
    const editor = editors[editors.length - 1]
    fireEvent.change(editor, { target: { value: 'SELECT * FROM users' } })

    // Click Run
    fireEvent.click(screen.getByTestId('btn-run-query'))

    await waitFor(() => {
      expect(window.api.query).toHaveBeenCalledWith('test-session', 'SELECT * FROM users')
    })
    
    // Check results
    await waitFor(() => {
       expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('updates data in grid', async () => {
    // Setup connected state with tables and data
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      }
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ success: true, rows: [{ count: '1' }] })
      }
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}, {column_name: 'name', data_type: 'text'}] })
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
      if (sql.includes('UPDATE "public"."users"')) {
        return Promise.resolve({ success: true })
      }
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Click on 'users' table
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))

    // Wait for data to load
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())

    // Double click on 'Alice' cell to edit
    const aliceText = screen.getByText('Alice')
    fireEvent.doubleClick(aliceText)

    // Change value
    await waitFor(() => expect(screen.getByDisplayValue('Alice')).toBeInTheDocument())
    const input = screen.getByDisplayValue('Alice')
    fireEvent.change(input, { target: { value: 'Bob' } })
    
    // Click Save
    ;(window.api.query as any).mockClear()
    fireEvent.click(screen.getByText('Save Changes'))

    // Verify UPDATE query was called
    await waitFor(() => {
      expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('UPDATE "public"."users" SET "name" = \'Bob\' WHERE "id" = \'1\''))
    })
  })

  it('updates table structure', async () => {
    // Setup connected state with tables and structure
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      }
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ success: true, rows: [{ count: '2' }] })
      }
      if (sql.includes('information_schema.columns')) {
        return Promise.resolve({
          success: true,
          rows: [
            { column_name: 'id', data_type: 'integer', is_nullable: 'NO', column_default: null, pk_constraint_name: 'pk' },
            { column_name: 'name', data_type: 'text', is_nullable: 'YES', column_default: null, pk_constraint_name: null }
          ]
        })
      }
      if (sql.includes('pg_class t')) {
        return Promise.resolve({ success: true, rows: [] })
      }
      if (sql.includes('PRIMARY KEY')) {
        return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
      }
      if (sql.includes('ALTER TABLE')) {
        return Promise.resolve({ success: true })
      }
      return Promise.resolve({ success: true, rows: [] })
    })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Click on 'users' table
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))

    // Wait for the tabs to appear
    await waitFor(() => expect(screen.getByTestId('tab-structure')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('tab-structure'))

    // Wait for structure to load
    await waitFor(() => expect(screen.getByDisplayValue('name')).toBeInTheDocument())

    // Change value directly in the input
    const input = screen.getByDisplayValue('name')
    fireEvent.change(input, { target: { value: 'full_name' } })
    
    // Click Save
    fireEvent.click(screen.getByText('Save Changes'))

    // Verify Preview Modal appears
    await waitFor(() => expect(screen.getByText('Preview SQL')).toBeInTheDocument())
    
    // Click Execute in modal
    ;(window.api.query as any).mockClear()
    fireEvent.click(screen.getByText('Execute'))

    // Verify ALTER TABLE query was called
    await waitFor(() => {
      expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('RENAME COLUMN "name" TO "full_name"'))
    })
  })

  it('triggers query execution with Cmd+Enter shortcut', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockResolvedValue({ success: true, rows: [], fields: [] })
    // Mock tables for click
    ;(window.api.query as any).mockImplementation((id, sql) => {
       if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{table_name: 'users', table_schema: 'public'}] })
       return Promise.resolve({ success: true, rows: [], fields: [] })
    })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Open a New Query tab
    // Open a New Query tab via Cmd+T
    fireEvent.keyDown(window, { key: 't', metaKey: true })
    await waitFor(() => expect(screen.getByText(/New Query/i)).toBeInTheDocument())

    // The command key is KeyMod.CtrlCmd | KeyCode.Enter = 2048 | 3 = 2051
    const cmdEnterKey = 2051
    await waitFor(() => expect((window as any)._monaco_commands?.[cmdEnterKey]).toBeDefined())
    
    // Trigger the command
    const executeCommand = (window as any)._monaco_commands[cmdEnterKey]
    executeCommand()

    await waitFor(() => {
      expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('SELECT * FROM '))
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      // Setup connected state with a table
      ;(window.api.connect as any).mockResolvedValue({ success: true })
      ;(window.api.query as any).mockImplementation((id, sql) => {
        if (sql.includes('SELECT table_name')) {
          return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
        }
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ success: true, rows: [{ count: '250' }] })
        }
        if (sql.includes('information_schema.columns')) {
          return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}, {column_name: 'name', data_type: 'text'}] })
        }
        if (sql.includes('SELECT * FROM "public"."users"')) {
          return Promise.resolve({
            success: true,
            rows: Array(100).fill(0).map((_, i) => ({ id: i, name: `User ${i}` })),
            fields: [{ name: 'id' }, { name: 'name' }]
          })
        }
        return Promise.resolve({ success: true, rows: [] })
      })

      render(<SessionView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('btn-connect'))
      await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByText('User 0')).toBeInTheDocument())
    })

    it('renders pagination controls', () => {
      expect(screen.getByTestId('btn-prev-page')).toBeInTheDocument()
      expect(screen.getByTestId('btn-next-page')).toBeInTheDocument()
      expect(screen.getByTestId('input-page-number')).toBeInTheDocument()
      expect(screen.getByTestId('select-page-size')).toBeInTheDocument()
    })

    it('navigates to next page', async () => {
      (window.api.query as any).mockClear()
      const nextBtn = screen.getByTestId('btn-next-page')
      fireEvent.click(nextBtn)

      await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('LIMIT 100 OFFSET 100'))
      })
    })

    it('navigates to previous page', async () => {
      // Go to second page first
      fireEvent.click(screen.getByTestId('btn-next-page'))
      await waitFor(() => expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('OFFSET 100')))

      ;(window.api.query as any).mockClear()
      const prevBtn = screen.getByTestId('btn-prev-page')
      fireEvent.click(prevBtn)

      await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('LIMIT 100 OFFSET 0'))
      })
    })

    it('changes page size', async () => {
      (window.api.query as any).mockClear()
      const select = screen.getByTestId('select-page-size')
      fireEvent.change(select, { target: { value: '50' } })

      await waitFor(() => {
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('LIMIT 50'))
      })
    })

    it('jumps to specific page', async () => {
      (window.api.query as any).mockClear()
      const input = screen.getByTestId('input-page-number')
      fireEvent.change(input, { target: { value: '3' } })
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        // Page 3 with size 100 should be OFFSET 200
        expect(window.api.query).toHaveBeenCalledWith('test-session', expect.stringContaining('LIMIT 100 OFFSET 200'))
      })
    })
  })

  describe('New Data Table Features', () => {
    beforeEach(async () => {
      // Setup connected state with multiple tables
      ;(window.api.connect as any).mockResolvedValue({ success: true })
      ;(window.api.query as any).mockImplementation((id, sql) => {
        if (sql.includes('SELECT table_name')) {
          return Promise.resolve({ 
            success: true, 
            rows: [
              { table_name: 'users', table_schema: 'public' },
              { table_name: 'posts', table_schema: 'public' }
            ] 
          })
        }
        if (sql.includes('information_schema.columns')) {
          if (sql.includes("'users'")) {
            return Promise.resolve({
              success: true,
              rows: [
                { column_name: 'id', data_type: 'integer' },
                { column_name: 'name', data_type: 'text' }
              ]
            })
          }
          if (sql.includes("'posts'")) {
            return Promise.resolve({
              success: true,
              rows: [
                { column_name: 'post_id', data_type: 'integer' },
                { column_name: 'title', data_type: 'varchar' }
              ]
            })
          }
        }
        if (sql.includes('COUNT(*)')) {
          return Promise.resolve({ success: true, rows: [{ count: '1' }] })
        }
        if (sql.includes('PRIMARY KEY')) {
          return Promise.resolve({ success: true, rows: [] })
        }
        if (sql.includes('SELECT * FROM "public"."users"')) {
          return Promise.resolve({
            success: true,
            rows: [{ id: 1, name: 'Alice' }],
            fields: [{ name: 'id' }, { name: 'name' }]
          })
        }
        if (sql.includes('SELECT * FROM "public"."posts"')) {
          return Promise.resolve({
            success: true,
            rows: [{ post_id: 1, title: 'Hello' }],
            fields: [{ name: 'post_id' }, { name: 'title' }]
          })
        }
        return Promise.resolve({ success: true, rows: [] })
      })

      render(<SessionView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('btn-connect'))
      await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())
    })

    it('opens a new tab when a table is clicked and supports multiple table tabs', async () => {
      // Click 'users' table
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))

      // Should show a tab for 'users'
      await waitFor(() => {
        expect(screen.getByTestId('tab-table-users')).toBeInTheDocument()
      })

      // Click 'posts' table
      fireEvent.click(screen.getByTestId('table-item-posts'))

      // Should show tabs for both 'users' and 'posts'
      await waitFor(() => {
        expect(screen.getByTestId('tab-table-users')).toBeInTheDocument()
        expect(screen.getByTestId('tab-table-posts')).toBeInTheDocument()
      })
      
      // 'posts' should be the active one
      expect(screen.getByTestId('tab-table-posts')).toHaveAttribute('data-active', 'true')
    })

    it('displays column data types in the table header', async () => {
      // Click 'users' table
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))

      // Check for column headers with types. The text might be split into spans.
      await waitFor(() => {
        const idTh = screen.getAllByText('id').find(el => el.tagName === 'SPAN' && el.closest('th'))?.closest('th')
        expect(idTh).toHaveTextContent(/integer/i)
        
        const nameTh = screen.getAllByText('name').find(el => el.tagName === 'SPAN' && el.closest('th'))?.closest('th')
        expect(nameTh).toHaveTextContent(/text/i)
      })

      // Click 'posts' table
      fireEvent.click(screen.getByTestId('table-item-posts'))

      // Check for posts column headers with types
      await waitFor(() => {
        const postIdTh = screen.getAllByText('post_id').find(el => el.tagName === 'SPAN' && el.closest('th'))?.closest('th')
        expect(postIdTh).toHaveTextContent(/integer/i)
        
        const titleTh = screen.getAllByText('title').find(el => el.tagName === 'SPAN' && el.closest('th'))?.closest('th')
        expect(titleTh).toHaveTextContent(/varchar/i)
      })
    })

    it('can switch between open table tabs', async () => {
      // Open 'users' then 'posts'
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      
      fireEvent.click(screen.getByTestId('table-item-posts'))
      await waitFor(() => expect(screen.getByTestId('tab-table-posts')).toBeInTheDocument())

      // Currently 'posts' is active. Switch back to 'users'
      fireEvent.click(screen.getByTestId('tab-table-users'))

      await waitFor(() => {
        expect(screen.getByTestId('tab-table-users')).toHaveAttribute('data-active', 'true')
        // Check if 'users' data is displayed
        expect(screen.getByText('Alice')).toBeInTheDocument()
      })
    })

    it('can close a table tab', async () => {
      // Open 'users'
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())

      // Close 'users' tab
      const closeBtn = screen.getByTestId('close-tab-users')
      fireEvent.click(closeBtn)

      await waitFor(() => {
        expect(screen.queryByTestId('tab-table-users')).not.toBeInTheDocument()
      })
    })
  })

  describe('Row Selection and Persistence', () => {
    beforeEach(async () => {
      ;(window.api.connect as any).mockResolvedValue({ success: true })
      ;(window.api.query as any).mockImplementation((id, sql) => {
        if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
        if (sql.includes('COUNT(*)')) return Promise.resolve({ success: true, rows: [{ count: '1' }] })
        if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'id', data_type: 'integer'}, {column_name: 'name', data_type: 'text'}] })
        if (sql.includes('PRIMARY KEY')) return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
        if (sql.includes('SELECT * FROM "public"."users"')) {
          return Promise.resolve({ success: true, rows: [{ id: 1, name: 'Alice' }], fields: [{ name: 'id' }, { name: 'name' }] })
        }
        return Promise.resolve({ success: true, rows: [] })
      })

      render(<SessionView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('btn-connect'))
      await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    })

    it('highlights a row when clicked', async () => {
      const row = screen.getByText('Alice').closest('tr')
      expect(row).not.toHaveAttribute('data-selected', 'true')
      
      fireEvent.click(row!)
      expect(row).toHaveAttribute('data-selected', 'true')
      expect(row).toHaveClass('bg-blue-100')
    })

    it('persists row highlight after closing the edit modal', async () => {
      const aliceCell = screen.getByText('Alice')
      const row = aliceCell.closest('tr')

      // Double click to focus and open modal
      fireEvent.doubleClick(aliceCell)
      expect(row).toHaveAttribute('data-selected', 'true')
      expect(screen.getByTestId('edit-textarea')).toBeInTheDocument()

      // Close modal
      fireEvent.click(screen.getByText('Cancel'))
      
      // Modal closed, but row should still be selected
      expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument()
      expect(row).toHaveAttribute('data-selected', 'true')
      expect(row).toHaveClass('bg-blue-100')
    })
  })
})
