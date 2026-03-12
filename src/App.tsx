import { useState, useEffect, useRef } from 'react';
import { EditorProvider, useEditor, type BlockType } from './components/EditorContext';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import MainEditor from './components/MainEditor';
import { ResetModal } from './components/ResetModal';
import { DownloadModal } from './components/DownloadModal';
import { QuickAddModal } from './components/QuickAddModal';
import ImportConfirmModal from './components/ImportConfirmModal';
import { googleService } from './lib/google-workspace';
import { DrivePickerModal } from './components/DrivePickerModal';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import './App.css';

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'character' | 'location' | null>(null);
  const [scriptSyncStatus, setScriptSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [shotlistSyncStatus, setShotlistSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const { importFullProject, project, activeTab, importShotlist, updateShotlistProjectName } = useEditor();
  const projectRef = useRef(project);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // CHUYỂN TAB: Đồng bộ phần cũ một lần, bắt đầu auto-sync phần mới
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

    // KIỂM TRA TRỐNG: Nếu chỉ có 1 block và nội dung trống thì không đồng bộ
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

    // Tự động đặt lịch đồng bộ tiếp theo mỗi 2 phút (chỉ khi không phải one-shot)
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

    // KIỂM TRA TRỐNG: Nếu shotlist không có hàng nào thì không đồng bộ
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

    // Tự động đặt lịch đồng bộ tiếp theo mỗi 2 phút (chỉ khi không phải one-shot)
    if (!isOneShot && activeTabRef.current === 'shotlist') {
      shotlistSyncTimerRef.current = setTimeout(() => handleSyncShotlist(false), 120000);
    }
  };

  // Auto-save Timers
  const scriptSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shotlistSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Khởi động chu kỳ đồng bộ 2 phút
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
      const detectedChars = new Set<string>();
      const detectedLocs = new Set<string>();

      let detectedProjectName = '';
      let detectedAuthor = '';
      const processedTags = new Set<number>();

      // Logic nhận diện Title Page (Tên kịch bản & Đạo diễn/Tác giả)
      for (let i = 0; i < Math.min(10, pTags.length); i++) {
        const text = pTags[i].textContent?.trim() || '';
        const lowerText = text.toLowerCase();
        
        if (lowerText === 'viết bởi' || lowerText === 'written by') {
          // Paragraph trước đó là Tên kịch bản (nếu chưa có hoặc là "Kịch bản mới")
          if (i > 0) {
            const potentialTitle = pTags[i - 1].textContent?.trim();
            if (potentialTitle) {
              detectedProjectName = potentialTitle;
              processedTags.add(i - 1);
            }
          }
          // Paragraph sau đó là Tác giả
          if (i < pTags.length - 1) {
            const potentialAuthor = pTags[i + 1].textContent?.trim();
            if (potentialAuthor) {
              detectedAuthor = potentialAuthor;
              processedTags.add(i + 1);
            }
          }
          processedTags.add(i);
          break; // Đã tìm thấy title page
        }
      }

      pTags.forEach((p, index) => {
        if (processedTags.has(index)) return;

        const text = p.textContent?.trim() || '';
        if (text.length === 0) return;

        let type: BlockType = 'action';
        const isHeading = /^(INT\.|EXT\.|CẢNH|SCENE|HỒI)/i.test(text);
        const isCaps = text === text.toUpperCase() && text.length < 55 && !isHeading && text.length > 1;
        const isParen = text.startsWith('(') && text.endsWith(')');

        if (isHeading) {
          type = 'scene';
          let loc = text.replace(/^(INT\.|EXT\.|CẢNH|SCENE|HỒI)/i, '').trim();
          if (loc.includes('-')) loc = loc.split('-')[0].trim();
          if (loc) detectedLocs.add(loc.toUpperCase());
        }
        else if (isCaps) {
          type = 'character';
          detectedChars.add(text.toUpperCase());
        }
        else if (isParen) type = 'parenthetical';
        else if ((lastType === 'character' || lastType === 'parenthetical') && text.length < 400) type = 'dialogue';
        else type = 'action';

        newBlocks.push({
          id: Math.random().toString(36).substr(2, 9),
          type,
          content: text
        });
        lastType = type;
      });

      if (newBlocks.length > 0) {
        const finalCharacters = Array.from(detectedChars).map(name => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          age: '',
          frequency: 0
        }));

        importFullProject({
          projectName: detectedProjectName || '',
          author: detectedAuthor,
          scriptBlocks: newBlocks,
          characters: finalCharacters,
          locations: Array.from(detectedLocs)
        });
      }
    } catch (err) {
      console.error('Lỗi khi nhập file Word:', err);
      alert('Không thể xử lý tệp kịch bản này. Vui lòng kiểm tra định dạng.');
    }
  };

  const processXlsxBlob = async (blob: Blob, projectName: string) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      // Tìm sheet Đạo Diễn hoặc Quay Phim
      const dirSheet = workbook.Sheets["Đạo Diễn"];
      const dpSheet = workbook.Sheets["Quay Phim"];

      if (!dirSheet && !dpSheet) {
        alert("Đây không phải file Shotlist từ Filmmakers.vn (Thiếu sheet 'Đạo Diễn' hoặc 'Quay Phim')");
        return;
      }

      // Ưu tiên sheet Đạo Diễn để lấy nhiều thông tin nhất
      const sheet = dirSheet || dpSheet;
      const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
      
      // Mapping từ label tiếng Việt sang key hệ thống
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
    <div className={`app-container ${theme}-theme ${sidebarOpen ? 'sidebar-visible' : 'sidebar-collapsed'}`}>
      <SidebarLeft
        isOpen={sidebarOpen}
        setOpen={setSidebarOpen}
        theme={theme}
        setTheme={setTheme}
        resetTrigger={() => setShowResetModal(true)}
        onQuickAdd={(type: 'character' | 'location') => setQuickAddType(type)}
      />
      <MainEditor />
      <SidebarRight 
        isOpen={sidebarOpen} 
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
      />

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
      <QuickAddModal type={quickAddType} onClose={() => setQuickAddType(null)} />
      
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
