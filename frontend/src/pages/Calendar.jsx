import React, { useState } from 'react';
import Layout from '../components/Layout';

// Mock Data from previous iteration
const calendarEvents = [
  { id: 1, title: "SCS Lab Setup", course: "SCS", date: "2026-10-07", type: "Lab", colorClass: "bg-secondary", time: "9:00 AM - 12:00 PM", location: "E11S601", instructor: "Aj. Tem", isRich: false },
  { id: 2, title: "KE Lab Intro", course: "KE", date: "2026-10-02", type: "Lab", colorClass: "bg-primary-container", time: "1:00 PM - 3:00 PM", location: "E11S602", instructor: "Aj. Hutchathai", isRich: false },
  { id: 3, title: "ISP Architecture Review", course: "ISP", date: "2026-10-12", type: "Lecture & Workshop", colorClass: "bg-primary-container", time: "1:00 PM - 4:00 PM", location: "E11S603", instructor: "Aj. Milk", isRich: true },
  { id: 4, title: "Software Communication Skills", course: "SCS", date: "2026-10-21", type: "Lecture & Workshop", colorClass: "bg-secondary-container", time: "9:00 AM - 12:00 PM", location: "E11S601", instructor: "Aj. Tem", isRich: true },
  { id: 5, title: "Folk Music: Traditional Scales", course: "FM", date: "2026-10-15", type: "Lecture", colorClass: "bg-outline-variant", time: "9:00 AM - 12:00 PM", location: "E11S604", instructor: "Aj. Pajee", isRich: true },
  { id: 6, title: "ISP Lab & Process Check", course: "ISP", date: "2026-10-20", type: "Assignment Due", colorClass: "bg-secondary", time: "1:00 PM - 4:00 PM", location: "E11S602", instructor: "Aj. Milk", isRich: true },
  { id: 7, title: "KE: Ontology & Model Milestone", course: "KE", date: "2026-10-23", type: "Project Milestone", colorClass: "bg-primary-container", time: "9:00 AM - 12:00 PM", location: "E11S603", instructor: "Aj. Hutchathai", isRich: true },
  { id: 8, title: "ISP Final Project Demo", course: "ISP", date: "2026-11-10", type: "Project Milestone", colorClass: "bg-primary-container", time: "9:00 AM - 12:00 PM", location: "E11S604", instructor: "Aj. Milk", isRich: true },
  { id: 9, title: "KE Knowledge Graph Submission", course: "KE", date: "2026-11-20", type: "Assignment Due", colorClass: "bg-secondary", time: "1:00 PM - 4:00 PM", location: "E11S601", instructor: "Aj. Hutchathai", isRich: true },
  { id: 10, title: "FM Ensemble Performance", course: "FM", date: "2026-11-26", type: "Final Exam", colorClass: "bg-outline-variant", time: "1:00 PM - 4:00 PM", location: "E11S602", instructor: "Aj. Pajee", isRich: true },
];

const upcomingDeadlinesList = [
  { course: "KE", title: "KE Project Milestone Submission", due: "Fri, Oct 23 · 11:59 PM", instructor: "Aj. Hutchathai", colorClass: "bg-primary-container" },
  { course: "ISP", title: "ISP Process Review & Lab", due: "Tue, Oct 20 · 5:00 PM", instructor: "Aj. Milk", colorClass: "bg-secondary" },
  { course: "SCS", title: "SCS Oral Presentation", due: "Wed, Oct 21 · 10:00 AM", instructor: "Aj. Tem", colorClass: "bg-secondary-container" }
];

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Helper to format date key YYYY-MM-DD
function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 9, 1)); // October 2026 by default
  const todayDate = new Date(2026, 9, 24); // Today highlight reference date (from original mock)
  const [activeCourses, setActiveCourses] = useState(new Set(["ISP", "KE", "SCS", "FM"]));
  const [activeView, setActiveView] = useState('Month');

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
    setCurrentDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
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

  const navbarLeftContent = (
    <>
      <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
        <span className="hover:text-on-surface transition-colors cursor-pointer">Guild Board Portal</span>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-primary font-semibold">Fall 2026</span>
      </nav>
      <div className="h-4 w-px bg-outline-variant/40"></div>
      <div className="flex items-center gap-space-2xs bg-surface-container-low px-space-sm py-1 rounded-full border border-outline-variant/30">
        <button onClick={prevMonth} className="text-on-surface-variant hover:text-on-surface flex items-center cursor-pointer" type="button" title="Previous Month">
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>
        <span className="font-title-sm text-title-sm px-space-2xs text-on-surface">{monthNames[currentMonth]} {currentYear}</span>
        <button onClick={nextMonth} className="text-on-surface-variant hover:text-on-surface flex items-center cursor-pointer" type="button" title="Next Month">
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </>
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
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Previous Month" type="button">
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <span className="font-title-md text-title-md text-on-surface px-space-xs min-w-[140px] text-center font-bold select-none">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" title="Next Month" type="button">
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
                <button className="inline-flex items-center gap-space-2xs px-space-md py-2 bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm rounded-lg shadow-sm transition-all cursor-pointer" type="button">
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
