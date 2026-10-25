// Helper to format date key YYYY-MM-DD
export function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

// Helper: get the Monday of the week containing a given date
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: generate .ics content for export
export function generateICS(events) {
  const pad = (n) => String(n).padStart(2, '0');
  const formatICSDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };

  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//GuildBoard//Course Calendar//EN\r\nCALSCALE:GREGORIAN\r\n`;

  events.forEach((evt) => {
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

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
