import React from 'react';
import { FileText, Table, X, Download, FileCheck } from 'lucide-react';
import { useEditor } from './EditorContext';
import { exportScriptToDocx, exportShotlistToDocx, exportShotlistToExcel } from '../lib/exportUtils';
import './DownloadModal.css';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
  const { project, shotlist } = useEditor();

  if (!isOpen) return null;

  return (
    <div className="download-modal-overlay" onClick={onClose}>
      <div className="download-modal-content glass-card" onClick={e => e.stopPropagation()}>
        <header className="download-header">
          <div className="header-title">
            <Download size={20} className="accent-icon" />
            <h2>Trích xuất dữ liệu</h2>
          </div>
          <button className="btn-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="download-sections">
          {/* Section: Script */}
          <section className="export-section">
            <div className="section-info">
              <FileText size={24} />
              <h3>Kịch bản văn học</h3>
              <p>Xuất nội dung kịch bản văn học với định dạng chuẩn.</p>
            </div>
            <div className="export-options">
              <button 
                className="export-btn" 
                onClick={() => {
                  exportScriptToDocx(project.projectName, project.author, project.scriptBlocks);
                  onClose();
                }}
              >
                <div className="btn-label">Tải về Word (.docx)</div>
                <div className="btn-meta">Chỉ dành cho kịch bản</div>
              </button>
            </div>
          </section>

          {/* Section: Shotlist */}
          <section className="export-section">
            <div className="section-info">
              <Table size={24} />
              <h3>Danh sách quay (Shotlist)</h3>
              <p>Xuất bảng phân cảnh chi tiết cho đoàn làm phim.</p>
            </div>
            <div className="export-options">
              <div className="option-group">
                <h4>Xuất lẻ (.docx)</h4>
                <div className="group-btns">
                  <button 
                    className="export-btn secondary" 
                    onClick={() => {
                      exportShotlistToDocx(project.shotlistProjectName || project.projectName, project.shotlistDirector || project.author, shotlist, 'director');
                      onClose();
                    }}
                  >
                    Bảng Đạo diễn
                  </button>
                  <button 
                    className="export-btn secondary" 
                    onClick={() => {
                      exportShotlistToDocx(project.shotlistProjectName || project.projectName, project.shotlistDirector || project.author, shotlist, 'dp');
                      onClose();
                    }}
                  >
                    Bảng Quay phim
                  </button>
                </div>
              </div>

              <div className="option-group">
                <h4>Xuất Excel (.xlsx)</h4>
                <button 
                  className="export-btn excel" 
                  onClick={() => {
                    exportShotlistToExcel(project.shotlistProjectName || project.projectName, project.shotlistDirector || project.author, shotlist);
                    onClose();
                  }}
                >
                  <div className="btn-label">Tải file Excel đầy đủ</div>
                  <div className="btn-meta">Bao gồm 2 tab (ĐD & QP)</div>
                </button>
              </div>
            </div>
          </section>
        </div>

        <footer className="download-footer">
          <div className="footer-tip">
            <FileCheck size={14} />
            <span>Kinh nghiệm: Sử dụng file Excel để in ấn bảng tập trung tại hiện trường.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
