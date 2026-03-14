import React from 'react';
import { LogIn, Sparkles, Film, Database } from 'lucide-react';
import { googleService } from '../lib/google-workspace';

interface LoginModalProps {
  onLogin: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const handleLogin = () => {
    googleService.login(onLogin);
  };

  return (
    <div className="modal-overlay login-screen">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="logo-badge">
            <Sparkles size={32} className="icon-accent" />
          </div>
          <h1>ScriptShotAI</h1>
          <p className="subtitle">Nâng tầm kịch bản với Trí tuệ nhân tạo</p>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <Film size={20} className="icon-dim" />
            <span>Biên kịch chuyên nghiệp với Gemini 2.0</span>
          </div>
          <div className="feature-item">
            <Database size={20} className="icon-dim" />
            <span>Đồng bộ Google Docs & Sheets thời gian thực</span>
          </div>
        </div>

        <button className="btn-google-login" onClick={handleLogin}>
          <LogIn size={20} />
          Tiếp tục với Google
        </button>

        <p className="login-footer">
          Đăng nhập để sử dụng Gemini thông qua tài khoản Google của bạn mà không cần API Key.
        </p>
      </div>
    </div>
  );
};
