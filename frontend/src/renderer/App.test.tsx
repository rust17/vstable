import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('renders with a default session', async () => {
    render(<App />);
    expect(await screen.findByText('New Connection')).toBeInTheDocument();
    expect(await screen.findAllByText('Connect to PostgreSQL')).toHaveLength(1);
  });

  it('can add a new session', async () => {
    render(<App />);
    const addButton = await screen.findByTestId('add-session-btn');

    fireEvent.click(addButton);

    const tabs = await screen.findAllByTestId('session-tab');
    expect(tabs).toHaveLength(2);
  });

  it('ensures add button is outside the scrollable tab container', async () => {
    render(<App />);
    const addButton = await screen.findByTestId('add-session-btn');
    const titlebar = addButton.closest('.titlebar');
    const scrollContainer = titlebar?.querySelector('.overflow-x-auto');

    // The addButton should not be inside the scroll container
    expect(scrollContainer?.contains(addButton)).toBe(false);
    // Both should be children of the titlebar
    expect(addButton.closest('.titlebar')).toBeInTheDocument();
  });

  it('switches active session when clicking tabs', async () => {
    render(<App />);
    const addButton = await screen.findByTestId('add-session-btn');
    fireEvent.click(addButton); // Now we have 2 sessions

    const tabs = await screen.findAllByTestId('session-tab');
    expect(tabs).toHaveLength(2);
    const session1Tab = tabs[0];
    const session2Tab = tabs[1];

    // Switch to session 1
    fireEvent.click(session1Tab);

    await waitFor(() => {
      // Check if session 1 tab is active (it should have bg-white or similar class)
      expect(session1Tab).toHaveClass('bg-white');
      expect(session2Tab).not.toHaveClass('bg-white');
    });
  });
});
