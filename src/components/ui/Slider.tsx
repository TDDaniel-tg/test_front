import React, { useCallback } from 'react';

interface SliderProps {
  id: string;
  value: number; // 0.0 to 1.0
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export const Slider: React.FC<SliderProps> = React.memo(
  ({ id, value, onChange, disabled = false, label = 'Прозрачность' }) => {
    const percentage = Math.round(value * 100);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value) / 100;
        onChange(val);
      },
      [onChange]
    );

    return (
      <div className={`slider-container ${disabled ? 'disabled' : ''}`}>
        <div className="slider-header">
          <label htmlFor={id} className="slider-label">
            {label}
          </label>
          <span className="slider-value">{percentage}%</span>
        </div>
        <div className="slider-track-wrap">
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            step={1}
            value={percentage}
            disabled={disabled}
            onChange={handleInputChange}
            className="slider-input"
            style={{
              background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${percentage}%, var(--bg-surface-elevated) ${percentage}%, var(--bg-surface-elevated) 100%)`,
            }}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
