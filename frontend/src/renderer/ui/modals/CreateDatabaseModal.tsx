import React, { useState } from 'react'

interface CreateDatabaseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export const CreateDatabaseModal: React.FC<CreateDatabaseModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('')
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 p-6 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Create Database</h3>
        <input
          autoFocus
          placeholder="Database Name"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 mb-6"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name) onCreate(name)
            if (e.key === 'Escape') onClose()
          }}
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button 
            disabled={!name}
            onClick={() => onCreate(name)} 
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
