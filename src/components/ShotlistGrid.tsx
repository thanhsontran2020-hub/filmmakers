import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, TableProperties, Eraser, ListPlus } from 'lucide-react';
import { useEditor } from './EditorContext';
import type { Shot } from './EditorContext';
import './ShotlistGrid.css';

export const ShotlistGrid: React.FC = () => {
  const {
    shotlist,
    shotlistView,
    project,
    updateShotlistProjectName,
    updateShotlistDirector,
    updateShotlistDate,
    removeShot,
    insertShot,
    clearShotRow,
    updateShot
  } = useEditor();
  const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);


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

  // Director: scene, shot, location, dayNight, actors, fov, duration, content, actorAction, scriptNotes
  const directorColumns: (keyof Shot)[] = ['scene', 'shot', 'location', 'dayNight', 'actors', 'fov', 'duration', 'content', 'actorAction', 'scriptNotes'];
  // DP: scene, shot, lens, framerate, size, movement, angle, memoryCard, techNotes
  const dpColumns: (keyof Shot)[] = ['scene', 'shot', 'lens', 'framerate', 'size', 'movement', 'angle', 'memoryCard', 'techNotes'];

  const columns = shotlistView === 'director' ? directorColumns : dpColumns;

  const labels: Record<string, string> = {
    scene: 'Scene',
    shot: 'Shot',
    memoryCard: 'Card',
    size: 'Size',
    movement: 'Move',
    lens: 'Lens (mm)',
    angle: 'Angle',
    location: 'Địa điểm',
    content: 'Nội dung',
    actorAction: 'Diễn xuất',
    dayNight: 'I/E',
    techNotes: 'Tech Note',
    scriptNotes: 'Thư ký',
    fov: 'FOV',
    duration: 'Thời lượng',
    actors: 'Diễn viên',
    framerate: 'FPS'
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
    dayNight: ['INT/DAY', 'INT/NIGHT', 'EXT/DAY', 'EXT/NIGHT'],
    fov: ['Góc rộng', 'Tiêu chuẩn', 'Góc hẹp', 'Góc macro'],
    framerate: ['24', '25', '30', '48', '50', '60', '96', '100', '120']
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
              shotlist.map((row: Shot, idx: number) => {
                const isFirstShotOfScene = row.shot === '1';

                return (
                  <tr key={row.id} className="shotlist-row-wrapper">
                    {columns.map((col, colIdx) => (
                      <td
                        key={col}
                        className={colIdx === 0 ? 'first-col' : ''}
                        onClick={(e) => {
                          const target = e.currentTarget.querySelector('textarea, select') as HTMLElement;
                          target?.focus();
                        }}
                      >
                        {colIdx === 0 && (
                          <div className="shotlist-row-controls">
                            <div className="row-type-indicator">
                              S{row.scene}
                            </div>

                            <div className="row-actions-floating">
                              <div className="insert-menu-anchor">
                                <button
                                  className="control-btn"
                                  onClick={(e) => { e.stopPropagation(); setActiveRowMenu(activeRowMenu === idx ? null : idx); }}
                                  title="Thêm hàng..."
                                >
                                  <Plus size={14} />
                                </button>

                                {activeRowMenu === idx && (
                                  <div className="insert-popup-menu">
                                    <button onClick={() => { insertShot(idx, false); setActiveRowMenu(null); }}>
                                      <ListPlus size={14} /> <span>Shot mới</span>
                                    </button>
                                    <button onClick={() => { insertShot(idx, true); setActiveRowMenu(null); }}>
                                      <TableProperties size={14} /> <span>Scene mới</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <button
                                className="control-btn"
                                onClick={(e) => { e.stopPropagation(); clearShotRow(idx); }}
                                title="Tẩy nội dung"
                              >
                                <Eraser size={14} />
                              </button>

                              <button
                                className="control-btn delete-action"
                                onClick={(e) => { e.stopPropagation(); removeShot(idx); }}
                                title="Xóa hàng"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {(col === 'location' || col === 'actors') && !isFirstShotOfScene ? (
                          <div className="inherited-cell"></div>
                        ) : (() => {
                          // Scene and Shot columns are read-only and derived from position
                          if (col === 'scene' || col === 'shot') {
                            return (
                              <div className="select-display-value" style={{ cursor: 'default', position: 'relative' }}>
                                {row[col]}
                              </div>
                            );
                          }

                          const isSidebarCol = ['location', 'actors', 'lens'].includes(col);
                          const colOptions = isSidebarCol
                            ? (col === 'location' ? (project.shotlistLocations || []) :
                              col === 'actors' ? (project.shotlistActors || []) :
                                (project.lenses || []))
                            : (options[col] || []);

                          const hasDataOptions = colOptions.length > 0;

                          // If it's a metadata column BUT no options exist in sidebar yet, 
                          // just show the value (or dash) without a clickable dropdown trigger
                          if (isSidebarCol && !hasDataOptions) {
                            return (
                              <div className="select-wrapper" style={{ cursor: 'default' }}>
                                <div className="select-display-value">
                                  {row[col] || '-'}
                                </div>
                              </div>
                            );
                          }

                          // If it's a curated column (Move, Angle, or a Sidebar col with data)
                          if (options[col] || isSidebarCol) {
                            return (
                              <div className="select-wrapper" style={{ height: '100%', minHeight: '44px' }}>
                                <div className="select-display-value">
                                  {row[col] || '-'}
                                </div>

                                <select
                                  className="select-trigger"
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    if (col === 'actors') {
                                      const current = row[col] || '';
                                      if (!current.includes(val)) {
                                        const newValue = current ? `${current}, ${val}` : val;
                                        updateShot(idx, col, newValue);
                                      }
                                    } else {
                                      updateShot(idx, col, val);
                                    }
                                  }}
                                >
                                  <option value="" disabled hidden></option>
                                  {options[col] && options[col].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  {col === 'location' && (project.shotlistLocations || []).map(l => <option key={l} value={l}>{l}</option>)}
                                  {col === 'actors' && (project.shotlistActors || []).map(a => <option key={a} value={a}>{a}</option>)}
                                  {col === 'lens' && (project.lenses || []).map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                            );
                          }

                          // Default for textareas (Content, Tech Notes, etc.)
                          return (
                            <div className="textarea-wrapper">
                              <textarea
                                rows={1}
                                value={row[col]}
                                onChange={(e) => updateShot(idx, col, e.target.value)}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  target.style.height = 'auto';
                                  target.style.height = target.scrollHeight + 'px';
                                }}
                                placeholder="..."
                              />
                            </div>
                          );
                        })()}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
