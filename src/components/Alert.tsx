import React from 'react';
import { Alert as AlertType } from '../types';

interface AlertProps {
  alert: AlertType;
  onClose?: () => void;
}

/**
 * Reusable alert component for displaying messages
 */
export const Alert: React.FC<AlertProps> = ({ alert, onClose }) => {
  const alertClass = `alert alert-${alert.type} fade-in`;

  return (
    <div className={alertClass}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {alert.title && (
            <div className="alert-title">{alert.title}</div>
          )}
          <div className="alert-message">{alert.message}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 text-current opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Close alert"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}; 