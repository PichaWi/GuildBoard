// Shared application configuration - single source of truth for UI options
// Used by components instead of hardcoded values

// Staff members available for assignment (lecturers, TAs, admins)
// In production, this would come from GET /api/users?role=staff
export const STAFF_OPTIONS = [
  { value: 'Aj. Hutchathai', label: 'Aj. Hutchathai (Course Director)', role: 'lecturer' },
  { value: 'Aj. Milk', label: 'Aj. Milk (TA - Distributed Systems)', role: 'ta' },
  { value: 'Aj. Tem', label: 'Aj. Tem (Architecture Lead)', role: 'lecturer' },
  { value: 'Aj. Pajee', label: 'Aj. Pajee (Lecturer)', role: 'lecturer' },
  { value: 'Dr. Ryan Gosling', label: 'Dr. Ryan Gosling (Faculty Lead)', role: 'lecturer' },
  { value: 'Alex Chen (TA)', label: 'Alex Chen (TA)', role: 'ta' },
];

// Lecturer/instructor options for event creation
// Subset of STAFF_OPTIONS filtered for lecturers
export const LECTURER_OPTIONS = STAFF_OPTIONS.filter(s => s.role === 'lecturer')
  .map(s => ({ value: s.value, label: s.label }));

// Course codes available in the system
export const COURSE_OPTIONS = [
  { value: 'ISP', label: 'ISP - Individual Software Development Process' },
  { value: 'KE', label: 'KE - Knowledge Engineering' },
  { value: 'SCS', label: 'SCS - Software Communication Skills' },
  { value: 'FM', label: 'FM - Folk Music & Acoustic Culture' },
];

// Event classification types
export const EVENT_TYPE_OPTIONS = [
  { value: 'Lecture', label: 'Lecture (Classroom & Broadcast)' },
  { value: 'Lab', label: 'Lab (Hands-on Practicum)' },
  { value: 'Project Milestone', label: 'Project Milestone (Major Checkpoint)' },
  { value: 'Assignment Due', label: 'Assignment Due' },
  { value: 'Workshop', label: 'Workshop / Guest Speaker' },
];

// Default fallback values (generic, not person-specific)
export const DEFAULTS = {
  assignee: 'Unassigned',
  author: 'Unknown Author',
  ownerRole: 'Staff',
  creator: 'Unknown Creator',
  instructor: 'TBA',
  location: 'TBA',
  profileName: 'User',
};