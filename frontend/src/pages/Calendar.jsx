import React, { useState } from 'react';
import Layout from '../components/Layout';

import { calendarEvents, upcomingDeadlinesList, monthNames } from '../mock/calendarData';

// Helper to format date key YYYY-MM-DD
function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// Helper: get the Monday of the week containing a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: generate .ics content for export
function generateICS(events) {
  const pad = (n) => String(n).padStart(2, '0');
  const formatICSDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };

  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GuildBoard//Course Calendar//EN\r\nCALSCALE:GREGORIAN\r\n`;

  events.forEach(evt => {
    ics += `BEGIN:VEVENT\r\n`;
    ics += `DTSTART;VALUE=DATE:${formatICSDate(evt.date)}\r\n`;
    ics += `DTEND;VALUE=DATE:${formatICSDate(evt.date)}\r\n`;
    ics += `SUMMARY:${evt.title}\r\n`;
    ics += `DESCRIPTION:${evt.course} - ${evt.type} | ${evt.time} | ${evt.instructor}\r\n`;
    ics += `LOCATION:${evt.location}\r\n`;
    ics += `END:VEVENT\r\n`;
  });

  ics += `END:VCALENDAR\r\n`;
  return ics;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

export default function Calendar() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const todayDate = now;
  const [activeCourses, setActiveCourses] = useState(new Set(["ISP", "KE", "SCS", "FM"]));
  const [activeView, setActiveView] = useState('Month');
  // For week/day navigation
  const [selectedDate, setSelectedDate] = useState(new Date(now));

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const goToToday = () => {
    const t = new Date();
    setCurrentDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(new Date(t));
  };

  // Week navigation
  const prevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const nextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Day navigation
  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };
  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Checkbox handler
  const toggleCourse = (course) => {
    const newSet = new Set(activeCourses);
    if (newSet.has(course)) {
      newSet.delete(course);
    } else {
      newSet.add(course);
    }
    setActiveCourses(newSet);
  };
  
  const toggleAllCourses = () => {
    if (activeCourses.size === 4) {
      setActiveCourses(new Set());
    } else {
      setActiveCourses(new Set(["ISP", "KE", "SCS", "FM"]));
    }
  };

  // Export handler
  const handleExport = () => {
    const filtered = calendarEvents.filter(e => activeCourses.has(e.course));
    const icsContent = generateICS(filtered);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guildboard_calendar_${currentYear}_${currentMonth + 1}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calendar generation logic
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday as day 0
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  const totalCellsNeeded = (firstDayOfWeek + daysInMonth > 35) ? 42 : 35;

  const calendarCells = [];
  
  // 1. Previous Month Overflow
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    calendarCells.push({
      type: 'prev',
      day: daysInPrevMonth - i
    });
  }
  
  // 2. Current Month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayEvents = calendarEvents.filter(e => e.date === dateKey && activeCourses.has(e.course));
    const isToday = (currentYear === todayDate.getFullYear() && currentMonth === todayDate.getMonth() && day === todayDate.getDate());
    const dayOfWeekIndex = (firstDayOfWeek + day - 1) % 7;
    const isWeekend = (dayOfWeekIndex === 5 || dayOfWeekIndex === 6);
    
    calendarCells.push({
      type: 'current',
      day,
      dateKey,
      events: dayEvents,
      isToday,
      isWeekend
    });
  }
  
  // 3. Next Month Overflow
  const remainingCells = totalCellsNeeded - (firstDayOfWeek + daysInMonth);
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    calendarCells.push({
      type: 'next',
      day: nextDay
    });
  }

  const filteredDeadlines = upcomingDeadlinesList.filter(d => activeCourses.has(d.course));

  // ─── Week View ──────────────────────────────────────────
  const renderWeekView = () => {
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
              {HOURS.map(h => (
                <div key={h} className="h-[50px] text-center text-on-surface-variant font-label-md text-[12px] border-b border-outline-variant/20 flex items-start justify-center pt-1.5">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {/* Day columns */}
            {weekDays.map((d, colIdx) => {
              const dateKey = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
              const dayEvts = calendarEvents.filter(e => e.date === dateKey && activeCourses.has(e.course));
              const isToday = d.toDateString() === todayDate.toDateString();
              return (
                <div key={colIdx} className={`relative border-r border-outline-variant/20 last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                  {HOURS.map(h => (
                    <div key={h} className="h-[50px] border-b border-outline-variant/20"></div>
                  ))}
                  {/* Render events */}
                  {dayEvts.map(evt => {
                    // Parse start hour from time string
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
  };

  // ─── Day View ──────────────────────────────────────────
  const renderDayView = () => {
    const dateKey = formatDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const dayEvents = calendarEvents.filter(e => e.date === dateKey && activeCourses.has(e.course));
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
              {HOURS.map(h => (
                <div key={h} className="h-[60px] text-center text-on-surface-variant font-label-md text-[13px] border-b border-outline-variant/20 flex items-start justify-center pt-2">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {/* Event column */}
            <div className="relative">
              {HOURS.map(h => (
                <div key={h} className="h-[60px] border-b border-outline-variant/20"></div>
              ))}
              {/* Render events */}
              {dayEvents.map(evt => {
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
  };

  // ─── Agenda View ──────────────────────────────────────────
  const renderAgendaView = () => {
    const upcomingEvents = calendarEvents
      .filter(e => activeCourses.has(e.course))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group events by date
    const grouped = {};
    upcomingEvents.forEach(evt => {
      if (!grouped[evt.date]) grouped[evt.date] = [];
      grouped[evt.date].push(evt);
    });

    const sortedDates = Object.keys(grouped).sort();

    return (
      <div className="flex-1 p-space-lg flex flex-col gap-space-sm overflow-y-auto">
        {sortedDates.map(dateStr => {
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
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{grouped[dateStr].length} event{grouped[dateStr].length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              {/* Events for this date */}
              <div className="ml-6 border-l-2 border-outline-variant/20 pl-space-md space-y-space-xs mb-space-md">
                {grouped[dateStr].map(evt => (
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
  };

  // ─── Navigation label per view ─────────────────────────────
  const getViewNavigationLabel = () => {
    if (activeView === 'Week') {
      const ws = getWeekStart(selectedDate);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      return `${monthNames[ws.getMonth()]} ${ws.getDate()} – ${ws.getMonth() !== we.getMonth() ? monthNames[we.getMonth()] + ' ' : ''}${we.getDate()}, ${we.getFullYear()}`;
    }
    if (activeView === 'Day') {
      return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    }
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  const handlePrev = () => {
    if (activeView === 'Week') prevWeek();
    else if (activeView === 'Day') prevDay();
    else prevMonth();
  };

  const handleNext = () => {
    if (activeView === 'Week') nextWeek();
    else if (activeView === 'Day') nextDay();
    else nextMonth();
  };

  const navbarLeftContent = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span className="hover:text-on-surface transition-colors cursor-pointer">Guild Board Portal</span>
      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      <span className="text-primary font-semibold">Course Calendar</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={navbarLeftContent}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full space-y-space-lg">
          
          {/* Header Control Band */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20">
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <h1 className="font-headline-md text-headline-md text-on-surface">Course Calendar</h1>
                <span className="bg-surface-container text-primary font-label-sm text-label-sm px-space-xs py-1 rounded-full uppercase tracking-wider font-semibold">
                  Fall 2026 Semester
                </span>
              </div>
              <div className="h-5 w-px bg-outline-variant/30 hidden sm:block"></div>
              <div className="flex items-center gap-space-2xs">
                <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Previous" type="button">
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <span className="font-title-md text-title-md text-on-surface px-space-xs min-w-[140px] text-center font-bold select-none">
                  {getViewNavigationLabel()}
                </span>
                <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Next" type="button">
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
                <button onClick={goToToday} className="ml-space-2xs px-space-sm py-1 bg-surface-container-low hover:bg-surface-container text-primary font-title-sm text-title-sm rounded-lg transition-colors cursor-pointer" type="button">
                  Today
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              {/* View Selector */}
              <div className="inline-flex bg-surface-container-low p-1 rounded-lg text-on-surface-variant">
                {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`px-space-sm py-1 font-title-sm text-title-sm rounded-md transition-all cursor-pointer ${
                      activeView === view
                        ? 'bg-primary-container text-on-primary shadow-sm'
                        : 'hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-space-2xs">
                <button className="inline-flex items-center gap-space-2xs px-space-sm py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-title-sm text-title-sm rounded-lg transition-colors cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  <span>Filter</span>
                </button>
                <button onClick={handleExport} className="inline-flex items-center gap-space-2xs px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm rounded-lg shadow-sm transition-all cursor-pointer" type="button">
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  <span>Export Calendar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Workspace Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
            {/* Calendar Area (Left 9 cols) */}
            <div className="xl:col-span-9 bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col border border-outline-variant/20">
              {activeView === 'Month' && (
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
                            {cell.events.map(evt => {
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
              )}
              {activeView === 'Week' && renderWeekView()}
              {activeView === 'Day' && renderDayView()}
              {activeView === 'Agenda' && renderAgendaView()}
            </div>

            {/* Supportive Sidebar */}
            <div className="xl:col-span-3 space-y-space-lg">
              {/* Upcoming Deadlines Mini Widget */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md border border-outline-variant/20">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-2xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold">Upcoming Deadlines</h3>
                  </div>
                  <span className="bg-secondary-container/40 text-primary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold">{filteredDeadlines.length} Pending</span>
                </div>
                
                <div className="space-y-space-sm" id="upcoming-deadlines-container">
                  {filteredDeadlines.length > 0 ? filteredDeadlines.map((d, i) => (
                    <div key={i} className="p-space-sm rounded-lg bg-surface-container-low/50 hover:bg-surface-container-low transition-colors flex flex-col gap-space-2xs relative overflow-hidden cursor-pointer">
                      <div className={`w-1 h-full absolute left-0 top-0 ${d.colorClass}`}></div>
                      <div className="flex items-center justify-between text-[11px] font-label-md">
                        <span className="text-primary font-semibold">{d.due}</span>
                        <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant text-[10px] font-bold">{d.course}</span>
                      </div>
                      <h4 className="font-title-sm text-title-sm text-on-surface leading-snug font-semibold">{d.title}</h4>
                      <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm pt-1">
                        <span className="truncate">{d.instructor}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Published
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div className="p-space-sm text-center text-on-surface-variant font-body-sm">No pending deadlines for selected courses.</div>
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

              {/* Course Legend & Filter Widget */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md border border-outline-variant/20">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-2xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold">Enrolled Courses</h3>
                  </div>
                  <button onClick={toggleAllCourses} className="text-primary hover:underline font-label-sm text-label-sm cursor-pointer" type="button">Toggle All</button>
                </div>

                <div className="space-y-space-xs">
                  {[
                    { id: 'ISP', name: 'Individual Software Dev Process', color: 'bg-primary-container' },
                    { id: 'KE', name: 'Knowledge Engineering', color: 'bg-secondary' },
                    { id: 'SCS', name: 'Software Communication Skills', color: 'bg-secondary-container' },
                    { id: 'FM', name: 'Folk Music', color: 'bg-outline-variant' }
                  ].map((course) => (
                    <label key={course.id} className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors group">
                      <div className="flex items-center gap-space-xs min-w-0">
                        <span className={`w-3 h-3 rounded-full ${course.color} flex-shrink-0`}></span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors truncate">{course.id}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{course.name}</span>
                        </div>
                      </div>
                      <input 
                        checked={activeCourses.has(course.id)} 
                        onChange={() => toggleCourse(course.id)}
                        className="rounded border-outline-variant text-primary-container focus:ring-primary-container cursor-pointer" 
                        type="checkbox" 
                      />
                    </label>
                  ))}
                </div>
                
                {/* Academic Calendar Sync Indicator */}
                <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-[22px] transition-transform">sync</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-title-sm text-[12px] text-on-surface">iCal / Google Calendar Feed</span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant truncate">Synced just now</span>
                  </div>
                  <button className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer rounded hover:bg-surface-container" type="button" title="Sync Calendar">
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
