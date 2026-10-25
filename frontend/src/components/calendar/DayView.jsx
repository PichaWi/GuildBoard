import React from 'react';
import { formatDateKey, DAY_LONG, HOURS } from './calendarUtils';

export default function DayView({ selectedDate, todayDate, calendarEvents, activeCourses, monthNames }) {
  const dateKey = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const dayEvents = calendarEvents.filter((e) => e.date === dateKey && activeCourses.has(e.course));
  const isToday = selectedDate.toDateString() === todayDate.toDateString();
  const dayLabel = `${DAY_LONG[selectedDate.getDay()]}, ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div className={`text-center py-space-sm font-title-md text-title-md font-semibold border-b border-outline-variant/10 ${isToday ? 'text-primary bg-primary/5' : 'text-on-surface bg-surface-container-low/60'}`}>
        {dayLabel} {isToday && <span className="ml-2 text-[12px] bg-primary text-white px-2 py-0.5 rounded-full font-label-sm">Today</span>}
      </div>
      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[80px_1fr] bg-surface-container-lowest">
          {/* Time labels */}
          <div className="border-r border-outline-variant/10">
            {HOURS.map((h) => (
              <div key={h} className="h-[60px] text-center text-on-surface-variant font-label-md text-[13px] border-b border-outline-variant/20 flex items-start justify-center pt-2">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {/* Event column */}
          <div className="relative">
            {HOURS.map((h) => (
              <div key={h} className="h-[60px] border-b border-outline-variant/20"></div>
            ))}
            {/* Render events */}
            {dayEvents.map((evt) => {
              const timeMatch = evt.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
              let startHour = 9;
              if (timeMatch) {
                startHour = parseInt(timeMatch[1]);
                const ampm = timeMatch[3].toUpperCase();
                if (ampm === 'PM' && startHour !== 12) startHour += 12;
                if (ampm === 'AM' && startHour === 12) startHour = 0;
              }
              const topPx = (startHour - 8) * 60;
              const heightPx = evt.time.includes('-') ? 120 : 60;

              return (
                <div
                  key={evt.id}
                  className={`absolute left-2 right-2 bg-surface-container-lowest rounded-xl p-space-sm sm:p-space-md shadow-sm border border-outline-variant/20 overflow-hidden cursor-pointer hover:shadow-md transition-all z-10 border-l-[4px] ${evt.colorClass.replace('bg-', 'border-')}`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-title-md text-on-surface font-semibold mb-0.5">{evt.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-1.5 py-0.5 bg-surface-container/60 text-on-surface-variant font-label-sm text-[11px] rounded">{evt.course} • {evt.type}</span>
                      </div>
                    </div>
                    <span className="font-title-sm font-bold text-primary shrink-0 hidden sm:block">{evt.time}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-space-lg gap-y-1 text-on-surface-variant font-body-sm text-[12px]">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> <span className="sm:hidden">{evt.time}</span></span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {evt.instructor}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {evt.location}</span>
                  </div>
                </div>
              );
            })}
            {dayEvents.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant text-center">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">event_busy</span>
                <p className="font-body-md opacity-60">No events scheduled for this day.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
