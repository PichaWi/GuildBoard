// Calendar export: one place for every format (.ics, CSV; Excel and PDF later).

const pad = (n) => String(n).padStart(2, '0');

// "09:00:00" (backend) or "9:00 AM" (mock) -> { h, m }, or null if unreadable.
export function parseClock(text) {
  const match = String(text || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h < 24 && m < 60 ? { h, m } : null;
}

// "09:00:00 - 12:00:00" -> [{h, m}, {h, m}], or null for an all-day event.
export function parseTimeRange(time) {
  const [start, end] = String(time || '').split(' - ');
  const s = parseClock(start);
  const e = parseClock(end);
  return s && e ? [s, e] : null;
}

// Rows every format shares, sorted by date then start time.
export function exportRows(events) {
  return [...events]
    .map((evt) => {
      const range = parseTimeRange(evt.time);
      return {
        date: evt.date,
        start: range ? `${pad(range[0].h)}:${pad(range[0].m)}` : '',
        end: range ? `${pad(range[1].h)}:${pad(range[1].m)}` : '',
        title: evt.title || '',
        course: evt.course || '',
        type: evt.type || '',
        location: evt.location || '',
        instructor: evt.instructor || '',
        description: evt.description || '',
      };
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

export const EXPORT_COLUMNS = [
  ['date', 'Date'], ['start', 'Start'], ['end', 'End'], ['title', 'Title'], ['course', 'Course'],
  ['type', 'Type'], ['location', 'Location'], ['instructor', 'Instructor'], ['description', 'Description'],
];

// ── .ics (Google Calendar, Outlook, Apple Calendar) ───────────────────────────

const icsText = (value) =>
  String(value || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const icsDate = (dateStr) => dateStr.replace(/-/g, '');

function nextDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function generateICS(events, now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GuildBoard//Course Calendar//EN', 'CALSCALE:GREGORIAN'];
  events.forEach((evt, index) => {
    const range = parseTimeRange(evt.time);
    lines.push('BEGIN:VEVENT', `UID:guildboard-event-${evt.id ?? index}@guildboard`, `DTSTAMP:${stamp}`);
    if (range) {
      const [s, e] = range;
      lines.push(`DTSTART:${icsDate(evt.date)}T${pad(s.h)}${pad(s.m)}00`);
      lines.push(`DTEND:${icsDate(evt.date)}T${pad(e.h)}${pad(e.m)}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(evt.date)}`, `DTEND;VALUE=DATE:${icsDate(nextDay(evt.date))}`);
    }
    lines.push(`SUMMARY:${icsText(evt.title)}`);
    lines.push(`DESCRIPTION:${icsText(`${evt.course || ''} - ${evt.type || ''} | ${evt.instructor || ''}`)}`);
    if (evt.location) lines.push(`LOCATION:${icsText(evt.location)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ── CSV (opens in Excel, Google Sheets, Numbers) ──────────────────────────────

function csvCell(value) {
  let text = String(value ?? '');
  // A cell starting with = + - @ could run as a formula in Excel; make it plain text.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function generateCSV(events) {
  const header = EXPORT_COLUMNS.map(([, label]) => label).join(',');
  const rows = exportRows(events).map((row) => EXPORT_COLUMNS.map(([key]) => csvCell(row[key])).join(','));
  // The BOM (\uFEFF) tells Excel the file is UTF-8, so Thai text shows correctly.
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n';
}

// ── Excel (.xlsx) ──────────────────────────────────────────────────────────────

const EXCEL_WIDTHS = { date: 12, start: 8, end: 8, title: 40, course: 10, type: 20, location: 18, instructor: 20, description: 40 };

// Returns a Promise<Blob>. The library is loaded only when someone exports to Excel,
// so it does not slow down the first page load.
export async function generateXLSX(events) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const header = EXPORT_COLUMNS.map(([, label]) => ({ value: label, fontWeight: 'bold', backgroundColor: '#E8F0EC' }));
  const rows = exportRows(events).map((row) => EXPORT_COLUMNS.map(([key]) => ({ value: row[key], type: String })));
  return writeExcelFile([header, ...rows], {
    sheet: 'Course Calendar',
    columns: EXPORT_COLUMNS.map(([key]) => ({ width: EXCEL_WIDTHS[key] })),
    stickyRowsCount: 1, // keep the header visible while scrolling
  }).toBlob();
}

// ── Download helper ────────────────────────────────────────────────────────────

export function downloadFile(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}