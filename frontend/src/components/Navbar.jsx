import React from 'react';

export default function Navbar({ leftContent }) {
  return (
    <header className="fixed top-0 left-sidebar-width right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 z-40 px-space-lg flex items-center justify-between">
      <div className="flex items-center gap-space-md">
        {leftContent}
      </div>
      <div className="flex items-center gap-space-sm">
        <div className="flex items-center space-x-2 text-label-sm font-label-sm text-primary bg-surface-container px-3 py-1 rounded-full border border-outline-variant/30 shadow-2xs">
          <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span className="font-semibold">Fall 2026 Semester</span>
        </div>
        <div className="h-6 w-px bg-outline-variant/30 mx-space-2xs"></div>
        <button
          aria-label="Notifications"
          className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <img
          alt="Ryan Gosling"
          className="w-8 h-8 rounded-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxRy36P-7hrtg5rnMsquzIJr9xNgbyWo17nUsTvltNY2EnocyWX_L3hiLUagVjHUDqz5eXOYnnd9QRvALGoz-PabZNtgfiR5ROapqzP_nDpgJuOZ3bSO6Q0I9Dh5AYKknn4wQsUgGXjG8UNr4Q_rTNui0QSotJN2oKVBrvZNzDG0nqJpwx7gEI7WuXUXz-qM2VQPYo7N4HkEF0uwczljR4bW1aWIhdi8qPjwRIVnmWeRqQPwwbJ63H"
        />
      </div>
    </header>
  );
}
