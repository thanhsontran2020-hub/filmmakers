import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, memo } from 'react';
import { useEditor } from './EditorContext';
import type { BlockType } from './EditorContext';
import {
  Trash2,
  User,
  Camera,
  Video,
  Type,
  User as UserIcon,
  Smile,
  MessageSquare,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Bold,
  Italic,
  MoreVertical
} from 'lucide-react';

import { ShotlistGrid } from './ShotlistGrid';
import { googleService } from '../lib/google-workspace';

// --- Selection-Safe ContentEditable Component ---
const ScriptBlockContent = memo(({
  content,
  blockType,
  onInput,
  onFocus,
  onMouseEnter,
  onKeyDown,
  onMouseDown,
  onClick,
  innerRef
}: any) => {
  const localRef = useRef<HTMLDivElement>(null);

  // Synchronize ref
  useEffect(() => {
    if (innerRef) {
      innerRef.current = localRef.current;
    }
  }, [innerRef]);

  // Only update innerHTML if it's different from the prop
  // This is the KEY to preserving selection in React contenteditable
  useEffect(() => {
    if (localRef.current && localRef.current.innerHTML !== content) {
      localRef.current.innerHTML = content;
    }
  }, [content]);

  return (
    <div
      ref={localRef}
      contentEditable
      suppressContentEditableWarning
      className={`block-editor ${blockType}`}
      onInput={onInput}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
      onClick={onClick}
      spellCheck={false}
    />
  );
});

const MainEditor: React.FC<{ user?: any }> = ({ user }) => {
  const {
    project,
    updateBlock,
    updateScriptBlocks,
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
    deleteSelectedBlocks,
    moveBlockUp,
    moveBlockDown
  } = useEditor();


  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPgOpen, setIsPgOpen] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [formatState, setFormatState] = useState({ bold: false, italics: false });

  // Track format state on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement?.classList.contains('block-editor')) {
        setFormatState({
          bold: document.queryCommandState('bold'),
          italics: document.queryCommandState('italic')
        });
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);
  const [showTransformMenu, setShowTransformMenu] = useState<number | null>(null);
  const [showQuickInsert, setShowQuickInsert] = useState(false);
  const [quickInsertIndex, setQuickInsertIndex] = useState<number | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<number | null>(null);
  const pgRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ start: number, end: number, timestamp: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTypeChange = (index: number, newType: BlockType) => {
    const block = project.scriptBlocks[index];
    if (!block) return;

    let newContent = block.content;

    // Smart Formatting Rules
    if (newType === ('parenthetical' as any)) {
      let clean = newContent.trim().replace(/^\(|\)$/g, '').trim();
      newContent = `(${clean})`;
      selectionRef.current = { start: 1, end: 1, timestamp: Date.now() };
    } else if ((block.type as string) === 'parenthetical' && newType !== 'parenthetical') {
      newContent = newContent.trim().replace(/^\(|\)$/g, '').trim();
    }

    updateBlock(index, newContent, newType);
  };

  // Move these constants to the top to avoid TDZ issues
  const PAGES_PER_SEGMENT = 10;
  const PAGE_HEIGHT_PT = 648;
  const LINE_HEIGHT_PT = 15;
  const CHARS_PER_LINE = {
    scene: 60,
    action: 60,
    character: 35,
    parenthetical: 30,
    dialogue: 40,
    transition: 60
  };
  const MARGINS_PT: Record<string, { top: number, bottom: number }> = {
    scene: { top: 24, bottom: 6 },
    action: { top: 0, bottom: 12 },
    character: { top: 12, bottom: 0 },
    parenthetical: { top: -2, bottom: 0 },
    dialogue: { top: 0, bottom: 12 },
    transition: { top: 18, bottom: 18 }
  };

  const pages = useMemo(() => {
    const calculatedPages: any[][] = [];
    let currentPage: any[] = [];
    let currentY = 0;

    project.scriptBlocks.forEach((block, index) => {
      const content = block.content || "";
      const charsPerLine = CHARS_PER_LINE[block.type as keyof typeof CHARS_PER_LINE] || 60;
      const hardLines = content.split('\n');
      let estimatedLines = 0;
      hardLines.forEach(line => {
        estimatedLines += Math.max(1, Math.ceil(line.length / charsPerLine));
      });

      const margins = MARGINS_PT[block.type] || { top: 0, bottom: 12 };
      const blockHeight = (estimatedLines * LINE_HEIGHT_PT) + margins.top + margins.bottom;

      if (currentY + blockHeight > PAGE_HEIGHT_PT && currentPage.length > 0) {
        calculatedPages.push(currentPage);
        currentPage = [{ block, index }];
        currentY = blockHeight;
      } else {
        currentPage.push({ block, index });
        currentY += blockHeight;
      }
    });

    if (currentPage.length > 0) calculatedPages.push(currentPage);
    if (calculatedPages.length === 0) calculatedPages.push([]);
    return calculatedPages;
  }, [project.scriptBlocks]);

  // Auto-focus and resize textareas
  const textareaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastTargetPageIdxRef = useRef<number | null>(null);

  const pagesToRender = pages.slice(currentSegmentIndex * PAGES_PER_SEGMENT, (currentSegmentIndex + 1) * PAGES_PER_SEGMENT);

  // 1. Core Focus & Selection Restoration (Lowest level)
  useLayoutEffect(() => {
    const activeEl = textareaRefs.current[activeBlockIndex];
    if (activeEl) {
      if (activeEl !== document.activeElement) {
        activeEl.focus();
      }

      // Restore focus if needed
      // (Specialized range restoration for contenteditable is complex, but focus is preserved by the activeBlockIndex logic)
      if (selectionRef.current && (Date.now() - selectionRef.current.timestamp < 1500)) {
        // focus is already handled by activeEl.focus() above
      }
    }

    // Auto-close menus on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (showQuickInsert && !(e.target as HTMLElement).closest('.quick-insert-menu')) {
        setShowQuickInsert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeBlockIndex, showTransformMenu, showQuickInsert, showMoreMenu, pages, project.scriptBlocks]);

  const handleFormat = (command: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Apply the format
    document.execCommand(command, false);

    // Update local state immediately for snappy UI
    setFormatState(prev => ({
      ...prev,
      [command === 'bold' ? 'bold' : 'italics']: document.queryCommandState(command)
    }));

    // Focus back to the element to keep toolbar visible
    const el = textareaRefs.current[activeBlockIndex!];
    if (el) el.focus();
  };

  // 2. Unified Scroll Controller (Higher level)
  useLayoutEffect(() => {
    if (activeBlockIndex === null) return;

    const targetPageIdx = pages.findIndex(page =>
      page.some((blockObj: any) => blockObj.index === activeBlockIndex)
    );

    if (targetPageIdx === -1) return;

    const targetSegmentIdx = Math.floor(targetPageIdx / PAGES_PER_SEGMENT);
    const activeEl = textareaRefs.current[activeBlockIndex];
    const isTyping = activeEl === document.activeElement;

    // A. Handle Segment Change
    if (targetSegmentIdx !== currentSegmentIndex) {
      const isMovingBackward = targetSegmentIdx < currentSegmentIndex;
      setCurrentSegmentIndex(targetSegmentIdx);

      // If typing, we must be INSTANT to avoid focus loss/jitter
      // If navigating, we can be SMOOTH
      const scrollBehavior = isTyping ? 'auto' : 'smooth';

      requestAnimationFrame(() => {
        if (containerRef.current) {
          if (isMovingBackward) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: scrollBehavior
            });
          } else {
            containerRef.current.scrollTo({ top: 0, behavior: scrollBehavior });
          }
        }
      });
    }
    // B. Keep active block in view
    else if (activeEl) {
      // If we are navigating from outside (e.g. sidebar), we want to be sure it's in view
      // We use a small timeout to ensure the DOM is stable after potential segment changes
      const timeout = setTimeout(() => {
        activeEl.scrollIntoView({
          behavior: isTyping ? 'auto' : 'smooth',
          block: isTyping ? 'nearest' : 'center' // Center the view for navigation jumps
        });
      }, 100);
      return () => clearTimeout(timeout);
    }

    lastTargetPageIdxRef.current = targetPageIdx;
  }, [activeBlockIndex, pages, currentSegmentIndex]);

  // Icon helper for consistent mapping
  const getIconForType = (type: BlockType, size: number = 14) => {
    switch (type) {
      case 'scene': return <Type size={size} />;
      case 'action': return <Video size={size} />;
      case 'character': return <UserIcon size={size} />;
      case 'parenthetical': return <Smile size={size} />;
      case 'dialogue': return <MessageSquare size={size} />;
      case 'transition': return <ChevronRight size={size} />;
      default: return <Type size={size} />;
    }
  };

  // Helper to switch segment and move focus to that segment
  const handleSegmentChange = (segmentIdx: number) => {
    setCurrentSegmentIndex(segmentIdx);

    // Move focus to the first block of the first page in the new segment
    const targetPageIdx = segmentIdx * PAGES_PER_SEGMENT;
    const targetPage = pages[targetPageIdx];
    if (targetPage && targetPage.length > 0) {
      setActiveBlockIndex(targetPage[0].index);
    }

    // Scroll smoothly
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pgRef.current && !pgRef.current.contains(event.target as Node)) {
        setIsPgOpen(false);
      }
      // Đóng các menu toolbar khi click ra ngoài
      if (!(event.target as HTMLElement).closest('.toolbar-section')) {
        setShowTransformMenu(null);
        setShowMoreMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // One-time sanitize to fix broken types from previous versions
  useEffect(() => {
    if (project.scriptBlocks.length > 0) {
      updateScriptBlocks(project.scriptBlocks, { skipHistory: true });
    }
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

      <div className="editor-container" ref={containerRef}>
        {activeTab === 'script' ? (
          <>
            {/* Page 1: Title Page - Only show when on Segment 0 */}
            {currentSegmentIndex === 0 && (
              <div className="script-page printable">
                <div className="script-title-page" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '60px',
                  minHeight: '1000px', // Đảm bảo chiều cao trang bìa chuẩn
                  position: 'relative',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box'
                }}>
                  {/* Container chính căn giữa tuyệt đối */}
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '100%'
                  }}>
                    <textarea
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
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
                        fontSize: '3.5rem',
                        fontWeight: 900,
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '100%',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '5px',
                        fontFamily: "'Courier New', Courier, monospace",
                        color: '#000',
                        resize: 'none',
                        overflow: 'visible',
                        lineHeight: '1.4',
                        padding: '20px 0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    />
                  </div>
                  
                  {/* Phần tác giả - Đưa về Absolute để không đẩy tiêu đề lên trên */}
                  <div style={{ 
                    position: 'absolute',
                    bottom: '80px',
                    right: '80px',
                    textAlign: 'right', 
                    fontFamily: "'Courier New', Courier, monospace",
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '1rem',
                      fontStyle: 'italic',
                      color: '#666',
                    }}>Viết bởi</div>
                    <textarea
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                      className="author-input"
                      value={project.author}
                      onChange={(e) => updateAuthor(e.target.value)}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                      rows={1}
                      placeholder="Tên tác giả..."
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        width: '400px',
                        textAlign: 'right',
                        textTransform: 'uppercase',
                        fontFamily: "'Courier New', Courier, monospace",
                        color: '#000',
                        resize: 'none',
                        overflow: 'hidden',
                        padding: '0',
                        lineHeight: '1.2'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Script Content Pages */}
            {(() => {
              return (
                <>
                  {pagesToRender.map((pageBlocks, localIdx) => {
                    const actualPageIdx = currentSegmentIndex * PAGES_PER_SEGMENT + localIdx;
                    return (
                      <div key={actualPageIdx} id={`page-${actualPageIdx}`} className="script-page printable">
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
                              // Proximity-based closure: switcher stays open even if mouse leaves the block-wrapper area.
                              // It only closes when entering another block or moving back to the content area (handled in textarea).
                              >
                                <div className={`wp-block-toolbar ${(!isToolbarVisible && activeBlockIndex === index) ? 'hidden' : ''}`}>
                                  {/* Menu Chuyển đổi (Transform) */}
                                  <div className="toolbar-section">
                                    <button
                                      className="toolbar-btn transform-btn"
                                      onClick={(e) => { e.stopPropagation(); setShowTransformMenu(showTransformMenu === index ? null : index); setShowMoreMenu(null); }}
                                      title="Chuyển đổi loại block"
                                    >
                                      {getIconForType(block.type, 20)}
                                    </button>

                                    {showTransformMenu === index && (
                                      <div className="wp-dropdown-menu transform-menu">
                                        <div className="menu-header">TRANSFORM TO</div>
                                        <button onClick={() => { handleTypeChange(index, 'scene'); setShowTransformMenu(null); }}>
                                          {getIconForType('scene', 18)} Cảnh
                                        </button>
                                        <button onClick={() => { handleTypeChange(index, 'character'); setShowTransformMenu(null); }}>
                                          {getIconForType('character', 18)} Nhân vật
                                        </button>
                                        <button onClick={() => { handleTypeChange(index, 'dialogue'); setShowTransformMenu(null); }}>
                                          {getIconForType('dialogue', 18)} Lời thoại
                                        </button>
                                        <button onClick={() => { handleTypeChange(index, 'parenthetical'); setShowTransformMenu(null); }}>
                                          {getIconForType('parenthetical', 18)} Sắc thái (Paren)
                                        </button>
                                        <button onClick={() => { handleTypeChange(index, 'action'); setShowTransformMenu(null); }}>
                                          {getIconForType('action', 18)} Hành động
                                        </button>
                                        <button onClick={() => { handleTypeChange(index, 'transition'); setShowTransformMenu(null); }}>
                                          {getIconForType('transition', 18)} Chuyển cảnh
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="toolbar-divider" />

                                  {/* Nút Di chuyển (Mover) */}
                                  <div className="toolbar-section mover-buttons">
                                    <button
                                      className="toolbar-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveBlockUp(index);
                                      }}
                                      title="Di chuyển lên"
                                    >
                                      <ChevronUp size={20} />
                                    </button>
                                    <button
                                      className="toolbar-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveBlockDown(index);
                                      }}
                                      title="Di chuyển xuống"
                                    >
                                      <ChevronDown size={20} />
                                    </button>
                                  </div>

                                  <div className="toolbar-divider" />

                                  {/* Nút Định dạng (Formatting) */}
                                  <div className="toolbar-section">
                                    <button
                                      className={`toolbar-btn ${formatState.bold ? 'active' : ''}`}
                                      onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                                      title="Chữ đậm (Ctrl+B)"
                                    >
                                      <Bold size={20} />
                                    </button>
                                    <button
                                      className={`toolbar-btn ${formatState.italics ? 'active' : ''}`}
                                      onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
                                      title="Chữ nghiêng (Ctrl+I)"
                                    >
                                      <Italic size={20} />
                                    </button>
                                  </div>

                                  <div className="toolbar-divider" />

                                  {/* Menu Tùy chọn thêm (More) */}
                                  <div className="toolbar-section">
                                    <button
                                      className="toolbar-btn"
                                      onClick={(e) => { e.stopPropagation(); setShowMoreMenu(showMoreMenu === index ? null : index); setShowTransformMenu(null); }}
                                      title="Tùy chọn khác"
                                    >
                                      <MoreVertical size={20} />
                                    </button>

                                    {showMoreMenu === index && (
                                      <div className="wp-dropdown-menu more-menu">
                                        <button className="delete-option" onMouseDown={(e) => { e.preventDefault(); removeBlock(index); setShowMoreMenu(null); }}>
                                          <Trash2 size={16} /> Xóa block
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <ScriptBlockContent
                                  content={block.content}
                                  blockType={block.type}
                                  index={index}
                                  innerRef={{
                                    get current() { return textareaRefs.current[index]; },
                                    set current(el) { textareaRefs.current[index] = el; }
                                  }}
                                  onInput={(e: any) => {
                                    const target = e.currentTarget;
                                    const val = target.innerHTML;
                                    const textOnly = target.innerText;
                                    let newType: BlockType | undefined = undefined;

                                    const headingRegex = /^([0-9]+[.\-\s\)]*\s*)?(INT|EXT|I\/E|CẢNH|PHÂN CẢNH|SCENE|HỒI|TAP|TẬP)(\.|\s|\/)/i;
                                    if (headingRegex.test(textOnly)) {
                                      newType = 'scene';
                                    }
                                    else if (textOnly.trim().startsWith('(')) {
                                      newType = 'parenthetical';
                                    }
                                    else if (block.type === 'character' && textOnly.trim().length > 0) {
                                      const hasLower = /[a-zà-ỹ]/.test(textOnly);
                                      const endsWithPunct = /[.!?]$/.test(textOnly.trim());
                                      if (hasLower || endsWithPunct || textOnly.trim().length > 50) {
                                        newType = 'action';
                                      }
                                    }

                                    updateBlock(index, val, newType);
                                  }}
                                  onFocus={() => {
                                    setActiveBlockIndex(index);
                                    setIsToolbarVisible(true);
                                  }}
                                  onMouseDown={() => {
                                    setIsToolbarVisible(true);
                                  }}
                                  onClick={() => {
                                    setIsToolbarVisible(true);
                                  }}
                                  onMouseEnter={() => handleBlockMouseEnter(index)}
                                  onKeyDown={(e: any) => {
                                    // Typing hides toolbar after a short delay or immediately
                                    if (!e.ctrlKey && !e.metaKey && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Alt', 'CapsLock'].includes(e.key)) {
                                      setIsToolbarVisible(false);
                                    }

                                    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      handleFormat('bold');
                                    }
                                    if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
                                      e.preventDefault();
                                      handleFormat('italic');
                                    }
                                    if (e.key === 'ArrowUp') {
                                      const selection = window.getSelection();
                                      if (selection && (selection.anchorOffset === 0 || selection.anchorNode?.parentElement === e.currentTarget)) {
                                        // Simple heuristic for start of block
                                        if (index > 0 && selection.anchorOffset === 0) {
                                          e.preventDefault();
                                          setActiveBlockIndex(index - 1);
                                        }
                                      }
                                    }
                                    if (e.key === 'ArrowDown') {
                                      const selection = window.getSelection();
                                      if (index < project.scriptBlocks.length - 1 && selection && selection.anchorOffset === e.currentTarget.innerText.length) {
                                        e.preventDefault();
                                        setActiveBlockIndex(index + 1);
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
                                      // Trigger quick insert menu for the new block
                                      setQuickInsertIndex(index + 1);
                                      setShowQuickInsert(true);
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      const types: BlockType[] = ['scene', 'action', 'character', 'parenthetical', 'dialogue', 'transition'];
                                      const currentIdx = types.indexOf(block.type);
                                      const nextIdx = (currentIdx + (e.shiftKey ? -1 : 1) + types.length) % types.length;
                                      updateBlock(index, block.content, types[nextIdx]);
                                    }
                                    if (!e.ctrlKey && !e.metaKey && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Alt', 'CapsLock'].includes(e.key)) {
                                      setIsToolbarVisible(false);
                                      if (showQuickInsert) setShowQuickInsert(false);
                                    }

                                    if (e.key === 'Backspace' || e.key === 'Delete') {
                                      if (selectedIndices.length > 1) {
                                        e.preventDefault();
                                        deleteSelectedBlocks();
                                      } else if (e.currentTarget.innerText === '' && project.scriptBlocks.length > 1 && e.key === 'Backspace') {
                                        e.preventDefault();
                                        removeBlock(index);
                                      }
                                    }
                                  }}
                                />

                                {showQuickInsert && quickInsertIndex === index && (
                                  <div className="quick-insert-menu no-print">
                                    <div className="quick-insert-grid">
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'scene'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon scene"><Type size={20} /></div>
                                        <span>Cảnh</span>
                                      </button>
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'character'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon character"><UserIcon size={20} /></div>
                                        <span>Nhân vật</span>
                                      </button>
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'dialogue'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon dialogue"><MessageSquare size={20} /></div>
                                        <span>Lời thoại</span>
                                      </button>
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'parenthetical'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon parenthetical"><Smile size={20} /></div>
                                        <span>Sắc thái</span>
                                      </button>
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'action'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon action"><Video size={20} /></div>
                                        <span>Hành động</span>
                                      </button>
                                      <button className="quick-insert-item" onClick={() => { updateBlock(index, '', 'transition'); setShowQuickInsert(false); }}>
                                        <div className="qi-icon transition"><ChevronRight size={20} /></div>
                                        <span>Chuyển cảnh</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Workspace Footer for Pagination */}
                  {pages.length > PAGES_PER_SEGMENT && (
                    <footer className="workspace-footer no-print">
                      <div className="pagination-controls minimalist" ref={pgRef}>
                        <div className="custom-pg-dropdown">
                          <button
                            className="pg-trigger"
                            onClick={() => setIsPgOpen(!isPgOpen)}
                          >
                            {(() => {
                              const s = currentSegmentIndex;
                              const startPage = s * PAGES_PER_SEGMENT + 1;
                              const endPage = Math.min((s + 1) * PAGES_PER_SEGMENT, pages.length);
                              return startPage === endPage ? `Trang ${startPage}` : `Trang ${startPage} - ${endPage}`;
                            })()}
                            <ChevronDown size={14} className={isPgOpen ? 'rotated' : ''} />
                          </button>

                          {isPgOpen && (
                            <div className="pg-menu">
                              {Array.from({ length: Math.ceil(pages.length / PAGES_PER_SEGMENT) }).map((_, s) => {
                                const startPage = s * PAGES_PER_SEGMENT + 1;
                                const endPage = Math.min((s + 1) * PAGES_PER_SEGMENT, pages.length);
                                return (
                                  <div
                                    key={s}
                                    className={`pg-option ${s === currentSegmentIndex ? 'active' : ''}`}
                                    onClick={() => {
                                      handleSegmentChange(s);
                                      setIsPgOpen(false);
                                    }}
                                  >
                                    {startPage === endPage ? `Trang ${startPage}` : `Trang ${startPage} - ${endPage}`}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </footer>
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

