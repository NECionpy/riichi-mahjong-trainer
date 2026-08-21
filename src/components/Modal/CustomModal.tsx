import React from "react";
import "./CustomModal.less";

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
  width?: string;
  minWidth?: string;
  onClose?: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ isOpen, title, children, width, minWidth, className, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-modal-overlay" onMouseDown={onClose}>
      <div className={`custom-modal ${className || ''}`} style={{width, minWidth}} onMouseDown={(e) => e.stopPropagation()}>
      
        <div className="custom-modal-header">
          <h2>{title}</h2>
          <button className="custom-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="custom-modal-body">
          {children}
        </div>
          <div className="corner-tr ornate-corner"></div>
      </div>
    </div>
  );
};

export default CustomModal;
