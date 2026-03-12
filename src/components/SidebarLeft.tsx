import React from 'react';
import {
  Video,
  Clock,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  X,
  Sun,
  Moon,
  ListPlus,
  ScrollText,
  Layout,
  Trash2,
  TableProperties,
  Smile,
  Clapperboard
} from 'lucide-react';
import { useEditor } from './EditorContext';

interface SidebarProps {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  resetTrigger: () => void;
  onQuickAdd: (type: 'character' | 'location') => void;
}

export const SidebarLeft: React.FC<SidebarProps> = ({
  isOpen,
  setOpen,
  theme,
  setTheme,
  resetTrigger,
  onQuickAdd
}) => {
  const {
    project,
    removeCharacter,
    insertElement,
    locations,
    removeLocation,
    activeTab,
    setActiveTab,
    addShot,
    addScene
  } = useEditor();


  return (
    <aside className={`sidebar-left ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <Clapperboard className="icon-accent" size={24} />
        {isOpen && <span className="logo-text">Filmmakers.vn</span>}
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'script' ? 'active' : ''}`}
          onClick={() => setActiveTab('script')}
          title="Kịch bản"
        >
          <ScrollText size={20} />
          {isOpen && <span>Kịch bản</span>}
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'shotlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('shotlist')}
          title="Shotlist"
        >
          <Layout size={20} />
          {isOpen && <span>Shotlist</span>}
        </button>
      </div>

      <div className="sidebar-content">
        {activeTab === 'script' ? (
          <>
            <div className="section-header-flex">
              <div className="section-title">{isOpen ? 'NHẬP NHANH' : '...'}</div>
            </div>
            <div className="element-grid">
              {/* 1. Tiêu đề */}
              <div className="element-item draggable" onClick={() => insertElement('scene')}>
                <Video size={18} />
                {isOpen && <span>Tiêu đề (INT/EXT)</span>}
              </div>

              {/* 2. Địa điểm */}
              <div className="element-item draggable" onClick={() => insertElement('location')}>
                <MapPin size={18} />
                {isOpen && <span>Địa điểm</span>}
              </div>
              {isOpen && (
                <div className="expanded-section">
                  <div className="quick-grid">
                    {locations.map(loc => (
                      <div
                        key={loc}
                        className="quick-item glass-card group relative"
                        onClick={() => insertElement('location_specific', loc)}
                      >
                        {loc}
                        <button
                          className="delete-btn"
                          onClick={(e) => { e.stopPropagation(); removeLocation(loc); }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="quick-item glass-card add-btn" onClick={() => onQuickAdd('location')}>
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Thời gian */}
              <div className="element-item draggable" onClick={() => insertElement('time')}>
                <Clock size={18} />
                {isOpen && <span>Ngày / Đêm</span>}
              </div>

              {/* 4. Hành động */}
              <div className="element-item draggable" onClick={() => insertElement('action')}>
                <Video size={18} />
                {isOpen && <span>Hành động</span>}
              </div>

              {/* 5. Nhân vật */}
              <div className="element-item draggable" onClick={() => insertElement('char')}>
                <User size={18} />
                {isOpen && <span>Nhân vật</span>}
              </div>
              {isOpen && (
                <div className="expanded-section">
                  <div className="quick-grid">
                    {project.characters.sort((a, b) => b.frequency - a.frequency).map(char => (
                      <div
                        key={char.id}
                        className="quick-item glass-card group relative"
                        onClick={() => insertElement('char_specific', char.name)}
                      >
                        {char.name}
                        <button
                          className="delete-btn"
                          onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="quick-item glass-card add-btn" onClick={() => onQuickAdd('character')}>
                      <Plus size={16} />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Sắc thái */}
              <div className="element-item draggable" onClick={() => insertElement('parenthetical')}>
                <Smile size={18} />
                {isOpen && <span>Sắc thái (...)</span>}
              </div>

              {/* 7. Lời thoại */}
              <div className="element-item draggable" onClick={() => insertElement('dialogue')}>
                <MessageSquare size={18} />
                {isOpen && <span>Lời thoại</span>}
              </div>

              {/* 8. Chuyển cảnh */}
              <div className="element-item draggable" onClick={() => insertElement('transition')}>
                <ChevronRight size={18} />
                {isOpen && <span>Chuyển cảnh</span>}
              </div>
            </div>

            {isOpen && (
              <div className="sidebar-help-card" style={{ background: 'transparent', padding: '16px 0', border: 'none', boxShadow: 'none', borderTop: '1px solid var(--glass-border)', marginTop: '20px' }}>
                <div className="section-title" style={{ marginBottom: '12px', paddingLeft: '0' }}>HƯỚNG DẪN SỬ DỤNG</div>

                <div className="help-item" style={{ marginBottom: '12px' }}>
                  <div className="icon-mini"><Plus size={14} /></div>
                  <p><strong>Chọn các phần Nhập nhanh</strong> để chèn nhanh vào kịch bản, tự xuống phần mới mà không cần ấn Enter.</p>
                </div>

                <div className="help-item" style={{ marginBottom: '8px' }}>
                  <div className="icon-mini"><Video size={14} /></div>
                  <p><strong>Cách nhập "INT. PHÒNG KHÁCH - NGÀY":</strong></p>
                </div>
                <div style={{ paddingLeft: '26px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <p>1. Ấn 1-2 lần <strong>Tiêu đề</strong> để chọn <strong>INT/EXT</strong>.</p>
                  <p>2. Chọn một <strong>Địa điểm</strong> đã lưu phía trên.</p>
                  <p>3. Ấn 1-2 lần <strong>Ngày/Đêm</strong> để chọn thời gian.</p>
                </div>

                <div className="help-item" style={{ marginBottom: '8px' }}>
                  <div className="icon-mini"><ChevronRight size={14} /></div>
                  <p><strong>Cách dùng Chuyển cảnh:</strong></p>
                </div>
                <div style={{ paddingLeft: '26px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p>Ấn liên tục vào <strong>Chuyển cảnh</strong> để xoay vòng giữa <strong>FADE IN, CUT TO, DISSOLVE TO, FADE OUT</strong>.</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="shotlist-actions">
            <div className="section-title">{isOpen ? 'HÀNH ĐỘNG SHOTLIST' : '...'}</div>
            <div className="element-grid">
              <button className="sidebar-action-btn" onClick={addShot}>
                <ListPlus size={18} />
                {isOpen && <span>Thêm Shot mới</span>}
              </button>
              <button className="sidebar-action-btn" onClick={addScene}>
                <TableProperties size={18} />
                {isOpen && <span>Thêm Phân cảnh</span>}
              </button>
            </div>

            {isOpen && (
              <div className="sidebar-help-card" style={{ background: 'transparent', padding: '16px 0', border: 'none', boxShadow: 'none', borderTop: '1px solid var(--glass-border)', marginTop: '20px' }}>
                <div className="section-title" style={{ marginBottom: '12px', paddingLeft: '0' }}>HƯỚNG DẪN SHOTLIST</div>
                
                <div className="help-item" style={{ marginBottom: '12px' }}>
                  <div className="icon-mini"><TableProperties size={14} /></div>
                  <p>Ấn vào các ô dữ liệu <strong>(Shot Size, Move, Angle...)</strong> để mở danh sách chọn nhanh các mẫu...</p>
                </div>

                <div className="help-item" style={{ marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div className="icon-mini" style={{ marginTop: '2px' }}><Plus size={14} /></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>Mẫu chọn nhanh:</p>
                    <p>• <strong>Size:</strong> Extreme Long Shot, Long Shot, Medium Long Shot, Medium Shot, Close Up...</p>
                    <p>• <strong>Move:</strong> Static, Pan, Tilt, Dolly, Zoom, Handheld...</p>
                    <p>• <strong>Angle:</strong> Eye Level, Low Angle, High Angle, Dutch Angle...</p>
                  </div>
                </div>

                <div className="help-item">
                  <div className="icon-mini"><Layout size={14} /></div>
                  <p>Dữ liệu của <strong>Scene và Shot</strong> sẽ tự động đồng bộ giữa phần Đạo diễn và Quay phim.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <div className="footer-actions-group">
          {isOpen ? (
            <>
              <button className="footer-mini-btn reset" onClick={resetTrigger} title="Dọn dẹp dự án">
                <Trash2 size={18} />
              </button>
              <button
                className="footer-mini-btn theme"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <button className="footer-mini-btn collapse" onClick={() => setOpen(false)} title="Thu gọn">
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <button className="footer-mini-btn expand" onClick={() => setOpen(true)} title="Mở rộng">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarLeft;
