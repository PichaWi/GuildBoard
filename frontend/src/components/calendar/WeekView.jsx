import React from 'react';
import { getWeekStart, formatDateKey, DAY_SHORT, HOURS } from './calendarUtils';

export default function WeekView({ selectedDate, todayDate, calendarEvents, activeCourses }) {
  const weekStart = getWeekStart(selectedDate);
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDays.push(d);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Week header */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-surface-container-low/60 text-center border-b border-outline-variant/10">
        <div className="py-space-xs font-label-md text-label-md text-on-surface-variant font-semibold border-r border-outline-variant/10">Time</div>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === todayDate.toDateString();
          return (
            <div key={i} className={`py-space-xs font-label-md text-label-md font-semibold border-r border-outline-variant/10 last:border-r-0 ${isToday ? 'text-primary bg-primary/5' : 'text-on-surface-variant'}`}>
              <div>{DAY_SHORT[d.getDay()]}</div>
              <div className={`text-[18px] font-bold ${isToday ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white' : ''}`}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] bg-surface-container-lowest">
          {/* Time labels */}
          <div className="border-r border-outline-variant/10">
            {HOURS.map((h) => (
              <div key={h} className="h-[50px] text-center text-on-surface-variant font-label-md text-[12px] border-b border-outline-variant/20 flex items-start justify-center pt-1.5">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {/* Day columns */}
          {weekDays.map((d, colIdx) => {
            const dateKey = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEvts = calendarEvents.filter((e) => e.date === dateKey && activeCourses.has(e.course));
            const isToday = d.toDateString() === todayDate.toDateString();
            return (
              <div key={colIdx} className={`relative border-r border-outline-variant/20 last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                {HOURS.map((h) => (
                  <div key={h} className="h-[50px] border-b border-outline-variant/20"></div>
                ))}
                {/* Render events */}
                {dayEvts.map((evt) => {
                  const timeMatch = evt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                  let startHour = 9;
                  if (timeMatch) {
                    startHour = parseInt(timeMatch[1]);
                    const ampm = timeMatch[3].toUpperCase();
                    if (ampm === 'PM' && startHour !== 12) startHour += 12;
                    if (ampm === 'AM' && startHour === 12) startHour = 0;
                  }
                  const topPx = (startHour - 8) * 50;
                  const heightPx = evt.time.includes('-') ? 100 : 50;

                  return (
                    <div
                      key={evt.id}
                      className={`absolute left-1 right-1 bg-surface-container-lowest rounded-md p-1.5 shadow-sm border border-outline-variant/20 overflow-hidden cursor-pointer hover:shadow-md transition-all z-10 border-l-[3px] ${evt.colorClass.replace('bg-', 'border-')}`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                    >
                      <div className="font-semibold text-on-surface text-[11px] leading-tight truncate mb-0.5">{evt.title}</div>
                      <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-[10px] truncate">
                        <span className="material-symbols-outlined text-[11px]">schedule</span>
                        {evt.time}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
