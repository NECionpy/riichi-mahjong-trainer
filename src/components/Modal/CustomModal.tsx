import React from "react";
import "./CustomModal.css";

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const CustomModal: React.FC<CustomModalProps> = ({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-modal-overlay" onMouseDown={onClose}>
      <div className="custom-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="custom-modal-header">
          <h2>{title}</h2>
          <button className="custom-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="custom-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
