import React from 'react';
import { DAY_SHORT, DAY_LONG } from './calendarUtils';

export default function AgendaView({ calendarEvents, activeCourses, todayDate, monthNames }) {
  const upcomingEvents = calendarEvents
    .filter((e) => activeCourses.has(e.course))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Group events by date
  const grouped = {};
  upcomingEvents.forEach((evt) => {
    if (!grouped[evt.date]) grouped[evt.date] = [];
    grouped[evt.date].push(evt);
  });

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="flex-1 p-space-lg flex flex-col gap-space-sm overflow-y-auto">
      {sortedDates.map((dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const isToday = d.toDateString() === todayDate.toDateString();
        const isPast = d < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        return (
          <div key={dateStr}>
            {/* Date group header */}
            <div className={`flex items-center gap-space-sm mb-space-xs py-space-xs px-space-sm rounded-lg ${isToday ? 'bg-primary/10' : ''}`}>
              <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${isToday ? 'bg-primary text-white' : 'bg-surface-container text-on-surface'}`}>
                <span className="font-label-sm text-[10px] uppercase leading-none">{DAY_SHORT[d.getDay()]}</span>
                <span className="font-headline-sm font-bold leading-none">{d.getDate()}</span>
              </div>
              <div>
                <span className={`font-title-sm text-title-sm ${isToday ? 'text-primary font-bold' : 'text-on-surface font-semibold'}`}>
                  {DAY_LONG[d.getDay()]}, {monthNames[d.getMonth()]} {d.getDate()}
                  {isToday && <span className="ml-2 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">Today</span>}
                </span>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {grouped[dateStr].length} event{grouped[dateStr].length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            {/* Events for this date */}
            <div className="ml-6 border-l-2 border-outline-variant/20 pl-space-md space-y-space-xs mb-space-md">
              {grouped[dateStr].map((evt) => (
                <div key={evt.id} className={`flex gap-space-md p-space-sm bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 hover:border-primary/40 transition-all cursor-pointer ${isPast ? 'opacity-50' : ''}`}>
                  <div className={`w-1 rounded-full self-stretch shrink-0 ${evt.colorClass}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`px-2 py-0.5 rounded font-label-sm text-[10px] font-semibold ${evt.colorClass} text-on-surface`}>{evt.course} • {evt.type}</span>
                      <span className="text-on-surface-variant font-label-sm text-[12px] shrink-0">{evt.time}</span>
                    </div>
                    <h4 className="font-title-sm text-title-sm text-on-surface font-semibold truncate">{evt.title}</h4>
                    <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-[12px] mt-1">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> {evt.instructor}</span>
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {evt.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {sortedDates.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant text-center py-space-2xl">
          <span className="material-symbols-outlined text-[48px] opacity-30 mb-2">event_busy</span>
          <p className="font-body-md opacity-60">No upcoming events found for selected courses.</p>
        </div>
      )}
    </div>
  );
}
