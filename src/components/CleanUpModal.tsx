import React from 'react';
import { Trash2, X, AlertTriangle, User, MapPin, Table2, ScrollText, Clapperboard } from 'lucide-react';
import { useEditor } from './EditorContext';
import './CleanUpModal.css';

interface CleanUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'script' | 'shotlist';
}

export const CleanUpModal: React.FC<CleanUpModalProps> = ({ isOpen, onClose, type }) => {
  const { 
    clearCharacters, 
    clearLocations, 
    clearScript,
    resetFullShotlist,
    resetShotlistContentOnly
  } = useEditor();

  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleAction = (action: () => void, label: string) => {
    action();
    setSuccessMsg(`Đã dọn dẹp ${label}!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const isScript = type === 'script';
  const title = isScript ? "DỌN DẸP DỮ LIỆU KỊCH BẢN" : "DỌN DẸP DỮ LIỆU SHOTLIST";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content glass-card clean-up-modal-horizontal" 
        onClick={e => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-header-title">
            <Trash2 size={24} className="icon-accent" />
            <h2>{title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body cleanup-horizontal-body">
          <div className="cleanup-intro">
            <div className="warning-box-compact">
              <AlertTriangle className="warning-icon" size={24} />
              <p>Chọn các thông tin bạn muốn dọn dẹp bên dưới. Thao tác này sẽ xóa dữ liệu nhập, bạn nên cẩn thận khi nhấn nút.</p>
            </div>
            {successMsg && <div className="success-toast">{successMsg}</div>}
          </div>

          <div className="cleanup-grid-horizontal">
            {isScript ? (
              <>
                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <User size={20} />
                    <h3>NHÂN VẬT</h3>
                  </div>
                  <p>Xóa sạch danh sách nhân vật đã quét hoặc nhập tay trong mục nhập nhanh.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(clearCharacters, "Nhân vật")}
                  >
                    XÓA NHÂN VẬT
                  </button>
                </section>

                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <MapPin size={20} />
                    <h3>ĐỊA ĐIỂM</h3>
                  </div>
                  <p>Xóa sạch danh sách địa điểm đã quét hoặc nhập tay trong mục nhập nhanh.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(clearLocations, "Địa điểm")}
                  >
                    XÓA ĐỊA ĐIỂM
                  </button>
                </section>

                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <ScrollText size={20} />
                    <h3>KỊCH BẢN</h3>
                  </div>
                  <p>Xóa toàn bộ các dòng nội dung kịch bản hiện tại và đưa về trạng thái trống.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(clearScript, "Kịch bản")}
                  >
                    XÓA KỊCH BẢN
                  </button>
                </section>
              </>
            ) : (
              <>
                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <Table2 size={20} />
                    <h3>BẢNG ĐẠO DIỄN</h3>
                  </div>
                  <p>Xóa nội dung (Nội dung, Diễn xuất, Ghi chú) trong bảng Đạo diễn.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(() => resetShotlistContentOnly('director'), "Shotlist Đạo diễn")}
                  >
                    XÓA BẢNG ĐẠO DIỄN
                  </button>
                </section>

                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <Table2 size={20} />
                    <h3>BẢNG QUAY PHIM</h3>
                  </div>
                  <p>Xóa nội dung (Size, Move, Lens, Tech Note...) trong bảng Quay phim.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(() => resetShotlistContentOnly('dp'), "Shotlist Quay phim")}
                  >
                    XÓA BẢNG QUAY PHIM
                  </button>
                </section>

                <section className="cleanup-column-v2">
                  <div className="column-header">
                    <Clapperboard size={20} />
                    <h3>SHOTLIST</h3>
                  </div>
                  <p>Xóa toàn bộ danh sách các shot hiện có và đưa về trạng thái trống.</p>
                  <button 
                    className="action-reset-btn" 
                    onClick={() => handleAction(resetFullShotlist, "Toàn bộ Shotlist")}
                  >
                    XÓA SHOTLIST
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
