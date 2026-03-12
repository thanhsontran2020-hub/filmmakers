import React from 'react';
import { FolderPlus, X, FileX, Table2, Info, RefreshCw } from 'lucide-react';
import { useEditor } from './EditorContext';
import './ResetModal.css';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose }) => {
  const { 
    resetFullScript,
    resetFullShotlist
  } = useEditor();

  if (!isOpen) return null;

  const handleResetFull = () => {
    if(window.confirm("BẮT ĐẦU DỰ ÁN MỚI HOÀN TOÀN?\nThao tác này sẽ xóa sạch cả Kịch bản và Shotlist. Bạn không thể hoàn tác!")) {
      resetFullScript();
      resetFullShotlist();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '92vw' }}
      >
        <header className="modal-header">
          <div className="modal-header-title">
            <FolderPlus size={24} className="icon-accent" />
            <h2>Dự án mới / Tùy chọn Reset</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body reset-main-grid">
          {/* Section 1: Reset Kịch bản */}
          <section className="reset-column">
            <div className="section-info">
              <div className="section-title-group">
                <FileX size={22} color="var(--accent)" />
                <h3>Chỉ Reset Kịch bản</h3>
              </div>
              <p style={{fontSize: '0.85rem'}}>Xóa nội dung viết, nhân vật và địa điểm. Shotlist sẽ được giữ nguyên.</p>
            </div>
            
            <div className="section-content">
              <button 
                className="modal-btn danger" 
                onClick={() => {
                  if(window.confirm("Xóa sạch Kịch bản? (Shotlist vẫn giữ nguyên)")) {
                    resetFullScript();
                    onClose();
                  }
                }}
              >
                <span className="modal-btn-label">XÓA TRẮNG KỊCH BẢN</span>
                <span className="modal-btn-meta">Làm mới toàn bộ trang viết</span>
              </button>
            </div>
          </section>

          {/* Section 2: Reset Shotlist */}
          <section className="reset-column">
            <div className="section-info">
              <div className="section-title-group">
                <Table2 size={22} color="var(--accent)" />
                <h3>Chỉ Reset Shotlist</h3>
              </div>
              <p style={{fontSize: '0.85rem'}}>Xóa toàn bộ các Shot và phân cảnh sản xuất. Nội dung kịch bản sẽ giữ nguyên.</p>
            </div>
            
            <div className="section-content">
              <button 
                className="modal-btn danger" 
                onClick={() => {
                  if(window.confirm("Xóa sạch Shotlist? (Kịch bản vẫn giữ nguyên)")) {
                    resetFullShotlist();
                    onClose();
                  }
                }}
              >
                <span className="modal-btn-label">XÓA TRẮNG SHOTLIST</span>
                <span className="modal-btn-meta">Làm mới bảng Đạo diễn & Quay phim</span>
              </button>
            </div>
          </section>

          {/* Full Reset Utility */}
          <div className="full-reset-area" style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--glass-border)', paddingTop: '32px', marginTop: '10px' }}>
            <button className="modal-btn minimal" onClick={handleResetFull} style={{ background: 'var(--accent)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <RefreshCw size={20} />
                <span className="modal-btn-label">BẮT ĐẦU DỰ ÁN MỚI HOÀN TOÀN</span>
              </div>
              <span className="modal-btn-meta" style={{ textAlign: 'center', width: '100%', display: 'block' }}>Reset cả Kịch bản và Shotlist để viết từ đầu</span>
            </button>
          </div>
        </div>

        <footer className="modal-footer">
          <div className="footer-tip">
            <Info size={14} />
            <span>Mẹo: Hãy trích xuất bản DOCX dự án hiện tại trước khi bắt đầu dự án mới.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
