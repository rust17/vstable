import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionView } from './SessionView'
import React from 'react'

// Mock context already handled by setup.tsx
const mockApi = (window as any).api

const defaultProps = {
  id: 'session-1',
  isActive: true,
  onUpdateTitle: vi.fn()
}

describe('SessionView UI Tasks - Maximize & Rubber Band', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.query.mockImplementation(() => Promise.resolve({ success: true, rows: [], fields: [] }))
    mockApi.connect.mockResolvedValue({ success: true })
  })

  const connectAndOpenTab = async () => {
    render(<SessionView {...defaultProps} />)
    fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } })
    fireEvent.click(screen.getByTestId('btn-connect'))
    
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Open a query tab
    fireEvent.click(screen.getByTestId('btn-new-query'))
    return await screen.findByTestId('tab-table-New Query')
  }

  describe('Tab Maximization', () => {
    it('maximizes and restores the editor area on double click', async () => {
      const tab = await connectAndOpenTab()
      
      // Sidebar should be visible initially
      const sidebar = screen.getByTestId('session-view-session-1').firstChild
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).not.toHaveClass('hidden')

      // Double click tab to maximize
      fireEvent.doubleClick(tab)
      
      // Expect sidebar to be hidden
      await waitFor(() => {
        expect(sidebar).toHaveClass('hidden')
      })

      // Double click tab again to restore
      fireEvent.doubleClick(tab)
      
      await waitFor(() => {
        expect(sidebar).not.toHaveClass('hidden')
      })
    })
  })

  describe('Rubber Band Effect', () => {
    it('applies overscroll behavior to scrollable areas', async () => {
      await connectAndOpenTab()
      
      // Sidebar scroll area
      const sidebarScroll = screen.getByTestId('sidebar-scroll')
      expect(sidebarScroll.className).toMatch(/overscroll-/)
      
      // Main results scroll area
      const resultsScroll = screen.getByTestId('results-scroll')
      expect(resultsScroll.className).toMatch(/overscroll-/)
    })
  })
})
