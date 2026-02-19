import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'

describe('App Component', () => {
  it('renders with a default session', () => {
    render(<App />)
    expect(screen.getByText('New Connection')).toBeInTheDocument()
    expect(screen.getAllByText('Connection Settings')).toHaveLength(1)
  })

  it('can add a new session', () => {
    render(<App />)
    const addButton = screen.getByTestId('add-session-btn')
    
    fireEvent.click(addButton)
    
    const tabs = screen.getAllByTestId('session-tab')
    expect(tabs).toHaveLength(2)
  })

  it('ensures add button is outside the scrollable tab container', () => {
    render(<App />)
    const addButton = screen.getByTestId('add-session-btn')
    const titlebar = addButton.closest('.titlebar')
    const scrollContainer = titlebar?.querySelector('.overflow-x-auto')
    
    // The addButton should not be inside the scroll container
    expect(scrollContainer?.contains(addButton)).toBe(false)
    // Both should be children of the titlebar
    expect(addButton.closest('.titlebar')).toBeInTheDocument()
  })

  it('switches active session when clicking tabs', () => {
    render(<App />)
    const addButton = screen.getByTestId('add-session-btn')
    fireEvent.click(addButton) // Now we have 2 sessions, session 2 is active
    
    const tabs = screen.getAllByTestId('session-tab')
    const session1Tab = tabs[0]
    const session2Tab = tabs[1]
    
    // Check initial state (session 2 should be visible, session 1 hidden)
    const sessionViews = screen.getAllByTestId(/session-view-/)
    const view1 = sessionViews.find(v => v.getAttribute('data-testid') !== `session-view-${session2Tab.getAttribute('key')}`)
    // Since we don't easily have the UUID here, let's just use the order
    
    expect(sessionViews[0]).toHaveStyle('display: none')
    expect(sessionViews[1]).toHaveStyle('display: flex')
    
    // Switch to session 1
    fireEvent.click(session1Tab)
    
    expect(sessionViews[0]).toHaveStyle('display: flex')
    expect(sessionViews[1]).toHaveStyle('display: none')
  })
})
