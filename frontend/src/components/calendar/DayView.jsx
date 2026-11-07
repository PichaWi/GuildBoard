import React from 'react';
import { formatDateKey, DAY_LONG, HOURS } from './calendarUtils';

// Parse time string like "9:00 AM - 12:00 PM" or "11:59 PM" to get start hour (0-23) and duration in minutes
const parseEventTime = (timeStr) => {
  if (!timeStr) return { startHour: 9, durationMin: 60 };

  // Try to match "HH:MM AM/PM - HH:MM AM/PM" or "H:MM AM/PM - H:MM AM/PM"
  const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (rangeMatch) {
    let startHour = parseInt(rangeMatch[1]);
    const startAmPm = rangeMatch[3].toUpperCase();
    if (startAmPm === 'PM' && startHour !== 12) startHour += 12;
    if (startAmPm === 'AM' && startHour === 12) startHour = 0;

    let endHour = parseInt(rangeMatch[4]);
    const endAmPm = rangeMatch[6].toUpperCase();
    if (endAmPm === 'PM' && endHour !== 12) endHour += 12;
    if (endAmPm === 'AM' && endHour === 12) endHour = 0;

    const endMin = parseInt(rangeMatch[5]);
    const startMin = parseInt(rangeMatch[2]);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    const duration = Math.max(30, endTotal - startTotal); // minimum 30 min

    return { startHour: startHour + startMin / 60, durationMin: duration };
  }

  // Try to match single time "HH:MM AM/PM" or "H:MM AM/PM"
  const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (singleMatch) {
    let hour = parseInt(singleMatch[1]);
    const ampm = singleMatch[3].toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    const min = parseInt(singleMatch[2]);
    return { startHour: hour + min / 60, durationMin: 60 };
  }

  // Default fallback
  return { startHour: 9, durationMin: 60 };
};

export default function DayView({ selectedDate, todayDate, calendarEvents, activeCourses, monthNames }) {
  const dateKey = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const dayEvents = calendarEvents.filter((e) => e.date === dateKey && activeCourses.has(e.course));
  const isToday = selectedDate.toDateString() === todayDate.toDateString();
  const dayLabel = `${DAY_LONG[selectedDate.getDay()]}, ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

  // Grid starts at 6 AM, ends at 11 PM (17 hours shown)
  const GRID_START_HOUR = 6;
  const GRID_END_HOUR = 23;
  const HOUR_HEIGHT = 60; // pixels per hour

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day header */}
      <div className={`text-center py-space-sm font-title-md text-title-md font-semibold border-b border-outline-variant/10 ${isToday ? 'text-primary bg-primary/5' : 'text-on-surface bg-surface-container-low/60'}`}>
        {dayLabel} {isToday && <span className="ml-2 text-[12px] bg-primary text-white px-2 py-0.5 rounded-full font-label-sm">Today</span>}
      </div>
      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[80px_1fr] bg-surface-container-lowest min-h-[calc(17*60px)]">
          {/* Time labels */}
          <div className="border-r border-outline-variant/10">
            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i).map((h) => (
              <div key={h} className="h-[60px] text-center text-on-surface-variant font-label-md text-[13px] border-b border-outline-variant/20 flex items-start justify-center pt-2">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {/* Event column */}
          <div className="relative" style={{ height: `${(GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT}px` }}>
            {Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, i) => GRID_START_HOUR + i).map((h) => (
              <div key={h} className="h-[60px] border-b border-outline-variant/20"></div>
            ))}
            {/* Render events */}
            {dayEvents.map((evt) => {
              const { startHour, durationMin } = parseEventTime(evt.time);
              const topPx = Math.max(0, (startHour - GRID_START_HOUR) * HOUR_HEIGHT);
              const heightPx = Math.max(40, (durationMin / 60) * HOUR_HEIGHT);

              // Skip events outside visible grid
              if (topPx > (GRID_END_HOUR - GRID_START_HOUR + 1) * HOUR_HEIGHT) return null;

              return (
                <div
                  key={evt.id}
                  className={`absolute left-2 right-2 bg-surface-container-lowest rounded-xl p-space-sm sm:p-space-md shadow-sm border border-outline-variant/20 overflow-hidden cursor-pointer hover:shadow-md transition-all z-10 border-l-[4px] ${evt.colorClass?.replace('bg-', 'border-') || 'border-primary'}`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h4 className="font-title-md text-on-surface font-semibold mb-0.5 truncate">{evt.title}</h4>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-1.5 py-0.5 bg-surface-container/60 text-on-surface-variant font-label-sm text-[11px] rounded">{evt.course} • {evt.type}</span>
                      </div>
                    </div>
                    <span className="font-title-sm font-bold text-primary shrink-0 hidden sm:block whitespace-nowrap">{evt.time}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-space-lg gap-y-1 text-on-surface-variant font-body-sm text-[12px]">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">schedule</span> <span>{evt.time}</span></span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {evt.instructor}</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {evt.location}</span>
                  </div>
                </div>
              );
            })}
            {dayEvents.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant text-center p-4">
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
