import { render, screen, waitFor } from '@testing-library/react'
import { SessionView } from './SessionView'
import { vi } from 'vitest'

describe('Window Management - Sidebar and Connections', () => {
  const defaultProps = {
    id: 'test-session',
    isActive: true,
    onUpdateTitle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock API
    ;(window.api.connect as any).mockResolvedValue({ success: true })
    ;(window.api.query as any).mockImplementation((id, sql) => {
      if (sql.includes('SELECT table_name')) {
        return Promise.resolve({ success: true, rows: [{ table_name: 'users', table_schema: 'public' }] })
      }
      return Promise.resolve({ success: true, rows: [] })
    })
  })

  it('should not show Connections header in sidebar', async () => {
    render(<SessionView {...defaultProps} />)
    
    // Check that 'Connections' header is NOT in the sidebar
    // Currently it IS there, so this should fail
    const connectionsHeader = screen.queryByRole('heading', { name: /connections/i })
    expect(connectionsHeader).not.toBeInTheDocument()
  })

  it('should not show active connection info in sidebar after connecting', async () => {
    render(<SessionView {...defaultProps} />)
    
    // Perform connection (using the form that appears by default)
    const connectBtn = screen.getByTestId('btn-connect')
    connectBtn.click()

    await waitFor(() => {
      expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument()
    })

    // Sidebar should only show Tables, not the connection info
    // Currently it shows connection info (Server icon + database name), so this should fail
    const serverIcon = document.querySelector('svg.lucide-server')
    expect(serverIcon).not.toBeInTheDocument()
  })

  it('should have a Connection add button in the top right header area', async () => {
    render(<SessionView {...defaultProps} />)
    
    // There should be an add connection button in the header area (top right)
    // We expect a button with test id 'btn-add-connection' or similar in the header
    const addConnBtn = screen.queryByTestId('btn-add-connection')
    expect(addConnBtn).toBeInTheDocument()
  })
  
  it('should still show Tables in the sidebar', async () => {
    render(<SessionView {...defaultProps} />)
    
    // Connect
    screen.getByTestId('btn-connect').click()
    
    await waitFor(() => {
      expect(screen.getByText(/Tables/i)).toBeInTheDocument()
      expect(screen.getByTestId('table-item-users')).toBeInTheDocument()
    })
  })
})
