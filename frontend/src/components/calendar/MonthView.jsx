import React from 'react';

export default function MonthView({ calendarCells }) {
  return (
    <>
      {/* Day-of-week Headers */}
      <div className="grid grid-cols-7 bg-surface-container-low/60 text-center py-space-xs font-label-md text-label-md text-on-surface-variant font-semibold border-b border-outline-variant/10">
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div className="text-on-surface-variant/70">Sat</div>
        <div className="text-on-surface-variant/70">Sun</div>
      </div>

      {/* Month Grid View */}
      <div className="grid grid-cols-7 gap-px bg-surface-variant/40 bg-outline-variant/20 border-t border-outline-variant/20">
        {calendarCells.map((cell, idx) => {
          if (cell.type !== 'current') {
            return (
              <div key={idx} className="min-h-calendar-cell-min-height bg-surface-container-lowest/50 p-space-xs flex flex-col justify-between opacity-40 select-none">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">{cell.day}</span>
              </div>
            );
          }

          return (
            <div key={idx} className={`min-h-calendar-cell-min-height ${cell.isToday ? 'bg-surface-container-low/60 ring-1 ring-primary/20 transition-all duration-150' : cell.isWeekend ? 'bg-surface-container-lowest/80' : 'bg-surface-container-lowest hover:bg-surface-container-lowest transition-all'} p-space-2xs flex flex-col justify-between group relative`}>
              <div className="flex items-center justify-between p-1">
                {cell.isToday ? (
                  <>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-sm">{cell.day}</span>
                    <span className="font-label-sm text-[10px] uppercase font-bold text-primary tracking-wider">Today</span>
                  </>
                ) : (
                  <>
                    <span className={`font-label-md text-label-md ${cell.isWeekend ? 'text-on-surface-variant' : 'text-on-surface'} font-semibold`}>{cell.day}</span>
                    {cell.events.length > 0 && <span className={`w-1.5 h-1.5 rounded-full ${cell.events[0].colorClass}`}></span>}
                  </>
                )}
              </div>
              
              <div className="space-y-1 mt-1 flex-1 flex flex-col">
                {cell.events.map((evt) => {
                  if (evt.isRich) {
                    return (
                      <div key={evt.id} className="mt-1 bg-surface-container-lowest rounded-lg p-space-xs shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer border border-outline-variant/20 hover:border-primary/40">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="bg-surface-container text-on-surface-variant font-label-sm text-[10px] px-1.5 py-0.5 rounded font-medium">{evt.type}</span>
                            <span className="inline-flex items-center gap-1 bg-secondary-container/40 text-primary-container px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Published
                            </span>
                          </div>
                          <h4 className="font-title-sm text-[12px] leading-tight text-on-surface font-semibold line-clamp-2">{evt.title}</h4>
                        </div>
                        <div className="pt-2 mt-1 space-y-0.5">
                          <div className="flex items-center gap-1 text-on-surface-variant font-label-md text-[11px]">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            <span>{evt.time}</span>
                          </div>
                          <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-[11px] truncate">
                            <span className="material-symbols-outlined text-[13px]">person</span>
                            <span className="truncate">{evt.instructor}</span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={evt.id} className="px-1.5 py-1 bg-surface-container-low hover:bg-surface-container rounded text-on-surface text-[10px] font-medium truncate flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${evt.colorClass} flex-shrink-0`}></span>
                        <span className="truncate">{evt.title}</span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
