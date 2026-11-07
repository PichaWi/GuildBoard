import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { INITIAL_FORM_DATA } from '../mock/createEventData';
import { createEvent } from '../api/events';
import { PriorityBadge } from '../components/Badge';
import Toast from '../components/Toast';
import { LECTURER_OPTIONS, DEFAULTS } from '../config/appConfig';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const newEvent = await createEvent(formData);
      setCreatedEvent(newEvent);
      setSubmitSuccess(true);
      setToast({
        visible: true,
        message: 'Event created successfully! Redirecting to calendar...',
        type: 'success',
      });
      setTimeout(() => navigate('/calendar'), 2000);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create event');
      setToast({
        visible: true,
        message: err.message || 'Failed to create event',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navbarLeftContent = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span className="hover:text-on-surface transition-colors cursor-pointer" onClick={() => navigate('/calendar')}>GuildBoard Portal</span>
      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      <span className="text-primary font-semibold">Create Event</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={navbarLeftContent}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full space-y-space-lg">

          {/* Header Control Band / Title Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/20">
            <div>
              <div className="flex items-center gap-space-xs mb-1">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined text-xs">school</span>
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-semibold">Faculty Curriculum Dispatch</span>
                <span className="text-outline-variant">•</span>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">Academic Year 2026-2027</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight">Create New Course Event</h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">Schedule lectures, project milestones, or laboratory sessions for enrolled students.</p>
            </div>
            {/* Live Draft Sync Pill */}
            <div className="flex items-center gap-space-xs self-start md:self-auto bg-surface-container-low px-space-md py-space-xs rounded-full border border-outline-variant/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">Live Draft Sync: <strong className="text-primary font-semibold">Active</strong></span>
            </div>
          </div>

          {submitError && (
            <div className="p-space-md rounded-xl bg-error-container/40 text-on-error-container border border-error-container text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && createdEvent && (
            <div className="p-space-md rounded-xl bg-primary-container/20 text-on-primary-container border border-primary-container">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span className="font-title-sm text-title-sm font-semibold">Event Created Successfully</span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-space-md mb-3">
                <h3 className="font-title-md text-on-surface mb-1">{createdEvent.title || formData.title}</h3>
                <div className="flex flex-wrap gap-2 text-body-sm text-on-surface-variant mb-2">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">schedule</span> {createdEvent.date || formData.date} • {createdEvent.startTime || formData.startTime} - {createdEvent.endTime || formData.endTime}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">meeting_room</span> {createdEvent.location || formData.location}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">person</span> {createdEvent.instructor || formData.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container text-primary">{createdEvent.courseCode || formData.courseCode}</span>
                  <PriorityBadge priority={createdEvent.priority || 'Medium'} />
                </div>
              </div>
              <p className="text-body-sm">Redirecting to calendar in 2 seconds...</p>
            </div>
          )}

          {/* Toast Notification */}
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, visible: false }))}
          />

          {/* Main Form Grid Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

            {/* Primary Event Form Card (Left 8 cols) */}
            <form onSubmit={handleSubmit} className="lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-space-xl flex flex-col gap-space-lg">

              {/* Section: Title */}
              <div className="flex flex-col gap-space-2xs">
                <div className="flex items-center justify-between">
                  <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center gap-space-2xs" htmlFor="eventTitle">
                    Event Title <span className="text-error font-bold">*</span>
                  </label>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">{formData.title.length} / 120</span>
                </div>
                <div className="relative">
                  <input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full h-11 px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/60 outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 transition-all"
                    maxLength="120"
                    placeholder="e.g., Milestone 2: Architecture Submission, SCS Lab Workshop"
                    required
                    type="text"
                  />
                </div>
                <p className="font-label-sm text-label-sm text-on-surface-variant">Clear, distinct titles assist students in calendar synchronization.</p>
              </div>

              {/* Section: Course Code & Event Classification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                {/* Course Picker */}
                <div className="flex flex-col gap-space-2xs">
                  <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center gap-space-2xs" htmlFor="courseSelect">
                    <span className="material-symbols-outlined text-[18px] text-primary">auto_stories</span>
                    Course Code <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="courseCode"
                      value={formData.courseCode}
                      onChange={handleChange}
                      className="w-full h-11 px-space-md pr-space-xl appearance-none rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 cursor-pointer transition-all"
                    >
                      <option value="ISP">ISP - Individual Software Development Process</option>
                      <option value="KE">KE - Knowledge Engineering</option>
                      <option value="SCS">SCS - Software Communication Skills</option>
                      <option value="FM">FM - Folk Music & Acoustic Culture</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                  </div>
                </div>

                {/* Event Classification Dropdown */}
                <div className="flex flex-col gap-space-2xs">
                  <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center gap-space-2xs" htmlFor="typeSelect">
                    <span className="material-symbols-outlined text-[18px] text-primary">category</span>
                    Event Classification <span className="text-error font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="w-full h-11 px-space-md pr-space-xl appearance-none rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 cursor-pointer transition-all"
                    >
                      <option value="Lecture">Lecture (Classroom & Broadcast)</option>
                      <option value="Lab">Lab (Hands-on Practicum)</option>
                      <option value="Project Milestone">Project Milestone (Major Checkpoint)</option>
                      <option value="Assignment Due">Assignment Due</option>
                      <option value="Workshop">Workshop / Guest Speaker</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Section: Timetable Details */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-title-sm text-title-sm text-primary flex items-center gap-space-2xs font-semibold">
                    <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
                    Schedule Timetable
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">ICT GMT+7 (Bangkok)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                  <div className="flex flex-col gap-space-2xs">
                    <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="eventDate">Event Date</label>
                    <div className="relative">
                      <input
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full h-10 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary-container border border-outline-variant/30"
                        type="date"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-2xs">
                    <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="startTime">Commencement</label>
                    <div className="relative">
                      <input
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className="w-full h-10 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary-container border border-outline-variant/30"
                        type="time"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-2xs">
                    <label className="font-label-md text-label-md text-on-surface-variant font-medium" htmlFor="endTime">Conclusion / Deadline</label>
                    <div className="relative">
                      <input
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="w-full h-10 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none focus:ring-2 focus:ring-primary-container border border-outline-variant/30"
                        type="time"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Venue Location & Instructor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-space-2xs">
                  <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center gap-space-2xs" htmlFor="locationInput">
                    <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
                    Physical Venue / Meeting Link
                  </label>
                  <div className="relative">
                    <input
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full h-11 px-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/60 outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 transition-all"
                      placeholder="e.g., Room 402, Engineering Hall or https://zoom.us/..."
                      type="text"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-space-2xs">
                  <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center gap-space-2xs" htmlFor="instructorSelect">
                    <span className="material-symbols-outlined text-[18px] text-primary">person_outline</span>
                    Presiding Instructor
                  </label>
                  <div className="relative">
                    <select
                      name="instructor"
                      value={formData.instructor}
                      onChange={handleChange}
                      className="w-full h-11 px-space-md pr-space-xl appearance-none rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 cursor-pointer transition-all"
                    >
                      <option value="" disabled>Select instructor</option>
                      {LECTURER_OPTIONS.map((lec) => (
                        <option key={lec.value} value={lec.value}>{lec.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Section: Guidelines & Deliverables */}
              <div className="flex flex-col gap-space-2xs">
                <label className="font-title-sm text-title-sm text-on-surface font-semibold flex items-center justify-between" htmlFor="eventDescription">
                  <span className="flex items-center gap-space-2xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                    Syllabus Guidelines & Deliverable Details
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Markdown supported</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/60 outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 resize-y transition-all"
                  placeholder="Outline required preparation..."
                  rows="4"
                ></textarea>
              </div>

              {/* Section: Dispatch Options */}
              <div className="flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
                <label className="flex items-start gap-space-sm cursor-pointer select-none">
                  <input
                    name="publishImmediately"
                    checked={formData.publishImmediately}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-primary-container rounded focus:ring-primary-container cursor-pointer"
                    type="checkbox"
                  />
                  <div className="flex flex-col">
                    <span className="font-title-sm text-title-sm text-on-surface font-medium flex items-center gap-space-xs">
                      Publish immediately to cohort schedule
                      <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Published
                      </span>
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Makes entry immediately visible to all enrolled students on their GuildBoard agenda.</span>
                  </div>
                </label>
                <label className="flex items-start gap-space-sm cursor-pointer select-none">
                  <input
                    name="notifyEmail"
                    checked={formData.notifyEmail}
                    onChange={handleChange}
                    className="mt-1 w-4 h-4 text-primary-container rounded focus:ring-primary-container cursor-pointer"
                    type="checkbox"
                  />
                  <div className="flex flex-col">
                    <span className="font-title-sm text-title-sm text-on-surface font-medium">Broadcast academic alert email</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Dispatches an automated notification email via faculty relay to student inboxes.</span>
                  </div>
                </label>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-md">
                <span onClick={() => navigate('/calendar')} className="font-title-sm text-title-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 order-3 sm:order-1 cursor-pointer">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Discard & Return
                </span>
                <div className="flex items-center gap-space-sm w-full sm:w-auto order-2">
                  <button className="flex-1 sm:flex-initial h-11 px-space-lg rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-title-sm text-title-sm transition-colors cursor-pointer" type="button" disabled={isSubmitting}>
                    Save as Draft
                  </button>
                  <button className="flex-1 sm:flex-initial h-11 px-space-xl rounded-xl bg-primary-container hover:bg-primary text-on-primary font-title-sm text-title-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-space-xs focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer" type="submit" disabled={isSubmitting}>
                    <span className="material-symbols-outlined text-lg">event_available</span>
                    <span>{isSubmitting ? 'Publishing...' : 'Publish Event'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Right Column: Interactive Live Preview & Insights */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Live Card Preview */}
              <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-space-lg flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/10">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold">Student View Preview</span>
                  <span className="font-label-sm text-label-sm text-primary font-semibold">Live Render</span>
                </div>

                {/* Simulated Student Event Card */}
                <div className="p-space-md rounded-lg bg-surface-container-lowest shadow-md flex flex-col gap-space-xs relative overflow-hidden border border-outline-variant/20">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-container"></div>
                  <div className="pl-space-2xs flex items-center justify-between">
                    <span className="px-space-xs py-0.5 rounded bg-surface-container font-label-sm text-label-sm text-on-surface font-semibold">{formData.courseCode}</span>
                    <span className="px-space-xs py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-medium">{formData.type}</span>
                  </div>
                  <div className="pl-space-2xs pt-1">
                    <h4 className="font-title-sm text-title-sm text-on-surface font-bold leading-tight">{formData.title || 'Untitled Event'}</h4>
                  </div>
                  <div className="pl-space-2xs flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm pt-space-2xs">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-sm text-secondary">schedule</span>
                      <span>{formData.date} • {formData.startTime} - {formData.endTime}</span>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-sm text-secondary">meeting_room</span>
                      <span className="truncate">{formData.location || 'TBA'}</span>
                    </div>
                  </div>
                  <div className="pl-space-2xs pt-space-xs flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-base text-on-surface-variant">account_circle</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">{formData.instructor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}