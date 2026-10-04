import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = React.memo(
  ({ id, checked, disabled = false, onChange, ariaLabel }) => {
    return (
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange();
        }}
        className={`toggle-switch ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      >
        <span className="toggle-switch-thumb" />
      </button>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';
