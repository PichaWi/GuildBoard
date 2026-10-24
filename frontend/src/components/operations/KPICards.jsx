import React from 'react';

export default function KPICards({ cards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
      {cards.map((card) => (
        <div
          key={card.id}
          className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-label-md font-label-md uppercase tracking-wider text-on-surface-variant">
              {card.label}
            </span>
            <div className={card.iconBgClass}>{card.icon}</div>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className={card.valueClass}>{card.value}</span>
            <span className={card.subtitleClass}>{card.subtitle}</span>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full mt-space-sm overflow-hidden">
            <div className={card.progressBarClass} style={{ width: card.progressWidth }} />
          </div>
        </div>
      ))}
    </div>
  );
}
