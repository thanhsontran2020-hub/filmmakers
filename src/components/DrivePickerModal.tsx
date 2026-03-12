import React, { useState, useEffect } from 'react';
import { X, FileText, Table, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { googleService } from '../lib/google-workspace';
import './ResetModal.css';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: { id: string; name: string; mimeType: string }) => void;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await googleService.listFilesFromAppFolder();
      setFiles(driveFiles);
    } catch (err) {
      setError("Không thể lấy danh sách file từ Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-header-title">
            <div className="icon-accent"><div style={{ display: 'flex' }}><FileText size={20} /><div style={{ marginLeft: '-8px', marginTop: '4px' }}><Table size={12} /></div></div></div>
            <h2>Chọn tệp từ Google Drive</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body" style={{ minHeight: '300px', maxHeight: '500px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
              <Loader2 className="animate-spin text-accent" size={32} />
              <p style={{ color: 'var(--text-secondary)' }}>Đang tìm tệp trong Filmmakers.vn...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
              <p>{error}</p>
              <button className="modal-btn" onClick={fetchFiles} style={{ marginTop: '16px' }}>Thử lại</button>
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ marginBottom: '16px', opacity: 0.5 }}><FileText size={48} /></div>
              <p>Thư mục <strong>Filmmakers.vn</strong> trên Drive đang trống.</p>
              <p style={{ fontSize: '0.85rem' }}>Các file đồng bộ từ web sẽ xuất hiện ở đây.</p>
              <button className="modal-btn" onClick={fetchFiles} style={{ marginTop: '20px' }}>
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>
          ) : (
            <div className="drive-file-list">
              {files.map(file => {
                const isDoc = file.mimeType.includes('document');
                const isSheet = file.mimeType.includes('spreadsheet');
                const isJson = file.mimeType.includes('json');

                if (!isDoc && !isSheet && !isJson) return null;

                return (
                  <div 
                    key={file.id} 
                    className="drive-file-item" 
                    onClick={() => onSelect(file)}
                  >
                    <div className="file-icon">
                      {isDoc && <FileText size={22} color="#4285f4" />}
                      {isSheet && <Table size={22} color="#0f9d58" />}
                      {isJson && <div className="icon-accent"><FileText size={22} /></div>}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-meta">
                        {isDoc ? 'Kịch bản (Google Doc)' : isSheet ? 'Shotlist (Google Sheet)' : 'Dữ liệu Dự án (.json)'}
                        {' • '}
                        {new Date(file.modifiedTime).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="modal-footer" style={{ borderTop: '1px solid var(--glass-border)', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end' }}>
             <button className="modal-btn secondary" onClick={onClose}>Hủy</button>
        </footer>
      </div>
      
      <style>{`
        .drive-file-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .drive-file-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .drive-file-item:hover {
          background: rgba(0, 0, 0, 0.03);
          border-color: var(--glass-border);
          transform: translateX(4px);
        }
        .dark-theme .drive-file-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .file-name {
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .file-meta {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .icon-accent {
            color: var(--accent);
        }
      `}</style>
    </div>
  );
};
