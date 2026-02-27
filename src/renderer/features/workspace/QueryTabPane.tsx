import React, { useState, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { Play } from 'lucide-react'
import { useSession } from '../../providers/SessionProvider'
import { ResultGrid } from '../../ui/data-grid/ResultGrid'
import { TableTab } from '../../types/session'

interface QueryTabPaneProps {
  tab: TableTab
  isActive: boolean
  onUpdateTab: (updates: Partial<TableTab>) => void
}

export const QueryTabPane: React.FC<QueryTabPaneProps> = ({ tab, isActive, onUpdateTab }) => {
  const { query } = useSession()
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const editorRef = useRef<any>(null)

  const handleExecute = async () => {
    if (!tab.query.trim()) return
    setExecuting(true)
    setError(null)
    
    // Clear previous results? Maybe
    onUpdateTab({ results: null })

    try {
      const res = await query(tab.query)
      if (res.success) {
        onUpdateTab({ results: { rows: res.rows || [], fields: res.fields || [] } })
      } else {
        setError(res.error || 'Query failed')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
      {/* Editor Section */}
      <div className="h-1/2 border-b border-gray-200 flex flex-col bg-white overflow-hidden relative">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
           <div className="flex items-center gap-2">
              <Play size={14} className="text-green-500" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">SQL Query</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 italic mr-2">Cmd+Enter to Run</span>
              <button 
                data-testid="btn-run-query"
                onClick={handleExecute}
                disabled={executing}
                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1"
              >
                <Play size={12} fill="currentColor" /> {executing ? 'Running...' : 'Run'}
              </button>
           </div>
        </div>
        <div className="flex-1 relative">
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="vs"
            value={tab.query}
            onChange={(val) => onUpdateTab({ query: val || '' })}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: 'on',
              padding: { top: 10 },
              wordWrap: 'on'
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handleExecute)
            }}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="px-4 py-1 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Results</span>
              {tab.results?.rows && <span className="text-[10px] text-gray-400">{tab.results.rows.length} rows</span>}
          </div>
          <div className="flex-1 overflow-hidden relative">
            <ResultGrid 
                rows={tab.results?.rows || []}
                fields={tab.results?.fields || []}
                loading={executing}
                error={error}
                // Query results are generally read-only for now unless we implement row identification logic
            />
          </div>
      </div>
    </div>
  )
}
