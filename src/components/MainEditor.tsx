import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from './EditorContext';
import type { BlockType } from './EditorContext';
import {
  Trash2,
  User,
  Camera
} from 'lucide-react';

import { ShotlistGrid } from './ShotlistGrid';
import { googleService } from '../lib/google-workspace';

const MainEditor: React.FC<{ user?: any }> = ({ user }) => {
  const {
    project,
    updateBlock,
    addBlock,
    removeBlock,
    activeTab,
    shotlistView,
    setShotlistView,
    updateProjectName,
    updateAuthor,
    activeBlockIndex,
    setActiveBlockIndex,
    selectedIndices,
    setSelectedIndices,
    deleteSelectedBlocks
  } = useEditor();


  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Auto-focus and resize textareas
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    const activeEl = textareaRefs.current[activeBlockIndex];
    if (activeEl) {
      activeEl.focus();
      // Scroll into view if needed
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeBlockIndex]);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const handleBlockMouseEnter = (index: number) => {
    if (isDragging && dragStartIndex !== null) {
      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedIndices(range);
    }
  };

  const handleGlobalMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="main-editor">
      <header className="editor-header">
        <div className="view-context-label">
          {activeTab === 'script' ? 'BIÊN TẬP KỊCH BẢN' : 'DANH SÁCH QUAY (SHOTLIST)'}
        </div>

        {activeTab === 'shotlist' && (
          <div className="sub-switcher">
            <button
              className={shotlistView === 'director' ? 'active' : ''}
              onClick={() => setShotlistView('director')}
            >
              <User size={16} /> Phần Đạo diễn
            </button>
            <button
              className={shotlistView === 'dp' ? 'active' : ''}
              onClick={() => setShotlistView('dp')}
            >
              <Camera size={16} /> Phần Quay phim
            </button>
          </div>
        )}

        <div className="header-actions">
          {user && (
            <div className="user-profile">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <span className="user-name">{user.name}</span>
              <button
                className="btn-logout"
                onClick={() => googleService.logout()}
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="editor-container">
        {activeTab === 'script' ? (
          <>
            {/* Page 1: Title Page */}
            <div className="script-page printable">
              <div className="script-title-page" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '160px 0 100px 0'
              }}>
                <textarea
                  className="project-title-input"
                  value={project.projectName}
                  onChange={(e) => updateProjectName(e.target.value)}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                  }}
                  rows={1}
                  placeholder="TÊN KỊCH BẢN"
                  style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '4px',
                    fontFamily: "'Courier New', Courier, monospace",
                    color: '#000',
                    marginBottom: '20px',
                    resize: 'none',
                    overflow: 'hidden',
                    lineHeight: '1.2',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '60px' }}>
                  <div style={{
                    fontSize: '1rem',
                    fontStyle: 'italic',
                    color: '#666',
                    letterSpacing: '2px',
                    textTransform: 'lowercase'
                  }}>viết bởi</div>
                  <textarea
                    className="author-input"
                    value={project.author}
                    onChange={(e) => updateAuthor(e.target.value)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                    rows={1}
                    placeholder="TÊN TÁC GIẢ"
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '100%',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      fontFamily: "'Courier New', Courier, monospace",
                      color: '#333',
                      letterSpacing: '2px',
                      resize: 'none',
                      overflow: 'hidden',
                      lineHeight: '1.2',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Script Content Pages */}
            {(() => {
              const PAGE_HEIGHT_PT = 648; // 9 inches of content area at 72pt/inch
              const LINE_HEIGHT_PT = 15;
              const CHARS_PER_LINE = {
                scene: 60,
                action: 60,
                character: 35,
                parenthetical: 30,
                dialogue: 40,
                transition: 60
              };
              const MARGINS_PT = {
                scene: { top: 24, bottom: 6 },
                action: { top: 0, bottom: 12 },
                character: { top: 12, bottom: 0 },
                parenthetical: { top: -2, bottom: 0 },
                dialogue: { top: 0, bottom: 12 },
                transition: { top: 18, bottom: 18 }
              };

              const pages: any[][] = [];
              let currentPage: any[] = [];
              let currentY = 0;

              project.scriptBlocks.forEach((block, index) => {
                // Estimate lines
                const content = block.content || "";
                const charsPerLine = CHARS_PER_LINE[block.type as keyof typeof CHARS_PER_LINE] || 60;

                // Real line breaks + wrapped lines
                const hardLines = content.split('\n');
                let estimatedLines = 0;
                hardLines.forEach(line => {
                  estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine));
                });

                const margins = MARGINS_PT[block.type as keyof typeof MARGINS_PT] || { top: 0, bottom: 12 };
                const blockHeight = (estimatedLines * LINE_HEIGHT_PT) + margins.top + margins.bottom;

                if (currentY + blockHeight > PAGE_HEIGHT_PT && currentPage.length > 0) {
                  pages.push(currentPage);
                  currentPage = [{ block, index }];
                  currentY = blockHeight;
                } else {
                  currentPage.push({ block, index });
                  currentY += blockHeight;
                }
              });

              if (currentPage.length > 0) {
                pages.push(currentPage);
              }
              if (pages.length === 0) pages.push([]);

              const isLargeScript = pages.length > 10;
              const pagesToRender = isLargeScript ? [pages[currentPageIndex]] : pages;

              return (
                <>
                  {pagesToRender.map((pageBlocks, pageIdx) => {
                    const actualPageIdx = isLargeScript ? currentPageIndex : pageIdx;
                    return (
                      <div key={actualPageIdx} className="script-page printable">
                        <div className="page-number">{actualPageIdx + 1}</div>
                        <div className="blocks-container">
                          {pageBlocks.map((blockData: any) => {
                            const { block, index } = blockData;
                            return (
                              <div
                                key={block.id}
                                className={`script-block-wrapper ${block.type} ${activeBlockIndex === index ? 'active' : ''} ${selectedIndices.includes(index) ? 'selected' : ''}`}
                                onMouseDown={(e) => {
                                  // Check if clicking near the edge or if using special keys
                                  const isMeta = e.ctrlKey || e.metaKey;
                                  const isShift = e.shiftKey;
                                  
                                  if (isShift && lastSelectedIndex !== null) {
                                    e.preventDefault();
                                    const start = Math.min(index, lastSelectedIndex);
                                    const end = Math.max(index, lastSelectedIndex);
                                    const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                                    setSelectedIndices(range);
                                  } else if (isMeta) {
                                    e.preventDefault();
                                    const newSelection = selectedIndices.includes(index)
                                      ? selectedIndices.filter((i: number) => i !== index)
                                      : [...selectedIndices, index];
                                    setSelectedIndices(newSelection);
                                    setLastSelectedIndex(index);
                                  } else {
                                    // Normal drag start or single select
                                    setIsDragging(true);
                                    setDragStartIndex(index);
                                    setActiveBlockIndex(index);
                                    setSelectedIndices([index]);
                                    setLastSelectedIndex(index);
                                  }
                                }}
                                onMouseEnter={() => handleBlockMouseEnter(index)}
                              >
                                <div className="block-controls">
                                  <div className="type-badge">
                                    {block.type === 'scene' && 'CẢNH'}
                                    {block.type === 'character' && 'NHÂN VẬT'}
                                    {block.type === 'parenthetical' && 'PAREN'}
                                    {block.type === 'dialogue' && 'THOẠI'}
                                    {block.type === 'action' && 'Hành động'}
                                    {block.type === 'transition' && 'CHUYỂN'}
                                  </div>
                                  <div className="block-actions">
                                    <button onClick={(e) => { e.stopPropagation(); removeBlock(index); }} title="Xóa"><Trash2 size={12} /></button>
                                  </div>
                                </div>

                                <textarea
                                  ref={(el) => {
                                    textareaRefs.current[index] = el;
                                    if (el) {
                                      el.style.height = 'auto';
                                      el.style.height = el.scrollHeight + 'px';
                                    }
                                  }}
                                  className={`block-editor ${block.type}`}
                                  value={block.content}
                                  onChange={(e) => updateBlock(index, e.target.value)}
                                  onFocus={() => setActiveBlockIndex(index)}
                                  onMouseEnter={() => handleBlockMouseEnter(index)}
                                  rows={1}
                                  spellCheck={false}
                                  placeholder={block.type === 'character' ? 'TÊN NHÂN VẬT...' : '...'}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp') {
                                      if (e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0) {
                                        if (index > 0) {
                                          e.preventDefault();
                                          setActiveBlockIndex(index - 1);
                                        }
                                      }
                                    }
                                    if (e.key === 'ArrowDown') {
                                      if (e.currentTarget.selectionStart === e.currentTarget.value.length && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
                                        if (index < project.scriptBlocks.length - 1) {
                                          e.preventDefault();
                                          setActiveBlockIndex(index + 1);
                                        }
                                      }
                                    }
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      let nextType: BlockType = 'action';
                                      if (block.type === 'scene') nextType = 'action';
                                      else if (block.type === 'character') nextType = 'dialogue';
                                      else if (block.type === 'parenthetical') nextType = 'dialogue';
                                      else if (block.type === 'dialogue') nextType = 'character';
                                      addBlock(index, nextType);
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      const types: BlockType[] = ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition'];
                                      const currentIdx = types.indexOf(block.type);
                                      const nextIdx = (currentIdx + (e.shiftKey ? -1 : 1) + types.length) % types.length;
                                      updateBlock(index, block.content, types[nextIdx]);
                                    }
                                    if (e.key === 'Backspace' || e.key === 'Delete') {
                                      if (selectedIndices.length > 1) {
                                        e.preventDefault();
                                        deleteSelectedBlocks();
                                      } else if (block.content === '' && project.scriptBlocks.length > 1 && e.key === 'Backspace') {
                                        e.preventDefault();
                                        removeBlock(index);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  {pages.length > 1 && (
                    <div className="pagination-controls no-print">
                      <div className="pagination-info">Trang {currentPageIndex + 1} / {pages.length}</div>
                      
                      {isLargeScript && (
                        <>
                          <button 
                            className="page-link nav" 
                            disabled={currentPageIndex === 0}
                            onClick={() => setCurrentPageIndex(0)}
                          >
                            Đầu
                          </button>
                          
                          {Array.from({ length: Math.min(5, pages.length) }, (_, i) => {
                            let pageNum = currentPageIndex - 2 + i;
                            if (pageNum < 0) pageNum = i;
                            if (pageNum >= pages.length) pageNum = pages.length - 5 + i;
                            if (pageNum < 0) return null;
                            if (pageNum >= pages.length) return null;
                            
                            return (
                              <button 
                                key={pageNum}
                                className={`page-link ${currentPageIndex === pageNum ? 'active' : ''}`}
                                onClick={() => setCurrentPageIndex(pageNum)}
                              >
                                {pageNum + 1}
                              </button>
                            );
                          })}
                          
                          <button 
                            className="page-link nav" 
                            disabled={currentPageIndex === pages.length - 1}
                            onClick={() => setCurrentPageIndex(pages.length - 1)}
                          >
                            Cuối
                          </button>
                        </>
                      )}
                    </div>
                  )}

                </>
              );
            })()}
          </>
        ) : (
          <ShotlistGrid />
        )}
      </div>
    </div>
  );
};

export default MainEditor;
