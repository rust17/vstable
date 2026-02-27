import React, { useState, useEffect } from 'react'
import { Edit2, X } from 'lucide-react'

interface DataEditModalProps {
  isOpen: boolean
  value: string
  title?: string
  dataType?: string
  onClose: () => void
  onSave: (val: string) => void
}

export const DataEditModal: React.FC<DataEditModalProps> = ({ isOpen, value, title, dataType, onClose, onSave }) => {
  const [val, setVal] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
        setVal(value)
        setError(null)
    }
  }, [isOpen, value])

  const handleSave = () => {
      if (dataType?.includes('json')) {
          try {
              if (val.trim()) JSON.parse(val)
          } catch (e: any) {
              setError('Invalid JSON: ' + e.message)
              return
          }
      }
      onSave(val)
  }

  if (!isOpen) return null

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" 
        role="dialog"
        onKeyDown={e => {
            if (e.key === 'Escape') onClose()
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
        }}
    >
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh] m-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <div className="flex flex-col">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Edit2 size={16} className="text-blue-500" /> {title || 'Edit Data'}</h3>
            {dataType && <span className="text-[10px] text-gray-400 font-mono ml-6">{dataType}</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-0 flex-1 overflow-hidden relative">
          <textarea
            data-testid="edit-textarea"
            className={`w-full h-full min-h-[300px] p-6 font-mono text-sm border-none focus:ring-0 outline-none resize-none bg-white text-gray-800 ${error ? 'bg-red-50/30' : ''}`}
            value={val}
            onChange={e => {
                setVal(e.target.value)
                if (error) setError(null)
            }}
            autoFocus
            spellCheck={false}
          />
          {error && (
              <div className="absolute bottom-4 left-6 right-6 p-3 bg-red-600 text-white text-xs rounded-lg shadow-xl animate-in slide-in-from-bottom-2 duration-200 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}><X size={14} /></button>
              </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  )
}
