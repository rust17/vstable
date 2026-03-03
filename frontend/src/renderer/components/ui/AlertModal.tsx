import React from 'react'
import { AlertCircle } from 'lucide-react'

interface AlertModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md" 
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-[320px] rounded-[28px] shadow-2xl flex flex-col items-center p-8 m-4 animate-in fade-in zoom-in duration-200 border border-white/20" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-red-500" />
        </div>

        <h3 className="text-gray-900 text-lg font-bold mb-2 text-center">Attention</h3>
        
        <div className="text-gray-500 text-sm font-medium text-center leading-relaxed mb-8 px-2">
          {message}
        </div>
        
        <button 
          onClick={onClose} 
          data-testid="btn-alert-ok"
          className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-700 active:scale-[0.98] transition-all shadow-lg shadow-primary-500/20"
          autoFocus
        >
          Got it
        </button>
      </div>
    </div>
  )
}
