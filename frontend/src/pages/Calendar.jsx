import React, { useState } from 'react';
import Layout from '../components/Layout';
import { calendarEvents, upcomingDeadlinesList, monthNames } from '../mock/calendarData';
import { formatDateKey, getWeekStart, generateICS } from '../components/calendar/calendarUtils';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import DayView from '../components/calendar/DayView';
import AgendaView from '../components/calendar/AgendaView';
import UpcomingDeadlines from '../components/calendar/UpcomingDeadlines';
import CourseFilter from '../components/calendar/CourseFilter';

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
    const filtered = calendarEvents.filter((e) => activeCourses.has(e.course));
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
      day: daysInPrevMonth - i,
    });
  }
  
  // 2. Current Month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const dayEvents = calendarEvents.filter((e) => e.date === dateKey && activeCourses.has(e.course));
    const isToday = (currentYear === todayDate.getFullYear() && currentMonth === todayDate.getMonth() && day === todayDate.getDate());
    const dayOfWeekIndex = (firstDayOfWeek + day - 1) % 7;
    const isWeekend = (dayOfWeekIndex === 5 || dayOfWeekIndex === 6);
    
    calendarCells.push({
      type: 'current',
      day,
      dateKey,
      events: dayEvents,
      isToday,
      isWeekend,
    });
  }
  
  // 3. Next Month Overflow
  const remainingCells = totalCellsNeeded - (firstDayOfWeek + daysInMonth);
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    calendarCells.push({
      type: 'next',
      day: nextDay,
    });
  }

  const filteredDeadlines = upcomingDeadlinesList.filter((d) => activeCourses.has(d.course));

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
              {activeView === 'Month' && <MonthView calendarCells={calendarCells} />}
              {activeView === 'Week' && (
                <WeekView
                  selectedDate={selectedDate}
                  todayDate={todayDate}
                  calendarEvents={calendarEvents}
                  activeCourses={activeCourses}
                />
              )}
              {activeView === 'Day' && (
                <DayView
                  selectedDate={selectedDate}
                  todayDate={todayDate}
                  calendarEvents={calendarEvents}
                  activeCourses={activeCourses}
                  monthNames={monthNames}
                />
              )}
              {activeView === 'Agenda' && (
                <AgendaView
                  calendarEvents={calendarEvents}
                  activeCourses={activeCourses}
                  todayDate={todayDate}
                  monthNames={monthNames}
                />
              )}
            </div>

            {/* Supportive Sidebar */}
            <div className="xl:col-span-3 space-y-space-lg">
              <UpcomingDeadlines filteredDeadlines={filteredDeadlines} />
              <CourseFilter
                activeCourses={activeCourses}
                toggleCourse={toggleCourse}
                toggleAllCourses={toggleAllCourses}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
