
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
  scriptNotes: string;
  fov: string;
  duration: string;
  actors: string;
  framerate: string;
}

interface ScriptHistoryState {
  blocks: ScriptBlock[];
  activeBlockIndex: number;
}

interface ShotlistHistoryState {
  shotlist: Shot[];
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
  lenses: string[];
  shotlistLocations: string[];
  shotlistActors: string[];
}

interface EditorContextType {
  project: ProjectData;
  updateProjectName: (name: string) => void;
  updateLogline: (logline: string) => void;
  updateAuthor: (author: string) => void;
  updateScriptBlocks: (blocks: ScriptBlock[], options?: { skipHistory?: boolean, forceHistory?: boolean }) => void;
  addBlock: (index: number, type: BlockType, content?: string) => void;
  removeBlock: (index: number) => void;
  removeScene: (index: number) => void;
  updateBlock: (index: number, content: string, type?: BlockType) => void;
  updateShot: (rowIndex: number, colKey: keyof Shot, value: string) => void;
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
  scanCharacters: () => void;
  scanLocations: () => void;
  removeShot: (index: number) => void;
  insertShot: (index: number, isNewScene: boolean) => void;
  clearShotRow: (index: number) => void;
  moveBlockUp: (index: number) => void;
  moveBlockDown: (index: number) => void;
  addLens: (name: string) => void;
  removeLens: (name: string) => void;
  clearLenses: () => void;
    addShotlistLocation: (name: string) => void;
    removeShotlistLocation: (name: string) => void;
    clearShotlistLocations: () => void;
    addShotlistActor: (name: string) => void;
    removeShotlistActor: (name: string) => void;
    clearShotlistActors: () => void;
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
  const [scriptHistory, setScriptHistory] = useState<ScriptHistoryState[]>([]);
  const [scriptRedoStack, setScriptRedoStack] = useState<ScriptHistoryState[]>([]);
  const [shotlistHistory, setShotlistHistory] = useState<ShotlistHistoryState[]>([]);
  const [shotlistRedoStack, setShotlistRedoStack] = useState<ShotlistHistoryState[]>([]);
  const [historyTimer, setHistoryTimer] = useState<NodeJS.Timeout | null>(null);

  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('filmmakers_project');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          id: parsed.id || Math.random().toString(36).substr(2, 9),
          projectName: parsed.projectName ?? parsed.title ?? '',
          title: parsed.title ?? parsed.projectName ?? '',
          author: parsed.author || '',
          logline: parsed.logline || '',
          currentScript: parsed.currentScript || '',
          scriptBlocks: parsed.scriptBlocks || DEFAULT_BLOCKS,
          characters: parsed.characters || [],
          locations: parsed.locations || [],
          shotlist: parsed.shotlist || [],
          shotlistProjectName: parsed.shotlistProjectName || '',
          shotlistDirector: parsed.shotlistDirector || '',
          shotlistDate: parsed.shotlistDate || '',
          lenses: parsed.lenses || [],
          shotlistLocations: parsed.shotlistLocations || [],
          shotlistActors: parsed.shotlistActors || []
        };
      } catch (e) {
        console.error("Lỗi parse dữ liệu cũ:", e);
      }
    }
    return {
      id: Math.random().toString(36).substr(2, 9),
      projectName: '',
      title: '',
      author: '',
      logline: '',
      currentScript: '',
      scriptBlocks: DEFAULT_BLOCKS,
      characters: [],
      locations: [],
      shotlist: [],
      shotlistProjectName: '',
      shotlistDirector: '',
      shotlistDate: '',
      lenses: [],
      shotlistLocations: [],
      shotlistActors: []
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

  const pushScriptHistory = (blocks: ScriptBlock[], activeIdx: number) => {
    if (historyTimer) {
      clearTimeout(historyTimer);
      setHistoryTimer(null);
    }
    const snapshotBlocks = JSON.parse(JSON.stringify(blocks));
    setScriptHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && JSON.stringify(last.blocks) === JSON.stringify(snapshotBlocks)) return prev;
      return [...prev.slice(-299), { blocks: snapshotBlocks, activeBlockIndex: activeIdx }];
    });
    setScriptRedoStack([]);
  };

  const pushShotlistHistory = (shotlist: Shot[]) => {
    if (historyTimer) {
      clearTimeout(historyTimer);
      setHistoryTimer(null);
    }
    const snapshotShotlist = JSON.parse(JSON.stringify(shotlist));
    setShotlistHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && JSON.stringify(last.shotlist) === JSON.stringify(snapshotShotlist)) return prev;
      return [...prev.slice(-299), { shotlist: snapshotShotlist }];
    });
    setShotlistRedoStack([]);
  };

  const updateScriptBlocks = (scriptBlocks: ScriptBlock[], options: { skipHistory?: boolean, forceHistory?: boolean } = {}) => {
    if (!options.skipHistory && options.forceHistory) {
      pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    }

    // Auto-fix misidentified blocks
    const headingRegex = /^([0-9]+[.\-\s\)]*\s*)?(INT|EXT|I\/E|CẢNH|PHÂN CẢNH|SCENE|HỒI|TAP|TẬP)(\.|\s|\/)/i;
    const fixedBlocks = scriptBlocks.map(block => {
      // Strip HTML for regex detection
      const textOnly = block.content.replace(/<[^>]*>/g, '').trim();
      
      if (headingRegex.test(textOnly) && block.type !== 'scene') {
        return { ...block, type: 'scene' as BlockType };
      }
      if (textOnly.startsWith('(') && textOnly.endsWith(')') && block.type !== 'parenthetical') {
        return { ...block, type: 'parenthetical' as BlockType };
      }
      return block;
    });

    // Auto-update currentScript (Legacy support for RAW text users)
    const rawText = fixedBlocks.map(b => {
      let indent = 0;
      if (b.type === 'character') indent = 35;
      else if (b.type === 'parenthetical') indent = 28;
      else if (b.type === 'dialogue') indent = 15;
      else if (b.type === 'transition') indent = 45;
      return ' '.repeat(indent) + b.content;
    }).join('\n');

    setProject(prev => ({ ...prev, scriptBlocks: fixedBlocks, currentScript: rawText }));
  };

  const undo = useCallback(() => {
    if (historyTimer) {
      clearTimeout(historyTimer);
      setHistoryTimer(null);
    }

    if (activeTab === 'script') {
      if (scriptHistory.length === 0) return;
      const prev = scriptHistory[scriptHistory.length - 1];
      setScriptRedoStack(rs => [{ blocks: JSON.parse(JSON.stringify(project.scriptBlocks)), activeBlockIndex }, ...rs]);
      setScriptHistory(h => h.slice(0, -1));
      updateScriptBlocks(prev.blocks, { skipHistory: true });
      setActiveBlockIndex(prev.activeBlockIndex);
    } else {
      if (shotlistHistory.length === 0) return;
      const prev = shotlistHistory[shotlistHistory.length - 1];
      setShotlistRedoStack(rs => [{ shotlist: JSON.parse(JSON.stringify(project.shotlist)) }, ...rs]);
      setShotlistHistory(h => h.slice(0, -1));
      setProject(p => ({ ...p, shotlist: prev.shotlist }));
    }
  }, [activeTab, scriptHistory, shotlistHistory, project.scriptBlocks, project.shotlist, activeBlockIndex]);

  const redo = useCallback(() => {
    if (historyTimer) {
      clearTimeout(historyTimer);
      setHistoryTimer(null);
    }

    if (activeTab === 'script') {
      if (scriptRedoStack.length === 0) return;
      const next = scriptRedoStack[0];
      setScriptHistory(h => [...h, { blocks: JSON.parse(JSON.stringify(project.scriptBlocks)), activeBlockIndex }]);
      setScriptRedoStack(rs => rs.slice(1));
      updateScriptBlocks(next.blocks, { skipHistory: true });
      setActiveBlockIndex(next.activeBlockIndex);
    } else {
      if (shotlistRedoStack.length === 0) return;
      const next = shotlistRedoStack[0];
      setShotlistHistory(h => [...h, { shotlist: JSON.parse(JSON.stringify(project.shotlist)) }]);
      setShotlistRedoStack(rs => rs.slice(1));
      setProject(p => ({ ...p, shotlist: next.shotlist }));
    }
  }, [activeTab, scriptRedoStack, shotlistRedoStack, project.scriptBlocks, project.shotlist, activeBlockIndex]);

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
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    if (project.scriptBlocks.length <= 1) {
      updateBlock(0, '', 'action');
      return;
    }
    const newBlocks = project.scriptBlocks.filter((_, i) => i !== index);
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setActiveBlockIndex(Math.max(0, index - 1));
  };

  const removeScene = (index: number) => {
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    const blocks = project.scriptBlocks;
    if (index < 0 || index >= blocks.length) return;

    // Find the end of this scene
    let nextSceneIndex = index + 1;
    while (nextSceneIndex < blocks.length && blocks[nextSceneIndex].type !== 'scene') {
      nextSceneIndex++;
    }

    const newBlocks = blocks.filter((_, i) => i < index || i >= nextSceneIndex);

    if (newBlocks.length === 0) {
      const defaultBlocks: ScriptBlock[] = [{ id: Math.random().toString(36).substr(2, 9), type: 'scene', content: '' }];
      updateScriptBlocks(defaultBlocks, { skipHistory: true });
      setActiveBlockIndex(0);
    } else {
      updateScriptBlocks(newBlocks, { skipHistory: true });
      setActiveBlockIndex(Math.max(0, index - 1));
    }
  };

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isShift = e.shiftKey;
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && isZ) {
        e.preventDefault();
        if (isShift) redo();
        else undo();
      } else if (isCtrl && isY) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const updateBlock = (index: number, content: string, type?: BlockType) => {
    const newBlocks = [...project.scriptBlocks];
    if (newBlocks[index]) {
      const isTypeChange = type && type !== newBlocks[index].type;

      if (isTypeChange) {
        pushScriptHistory(project.scriptBlocks, activeBlockIndex);
      } else {
        // Every 500ms of active typing creates a new undo-able checkpoint
        if (!historyTimer) {
          pushScriptHistory(project.scriptBlocks, activeBlockIndex);
          const timer = setTimeout(() => {
            setHistoryTimer(null);
          }, 500); 
          setHistoryTimer(timer);
        }
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

  const addLens = (name: string) => {
    setProject(prev => ({ ...prev, lenses: [...(prev.lenses || []), name] }));
  };

  const removeLens = (name: string) => {
    setProject(prev => ({ ...prev, lenses: (prev.lenses || []).filter(l => l !== name) }));
  };

  const clearLenses = () => {
    setProject(prev => ({ ...prev, lenses: [] }));
  };

  const addShotlistLocation = (name: string) => {
    setProject(prev => ({ ...prev, shotlistLocations: [...(prev.shotlistLocations || []), name] }));
  };

  const removeShotlistLocation = (name: string) => {
    setProject(prev => ({ ...prev, shotlistLocations: (prev.shotlistLocations || []).filter(l => l !== name) }));
  };

  const clearShotlistLocations = () => {
    setProject(prev => ({ ...prev, shotlistLocations: [] }));
  };

  const addShotlistActor = (name: string) => {
    setProject(prev => ({ ...prev, shotlistActors: [...(prev.shotlistActors || []), name] }));
  };

  const removeShotlistActor = (name: string) => {
    setProject(prev => ({ ...prev, shotlistActors: (prev.shotlistActors || []).filter(a => a !== name) }));
  };

  const clearShotlistActors = () => {
    setProject(prev => ({ ...prev, shotlistActors: [] }));
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
      content = '()';
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
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    const newBlocks = [...project.scriptBlocks];
    const pasteItems = clipboard.map(b => ({ ...b, id: Math.random().toString(36).substr(2, 9) }));
    newBlocks.splice(atIndex + 1, 0, ...pasteItems);
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setSelectedIndices(Array.from({ length: pasteItems.length }, (_, i) => atIndex + 1 + i));
  }, [clipboard, project.scriptBlocks, activeBlockIndex]);

  const deleteSelectedBlocks = useCallback(() => {
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
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

  const moveBlockUp = (index: number) => {
    if (index <= 0) return;
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    const newBlocks = [...project.scriptBlocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index - 1];
    newBlocks[index - 1] = temp;
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setActiveBlockIndex(index - 1);
  };

  const moveBlockDown = (index: number) => {
    if (index >= project.scriptBlocks.length - 1) return;
    pushScriptHistory(project.scriptBlocks, activeBlockIndex);
    const newBlocks = [...project.scriptBlocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + 1];
    newBlocks[index + 1] = temp;
    updateScriptBlocks(newBlocks, { skipHistory: true });
    setActiveBlockIndex(index + 1);
  };

  const clearSelection = () => setSelectedIndices([]);

  const setShotlist = (shotlist: Shot[]) => {
    setProject(prev => ({ ...prev, shotlist }));
  };

  const renumberShotlist = (list: Shot[]): Shot[] => {
    let currentSceneNum = 0;
    let lastOriginalScene = "";
    let currentShotNum = 0;

    return list.map((item) => {
      // Create a fresh copy to avoid mutation
      const newItem = { ...item };

      if (newItem.scene !== lastOriginalScene) {
        currentSceneNum++;
        currentShotNum = 1;
        lastOriginalScene = newItem.scene;
      } else {
        currentShotNum++;
      }

      newItem.scene = currentSceneNum.toString();
      newItem.shot = currentShotNum.toString();
      return newItem;
    });
  };

  const updateShot = (rowIndex: number, colKey: keyof Shot, value: string) => {
    const list = [...project.shotlist];
    if (list[rowIndex]) {
      // Immediate push for structural/select changes? 
      // size, movement, angle, dayNight, fov, framerate are selects
      const isSelectField = ['size', 'movement', 'angle', 'dayNight', 'fov', 'framerate'].includes(colKey);

      if (isSelectField) {
        pushShotlistHistory(project.shotlist);
      } else {
        // Debounce for granular undo: Capture clean state, then pause for 500ms
        if (!historyTimer) {
          pushShotlistHistory(project.shotlist);
          const timer = setTimeout(() => {
            setHistoryTimer(null);
          }, 500);
          setHistoryTimer(timer);
        }
      }

      list[rowIndex] = { ...list[rowIndex], [colKey]: value };
      setShotlist(list);
    }
  };

  const addShot = useCallback(() => {
    pushShotlistHistory(project.shotlist);
    const list = project.shotlist;
    const lastShot = list[list.length - 1];

    const newShot: Shot = {
      id: crypto.randomUUID(),
      scene: lastShot?.scene || '1',
      shot: lastShot ? (parseInt(lastShot.shot) + 1).toString() : '1',
      memoryCard: lastShot?.memoryCard || '',
      size: '',
      movement: '',
      lens: '',
      angle: '',
      location: lastShot?.location || '',
      content: '',
      actorAction: '',
      dayNight: '',
      techNotes: '',
      scriptNotes: '',
      fov: '',
      duration: '',
      actors: '',
      framerate: ''
    };

    setShotlist(renumberShotlist([...list, newShot]));
  }, [project.shotlist]);

  const addScene = useCallback(() => {
    pushShotlistHistory(project.shotlist);
    const list = project.shotlist;
    const lastShot = list[list.length - 1];
    const nextSceneNum = lastShot ? (parseInt(lastShot.scene) + 1).toString() : '1';

    const newShot: Shot = {
      id: crypto.randomUUID(),
      scene: nextSceneNum,
      shot: '1',
      memoryCard: '',
      size: '',
      movement: '',
      lens: '',
      angle: '',
      location: '',
      content: '',
      actorAction: '',
      dayNight: '',
      techNotes: '',
      scriptNotes: '',
      fov: '',
      duration: '',
      actors: '',
      framerate: ''
    };

    setShotlist(renumberShotlist([...list, newShot]));
  }, [project.shotlist]);

  const removeShot = useCallback((index: number) => {
    pushShotlistHistory(project.shotlist);
    const list = [...project.shotlist];
    if (list.length === 0 || index < 0 || index >= list.length) return;

    list.splice(index, 1);
    setShotlist(renumberShotlist(list));
  }, [project.shotlist]);

  const insertShot = useCallback((index: number, isNewScene: boolean) => {
    pushShotlistHistory(project.shotlist);
    const list = [...project.shotlist];
    const prevShot = list[index];

    const newShot: Shot = {
      id: crypto.randomUUID(),
      scene: isNewScene ? `NEW_SCENE_${crypto.randomUUID()}` : (prevShot?.scene || '1'),
      shot: '0', // Will be renumbered
      memoryCard: prevShot?.memoryCard || '',
      size: '',
      movement: '',
      lens: '',
      angle: '',
      location: isNewScene ? '' : (prevShot?.location || ''),
      content: '',
      actorAction: '',
      dayNight: '',
      techNotes: '',
      scriptNotes: '',
      fov: '',
      duration: '',
      actors: '',
      framerate: ''
    };

    list.splice(index + 1, 0, newShot);
    setShotlist(renumberShotlist(list));
  }, [project.shotlist]);

  const clearShotRow = useCallback((index: number) => {
    pushShotlistHistory(project.shotlist);
    const list = [...project.shotlist];
    if (!list[index]) return;

    const originalId = list[index].id;
    const originalScene = list[index].scene;
    const originalShot = list[index].shot;

    list[index] = {
      id: originalId,
      scene: originalScene,
      shot: originalShot,
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
      scriptNotes: '',
      fov: '',
      duration: '',
      actors: '',
      framerate: '24'
    };

    setShotlist(list);
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
      projectName: '',
      title: '',
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
          location: '',
          actors: '',
          fov: '',
          duration: '',
          content: '',
          actorAction: '',
          dayNight: 'INT',
          scriptNotes: ''
        };
      } else {
        return {
          ...shot,
          lens: '',
          framerate: '24',
          roll: 'A',
          size: '',
          movement: '',
          angle: '',
          memoryCard: '',
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
          actors: '',
          fov: '',
          duration: '',
          content: '',
          actorAction: '',
          dayNight: 'INT',
          scriptNotes: ''
        };
      } else {
        return {
          ...shot,
          lens: '',
          framerate: '24',
          roll: 'A',
          size: '',
          movement: '',
          angle: '',
          memoryCard: '',
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
      removeScene,
      updateBlock,
      addCharacter,
      removeCharacter,
      addLocation,
      removeLocation,
      insertElement,
      shotlist: project.shotlist,
      setShotlist,
      updateShot,
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
      moveBlockUp,
      moveBlockDown,
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
      removeShot,
      insertShot,
      clearShotRow,
      addLens,
      removeLens,
      clearLenses,
      addShotlistLocation,
      removeShotlistLocation,
      clearShotlistLocations,
      addShotlistActor,
      removeShotlistActor,
      clearShotlistActors,
      importFullProject: (data: Partial<ProjectData>) => {
        setProject(prev => ({
          ...prev,
          id: data.id || Math.random().toString(36).substr(2, 9),
          projectName: data.projectName ?? data.title ?? '',
          title: data.title ?? data.projectName ?? '',
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
        setScriptHistory([]); // Clear history for new project
        setScriptRedoStack([]);
        setShotlistHistory([]);
        setShotlistRedoStack([]);
      },
      importShotlist: (shotlist: Shot[]) => {
        setProject(prev => ({
          ...prev,
          shotlist
        }));
      },
      scanCharacters: () => {
        const scriptCharacters = new Set<string>();
        project.scriptBlocks.forEach(block => {
          if (block.type === 'character' && block.content) {
            scriptCharacters.add(block.content.trim().toUpperCase());
          }
        });

        setProject(prev => {
          const newChars = [...prev.characters];
          scriptCharacters.forEach(name => {
            if (!newChars.find(c => c.name === name)) {
              newChars.push({
                id: Math.random().toString(36).substr(2, 9),
                name,
                age: '',
                frequency: 0
              });
            }
          });
          return { ...prev, characters: newChars };
        });
      },
      scanLocations: () => {
        const scriptLocations = new Set<string>();
        project.scriptBlocks.forEach(block => {
          if (block.type === 'scene' && block.content) {
            // Regex to extract text STRICTLY after INT. or EXT.
            // Handles cases like "INT. ROOM - DAY" or "1. INT. ROOM"
            const match = block.content.match(/(?:INT|EXT|I\/E)\.?\s*([^-\n\r]+)/i);
            if (match && match[1]) {
              let loc = match[1].trim();
              // Remove time part if it exists (split by -)
              if (loc.includes(' - ')) {
                loc = loc.split(' - ')[0].trim();
              }
              if (loc && !['INT', 'EXT', 'I/E'].includes(loc.toUpperCase())) {
                scriptLocations.add(loc.toUpperCase());
              }
            }
          }
        });

        setProject(prev => {
          const newLocs = [...prev.locations];
          scriptLocations.forEach(name => {
            if (!newLocs.includes(name)) {
              newLocs.push(name);
            }
          });
          return { ...prev, locations: newLocs };
        });
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
