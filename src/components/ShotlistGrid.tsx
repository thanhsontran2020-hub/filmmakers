import React, { useEffect, useRef } from 'react';
import { useEditor } from './EditorContext';
import type { Shot } from './EditorContext';
import './ShotlistGrid.css';

export const ShotlistGrid: React.FC = () => {
  const { 
    shotlist,
    setShotlist,
    shotlistView,
    project, 
    updateShotlistProjectName, 
    updateShotlistDirector,
    updateShotlistDate
  } = useEditor();
  const tableRef = useRef<HTMLTableElement>(null);

  const handleCellChange = (rowIndex: number, colKey: keyof Shot, value: string) => {
    const newData = [...shotlist];
    newData[rowIndex] = { ...newData[rowIndex], [colKey]: value };
    setShotlist(newData);
  };

  // Robust Auto-resize logic for all textareas in the grid
  useEffect(() => {
    const resizeAll = () => {
      if (tableRef.current) {
        const textareas = tableRef.current.querySelectorAll('textarea');
        textareas.forEach(ta => {
          ta.style.height = 'auto'; 
          ta.style.height = (ta.scrollHeight) + 'px';
        });
      }
    };
    
    resizeAll();
    const timer = setTimeout(resizeAll, 10);
    return () => clearTimeout(timer);
  }, [shotlist, shotlistView]);

  // Director: scene, shot, dayNight, location, content, actorAction, notes
  const directorColumns: (keyof Shot)[] = ['scene', 'shot', 'dayNight', 'location', 'content', 'actorAction', 'sceneNotes', 'scriptNotes'];
  // DP: scene, shot, dayNight, memoryCard, size, movement, lens, angle, techNotes
  const dpColumns: (keyof Shot)[] = ['scene', 'shot', 'dayNight', 'memoryCard', 'size', 'movement', 'lens', 'angle', 'techNotes'];

  const columns = shotlistView === 'director' ? directorColumns : dpColumns;

  const labels: Record<string, string> = {
    scene: 'Scene',
    shot: 'Shot',
    roll: 'Roll',
    memoryCard: 'Card',
    size: 'Shot Size',
    movement: 'Move',
    lens: 'Lens',
    angle: 'Angle',
    location: 'Địa điểm',
    content: 'Nội dung',
    actorAction: 'Diễn xuất',
    dayNight: 'I/E',
    techNotes: 'Tech Note',
    sceneNotes: 'Ghi chú ĐD',
    scriptNotes: 'Thư ký'
  };

  const options: Record<string, string[]> = {
    size: [
      'Extreme Long Shot', 
      'Long Shot', 
      'Medium Long Shot', 
      'Medium Shot', 
      'Medium Close Up', 
      'Close Up', 
      'Extreme Close Up'
    ],
    movement: ['Static', 'Pan', 'Tilt', 'Zoom', 'Push', 'Pull', 'Dolly', 'Handheld', 'Gimbal'],
    angle: [
      'Eye Level', 
      'Low Angle', 
      'High Angle', 
      'Birds Eye (Top)', 
      'Dutch Angle', 
      'Over The Shoulder'
    ],
    dayNight: ['INT', 'EXT', 'INT/DAY', 'INT/NIGHT', 'EXT/DAY', 'EXT/NIGHT']
  };

  return (
    <div className="shotlist-grid-wrapper">
      <div className="shotlist-scroll-area">
        <div className="shotlist-document-header">
          <div className="doc-title">DANH SÁCH QUAY</div>
          <div className="doc-meta">
            <div className="meta-field">
              <strong>DỰ ÁN:</strong> 
              <textarea 
                rows={1}
                value={project.shotlistProjectName} 
                onChange={(e) => updateShotlistProjectName(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                placeholder="Tên dự án..."
              />
            </div>
            <div className="meta-field">
              <strong>ĐẠO DIỄN:</strong> 
              <textarea 
                rows={1}
                value={project.shotlistDirector} 
                onChange={(e) => updateShotlistDirector(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                placeholder="Tên đạo diễn..."
              />
            </div>
            <div className="meta-field">
              <strong>NGÀY:</strong> 
              <textarea 
                rows={1}
                value={project.shotlistDate}
                onChange={(e) => updateShotlistDate(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                placeholder="Ngày tháng..."
              />
            </div>
          </div>
        </div>

        <table className={`shotlist-table ${shotlistView}-view`} ref={tableRef}>
          <thead>
            <tr>
              {columns.map(col => <th key={col}>{labels[col]}</th>)}
            </tr>
          </thead>
          <tbody>
            {shotlist.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-cell" style={{ padding: '40px', textAlign: 'center' }}>
                  Click + THÊM SHOT để bắt đầu lập danh sách quay.
                </td>
              </tr>
            ) : (
              shotlist.map((row, idx) => (
                <tr key={row.id}>
                  {columns.map(col => (
                    <td 
                      key={col} 
                      onClick={(e) => {
                        const target = e.currentTarget.querySelector('textarea, select') as HTMLElement;
                        target?.focus();
                      }}
                    >
                      {options[col] ? (
                        <select 
                          value={row[col]} 
                          onChange={(e) => handleCellChange(idx, col, e.target.value)}
                        >
                          <option value="">-</option>
                          {options[col].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <textarea 
                          rows={1}
                          value={row[col]} 
                          onChange={(e) => handleCellChange(idx, col, e.target.value)}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }}
                          placeholder="..."
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
