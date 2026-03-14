import React from 'react';
import {
  Video,
  Clock,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  MapPin,
  X,
  Sun,
  ListPlus,
  ScrollText,
  Layout,
  Trash2,
  TableProperties,
  Smile,
  RefreshCw,
  Type
} from 'lucide-react';
import { useEditor } from './EditorContext';

interface SidebarProps {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  openCleanUp: (type: 'script' | 'shotlist') => void;
}

export const SidebarLeft: React.FC<SidebarProps> = ({
  isOpen,
  setOpen,
  openCleanUp
}) => {
  const {
    project,
    removeScene,
    removeCharacter,
    insertElement,
    locations,
    removeLocation,
    activeTab,
    setActiveTab,
    addShot,
    addScene,
    scanCharacters,
    scanLocations,
    addCharacter,
    addLocation,
    addLens,
    removeLens,
    addShotlistLocation,
    removeShotlistLocation,
    addShotlistActor,
    removeShotlistActor,
    clearShotlistLocations,
    clearShotlistActors,
    setActiveBlockIndex,
    clearLenses
  } = useEditor();

  const sceneHeadings = project.scriptBlocks
    .map((block, index) => ({ block, index }))
    .filter(item => item.block.type === 'scene');

  // Modal state moved to App.tsx

  const [inlineAddType, setInlineAddType] = React.useState<'character' | 'location' | 'lens' | null>(null);
  const [inputValue, setInputValue] = React.useState('');

  // Collapsible states
  const [isQuickAccessExpanded, setIsQuickAccessExpanded] = React.useState(true);
  const [isLocationExpanded, setIsLocationExpanded] = React.useState(true);
  const [isCharactersExpanded, setIsCharactersExpanded] = React.useState(true);
  const [lensExpanded, setLensExpanded] = React.useState(true);

  const handleAddSubmit = () => {
    if (!inputValue.trim()) {
      setInlineAddType(null);
      return;
    }

    if (inlineAddType === 'character') {
      if (activeTab === 'script') {
        addCharacter({ name: inputValue.trim().toUpperCase(), age: '' });
      } else {
        addShotlistActor(inputValue.trim().toUpperCase());
      }
    } else if (inlineAddType === 'location') {
      if (activeTab === 'script') {
        addLocation(inputValue.trim().toUpperCase());
      } else {
        addShotlistLocation(inputValue.trim().toUpperCase());
      }
    } else if (inlineAddType === 'lens') {
      addLens(inputValue.trim());
    }

    setInputValue('');
    setInlineAddType(null);
  };

  const handleLensSubmit = () => {
    if (!inputValue.trim()) {
      setInlineAddType(null);
      return;
    }
    addLens(inputValue.trim());
    setInputValue('');
    setInlineAddType(null);
  };


  return (
    <aside className={`sidebar-left ${!isOpen ? 'collapsed' : ''}`}>
      {/* Sidebar header removed as requested - Clapperboard and logo row deleted */}
      
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
            {/* 1. Truy cập nhanh (Navigation) - Separate from Quick Entry */}
            <div className="section-header-flex" style={{ marginTop: '0' }}>
              <div className="section-title">{isOpen ? 'TRUY CẬP NHANH' : '...'}</div>
            </div>
            <div className="element-grid" style={{ marginBottom: '20px' }}>
              <div className="element-item draggable" onClick={() => isOpen && setIsQuickAccessExpanded(!isQuickAccessExpanded)}>
                <ScrollText size={18} />
                {isOpen && <span>Cảnh (Scene)</span>}
                {isOpen && (
                  <div className="element-chevron">
                    {isQuickAccessExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </div>
              {isOpen && isQuickAccessExpanded && (
                <div className="expanded-section">
                  <div className="nav-guidance">Nhấp để truy cập nhanh tới cảnh</div>
                  <div className="scene-nav-list-vertical">
                    {sceneHeadings.length > 0 ? (
                      sceneHeadings.map(s => (
                        <div
                          key={s.block.id}
                          className="nav-item-scene-vertical group"
                          onClick={() => setActiveBlockIndex(s.index)}
                        >
                          <span className="nav-text">{s.block.content || '(Cảnh trống)'}</span>
                          <button
                            className="delete-scene-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Xóa cảnh này và toàn bộ nội dung trong đó?`)) {
                                removeScene(s.index);
                              }
                            }}
                            title="Xóa cảnh"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-nav-msg">Chưa có cảnh</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="section-header-flex">
              <div className="section-title">{isOpen ? 'NHẬP NHANH' : '...'}</div>
            </div>
            <div className="element-grid">
              {/* 2. Tiêu đề (Insert Scene) */}
              <div className="element-item draggable" onClick={() => insertElement('scene')}>
                <Type size={18} />
                {isOpen && <span>Tiêu đề (INT/EXT)</span>}
              </div>

              {/* 3. Địa điểm */}
              <div className="element-item draggable" onClick={() => isOpen && setIsLocationExpanded(!isLocationExpanded)}>
                <MapPin size={18} />
                {isOpen && <span>Địa điểm</span>}
                {isOpen && (
                  <div className="element-chevron">
                    {locations.length > 0 && (
                      <button 
                        className="header-trash-btn"
                        onClick={(e) => { e.stopPropagation(); if(confirm('Xóa trắng danh sách địa điểm gợi ý?')) { locations.forEach(l => removeLocation(l)); } }}
                        title="Xóa tất cả địa điểm"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isLocationExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </div>
              {isOpen && isLocationExpanded && (
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
                    {inlineAddType === 'location' ? (
                      <div className="quick-item glass-card add-input-wrapper">
                        <input
                          autoFocus
                          className="inline-add-input"
                          placeholder="TÊN ĐỊA ĐIỂM..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubmit();
                            if (e.key === 'Escape') setInlineAddType(null);
                          }}
                          onBlur={handleAddSubmit}
                        />
                      </div>
                    ) : (
                      <div className="quick-item glass-card add-btn" onClick={() => { setInlineAddType('location'); setInputValue(''); }} title="Thêm địa điểm mới">
                        <Plus size={16} />
                      </div>
                    )}
                    <div className="quick-item glass-card add-btn" onClick={scanLocations} title="Quét địa điểm từ kịch bản">
                      <RefreshCw size={16} />
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
              <div className="element-item draggable" onClick={() => isOpen && setIsCharactersExpanded(!isCharactersExpanded)}>
                <User size={18} />
                {isOpen && <span>Nhân vật</span>}
                {isOpen && (
                  <div className="element-chevron">
                    {project.characters.length > 0 && (
                      <button 
                        className="header-trash-btn"
                        onClick={(e) => { e.stopPropagation(); if(confirm('Xóa trắng danh sách nhân vật gợi ý?')) { project.characters.forEach(c => removeCharacter(c.id)); } }}
                        title="Xóa tất cả nhân vật"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isCharactersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
              </div>
              {isOpen && isCharactersExpanded && (
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
                    {inlineAddType === 'character' ? (
                      <div className="quick-item glass-card add-input-wrapper">
                        <input
                          autoFocus
                          className="inline-add-input"
                          placeholder="TÊN NHÂN VẬT..."
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubmit();
                            if (e.key === 'Escape') setInlineAddType(null);
                          }}
                          onBlur={handleAddSubmit}
                        />
                      </div>
                    ) : (
                      <div className="quick-item glass-card add-btn" onClick={() => { setInlineAddType('character'); setInputValue(''); }} title="Thêm nhân vật mới">
                        <Plus size={16} />
                      </div>
                    )}
                    <div className="quick-item glass-card add-btn" onClick={scanCharacters} title="Quét nhân vật từ kịch bản">
                      <RefreshCw size={16} />
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
                  <div className="icon-mini"><Type size={14} /></div>
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
            <div className="section-title">{isOpen ? 'THAO TÁC NHANH' : '...'}</div>
            <div className="element-grid">
              <button className="sidebar-action-btn" onClick={addScene}>
                <TableProperties size={18} />
                {isOpen && <span>Thêm scene</span>}
              </button>
              <button className="sidebar-action-btn" onClick={addShot}>
                <ListPlus size={18} />
                {isOpen && <span>Thêm shot</span>}
              </button>
            </div>

            <div className="section-title" style={{ marginTop: '24px' }}>{isOpen ? 'QUẢN LÝ DỮ LIỆU' : '...'}</div>

            {/* Shotlist Locations */}
            <div className="element-item" onClick={() => isOpen && setIsLocationExpanded(!isLocationExpanded)}>
              <MapPin size={18} />
              {isOpen && <span>Địa điểm</span>}
              {isOpen && (
                <div className="element-chevron">
                  {(project.shotlistLocations || []).length > 0 && (
                    <button 
                      className="header-trash-btn"
                      onClick={(e) => { e.stopPropagation(); if(confirm('Xóa trắng danh sách địa điểm gợi ý?')) clearShotlistLocations(); }}
                      title="Xóa tất cả địa điểm"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isLocationExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {isOpen && isLocationExpanded && (
              <div className="expanded-section">
                <div className="quick-grid">
                  {(project.shotlistLocations || []).map(loc => (
                    <div key={loc} className="quick-item glass-card group relative">
                      {loc}
                      <button className="delete-btn" onClick={() => removeShotlistLocation(loc)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {inlineAddType === 'location' ? (
                    <div className="quick-item glass-card add-input-wrapper">
                      <input
                        autoFocus
                        className="inline-add-input"
                        placeholder="..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubmit(); if (e.key === 'Escape') setInlineAddType(null); }}
                        onBlur={handleAddSubmit}
                      />
                    </div>
                  ) : (
                    <div className="quick-item glass-card add-btn" onClick={() => { setInlineAddType('location'); setInputValue(''); }}>
                      <Plus size={16} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shotlist Characters (Actors) */}
            <div className="element-item" onClick={() => isOpen && setIsCharactersExpanded(!isCharactersExpanded)}>
              <User size={18} />
              {isOpen && <span>Diễn viên</span>}
              {isOpen && (
                <div className="element-chevron">
                  {(project.shotlistActors || []).length > 0 && (
                    <button 
                      className="header-trash-btn"
                      onClick={(e) => { e.stopPropagation(); if(confirm('Xóa toàn bộ diễn viên?')) clearShotlistActors(); }}
                      title="Xóa tất cả diễn viên"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isCharactersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {isOpen && isCharactersExpanded && (
              <div className="expanded-section">
                <div className="quick-grid">
                  {(project.shotlistActors || []).map(actor => (
                    <div key={actor} className="quick-item glass-card group relative">
                      {actor}
                      <button className="delete-btn" onClick={() => removeShotlistActor(actor)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {inlineAddType === 'character' ? (
                    <div className="quick-item glass-card add-input-wrapper">
                      <input
                        autoFocus
                        className="inline-add-input"
                        placeholder="..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubmit(); if (e.key === 'Escape') setInlineAddType(null); }}
                        onBlur={handleAddSubmit}
                      />
                    </div>
                  ) : (
                    <div className="quick-item glass-card add-btn" onClick={() => { setInlineAddType('character'); setInputValue(''); }}>
                      <Plus size={16} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shotlist Lenses (Tiêu cự) */}
            <div className="element-item" onClick={() => isOpen && setLensExpanded(!lensExpanded)}>
              <Sun size={18} />
              {isOpen && <span>Tiêu cự (mm)</span>}
              {isOpen && (
                <div className="element-chevron">
                  {(project.lenses || []).length > 0 && (
                    <button 
                      className="header-trash-btn"
                      onClick={(e) => { e.stopPropagation(); if(confirm('Xóa toàn bộ tiêu cự?')) clearLenses(); }}
                      title="Xóa tất cả tiêu cự"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {lensExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            {isOpen && lensExpanded && (
              <div className="expanded-section">
                <div className="quick-grid">
                  {(project.lenses || []).map(lens => (
                    <div key={lens} className="quick-item glass-card group relative">
                      {lens}
                      <button className="delete-btn" onClick={() => removeLens(lens)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {inlineAddType === 'lens' ? (
                    <div className="quick-item glass-card add-input-wrapper">
                      <input
                        autoFocus
                        className="inline-add-input"
                        placeholder="..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleLensSubmit(); if (e.key === 'Escape') setInlineAddType(null); }}
                        onBlur={handleLensSubmit}
                      />
                    </div>
                  ) : (
                    <div className="quick-item glass-card add-btn" onClick={() => { setInlineAddType('lens'); setInputValue(''); }}>
                      <Plus size={16} />
                    </div>
                  )}
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
              <button
                className="footer-mini-btn reset"
                onClick={() => openCleanUp(activeTab === 'script' ? 'script' : 'shotlist')}
                title={activeTab === 'script' ? "Dọn dẹp Nhân vật & Địa điểm" : "Dọn dẹp nội dung Shotlist"}
              >
                <Trash2 size={18} />
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
