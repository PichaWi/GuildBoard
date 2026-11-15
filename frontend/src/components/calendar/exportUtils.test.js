import { describe, expect, it, vi } from 'vitest';
import { generateCSV, generateICS, parseTimeRange } from './exportUtils';

const EVENTS = [
  {
    id: 2, date: '2026-11-20', time: '13:00:00 - 16:00:00', title: 'KE Ontology, Design', course: 'KE',
    type: 'Assignment Due', location: 'Room 203', instructor: 'Aj. Milk', description: 'Say "hi"'
  },
  {
    id: 1, date: '2026-11-12', time: '9:00 AM - 12:00 PM', title: 'ISP Iteration 4 Report', course: 'ISP',
    type: 'Project Milestone', location: '', instructor: 'Aj. Suwichak', description: ''
  },
];

describe('parseTimeRange', () => {
  it('reads backend and mock time formats', () => {
    expect(parseTimeRange('13:00:00 - 16:00:00')).toEqual([{ h: 13, m: 0 }, { h: 16, m: 0 }]);
    expect(parseTimeRange('9:00 AM - 12:00 PM')).toEqual([{ h: 9, m: 0 }, { h: 12, m: 0 }]);
    expect(parseTimeRange('')).toBeNull();
  });
});

describe('generateICS', () => {
  const ics = generateICS(EVENTS, new Date('2026-11-15T12:00:00Z'));

  it('has the fields calendar apps require', () => {
    expect(ics).toContain('UID:guildboard-event-2@guildboard');
    expect(ics).toContain('DTSTAMP:20261115T120000Z');
  });

  it('keeps the real start and end times', () => {
    expect(ics).toContain('DTSTART:20261120T130000');
    expect(ics).toContain('DTEND:20261120T160000');
  });

  it('escapes commas in text', () => {
    expect(ics).toContain('SUMMARY:KE Ontology\\, Design');
  });

  it('makes an all-day event end on the next day', () => {
    const allDay = generateICS([{ id: 3, date: '2026-11-30', time: '', title: 'Holiday' }]);
    expect(allDay).toContain('DTSTART;VALUE=DATE:20261130');
    expect(allDay).toContain('DTEND;VALUE=DATE:20261201');
  });
});

describe('generateCSV', () => {
  const lines = generateCSV(EVENTS).replace('\uFEFF', '').trim().split('\r\n');

  it('starts with a header and sorts rows by date', () => {
    expect(lines[0]).toBe('Date,Start,End,Title,Course,Type,Location,Instructor,Description');
    expect(lines[1].startsWith('2026-11-12,09:00,12:00,ISP Iteration 4 Report')).toBe(true);
  });

  it('quotes commas and doubles quote marks', () => {
    expect(lines[2]).toContain('"KE Ontology, Design"');
    expect(lines[2]).toContain('"Say ""hi"""');
  });

  it('stops a cell from running as an Excel formula', () => {
    const csv = generateCSV([{ date: '2026-11-01', time: '', title: '=HYPERLINK("x")' }]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('starts with a BOM so Excel reads Thai text', () => {
    expect(generateCSV([]).startsWith('\uFEFF')).toBe(true);
  });
});


function readBytes(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(blob);
  });
}

describe('generateXLSX', () => {
  it('builds a real Excel (.xlsx) file', async () => {
    const { generateXLSX } = await import('./exportUtils');
    const blob = await generateXLSX(EVENTS);
    const bytes = await readBytes(blob);

    // .xlsx files are zip archives, which always start with "PK".
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK');
    expect(bytes.length).toBeGreaterThan(1000);
  });
});


describe('generatePDF', () => {
  it('builds a PDF with the Thai font embedded', async () => {
    const { readFileSync } = await import('fs');
    const font = readFileSync('public/fonts/Sarabun-Regular.ttf');
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      arrayBuffer: async () => font.buffer.slice(font.byteOffset, font.byteOffset + font.length),
    }));
    const { generatePDF } = await import('./exportUtils');

    const bytes = await readBytes(await generatePDF(EVENTS));
    const text = new TextDecoder('latin1').decode(bytes);

    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toContain('Sarabun'); // the Thai-capable font is inside the file
    vi.unstubAllGlobals();
  });
});