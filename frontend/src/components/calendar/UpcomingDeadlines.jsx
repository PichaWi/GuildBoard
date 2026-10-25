import React from 'react';

export default function UpcomingDeadlines({ filteredDeadlines }) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md border border-outline-variant/20">
      <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
        <div className="flex items-center gap-space-2xs">
          <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">Upcoming Deadlines</h3>
        </div>
        <span className="bg-secondary-container/40 text-primary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold">
          {filteredDeadlines.length} Pending
        </span>
      </div>

      <div className="space-y-space-sm" id="upcoming-deadlines-container">
        {filteredDeadlines.length > 0 ? (
          filteredDeadlines.map((d, i) => (
            <div
              key={i}
              className="p-space-sm rounded-lg bg-surface-container-low/50 hover:bg-surface-container-low transition-colors flex flex-col gap-space-2xs relative overflow-hidden cursor-pointer"
            >
              <div className={`w-1 h-full absolute left-0 top-0 ${d.colorClass}`}></div>
              <div className="flex items-center justify-between text-[11px] font-label-md">
                <span className="text-primary font-semibold">{d.due}</span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
                  {d.course}
                </span>
              </div>
              <h4 className="font-title-sm text-title-sm text-on-surface leading-snug font-semibold">{d.title}</h4>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm pt-1">
                <span className="truncate">{d.instructor}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-primary text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Published
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-space-sm text-center text-on-surface-variant font-body-sm">
            No pending deadlines for selected courses.
          </div>
        )}
      </div>

      {/* Academic Workload Sparkline Visualization */}
      <div className="pt-space-xs">
        <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant mb-1">
          <span>Weekly Milestone Density</span>
          <span className="text-primary font-semibold">High Load</span>
        </div>
        <div className="bg-surface-container-low p-space-xs rounded-lg flex items-center justify-center">
          <svg className="w-full h-12 text-primary" fill="none" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 32 Q 25 35, 45 22 T 90 28 T 130 8 T 160 20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
            <circle className="fill-primary-container" cx="130" cy="8" r="4"></circle>
            <circle className="fill-secondary" cx="90" cy="28" r="3"></circle>
            <circle className="fill-secondary-container" cx="45" cy="22" r="3"></circle>
          </svg>
        </div>
      </div>
    </div>
  );
}
