import React from 'react';

const COURSES = [
  { id: 'ISP', name: 'Individual Software Dev Process', color: 'bg-primary-container' },
  { id: 'KE', name: 'Knowledge Engineering', color: 'bg-secondary' },
  { id: 'SCS', name: 'Software Communication Skills', color: 'bg-secondary-container' },
  { id: 'FM', name: 'Folk Music', color: 'bg-outline-variant' },
];

export default function CourseFilter({ activeCourses, toggleCourse, toggleAllCourses }) {
  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-md border border-outline-variant/20">
      <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
        <div className="flex items-center gap-space-2xs">
          <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
          <h3 className="font-title-md text-title-md text-on-surface font-semibold">Enrolled Courses</h3>
        </div>
        <button
          onClick={toggleAllCourses}
          className="text-primary hover:underline font-label-sm text-label-sm cursor-pointer"
          type="button"
        >
          Toggle All
        </button>
      </div>

      <div className="space-y-space-xs">
        {COURSES.map((course) => (
          <label
            key={course.id}
            className="flex items-center justify-between p-space-xs rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-space-xs min-w-0">
              <span className={`w-3 h-3 rounded-full ${course.color} flex-shrink-0`}></span>
              <div className="flex flex-col min-w-0">
                <span className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors truncate">
                  {course.id}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  {course.name}
                </span>
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
        <button
          className="p-1 text-on-surface-variant hover:text-on-surface cursor-pointer rounded hover:bg-surface-container"
          type="button"
          title="Sync Calendar"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
        </button>
      </div>
    </div>
  );
}
