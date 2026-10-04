import React from 'react';

interface RenderBadgeProps {
  count: number;
  isFlashing: boolean;
}

export const RenderBadge: React.FC<RenderBadgeProps> = React.memo(({ count, isFlashing }) => {
  return (
    <div
      className={`render-badge ${isFlashing ? 'flashing' : ''}`}
      title="Количество вызовов render этого компонента"
    >
      <span className="render-badge-dot" />
      <span className="render-badge-text">renders: {count}</span>
    </div>
  );
});

RenderBadge.displayName = 'RenderBadge';
