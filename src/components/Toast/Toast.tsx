import React, { useEffect, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const typeConfig: Record<ToastType, { icon: string; className: string }> = {
  success: { icon: '✓', className: 'toast-success' },
  error: { icon: '✗', className: 'toast-error' },
  info: { icon: 'ℹ', className: 'toast-info' },
};

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(onClose, 300); // 等待动画结束后移除
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  const config = typeConfig[type];

  return (
    <div className={`toast-item ${config.className} ${visible ? 'toast-enter' : 'toast-exit'}`}>
      <span className="toast-icon">{config.icon}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast;