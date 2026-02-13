import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Polyfill crypto.randomUUID for JSDOM
if (typeof window !== 'undefined' && !window.crypto) {
  (window as any).crypto = {};
}
if (typeof window !== 'undefined' && !window.crypto.randomUUID) {
  (window as any).crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Mock Electron API
window.api = {
  connect: vi.fn(),
  query: vi.fn(),
  disconnect: vi.fn(),
}

// Mock Monaco Editor
// We mock it to a simple textarea so we can test value changes easily
vi.mock('@monaco-editor/react', () => {
  return {
    default: ({ value, onChange, onMount }: any) => {
      // We simulate the editor instance for onMount if needed, 
      // but for simple value testing a textarea is enough.
      // If the component uses editor instance methods (like getValue), 
      // we might need a more complex mock or expose it via ref.
      
      // However, the component in SessionView uses onMount to add commands.
      // We can mock that.
      const editorMock = {
        getValue: () => value,
        addCommand: (key: number, fn: Function) => {
          (window as any)._monaco_commands = (window as any)._monaco_commands || {};
          (window as any)._monaco_commands[key] = fn;
        },
      }
      
      const monacoMock = {
        KeyMod: { CtrlCmd: 2048 },
        KeyCode: { Enter: 3 },
      }

      React.useEffect(() => {
        if (onMount) {
          onMount(editorMock, monacoMock)
        }
      }, [])

      return (
        <textarea
          data-testid="monaco-editor-mock"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )
    },
  }
})

// Mock Lucide React icons to avoid issues with SVG rendering or missing props if any
// (Usually not strictly necessary but keeps snapshots clean if used)
// For now, we rely on the actual components as they are simple SVGs.
