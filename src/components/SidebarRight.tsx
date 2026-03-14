import React from 'react';
import { 
  Upload, 
  Download, 
  RefreshCcw,
  LogOut,
  FolderPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarRightProps {
  isOpen: boolean;
  onOpenDownload: () => void;
  onOpenImport: () => void;
  onSyncScript: () => void;
  onSyncShotlist: () => void;
  onReset: () => void;
  scriptSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  shotlistSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  user?: any;
  onLogout: () => void;
  onLogin: () => void;
  setOpen: (v: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({ 
  isOpen, 
  onOpenDownload, 
  onOpenImport, 
  onSyncScript,
  onSyncShotlist,
  onReset,
  scriptSyncStatus,
  shotlistSyncStatus,
  user,
  onLogout,
  onLogin,
  setOpen,
  theme,
  setTheme
}) => {
  const [showLoginConfirm, setShowLoginConfirm] = React.useState(false);

  const handleLoginClick = () => {
    setShowLoginConfirm(true);
  };

  const confirmLogin = () => {
    setShowLoginConfirm(false);
    onLogin();
  };

  return (
    <>
    <aside className={`sidebar-right ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header right-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="sidebar-mobile-close-btn no-print"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
            style={{ display: 'flex', color: 'var(--text-secondary)' }}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <button className="sidebar-mobile-close-btn no-print" onClick={() => setOpen(false)}>
          <span>✕</span>
        </button>
      </div>
      <div className="sidebar-content">
        <div className="section-title" style={{ marginBottom: '16px' }}>{isOpen ? 'ĐỒNG BỘ GOOGLE' : '...'}</div>
        
        <div className="element-grid" style={{ gap: '8px' }}>
          {/* Nút Đồng bộ Kịch bản */}
          <button 
            className={`sidebar-action-btn sync-btn-minimal ${scriptSyncStatus} ${scriptSyncStatus === 'synced' ? 'success' : ''}`} 
            onClick={onSyncScript}
            disabled={scriptSyncStatus === 'syncing'}
            style={{ 
              justifyContent: isOpen ? 'flex-start' : 'center',
              padding: '12px 16px'
            }}
          >
            {scriptSyncStatus === 'syncing' ? (
              <RefreshCcw size={18} className="spin icon-accent" />
            ) : scriptSyncStatus === 'synced' ? (
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
            ) : scriptSyncStatus === 'error' ? (
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
            ) : (
              <RefreshCcw size={18} className="icon-accent" />
            )}
            {isOpen && <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Kịch bản</span>}
          </button>

          {/* Nút Đồng bộ Shotlist */}
          <button 
            className={`sidebar-action-btn sync-btn-minimal ${shotlistSyncStatus} ${shotlistSyncStatus === 'synced' ? 'success' : ''}`} 
            onClick={onSyncShotlist}
            disabled={shotlistSyncStatus === 'syncing'}
            style={{ 
              justifyContent: isOpen ? 'flex-start' : 'center',
              padding: '12px 16px'
            }}
          >
            {shotlistSyncStatus === 'syncing' ? (
              <RefreshCcw size={18} className="spin icon-accent" />
            ) : shotlistSyncStatus === 'synced' ? (
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
            ) : shotlistSyncStatus === 'error' ? (
              <AlertCircle size={18} style={{ color: '#ef4444' }} />
            ) : (
              <RefreshCcw size={18} className="icon-accent" />
            )}
            {isOpen && <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Shotlist</span>}
          </button>
        </div>

        <div className="section-title" style={{ marginTop: '32px' }}>{isOpen ? 'FILE & TRÍCH XUẤT' : '...'}</div>
        <div className="element-grid">
          <button className="sidebar-action-btn secondary " onClick={onReset}>
            <FolderPlus size={18} className="icon-accent" />
            {isOpen && <span>Dự án mới</span>}
          </button>

          <button className="sidebar-action-btn secondary" onClick={onOpenImport}>
            <Upload size={18} />
            {isOpen && <span>Tải lên (Docx, Xlsx)</span>}
          </button>

          <button className="sidebar-action-btn secondary" onClick={onOpenDownload}>
            <Download size={18} />
            {isOpen && <span>Trích xuất File</span>}
          </button>
        </div>

        <div className="sidebar-spacer" style={{ flex: 1 }}></div>

        {/* Simplified Auth Footer */}
        <div className="sidebar-footer-minimal">
          {user && isOpen && (
            <div className="user-email-header">
              {user.email}
            </div>
          )}
          
          <div className="auth-buttons-row">
            {!user ? (
              <button className="auth-btn login-primary" onClick={handleLoginClick}>
                <LogIn size={16} />
                {isOpen && <span>Đăng nhập</span>}
              </button>
            ) : (
              <>
                <button className="auth-btn login-dimmed" disabled>
                  <LogIn size={16} />
                  {isOpen && <span>Đã đăng nhập</span>}
                </button>
                <button className="auth-btn logout-danger" onClick={onLogout} title="Đăng xuất">
                  <LogOut size={16} />
                  {isOpen && <span>Thoát</span>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>

    {showLoginConfirm && (
      <div className="modal-overlay">
        <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
          <div className="logo-badge" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <CheckCircle2 size={32} style={{ color: '#10b981' }} />
          </div>
          <h3>Cam kết Bảo mật</h3>
          <p style={{ 
            fontSize: '0.9rem', 
            lineHeight: '1.6', 
            color: 'var(--text-secondary)',
            textAlign: 'center',
            margin: '0'
          }}>
            Bạn hãy yên tâm khi cấp quyền nhằm mục đích đồng bộ nội dung. Nếu có vấn đề gì, bạn hoàn toàn có thể bắt đền tài khoản Facebook của tôi:
          </p>
          <a 
            href="https://www.facebook.com/son151198/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: 'var(--accent)', 
              fontWeight: 700, 
              textAlign: 'center', 
              textDecoration: 'none',
              fontSize: '0.95rem',
              padding: '10px',
              background: 'rgba(220, 38, 38, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(220, 38, 38, 0.1)'
            }}
          >
            facebook.com/son151198/
          </a>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowLoginConfirm(false)}>
              Để sau
            </button>
            <button className="btn-primary" onClick={confirmLogin}>
              Tôi đã hiểu & Đăng nhập
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default SidebarRight;
