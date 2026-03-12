import React from 'react';
import { AlertTriangle, X, Upload, Info } from 'lucide-react';
import './ResetModal.css';

interface ImportConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLocal: () => void;
  onConfirmGoogle: () => void;
  isLoggedIn: boolean;
}

const ImportConfirmModal: React.FC<ImportConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirmLocal, 
  onConfirmGoogle, 
  isLoggedIn 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '820px' }} onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-header-title">
            <Upload size={20} className="accent-icon" />
            <h2>Nhập dữ liệu kịch bản mới</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          <section className="modal-section">
            <div className="section-info">
              <div className="section-title-group">
                <AlertTriangle size={28} color="#ef4444" style={{ flexShrink: 0 }} />
                <h3 style={{ margin: 0 }}>Cảnh báo ghi đè</h3>
              </div>
              <p>Tải lên file `.docx` hoặc `.xlsx` mới sẽ thay thế các nội dung tương ứng hiện có trong dự án này.</p>
              
              <div className="modal-sync-list">
                <div className="modal-sync-item"><span className="modal-sync-icon">→</span> Kịch bản & Hội thoại (nếu chọn file Word)</div>
                <div className="modal-sync-item"><span className="modal-sync-icon">→</span> Danh sách Shots quay (nếu chọn file Excel)</div>
              </div>
            </div>
            
            <div className="section-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <button className="modal-btn" onClick={onConfirmLocal} style={{ padding: '24px', flexDirection: 'column', gap: '8px' }}>
                <Upload size={24} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="modal-btn-label">Tải lên từ Máy tính</span>
                  <span className="modal-btn-meta">Chọn file .docx hoặc .xlsx</span>
                </div>
              </button>
              
              <button 
                className={`modal-btn ${isLoggedIn ? 'success' : 'secondary'}`} 
                onClick={onConfirmGoogle} 
                style={{ padding: '24px', flexDirection: 'column', gap: '8px' }}
              >
                <div className="icon-accent"><Upload size={24} /></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="modal-btn-label">Từ Google Drive</span>
                  <span className="modal-btn-meta">{isLoggedIn ? 'Chọn file từ thư mục Filmmakers.vn' : 'Yêu cầu đăng nhập trước'}</span>
                </div>
              </button>
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <div className="footer-tip">
            <Info size={16} />
            <span>Kinh nghiệm: Bạn có thể kéo thả trực tiếp file Word vào màn hình soạn thảo để nhập nhanh.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ImportConfirmModal;
