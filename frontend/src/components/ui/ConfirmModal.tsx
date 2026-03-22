import { HelpCircle, TriangleAlert } from 'lucide-react';
import type React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isDeleteAction =
    confirmText?.toLowerCase().includes('delete') || confirmText?.toLowerCase().includes('drop');

  // 动态选择图标：危险操作用警告三角，普通操作用帮助圆圈
  const Icon = isDeleteAction ? TriangleAlert : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[340px] rounded-[32px] shadow-2xl flex flex-col items-center p-8 m-4 animate-in fade-in zoom-in duration-200 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-16 h-16 ${isDeleteAction ? 'bg-red-50' : 'bg-primary-50'} rounded-full flex items-center justify-center mb-6`}
        >
          <Icon size={32} className={isDeleteAction ? 'text-red-500' : 'text-primary-500'} />
        </div>

        <h3 className="text-gray-900 text-lg font-extrabold mb-2 text-center uppercase tracking-tight">
          {title || (isDeleteAction ? 'Danger Zone' : 'Confirmation')}
        </h3>

        <div className="text-gray-500 text-sm font-medium text-center leading-relaxed mb-8 px-2">
          {message}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            data-testid="btn-confirm-ok"
            className={`w-full py-4 ${isDeleteAction ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'} text-white rounded-2xl font-bold text-base active:scale-[0.98] transition-all shadow-xl`}
            autoFocus
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            data-testid="btn-confirm-cancel"
            className="w-full py-2.5 bg-transparent text-gray-400 hover:text-gray-600 font-bold text-sm transition-all"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
