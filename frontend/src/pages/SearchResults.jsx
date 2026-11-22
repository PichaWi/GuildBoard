import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { search } from '../api/search';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { getInitials } from '../components/operations/Badges';
import { DEFAULTS } from '../config/appConfig';

const DEFAULT_LIMIT = 50;

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'tasks' | 'calendar'

  const [results, setResults] = useState({ tasks: [], events: [], materials: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Sync internal search input with URL search params
  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  // Reset pagination when query changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
  }, [query]);

  // ─── Fetch Search Results (GET /api/search?q={query}) ──────────────────────
  const fetchSearchResults = useCallback(async (isLoadMore = false) => {
    if (!query.trim()) {
      setResults({ tasks: [], events: [], materials: [] });
      setIsLoading(false);
      setIsLoadingMore(false);
      setHasMore(false);
      return;
    }

    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await search(query, { limit: DEFAULT_LIMIT, offset: isLoadMore ? offset : 0 });

      const newTasks = Array.isArray(data.tasks) ? data.tasks : [];
      const newEvents = Array.isArray(data.events) ? data.events : [];
      const newMaterials = Array.isArray(data.materials) ? data.materials : [];

      if (isLoadMore) {
        setResults(prev => ({
          tasks: [...prev.tasks, ...newTasks],
          events: [...prev.events, ...newEvents],
          materials: [...prev.materials, ...newMaterials],
        }));
        setOffset(prev => prev + DEFAULT_LIMIT);
      } else {
        setResults({
          tasks: newTasks,
          events: newEvents,
          materials: newMaterials,
        });
        setOffset(DEFAULT_LIMIT);
      }

      // Check if there are more results (if we got a full page)
      const totalNew = newTasks.length + newEvents.length + newMaterials.length;
      setHasMore(totalNew >= DEFAULT_LIMIT);
    } catch (err) {
      console.warn('GET /api/search failed:', err.message);
      setError(err.message);
      if (!isLoadMore) {
        setResults({ tasks: [], events: [], materials: [] });
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [query, offset]);

  useEffect(() => {
    fetchSearchResults(false);
  }, [fetchSearchResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    } else {
      setSearchParams({});
    }
  };

  const handleLoadMore = () => {
    fetchSearchResults(true);
  };

  const tasksCount = results.tasks.length;
  const eventsCount = results.events.length;
  const materialsCount = results.materials.length;
  const totalCount = tasksCount + eventsCount + materialsCount;

  const showTasks = activeTab === 'all' || activeTab === 'tasks';
  const showEvents = activeTab === 'all' || activeTab === 'calendar';
  const showMaterials = activeTab === 'all' || activeTab === 'materials';

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>Academix</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span>Search</span>
      {query && (
        <>
          <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
          <span className="text-primary font-semibold">"{query}"</span>
        </>
      )}
    </nav>
  );

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          {/* Search Bar & Header */}
          <div className="mb-space-xl">
            <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight font-bold mb-space-sm">
              Search Results
            </h1>

            <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[22px]">
                search
              </span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search tasks, tickets, calendar events, or course materials..."
                className="w-full h-12 pl-12 pr-28 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary shadow-sm transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-title-sm font-title-sm transition-all cursor-pointer shadow-sm"
              >
                Search
              </button>
            </form>

            {query && (
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">
                Found <span className="text-primary font-bold">{totalCount}</span> results for "
                <span className="text-primary font-medium">{query}</span>"
              </p>
            )}
          </div>

          {/* Tabbed Navigation (All, Tasks, Calendar, Materials) */}
          <div className="flex items-center gap-space-xs border-b border-surface-container mb-space-lg">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`pb-space-sm px-space-md text-title-sm font-title-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>All Results</span>
              <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`pb-space-sm px-space-md text-title-sm font-title-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Tasks & Tickets</span>
              <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                {tasksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`pb-space-sm px-space-md text-title-sm font-title-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Calendar Events</span>
              <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                {eventsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`pb-space-sm px-space-md text-title-sm font-title-sm border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'materials'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Course Materials</span>
              <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container text-on-surface-variant">
                {materialsCount}
              </span>
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-space-2xl text-center bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-[36px] animate-spin">
                progress_activity
              </span>
              <span className="text-title-md font-title-md text-on-surface font-semibold">
                Searching across database...
              </span>
              <span className="text-body-sm font-body-sm text-outline">
                Querying /api/search?q={query}
              </span>
            </div>
          )}

          {/* Error Notice */}
          {!isLoading && error && (
            <div className="mb-space-md p-space-md rounded-xl bg-error-container/40 text-on-error-container border border-error-container text-body-sm">
              Note: Database search endpoint returned {error} (scaffolding mode).
              <button onClick={fetchSearchResults} className="underline hover:text-primary cursor-pointer ml-2">Retry</button>
            </div>
          )}

          {/* Empty Query State */}
          {!isLoading && !query && (
            <div className="p-space-2xl text-center bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary mb-space-sm">
                <span className="material-symbols-outlined text-[28px]">search</span>
              </div>
              <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                Type a keyword to begin searching
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-md">
                Search tasks, rubrics, instructors, course calendar milestones, or material titles.
              </p>
            </div>
          )}

          {/* No Results Empty State */}
          {!isLoading && query && totalCount === 0 && (
            <div className="p-space-2xl text-center bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-space-sm">
                <span className="material-symbols-outlined text-[28px]">search_off</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                No matching results found
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-md">
                We couldn't find any tasks or events matching "
                <span className="text-primary font-medium">{query}</span>".
              </p>
              <div className="mt-space-md flex flex-wrap items-center justify-center gap-2 text-label-sm font-label-sm text-outline">
                <span>Try searching:</span>
                <button
                  type="button"
                  onClick={() => setSearchParams({ q: 'ISP' })}
                  className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-primary cursor-pointer"
                >
                  ISP
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams({ q: 'Milestone' })}
                  className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-primary cursor-pointer"
                >
                  Milestone
                </button>
                <button
                  type="button"
                  onClick={() => setSearchParams({ q: 'Architecture' })}
                  className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-primary cursor-pointer"
                >
                  Architecture
                </button>
              </div>
            </div>
          )}

          {/* Results Lists */}
          {!isLoading && totalCount > 0 && (
            <div className="space-y-space-xl">
              {/* Section 1: Tasks (Mapped to existing TicketRow component) */}
              {showTasks && (
                <section>
                  <div className="flex items-center justify-between mb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        task_alt
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Tasks & Tickets
                      </h2>
                    </div>
                    <span className="text-label-sm font-label-sm text-outline">
                      {tasksCount} {tasksCount === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  {tasksCount === 0 ? (
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest text-center text-body-sm text-on-surface-variant">
                      No tasks found for this query.
                    </div>
                  ) : (
                    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                              <th className="py-space-sm px-space-lg">Task Title & Details</th>
                              <th className="py-space-sm px-space-md">Assigned Owner</th>
                              <th className="py-space-sm px-space-md">Priority</th>
                              <th className="py-space-sm px-space-md">Status</th>
                              <th className="py-space-sm px-space-md">Due Date</th>
                              <th className="py-space-sm px-space-lg text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="text-body-md font-body-md divide-y divide-surface-container-low">
                            {results.tasks.map((ticket) => (
                              <tr key={ticket.id || ticket._id} className="hover:bg-surface-container-low/60 transition-colors">
                                <td className="py-space-md px-space-lg">
                                  <div className="flex flex-col">
                                    <span className="font-title-sm text-title-sm text-primary font-semibold hover:underline cursor-pointer">
                                      {ticket.title}
                                    </span>
                                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                                      Ticket #AC-{(ticket.id || 0) + 1040}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-space-md px-space-md">
                                  <div className="flex items-center gap-space-xs">
                                    <div className="w-7 h-7 rounded-full bg-surface-container-high text-primary flex items-center justify-center text-label-sm font-label-sm font-semibold shrink-0">
                                      {getInitials(ticket.owner)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-title-sm text-title-sm text-on-surface truncate">{ticket.owner}</span>
                                      <span className="text-label-sm font-label-sm text-on-surface-variant truncate">
                                        {ticket.ownerRole || DEFAULTS.ownerRole}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-space-md px-space-md">
                                  <PriorityBadge priority={ticket.priority} />
                                </td>
                                <td className="py-space-md px-space-md">
                                  <StatusBadge status={ticket.status} />
                                </td>
                                <td className="py-space-md px-space-md text-on-surface-variant text-body-sm font-body-sm font-medium">
                                  {ticket.dueDate}
                                </td>
                                <td className="py-space-md px-space-lg text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      className="px-2 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-sm font-label-sm transition-colors"
                                      title="View Details"
                                      type="button"
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Section 2: Calendar Events (Simplified list items) */}
              {showEvents && (
                <section>
                  <div className="flex items-center justify-between mb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        calendar_month
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Activities & Calendar Events
                      </h2>
                    </div>
                    <span className="text-label-sm font-label-sm text-outline">
                      {eventsCount} {eventsCount === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  {eventsCount === 0 ? (
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest text-center text-body-sm text-on-surface-variant">
                      No calendar events found for this query.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
                      {results.events.map((event) => {
                        const eventDate = event.date ? new Date(event.date) : new Date();
                        const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                        const day = eventDate.getDate();

                        return (
                          <div
                            key={event.id || event._id}
                            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 hover:border-primary/40 transition-all flex items-start gap-space-md group"
                          >
                            {/* Date Box */}
                            <div className="bg-surface-container-low text-primary rounded-xl p-space-xs w-14 text-center shrink-0 border border-outline-variant/20">
                              <span className="block font-label-sm text-label-sm font-bold text-secondary uppercase">
                                {month}
                              </span>
                              <span className="block font-headline-md text-headline-md font-extrabold text-on-surface">
                                {day}
                              </span>
                            </div>

                            {/* Event Details */}
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-space-xs mb-1">
                                {event.course && (
                                  <span className="px-1.5 py-0.5 rounded font-label-sm text-label-sm bg-surface-container text-primary font-semibold">
                                    {event.course}
                                  </span>
                                )}
                                {event.type && (
                                  <span className="text-label-sm font-label-sm text-outline">
                                    {event.type}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-title-sm text-title-sm text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                                {event.title}
                              </h3>
                              <div className="flex flex-col gap-0.5 text-body-sm font-body-sm text-on-surface-variant mt-1.5">
                                {event.time && (
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[15px] text-outline">
                                      schedule
                                    </span>
                                    <span>{event.time}</span>
                                  </div>
                                )}
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[15px] text-outline">
                                      location_on
                                    </span>
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                                {event.speaker && (
                                  <div className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[15px] text-outline">
                                      person
                                    </span>
                                    <span>{event.speaker}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Section 3: Course Materials */}
              {showMaterials && (
                <section>
                  <div className="flex items-center justify-between mb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">
                        menu_book
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Course Materials
                      </h2>
                    </div>
                    <span className="text-label-sm font-label-sm text-outline">
                      {materialsCount} {materialsCount === 1 ? 'match' : 'matches'}
                    </span>
                  </div>

                  {materialsCount === 0 ? (
                    <div className="p-space-lg rounded-xl bg-surface-container-lowest text-center text-body-sm text-on-surface-variant">
                      No course materials found for this query.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
                      {results.materials.map((material) => {
                        const materialDate = material.date ? new Date(material.date) : new Date();
                        const month = materialDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                        const day = materialDate.getDate();

                        return (
                          <div
                            key={material.id || material._id}
                            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 hover:border-primary/40 transition-all flex items-start gap-space-md group"
                          >
                            {/* Date Box */}
                            <div className="bg-surface-container-low text-primary rounded-xl p-space-xs w-14 text-center shrink-0 border border-outline-variant/20">
                              <span className="block font-label-sm text-label-sm font-bold text-secondary uppercase">
                                {month}
                              </span>
                              <span className="block font-headline-md text-headline-md font-extrabold text-on-surface">
                                {day}
                              </span>
                            </div>

                            {/* Material Details */}
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-space-xs mb-1">
                                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                                <span className="text-label-sm font-label-sm text-primary font-semibold">Material</span>
                              </div>
                              <h3 className="font-title-sm text-title-sm text-on-surface font-semibold group-hover:text-primary transition-colors truncate">
                                {material.title}
                              </h3>
                              <div className="flex flex-col gap-0.5 text-body-sm font-body-sm text-on-surface-variant mt-1.5">
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px] text-outline">calendar_today</span>
                                  <span>{materialDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Load More Button */}
              {hasMore && totalCount > 0 && (
                <div className="text-center mt-space-xl">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-space-xl py-3 rounded-xl bg-primary-container text-on-primary hover:bg-primary font-title-sm text-title-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mx-auto"
                  >
                    {isLoadingMore ? (
                      <span>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        Loading more...
                      </span>
                    ) : (
                      <span>
                        <span>Load More Results</span>
                        <span className="material-symbols-outlined text-[20px]">keyboard_arrow_down</span>
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

          )}
        </div>
      </div>
    </Layout>
  );
}