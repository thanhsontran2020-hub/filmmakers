import React, { useEffect, useState } from 'react';
import { useEditor } from './EditorContext';
import { X, Plus, Info } from 'lucide-react';
import './ResetModal.css';

interface QuickAddModalProps {
  type: 'character' | 'location' | null;
  onClose: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ type, onClose }) => {
  const { addCharacter, addLocation } = useEditor();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (type) {
      setInputValue(''); // Reset input value when type changes or modal opens
    }
  }, [type]);

  if (!type) return null;

  const handleAdd = () => {
    const val = inputValue.trim();
    if (!val) return;

    if (type === 'character') {
      addCharacter({ name: val.toUpperCase(), age: '' });
    } else {
      addLocation(val.toUpperCase());
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-header-title">
            <Plus size={20} className="secondary-icon" />
            <h2>Đăng ký {type === 'character' ? 'nhân vật' : 'địa điểm'} mới</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="modal-body">
          <section className="modal-section" style={{ gridTemplateColumns: '1fr' }}>
            <div className="section-content">
              <div className="input-group">
                <input 
                  autoFocus
                  className="tech-input"
                  placeholder={type === 'character' ? "VD: NAM, LINH.." : "VD: PHÒNG KHÁCH, NHÀ KHO.."}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <button 
                className="modal-btn minimal" 
                onClick={handleAdd} 
                style={{ 
                  marginTop: '16px', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  minHeight: '64px'
                }}
              >
                <span className="modal-btn-label" style={{ fontSize: '1.2rem' }}>Lưu</span>
              </button>
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <div className="footer-tip">
            <Info size={16} />
            <span>
              {type === 'character' 
                ? 'Kinh nghiệm: Nên viết rõ ràng tên nhân vật, hạn chế viết tắt để tránh nhầm lẫn giữa các vai trong kịch bản.' 
                : 'Kinh nghiệm: Viết rõ tên địa điểm, không nên viết tắt. Nếu có nhiều địa điểm trùng tên, hãy đánh số (VD: PHÒNG KHÁCH 1, 2).'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default QuickAddModal;
