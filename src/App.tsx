import { useState, useEffect, useRef } from 'react';
import { EditorProvider, useEditor, type BlockType } from './components/EditorContext';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import MainEditor from './components/MainEditor';
import { ResetModal } from './components/ResetModal';
import { DownloadModal } from './components/DownloadModal';
import ImportConfirmModal from './components/ImportConfirmModal';
import { googleService } from './lib/google-workspace';
import { DrivePickerModal } from './components/DrivePickerModal';
import { CleanUpModal } from './components/CleanUpModal';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { formatImportSceneHeading } from './lib/formatUtils';
import './App.css';

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [sidebarLeftOpen, setSidebarLeftOpen] = useState(() => window.innerWidth > 1024);
  const [sidebarRightOpen, setSidebarRightOpen] = useState(() => window.innerWidth > 1400);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showCleanUpModal, setShowCleanUpModal] = useState(false);
  const [cleanUpType, setCleanUpType] = useState<'script' | 'shotlist'>('script');
  const [scriptSyncStatus, setScriptSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [shotlistSyncStatus, setShotlistSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 1024);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) {
        // Auto-close sidebars on mobile if window shrinks
        setSidebarLeftOpen(false);
        setSidebarRightOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLeftSidebar = () => {
    const nextState = !sidebarLeftOpen;
    setSidebarLeftOpen(nextState);
    if (isMobile && nextState) {
      setSidebarRightOpen(false);
    }
  };

  const toggleRightSidebar = () => {
    const nextState = !sidebarRightOpen;
    setSidebarRightOpen(nextState);
    if (isMobile && nextState) {
      setSidebarLeftOpen(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const { importFullProject, project, activeTab, importShotlist, updateShotlistProjectName } = useEditor();
  const projectRef = useRef(project);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    const prevTab = activeTabRef.current;
    if (prevTab !== activeTab) {
      if (prevTab === 'script') handleSyncScript(false, true);
      else if (prevTab === 'shotlist') handleSyncShotlist(false, true);

      activeTabRef.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      await googleService.initialize();
      if (googleService.currentUser) {
        setCurrentUser(googleService.currentUser);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const handleLogout = () => {
    googleService.logout();
    setCurrentUser(null);
  };

  const handleSyncScript = async (isManual = false, isOneShot = false) => {
    if (scriptSyncTimerRef.current) clearTimeout(scriptSyncTimerRef.current);

    const token = googleService.getAccessToken();
    if (!token) {
      if (isManual) {
        googleService.login((user) => {
          if (user) {
            setCurrentUser(user);
            setTimeout(() => handleSyncScript(false), 500);
          }
        });
      }
      return;
    }

    const blocks = projectRef.current.scriptBlocks || [];
    const isScriptEmpty = blocks.length === 0 || (blocks.length === 1 && !blocks[0].content.trim());

    if (isScriptEmpty) {
      if (!isOneShot && activeTabRef.current === 'script') {
        scriptSyncTimerRef.current = setTimeout(() => handleSyncScript(false), 120000);
      }
      return;
    }

    setScriptSyncStatus('syncing');
    const result = await googleService.syncFullProjectToGoogleDoc(projectRef.current);

    if (result.success) {
      setScriptSyncStatus('synced');
      setTimeout(() => setScriptSyncStatus('idle'), 5000);
    } else {
      setScriptSyncStatus('error');
      setTimeout(() => setScriptSyncStatus('idle'), 10000);
    }

    if (!isOneShot && activeTabRef.current === 'script') {
      scriptSyncTimerRef.current = setTimeout(() => handleSyncScript(false), 120000);
    }
  };

  const handleSyncShotlist = async (isManual = false, isOneShot = false) => {
    if (shotlistSyncTimerRef.current) clearTimeout(shotlistSyncTimerRef.current);

    const token = googleService.getAccessToken();
    if (!token) {
      if (isManual) {
        googleService.login((user) => {
          if (user) {
            setCurrentUser(user);
            setTimeout(() => handleSyncShotlist(false), 500);
          }
        });
      }
      return;
    }

    const isShotlistEmpty = (projectRef.current.shotlist || []).length === 0;

    if (isShotlistEmpty) {
      if (!isOneShot && activeTabRef.current === 'shotlist') {
        shotlistSyncTimerRef.current = setTimeout(() => handleSyncShotlist(false), 120000);
      }
      return;
    }

    setShotlistSyncStatus('syncing');
    const result = await googleService.syncShotlistToDriveXlsx(projectRef.current);

    if (result.success) {
      setShotlistSyncStatus('synced');
      setTimeout(() => setShotlistSyncStatus('idle'), 5000);
    } else {
      setShotlistSyncStatus('error');
      setTimeout(() => setShotlistSyncStatus('idle'), 10000);
    }

    if (!isOneShot && activeTabRef.current === 'shotlist') {
      shotlistSyncTimerRef.current = setTimeout(() => handleSyncShotlist(false), 120000);
    }
  };

  const scriptSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shotlistSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTab === 'script') {
      handleSyncScript(false);
    } else {
      handleSyncShotlist(false);
    }

    return () => {
      if (scriptSyncTimerRef.current) clearTimeout(scriptSyncTimerRef.current);
      if (shotlistSyncTimerRef.current) clearTimeout(shotlistSyncTimerRef.current);
    };
  }, [activeTab, project.id]);

  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer]);
    await processDocxBlob(blob);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportConfirm(false);
  };

  const processDocxBlob = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.value, 'text/html');
      const pTags = Array.from(doc.querySelectorAll('p'));

      const newBlocks: any[] = [];
      let lastType: BlockType = 'action';

      let detectedProjectName = '';
      let detectedAuthor = '';
      const processedTags = new Set<number>();

      for (let i = 0; i < Math.min(10, pTags.length); i++) {
        const text = pTags[i].textContent?.trim() || '';
        const lowerText = text.toLowerCase();

        if (lowerText === 'viết bởi' || lowerText === 'written by') {
          if (i > 0) {
            const potentialTitle = pTags[i - 1].textContent?.trim();
            if (potentialTitle) {
              detectedProjectName = potentialTitle;
              processedTags.add(i - 1);
            }
          }
          if (i < pTags.length - 1) {
            const potentialAuthor = pTags[i + 1].textContent?.trim();
            if (potentialAuthor) {
              detectedAuthor = potentialAuthor;
              processedTags.add(i + 1);
            }
          }
          processedTags.add(i);
          break;
        }
      }

      pTags.forEach((p, index) => {
        if (processedTags.has(index)) return;

        const text = p.textContent?.trim() || '';
        if (text.length === 0) return;

        let type: BlockType = 'action';
        let content = text;
        const upperText = text.toUpperCase();
        
        // 1. Scene Headings (Catch INT, EXT, I/E with or without dots, support leading numbers)
        const isHeading = /^([0-9]+[.\-\s\)]*\s*)?(INT|EXT|I\/E|CẢNH|PHÂN CẢNH|SCENE|HỒI|TAP|TẬP)(\.|\s|\/)/i.test(text);
        
        // 2. Transitions (Usually all caps ends with :)
        const isTransition = upperText === text && text.endsWith(':') && text.length < 40;
        
        // 3. Characters (All caps, no terminal punctuation, usually short)
        const hasTerminalPunctuation = /[.!?]$/.test(text);
        const isCaps = upperText === text && text.length < 50 && !isHeading && !isTransition && !hasTerminalPunctuation;
        
        // 4. Parentheticals
        const isParen = text.startsWith('(') && text.endsWith(')');

        if (isHeading) {
          type = 'scene';
          content = formatImportSceneHeading(text);
        } else if (isTransition) {
          type = 'transition';
        } else if (isCaps) {
          // Heuristic: If it's all caps but follows a scene heading, it's very likely a Character
          // unless it's extremely long (which usually implies Action accidentally caps-locked)
          type = 'character';
        } else if (isParen) {
          type = 'parenthetical';
        } else if (lastType === 'character' || lastType === 'parenthetical') {
          // Following a character or parenthetical is almost always dialogue
          type = 'dialogue';
        } else if (lastType === 'dialogue' && text.length < 400) {
          // If previous was dialogue, and this isn't caps/paren/heading, it's likely continued dialogue or action
          // We'll lean towards action if it ends with punctuation
          type = hasTerminalPunctuation ? 'action' : 'dialogue';
        } else {
          type = 'action';
        }

        newBlocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type,
          content: content
        });
        lastType = type;
      });

        importFullProject({
          projectName: detectedProjectName || '',
          author: detectedAuthor,
          scriptBlocks: newBlocks,
          characters: [],
          locations: []
        });
    } catch (err) {
      console.error('Lỗi khi nhập file Word:', err);
      alert('Không thể xử lý tệp kịch bản này. Vui lòng kiểm tra định dạng.');
    }
  };

  const processXlsxBlob = async (blob: Blob, projectName: string) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const dirSheet = workbook.Sheets["Đạo Diễn"];
      const dpSheet = workbook.Sheets["Quay Phim"];

      if (!dirSheet && !dpSheet) {
        alert("Đây không phải file Shotlist từ Filmmakers.vn (Thiếu sheet 'Đạo Diễn' hoặc 'Quay Phim')");
        return;
      }

      const sheet = dirSheet || dpSheet;
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet);

      const labelMap: Record<string, string> = {
        'Scene': 'scene', 'Shot': 'shot', 'I/E': 'dayNight', 'Địa điểm': 'location',
        'Nội dung': 'content', 'Diễn xuất': 'actorAction', 'Ghi chú ĐD': 'sceneNotes', 'Thư ký': 'scriptNotes',
        'Card': 'memoryCard', 'Shot Size': 'size', 'Move': 'movement', 'Lens': 'lens', 'Angle': 'angle', 'Tech Note': 'techNotes'
      };

      const newShotlist = rawData.map(row => {
        const shot: any = {};
        Object.entries(labelMap).forEach(([label, key]) => {
          if (row[label] !== undefined) shot[key] = row[label];
        });
        return {
          id: Math.random().toString(36).substr(2, 9),
          scene: shot.scene || '',
          shot: shot.shot || '',
          roll: 'A',
          memoryCard: shot.memoryCard || '',
          size: shot.size || '',
          movement: shot.movement || '',
          lens: shot.lens || '',
          angle: shot.angle || '',
          location: shot.location || '',
          content: shot.content || '',
          actorAction: shot.actorAction || '',
          dayNight: shot.dayNight || 'D',
          techNotes: shot.techNotes || '',
          sceneNotes: shot.sceneNotes || '',
          scriptNotes: shot.scriptNotes || ''
        };
      });

      if (newShotlist.length > 0) {
        importShotlist(newShotlist);
        updateShotlistProjectName(projectName || 'Shotlist mới');
        alert(`Đã nhập thành công ${newShotlist.length} shot từ Google Drive.`);
      }
    } catch (err) {
      console.error('Lỗi khi nhập file Excel:', err);
      alert('Không thể xử lý tệp Shotlist. Vui lòng kiểm tra định dạng.');
    }
  };

  const handleDriveFileSelect = async (file: { id: string; name: string; mimeType: string }) => {
    setShowDrivePicker(false);
    const blob = await googleService.downloadFileAsBlob(file.id, file.mimeType);
    if (!blob) {
      alert("Không thể tải tệp từ Google Drive.");
      return;
    }

    if (file.mimeType.includes('document')) {
      await processDocxBlob(blob);
    } else if (file.mimeType.includes('spreadsheet')) {
      await processXlsxBlob(blob, file.name);
    } else if (file.name.endsWith('.json')) {
      const text = await blob.text();
      try {
        const data = JSON.parse(text);
        importFullProject(data);
      } catch (e) {
        alert("Lỗi khi đọc file tệp dự án JSON.");
      }
    }
  };

  if (isInitializing) {
    return <div className="loading-screen">Khởi tạo hệ thống...</div>;
  }

  return (
    <div className={`app-container ${theme}-theme ${sidebarLeftOpen ? 'sidebar-left-visible' : 'sidebar-left-collapsed'} ${sidebarRightOpen ? 'sidebar-right-visible' : 'sidebar-right-collapsed'} ${isMobile ? 'is-mobile' : ''}`}>
      {/* WordPress-style Header */}
      <header className="app-header no-print">
        <div className="header-left">
          <button className="icon-btn hamburger-btn" onClick={toggleLeftSidebar} title="Bật/Tắt công cụ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="project-title-container">
            <span className="logo-text">FILMMAKERS.VN</span>
            <span className="project-name-display">bởi {project.author || 'Trần Thanh Sơn'}</span>
          </div>
        </div>
        
        <div className="header-right">
          <div className={`sync-status-mini ${scriptSyncStatus} ${!currentUser ? 'unauthenticated' : ''}`}></div>
          <button className="icon-btn gear-btn" onClick={toggleRightSidebar} title="Cài đặt hệ thống">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </header>

      <div className="main-layout-area">
        <SidebarLeft
          isOpen={sidebarLeftOpen}
          setOpen={setSidebarLeftOpen}
          openCleanUp={(type: 'script' | 'shotlist') => {
            setCleanUpType(type);
            setShowCleanUpModal(true);
          }}
        />
        <MainEditor />
        <SidebarRight
          isOpen={sidebarRightOpen}
          onOpenDownload={() => setShowDownloadModal(true)}
          onOpenImport={() => setShowImportConfirm(true)}
          onSyncScript={() => handleSyncScript(true)}
          onSyncShotlist={() => handleSyncShotlist(true)}
          onReset={() => setShowResetModal(true)}
          scriptSyncStatus={scriptSyncStatus}
          shotlistSyncStatus={shotlistSyncStatus}
          user={currentUser}
          onLogout={handleLogout}
          onLogin={() => {
            if (activeTab === 'script') handleSyncScript(true);
            else handleSyncShotlist(true);
          }}
          setOpen={setSidebarRightOpen}
          theme={theme}
          setTheme={setTheme}
        />
      </div>

      {/* Mobile Sidebar Tabs - REMOVED, using Header instead */}


      <ResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
      <DownloadModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} />
      <ImportConfirmModal
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        onConfirmLocal={() => fileInputRef.current?.click()}
        onConfirmGoogle={() => {
          if (currentUser) {
            setShowImportConfirm(false);
            setShowDrivePicker(true);
          } else {
            alert("Vui lòng đăng nhập Google trước khi sử dụng tính năng này.");
            handleSyncScript(true); // Trigger login
          }
        }}
        isLoggedIn={!!currentUser}
      />
      <DrivePickerModal
        isOpen={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        onSelect={handleDriveFileSelect}
      />

      <CleanUpModal 
        isOpen={showCleanUpModal} 
        onClose={() => setShowCleanUpModal(false)} 
        type={cleanUpType} 
      />

      <input
        type="file"
        ref={fileInputRef}
        accept=".docx,.xlsx"
        style={{ display: 'none' }}
        onChange={handleImportWord}
      />
    </div>
  );
}

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}

export default App;
