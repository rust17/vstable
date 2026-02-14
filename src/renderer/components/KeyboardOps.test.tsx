import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi } from 'vitest'

describe('Keyboard Operations in SessionView', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mocking window.api
    ;(window as any).api = {
      connect: vi.fn(),
      query: vi.fn(),
    }
  })

  it('handles Ctrl+Tab MRU switching', async () => {
    // Setup connected state with multiple tables
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 't1', table_schema: 'public' }, { table_name: 't2', table_schema: 'public' }, { table_name: 't3', table_schema: 'public' }] })
      }
      return Promise.resolve({ success: true, rows: [], fields: [] })
    })

    render(<SessionView {...defaultProps} />)
    
    // Connect
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Open t1, then t2, then t3
    await waitFor(() => expect(screen.getByTestId('table-item-t1')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-t1'))
    await waitFor(() => expect(screen.getByTestId('tab-table-t1')).toBeInTheDocument())
    
    fireEvent.click(screen.getByTestId('table-item-t2'))
    await waitFor(() => expect(screen.getByTestId('tab-table-t2')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('table-item-t3'))
    await waitFor(() => expect(screen.getByTestId('tab-table-t3')).toBeInTheDocument())

    // Current order (MRU): t3, t2, t1
    expect(screen.getByTestId('tab-table-t3')).toHaveAttribute('data-active', 'true')

    // Press Ctrl + Tab
    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true })
    
    // TabSwitcher should be open, showing t2 as selected (index 1)
    expect(screen.getByText('Switch Tab')).toBeInTheDocument()
    const t2InSwitcher = screen.getAllByText('t2').find(el => el.closest('.fixed'))
    expect(t2InSwitcher?.closest('div')).toHaveClass('bg-blue-600')

    // Press Tab again while holding Ctrl
    fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true })
    // Now t1 should be selected
    const t1InSwitcher = screen.getAllByText('t1').find(el => el.closest('.fixed'))
    expect(t1InSwitcher?.closest('div')).toHaveClass('bg-blue-600')

    // Release Control
    fireEvent.keyUp(window, { key: 'Control' })

    // Switcher should be closed, and t1 should be active
    await waitFor(() => expect(screen.queryByText('Switch Tab')).not.toBeInTheDocument())
    expect(screen.getByTestId('tab-table-t1')).toHaveAttribute('data-active', 'true')
  })

  it('handles Cmd+P table fuzzy search', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }, { table_name: 'posts', table_schema: 'public' }] })
      }
      return Promise.resolve({ success: true, rows: [], fields: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Press Cmd + P
    fireEvent.keyDown(window, { key: 'p', metaKey: true })

    // Search modal should be open
    expect(screen.getByPlaceholderText('Search tables...')).toBeInTheDocument()

    // Type 'po'
    fireEvent.change(screen.getByPlaceholderText('Search tables...'), { target: { value: 'po' } })

    // Should show 'posts', but not 'users' (fuzzy/substring)
    const postsInModal = screen.getAllByText('posts').find(el => el.closest('.fixed'))
    expect(postsInModal).toBeInTheDocument()
    
    const usersInModal = screen.queryAllByText('users').find(el => el.closest('.fixed'))
    expect(usersInModal).toBeUndefined()

    // Press Enter to select
    fireEvent.keyDown(screen.getByPlaceholderText('Search tables...'), { key: 'Enter' })

    // Modal should be closed and posts tab should open
    await waitFor(() => expect(screen.queryByPlaceholderText('Search tables...')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByTestId('tab-table-posts')).toBeInTheDocument())
  })

  it('maximizes/restores on tab double click', async () => {
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      }
      return Promise.resolve({ success: true, rows: [], fields: [] })
    })

    render(<SessionView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-connect'))
    await waitFor(() => expect(screen.getByTestId('table-item-users')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('table-item-users'))
    await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())

    // Sidebar should be visible initially
    expect(screen.getByTestId('sidebar-scroll').closest('div')).not.toHaveClass('hidden')

    // Double click tab
    fireEvent.doubleClick(screen.getByTestId('tab-table-users'))

    // Sidebar should be hidden
    expect(screen.getByTestId('sidebar-scroll').parentElement).toHaveClass('hidden')

    // Double click again
    fireEvent.doubleClick(screen.getByTestId('tab-table-users'))

    // Sidebar should be visible
    expect(screen.getByTestId('sidebar-scroll').parentElement).not.toHaveClass('hidden')
  })
})
