import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { createConsultation, getConsultations } from '../api/consultations';
import { COURSE_OPTIONS } from '../config/appConfig';

const EMPTY_FORM = { studentName: '', studentId: '', courseCode: '', topic: '', sessionAt: '', notes: '' };
const EMPTY_FILTERS = { keyword: '', student: '', date: '' };

const INPUT_CLASS = 'h-[38px] w-full px-space-sm rounded-lg bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors';
const LABEL_CLASS = 'text-label-md font-label-md text-on-surface';

function formatSessionTime(sessionAt) {
  return new Date(sessionAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Consultations() {
  const [consultations, setConsultations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const closeToast = useCallback(() => setToast((prev) => ({ ...prev, visible: false })), []);

  // Only the newest search may fill the list, however the responses arrive.
  const latestRequest = useRef(0);

  const loadConsultations = useCallback(async (nextFilters) => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    setLoadError('');
    setAppliedFilters(nextFilters);
    try {
      const data = await getConsultations(nextFilters);
      if (request === latestRequest.current) setConsultations(data);
    } catch (err) {
      if (request === latestRequest.current) {
        setConsultations([]);
        setLoadError(err.message || 'Consultation sessions could not be loaded.');
      }
    } finally {
      if (request === latestRequest.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsultations(EMPTY_FILTERS);
  }, [loadConsultations]);

  const updateForm = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const updateFilter = (field) => (e) => setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSearch = (e) => {
    e.preventDefault();
    loadConsultations(filters);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    loadConsultations(EMPTY_FILTERS);
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.topic.trim() || !form.sessionAt) {
      setFormError('Student name, topic and date/time are required.');
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      await createConsultation({ ...form, sessionAt: new Date(form.sessionAt).toISOString() });
      setForm(EMPTY_FORM);
      setFilters(EMPTY_FILTERS);
      setToast({ visible: true, message: 'Consultation session recorded.', type: 'success' });
      loadConsultations(EMPTY_FILTERS);
    } catch (err) {
      setFormError(err.message || 'The session could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isFiltered = Boolean(
    appliedFilters.keyword.trim() || appliedFilters.student.trim() || appliedFilters.date,
  );

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>GuildBoard</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">Consultations</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          <div className="flex flex-col max-w-3xl mb-space-xl">
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight font-bold">
              Consultation Log
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-2xs">
              Record support sessions and search the history to resolve recurring student issues faster.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg items-start">
            <form
              aria-label="Record a consultation session"
              className="xl:col-span-1 p-space-lg rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md"
              noValidate
              onSubmit={handleRecord}
            >
              <h2 className="font-title-md text-title-md text-primary font-semibold">Record a Session</h2>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS} htmlFor="consultation-student-name">
                  Student Name <span className="text-error">*</span>
                </label>
                <input className={INPUT_CLASS} id="consultation-student-name" maxLength={120} onChange={updateForm('studentName')} value={form.studentName} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} htmlFor="consultation-student-id">Student ID</label>
                  <input className={INPUT_CLASS} id="consultation-student-id" maxLength={32} onChange={updateForm('studentId')} value={form.studentId} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} htmlFor="consultation-course">Course</label>
                  <select className={INPUT_CLASS} id="consultation-course" onChange={updateForm('courseCode')} value={form.courseCode}>
                    <option value="">None</option>
                    {COURSE_OPTIONS.map(({ value }) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS} htmlFor="consultation-topic">
                  Topic <span className="text-error">*</span>
                </label>
                <input className={INPUT_CLASS} id="consultation-topic" maxLength={255} onChange={updateForm('topic')} value={form.topic} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS} htmlFor="consultation-session-at">
                  Date &amp; Time <span className="text-error">*</span>
                </label>
                <input className={INPUT_CLASS} id="consultation-session-at" onChange={updateForm('sessionAt')} type="datetime-local" value={form.sessionAt} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL_CLASS} htmlFor="consultation-notes">Notes</label>
                <textarea
                  className="p-space-sm rounded-lg bg-surface-container-low text-on-surface focus:outline-none focus:bg-surface-container-lowest transition-colors"
                  id="consultation-notes"
                  onChange={updateForm('notes')}
                  rows="4"
                  value={form.notes}
                />
              </div>

              {formError && <p className="text-body-sm font-body-sm text-error" role="alert">{formError}</p>}

              <button
                className="w-full h-[38px] rounded-lg bg-primary-container text-on-primary hover:bg-primary font-title-sm text-title-sm shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? 'Saving...' : 'Save Session'}
              </button>
            </form>

            <section aria-label="Consultation history" className="xl:col-span-2 space-y-space-md">
              <form
                aria-label="Search consultation sessions"
                className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm grid grid-cols-1 md:grid-cols-4 gap-space-sm items-end"
                onSubmit={handleSearch}
              >
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} htmlFor="consultation-search-keyword">Keyword</label>
                  <input className={INPUT_CLASS} id="consultation-search-keyword" maxLength={255} onChange={updateFilter('keyword')} placeholder="Topic or notes" value={filters.keyword} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} htmlFor="consultation-search-student">Student</label>
                  <input className={INPUT_CLASS} id="consultation-search-student" maxLength={120} onChange={updateFilter('student')} placeholder="Name or ID" value={filters.student} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LABEL_CLASS} htmlFor="consultation-search-date">Date</label>
                  <input className={INPUT_CLASS} id="consultation-search-date" onChange={updateFilter('date')} type="date" value={filters.date} />
                </div>
                <div className="flex items-center gap-space-xs">
                  <button className="flex-1 h-[38px] rounded-lg bg-primary-container text-on-primary hover:bg-primary font-title-sm text-title-sm transition-colors cursor-pointer" type="submit">
                    Search
                  </button>
                  <button className="flex-1 h-[38px] rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-title-sm text-title-sm transition-colors cursor-pointer" onClick={handleClear} type="button">
                    Clear
                  </button>
                </div>
              </form>

              {isLoading && (
                <p className="p-space-lg text-center font-body-md text-body-md text-on-surface-variant">Loading sessions...</p>
              )}

              {!isLoading && loadError && (
                <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm text-center" role="alert">
                  <p className="font-body-md text-body-md text-error mb-space-sm">{loadError}</p>
                  <button
                    className="px-space-md h-[38px] rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-title-sm text-title-sm transition-colors cursor-pointer"
                    onClick={() => loadConsultations(appliedFilters)}
                    type="button"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!isLoading && !loadError && consultations.length === 0 && (
                <p className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm text-center font-body-md text-body-md text-on-surface-variant">
                  {isFiltered ? 'No results match your search.' : 'No consultation sessions have been recorded yet.'}
                </p>
              )}

              {!isLoading && !loadError && consultations.map((session) => (
                <article className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm" key={session.id}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-xs">
                    <div className="min-w-0">
                      <h3 className="font-title-md text-title-md text-primary font-semibold">{session.topic}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {session.studentName}
                        {session.studentId ? ` (${session.studentId})` : ''}
                        {session.courseCode ? ` · ${session.courseCode}` : ''}
                      </p>
                    </div>
                    <time className="font-label-md text-label-md text-on-surface-variant shrink-0" dateTime={session.sessionAt}>
                      {formatSessionTime(session.sessionAt)}
                    </time>
                  </div>
                  {session.notes && (
                    <p className="mt-space-sm font-body-md text-body-md text-on-surface whitespace-pre-line">{session.notes}</p>
                  )}
                  <p className="mt-space-sm font-label-sm text-label-sm text-outline">Recorded by {session.recordedBy}</p>
                </article>
              ))}
            </section>
          </div>
        </div>
      </div>
      <Toast message={toast.message} onClose={closeToast} type={toast.type} visible={toast.visible} />
    </Layout>
  );
}
