import { useState, useRef, useEffect } from 'react';
import '../styles/select.css';

interface ModernSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

export function ModernSelect({
  value,
  onChange,
  options,
  placeholder = 'Scegli...',
  disabled = false,
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = Math.min(300, options.length * 45 + 16) + 16;
      setOpenUp(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`modern-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <button
        className="select-trigger"
        onClick={toggleOpen}
        disabled={disabled}
        type="button"
      >
        <span className={`select-value ${!value ? 'placeholder' : ''}`}>
          {selectedLabel}
        </span>
        <svg className="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className={`select-dropdown ${openUp ? 'drop-up' : ''}`}>
          <div className="select-options">
            {options.map((option) => (
              <button
                key={option.value}
                className={`select-option ${option.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <svg className="select-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
