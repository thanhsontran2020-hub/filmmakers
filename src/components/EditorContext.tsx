
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type BlockType = 'scene' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition';

export interface ScriptBlock {
  id: string;
  type: BlockType;
  content: string;
}

export interface CharacterItem {
  id: string;
  name: string;
  age: string;
  description?: string;
  frequency: number;
}

export interface Shot {
  id: string;
  scene: string;
  shot: string;
  roll: string;
  memoryCard: string;
  size: string;
  movement: string;
  lens: string;
  angle: string;
  location: string;
  content: string;
  actorAction: string;
  dayNight: string;
  techNotes: string;
  sceneNotes: string;
  scriptNotes: string;
}

interface HistoryState {
  blocks: ScriptBlock[];
  activeBlockIndex: number;
}

interface ProjectData {
  id: string;
  projectName: string;
  title: string;
  author: string;
  logline: string;
  currentScript: string;
  scriptBlocks: ScriptBlock[];
  characters: CharacterItem[];
  locations: string[];
  shotlist: Shot[];
  shotlistProjectName: string;
  shotlistDirector: string;
  shotlistDate: string;
}

interface EditorContextType {
  project: ProjectData;
  updateProjectName: (name: string) => void;
  updateLogline: (logline: string) => void;
  updateAuthor: (author: string) => void;
  updateScriptBlocks: (blocks: ScriptBlock[]) => void;
  addBlock: (index: number, type: BlockType, content?: string) => void;
  removeBlock: (index: number) => void;
  updateBlock: (index: number, content: string, type?: BlockType) => void;
  addCharacter: (char: { name: string; age: string }) => void;
  removeCharacter: (id: string) => void;
  addLocation: (name: string) => void;
  removeLocation: (name: string) => void;
  updateLocation: (oldName: string, newName: string) => void;
  insertElement: (type: string, name?: string) => void;
  undo: () => void;
  redo: () => void;
  shotlist: Shot[];
  setShotlist: (shotlist: Shot[]) => void;
  updateShotlist: (shotlist: Shot[]) => void; // Legacy
  activeTab: string;
  setActiveTab: (tab: string) => void;
  shotlistView: 'director' | 'dp';
  setShotlistView: (view: 'director' | 'dp') => void;
  locations: string[];
  activeBlockIndex: number;
  setActiveBlockIndex: (index: number) => void;
  selectedIndices: number[];
  setSelectedIndices: (indices: number[]) => void;
  clearSelection: () => void;
  copyBlocks: () => void;
  cutBlocks: () => void;
  pasteBlocks: (atIndex: number) => void;
  deleteSelectedBlocks: () => void;
  addShot: () => void;
  addScene: () => void;
  updateShotlistProjectName: (name: string) => void;
  updateShotlistDirector: (director: string) => void;
  updateShotlistDate: (date: string) => void;
  clearCharacters: () => void;
  clearLocations: () => void;
  clearScript: () => void; // Keeps metadata
  resetFullScript: () => void; // Wipes metadata + blocks
  clearShotlistData: (view: 'director' | 'dp') => void;
  resetShotlistContentOnly: (view: 'director' | 'dp') => void;
  resetFullShotlist: () => void;
  importFullProject: (data: Partial<ProjectData>) => void;
  importShotlist: (shotlist: Shot[]) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const DEFAULT_BLOCKS: ScriptBlock[] = [
  { id: '1', type: 'scene', content: '' }
];

export const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState('script');
  const [shotlistView, setShotlistView] = useState<'director' | 'dp'>('director');
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [clipboard, setClipboard] = useState<ScriptBlock[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const [historyTimer, setHistoryTimer] = useState<NodeJS.Timeout | null>(null);

  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('filmmakers_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          id: parsed.id || Math.random().toString(36).substr(2, 9),
          projectName: parsed.projectName || parsed.title || 'Kịch bản chưa đặt tên',
          title: parsed.title || parsed.projectName || 'Kịch bản chưa đặt tên',
          author: parsed.author || '',
          logline: parsed.logline || '',
          currentScript: parsed.currentScript || '',
          scriptBlocks: parsed.scriptBlocks || DEFAULT_BLOCKS,
          characters: parsed.characters || [],
          locations: parsed.locations || [],
          shotlist: parsed.shotlist || [],
          shotlistProjectName: parsed.shotlistProjectName || '',
          shotlistDirector: parsed.shotlistDirector || '',
          shotlistDate: parsed.shotlistDate || ''
        };
      } catch (e) {
        console.error("Lỗi parse dữ liệu cũ:", e);
      }
    }
    return {
      id: Math.random().toString(36).substr(2, 9),
      projectName: 'Kịch bản chưa đặt tên',
      title: 'Kịch bản chưa đặt tên',
      author: '',
      logline: '',
      currentScript: '',
      scriptBlocks: DEFAULT_BLOCKS,
      characters: [],
      locations: [],
      shotlist: [],
      shotlistProjectName: '',
      shotlistDirector: '',
      shotlistDate: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('filmmakers_project', JSON.stringify(project));
  }, [project]);

  // Sync selection with active block to ensure the "Grey Area" follows the cursor
  useEffect(() => {
    setSelectedIndices([activeBlockIndex]);
  }, [activeBlockIndex]);

  const updateProjectName = (name: string) => {
    setProject(prev => ({ ...prev, projectName: name, title: name }));
  };

  const updateLogline = (logline: string) => {
    setProject(prev => ({ ...prev, logline }));
  };

  const updateAuthor = (author: string) => {
    setProject(prev => ({ ...prev, author }));
  };

  const updateShotlistProjectName = (name: string) => {
    setProject(prev => ({ ...prev, shotlistProjectName: name }));
  };

  const updateShotlistDirector = (director: string) => {
    setProject(prev => ({ ...prev, shotlistDirector: director }));
  };

  const updateShotlistDate = (date: string) => {
    setProject(prev => ({ ...prev, shotlistDate: date }));
  };

  const pushToHistory = (blocks: ScriptBlock[], activeIdx: number) => {
    // Deep clone to ensure no references persist
    const snapshot = JSON.parse(JSON.stringify(blocks));
    setHistory(prev => [...prev.slice(-49), { blocks: snapshot, activeBlockIndex: activeIdx }]); 
    setRedoStack([]);
  };

  const updateScriptBlocks = (scriptBlocks: ScriptBlock[], options: { skipHistory?: boolean, forceHistory?: boolean } = {}) => {
    if (!options.skipHistory && options.forceHistory) {
      pushToHistory(project.scriptBlocks, activeBlockIndex);
    }
    
    // Auto-update currentScript (Legacy support for RAW text users)
    const rawText = scriptBlocks.map(b => {
      let indent = 0;
      if (b.type === 'character') indent = 35;
      else if (b.type === 'parenthetical') indent = 28;
      else if (b.type === 'dialogue') indent = 15;
      else if (b.type === 'transition') indent = 45;
      return ' '.repeat(indent) + b.content;
    }).join('\n');
    
    setProject(prev => ({ ...prev, scriptBlocks, currentScript: rawText }));
  };

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setRedoStack(prev => [{ blocks: JSON.parse(JSON.stringify(project.scriptBlocks)), activeBlockIndex }, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    updateScriptBlocks(previousState.blocks, { skipHistory: true });
    setActiveBlockIndex(previousState.activeBlockIndex);
  }, [history, project.scriptBlocks, activeBlockIndex]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    setHistory(prev => [...prev, { blocks: JSON.parse(JSON.stringify(project.scriptBlocks)), activeBlockIndex }]);
    setRedoStack(prev => prev.slice(1));
    updateScriptBlocks(nextState.blocks, { skipHistory: true });
    setActiveBlockIndex(nextState.activeBlockIndex);
  }, [redoStack, project.scriptBlocks, activeBlockIndex]);

  const addBlock = useCallback((index: number, type: BlockType, content: string = '') => {
    const newBlock: ScriptBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content
    };
    const newBlocks = [...project.scriptBlocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateScriptBlocks(newBlocks, { forceHistory: true });
    // Selection will be synced by the useEffect above
    setActiveBlockIndex(index + 1);
  }, [project.scriptBlocks]);

  const removeBlock = (index: number) => {
    pushToHistory(project.scriptBlocks, activeBlockIndex);
    if (project.scriptBlocks.length <= 1) {
      updateBlock(0, '', 'action');
      return;
    }
    const newBlocks = project.scriptBlocks.filter((_, i) => i !== index);
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setActiveBlockIndex(Math.max(0, index - 1));
  };

  const updateBlock = (index: number, content: string, type?: BlockType) => {
    const newBlocks = [...project.scriptBlocks];
    if (newBlocks[index]) {
      const isTypeChange = type && type !== newBlocks[index].type;
      
      if (isTypeChange) {
        if (historyTimer) clearTimeout(historyTimer);
        pushToHistory(project.scriptBlocks, activeBlockIndex);
      } else {
        // Debounce text changes
        if (historyTimer) clearTimeout(historyTimer);
        const timer = setTimeout(() => {
          pushToHistory(project.scriptBlocks, activeBlockIndex);
          setHistoryTimer(null);
        }, 1000); // 1 second debounce
        setHistoryTimer(timer);
      }

      newBlocks[index] = { 
        ...newBlocks[index], 
        content,
        type: type || newBlocks[index].type 
      };
      
      updateScriptBlocks(newBlocks, { skipHistory: true });
    }
  };

  const addCharacter = (char: { name: string; age: string }) => {
    const newChar: CharacterItem = {
      ...char,
      id: Math.random().toString(36).substr(2, 9),
      frequency: 0
    };
    setProject(prev => ({ ...prev, characters: [...prev.characters, newChar] }));
  };

  const removeCharacter = (id: string) => {
    setProject(prev => ({ ...prev, characters: prev.characters.filter(c => c.id !== id) }));
  };

  const addLocation = (name: string) => {
    setProject(prev => ({ ...prev, locations: [...prev.locations, name] }));
  };

  const removeLocation = (name: string) => {
    setProject(prev => ({ ...prev, locations: prev.locations.filter(l => l !== name) }));
  };

  const updateLocation = (oldName: string, newName: string) => {
    setProject(prev => ({
      ...prev,
      locations: prev.locations.map(l => l === oldName ? newName : l)
    }));
  };

  const insertElement = (type: string, name?: string) => {
    let index = activeBlockIndex;
    let blockType: BlockType = 'action';
    let content = name || '';

    if (type === 'scene') {
      blockType = 'scene';
      const currentBlock = project.scriptBlocks[index];
      if (currentBlock && currentBlock.type === 'scene') {
        // Cycle: EXT. -> INT. -> INT. ... - NGÀY -> INT. ... - ĐÊM
        let text = currentBlock.content.toUpperCase();
        if (text.startsWith('EXT.')) text = text.replace('EXT.', 'INT.');
        else if (text.startsWith('INT.')) text = text.replace('INT.', 'EXT.');
        else text = 'INT. ' + text;

        updateBlock(index, text, 'scene');
        return;
      }
      content = 'INT. ';
    } else if (type === 'time') {
      const currentBlock = project.scriptBlocks[index];
      if (currentBlock && currentBlock.type === 'scene') {
        let text = currentBlock.content;
        if (text.includes(' - NGÀY')) text = text.replace(' - NGÀY', ' - ĐÊM');
        else if (text.includes(' - ĐÊM')) text = text.replace(' - ĐÊM', ' - NGÀY');
        else text = text + ' - NGÀY';
        
        updateBlock(index, text, 'scene');
        return;
      }
      return;
    } else if (type === 'location_specific') {
      const currentBlock = project.scriptBlocks[index];
      if (currentBlock && currentBlock.type === 'scene') {
        let text = currentBlock.content.toUpperCase();
        let prefix = '';
        if (text.startsWith('INT.')) prefix = 'INT. ';
        else if (text.startsWith('EXT.')) prefix = 'EXT. ';
        else prefix = 'INT. '; // Default if neither
        
        // Remove existing time suffix if present to update just the location
        let locationPart = text.replace('INT.', '').replace('EXT.', '').trim();
        if (locationPart.includes(' - ')) {
          const parts = locationPart.split(' - ');
          updateBlock(index, prefix + name + ' - ' + parts[1], 'scene');
        } else {
          updateBlock(index, prefix + name, 'scene');
        }
        return;
      }
      blockType = 'scene';
      content = 'INT. ' + (name || '');
    } else if (type === 'char_specific') {
      blockType = 'character';
      content = (name || '').toUpperCase();
    } else if (type === 'parenthetical') {
      blockType = 'parenthetical';
      content = name ? `(${name})` : '()';
    } else if (type === 'dialogue') {
      blockType = 'dialogue';
    } else if (type === 'transition') {
      blockType = 'transition';
      const currentBlock = project.scriptBlocks[index];
      if (currentBlock && currentBlock.type === 'transition') {
        const transforms = ['FADE IN:', 'CUT TO:', 'DISSOLVE TO:', 'FADE OUT:'];
        let text = currentBlock.content.toUpperCase();
        let nextIdx = (transforms.indexOf(text) + 1) % transforms.length;
        updateBlock(index, transforms[nextIdx], 'transition');
        return;
      }
      content = 'CUT TO:';
    }

    const currentBlock = project.scriptBlocks[index];
    const isEmpty = currentBlock && currentBlock.content.trim() === '';

    if (isEmpty && type !== 'time') {
      // Replace the empty block
      updateBlock(index, content, blockType);
    } else {
      // Normal insertion
      addBlock(index, blockType, content);
    }
  };

  const copyBlocks = useCallback(() => {
    if (selectedIndices.length === 0) {
      setClipboard([project.scriptBlocks[activeBlockIndex]]);
    } else {
      const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
      setClipboard(sortedIndices.map(i => project.scriptBlocks[i]));
    }
  }, [selectedIndices, project.scriptBlocks, activeBlockIndex]);

  const cutBlocks = useCallback(() => {
    copyBlocks();
    deleteSelectedBlocks();
  }, [copyBlocks, project.scriptBlocks]);

  const pasteBlocks = useCallback((atIndex: number) => {
    if (clipboard.length === 0) return;
    pushToHistory(project.scriptBlocks, activeBlockIndex);
    const newBlocks = [...project.scriptBlocks];
    const pasteItems = clipboard.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) }));
    newBlocks.splice(atIndex + 1, 0, ...pasteItems);
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setSelectedIndices(Array.from({ length: pasteItems.length }, (_, i) => atIndex + 1 + i));
  }, [clipboard, project.scriptBlocks, activeBlockIndex]);

  const deleteSelectedBlocks = useCallback(() => {
    pushToHistory(project.scriptBlocks, activeBlockIndex);
    const indicesToRemove = selectedIndices.length > 0 ? selectedIndices : [activeBlockIndex];
    if (indicesToRemove.length === project.scriptBlocks.length) {
      updateScriptBlocks(DEFAULT_BLOCKS, { skipHistory: true });
      setSelectedIndices([]);
      setActiveBlockIndex(0);
      return;
    }
    const newBlocks = project.scriptBlocks.filter((_, i) => !indicesToRemove.includes(i));
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setSelectedIndices([]);
    setActiveBlockIndex(Math.max(0, Math.min(...indicesToRemove) - 1));
  }, [selectedIndices, activeBlockIndex, project.scriptBlocks]);

  const clearSelection = () => setSelectedIndices([]);

  const setShotlist = (shotlist: Shot[]) => {
    setProject(prev => ({ ...prev, shotlist }));
  };

  const addShot = useCallback(() => {
    const list = project.shotlist;
    const lastShot = list[list.length - 1];
    const newShot: Shot = {
      id: Math.random().toString(36).substr(2, 9),
      scene: lastShot?.scene || '1',
      shot: lastShot ? (parseInt(lastShot.shot) + 1).toString() : '1',
      roll: 'A',
      memoryCard: lastShot?.memoryCard || '',
      size: '',
      movement: '',
      lens: '',
      angle: '',
      location: lastShot?.location || '',
      content: '',
      actorAction: '',
      dayNight: 'INT',
      techNotes: '',
      sceneNotes: '',
      scriptNotes: ''
    };
    setShotlist([...list, newShot]);
  }, [project.shotlist]);

  const addScene = useCallback(() => {
    const list = project.shotlist;
    const lastShot = list[list.length - 1];
    const newSceneNum = lastShot ? (parseInt(lastShot.scene) + 1).toString() : '1';
    const newShot: Shot = {
      id: Math.random().toString(36).substr(2, 9),
      scene: newSceneNum,
      shot: '1',
      roll: 'A',
      memoryCard: '',
      size: '',
      movement: '',
      lens: '',
      angle: '',
      location: '',
      content: '',
      actorAction: '',
      dayNight: 'INT',
      techNotes: '',
      sceneNotes: '',
      scriptNotes: ''
    };
    setShotlist([...list, newShot]);
  }, [project.shotlist]);

  const clearCharacters = () => {
    setProject(prev => ({ ...prev, characters: [] }));
  };

  const clearLocations = () => {
    setProject(prev => ({ ...prev, locations: [] }));
  };

  const clearScript = () => {
    updateScriptBlocks(DEFAULT_BLOCKS, { forceHistory: true });
    setActiveBlockIndex(0);
  };

  const resetFullScript = () => {
    setProject(prev => ({
      ...prev,
      id: Math.random().toString(36).substr(2, 9),
      projectName: 'Kịch bản chưa đặt tên',
      title: 'Kịch bản chưa đặt tên',
      author: '',
      logline: '',
      scriptBlocks: DEFAULT_BLOCKS,
      characters: [],
      locations: []
    }));
    setActiveBlockIndex(0);
  };

  const clearShotlistData = (view: 'director' | 'dp') => {
    const list = [...project.shotlist];
    const clearedList = list.map(shot => {
      if (view === 'director') {
        return {
          ...shot,
          content: '',
          actorAction: '',
          sceneNotes: '',
          scriptNotes: '',
          location: '',
          dayNight: 'INT'
        };
      } else {
        return {
          ...shot,
          roll: 'A',
          memoryCard: '',
          size: '',
          movement: '',
          lens: '',
          angle: '',
          techNotes: ''
        };
      }
    });
    setShotlist(clearedList);
  };

  const resetShotlistContentOnly = (view: 'director' | 'dp') => {
    const list = [...project.shotlist];
    const clearedList = list.map(shot => {
      if (view === 'director') {
        return {
          ...shot,
          location: '',
          content: '',
          actorAction: '',
          dayNight: 'INT',
          sceneNotes: '',
          scriptNotes: ''
        };
      } else {
        return {
          ...shot,
          roll: 'A',
          memoryCard: '',
          size: '',
          movement: '',
          lens: '',
          angle: '',
          techNotes: ''
        };
      }
    });
    setShotlist(clearedList);
  };

  const resetFullShotlist = () => {
    setProject(prev => ({
      ...prev,
      id: Math.random().toString(36).substr(2, 9),
      shotlist: [],
      shotlistProjectName: '',
      shotlistDirector: '',
      shotlistDate: ''
    }));
  };

  return (
    <EditorContext.Provider value={{ 
      project, 
      updateProjectName, 
      updateLogline,
      updateAuthor,
      updateScriptBlocks,
      addBlock,
      removeBlock,
      updateBlock,
      addCharacter,
      removeCharacter,
      addLocation,
      removeLocation,
      insertElement,
      shotlist: project.shotlist,
      setShotlist,
      updateShotlist: setShotlist,
      activeTab,
      setActiveTab,
      shotlistView,
      setShotlistView,
      locations: project.locations,
      activeBlockIndex,
      setActiveBlockIndex,
      selectedIndices,
      setSelectedIndices,
      clearSelection,
      copyBlocks,
      cutBlocks,
      pasteBlocks,
      deleteSelectedBlocks,
      updateLocation,
      undo,
      redo,
      addShot,
      addScene,
      updateShotlistProjectName,
      updateShotlistDirector,
      updateShotlistDate,
      clearCharacters,
      clearLocations,
      clearScript,
      resetFullScript,
      clearShotlistData,
      resetShotlistContentOnly,
      resetFullShotlist,
      importFullProject: (data: Partial<ProjectData>) => {
        setProject(prev => ({
          ...prev,
          id: data.id || Math.random().toString(36).substr(2, 9), 
          projectName: data.projectName || data.title || 'Kịch bản mới',
          title: data.title || data.projectName || 'Kịch bản mới',
          author: data.author || '',
          logline: data.logline || '',
          scriptBlocks: data.scriptBlocks || DEFAULT_BLOCKS,
          characters: data.characters || [],
          locations: data.locations || [],
          // Keep shotlist data untouched
          shotlist: prev.shotlist,
          shotlistProjectName: prev.shotlistProjectName,
          shotlistDirector: prev.shotlistDirector,
          shotlistDate: prev.shotlistDate
        }));
        setActiveBlockIndex(0);
        setSelectedIndices([0]);
        setHistory([]); // Clear history for new project
        setRedoStack([]);
      },
      importShotlist: (shotlist: Shot[]) => {
        setProject(prev => ({
          ...prev,
          shotlist
        }));
      }
    }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
};
