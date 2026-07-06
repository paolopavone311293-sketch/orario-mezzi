import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DialogOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface DialogContextType {
  confirm: (options: DialogOptions) => void;
  alert: (title: string, message: string) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ title: string; message: string } | null>(null);

  const confirm = (options: DialogOptions) => {
    setDialog(options);
  };

  const alert = (title: string, message: string) => {
    setAlertDialog({ title, message });
  };

  const handleConfirm = () => {
    dialog?.onConfirm();
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.onCancel?.();
    setDialog(null);
  };

  const handleAlertClose = () => {
    setAlertDialog(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {dialog && (
        <div className="dialog-overlay" onClick={handleCancel}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{dialog.title}</h2>
            </div>
            <div className="dialog-body">
              <p>{dialog.message}</p>
            </div>
            <div className="dialog-footer">
              <button className="secondary" onClick={handleCancel}>
                {dialog.cancelText || 'Annulla'}
              </button>
              <button
                className={dialog.isDestructive ? 'danger' : 'primary'}
                onClick={handleConfirm}
              >
                {dialog.confirmText || 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {alertDialog && (
        <div className="dialog-overlay" onClick={handleAlertClose}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2>{alertDialog.title}</h2>
            </div>
            <div className="dialog-body">
              <p>{alertDialog.message}</p>
            </div>
            <div className="dialog-footer">
              <button className="primary" onClick={handleAlertClose} style={{ marginLeft: 'auto' }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}
