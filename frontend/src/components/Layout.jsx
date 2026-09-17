import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout({ children, navbarLeftContent }) {
  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen">
      <Sidebar />
      <div className="pl-sidebar-width">
        <Navbar leftContent={navbarLeftContent} />
        <main className="w-full pt-16 bg-background min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
