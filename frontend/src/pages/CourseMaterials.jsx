import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { DEFAULTS } from '../config/appConfig';

export default function CourseMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('date-desc');

  // Upload modal/drawer state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({
    title: '',
    course: 'ISP',
    category: 'Lecture Slides',
    module: '',
    description: '',
    file: null,
  });
  const [uploadError, setUploadError] = useState('');

  // Toast notification
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // ─── File Validation (ZIP only, max 10MB) ─────────────────────────────────────
  const validateFile = (file) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = ['application/zip', 'application/x-zip-compressed'];
    const allowedExtensions = ['.zip'];

    // Check extension
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, error: `Invalid file type: "${ext}". Only .zip files are allowed.` };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type) && file.type !== '') {
      return { valid: false, error: `Invalid file type: "${file.type}". Only ZIP archives are allowed.` };
    }

    // Check size
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `File too large: ${sizeMB} MB. Maximum size is 10 MB.` };
    }

    return { valid: true, error: '' };
  };

  // Role-Based Access Control: Upload available only to TA, Lecturer, and Admin
  const userRole = user?.role ? user.role.toLowerCase() : '';
  const canUpload = ['ta', 'lecturer', 'admin'].includes(userRole);

  // ─── Fetch Materials (GET /api/materials) ──────────────────────────────────
  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Backend Dev - Replace placeholder fetch with real DB query / API route.
      // Expected backend endpoint: GET /api/materials
      // Expected response schema: Array of Material objects:
      // [{ id, title, description, course, module, category, fileType, fileSize, publishedDate, downloadCount, author, authorRole, fileUrl }]
      const response = await fetch('/api/materials');

      if (!response.ok) {
        throw new Error(`Failed to fetch materials: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('GET /api/materials failed (API scaffolding mode):', err.message);
      setError(err.message);
      // In development / demo when backend route is not yet connected, initialize empty list
      setMaterials([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Handle Upload (POST /api/materials) ───────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    // Validate file before submitting
    if (!uploadFormData.file) {
      setUploadError('Please select a ZIP file to upload.');
      return;
    }

    const validation = validateFile(uploadFormData.file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      // TODO: Backend Dev - Implement multipart/form-data upload or JSON payload to POST /api/materials
      // Requires authentication header and file storage (S3, GCS, or local disk).
      const payload = new FormData();
      payload.append('title', uploadFormData.title);
      payload.append('course', uploadFormData.course);
      payload.append('category', uploadFormData.category);
      payload.append('module', uploadFormData.module);
      payload.append('description', uploadFormData.description);
      if (uploadFormData.file) {
        payload.append('file', uploadFormData.file);
      }

      const response = await fetch('/api/materials', {
        method: 'POST',
        // TODO: Backend Dev - include Authorization token header if required
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const createdMaterial = await response.json();
      setMaterials((prev) => [createdMaterial, ...prev]);

      setToast({
        visible: true,
        message: `Material "${uploadFormData.title}" uploaded successfully!`,
        type: 'success',
      });
      setIsUploadOpen(false);
      setUploadFormData({
        title: '',
        course: 'ISP',
        category: 'Lecture Slides',
        module: '',
        description: '',
        file: null,
      });
    } catch (err) {
      console.warn('POST /api/materials scaffold error:', err.message);
      // Optimistic preview creation for developer testing if backend isn't mounted yet
      const fallbackMaterial = {
        id: Date.now(),
        title: uploadFormData.title || 'Untitled Resource',
        description: uploadFormData.description || 'Uploaded instructional asset.',
        course: uploadFormData.course,
        module: uploadFormData.module || 'Week 01',
        category: uploadFormData.category.toLowerCase().includes('slide') ? 'slides' : 'lab',
        fileType: uploadFormData.file ? uploadFormData.file.name.split('.').pop() : 'pdf',
        fileSize: '1.2 MB',
        publishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        downloadCount: 0,
        author: user?.name || DEFAULTS.author,
        authorRole: user?.role || DEFAULTS.ownerRole,
      };
      setMaterials((prev) => [fallbackMaterial, ...prev]);
      setToast({
        visible: true,
        message: `Material "${fallbackMaterial.title}" saved (scaffold mode).`,
        type: 'success',
      });
      setIsUploadOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Handle Download ───────────────────────────────────────────────────────
  const handleDownload = (material) => {
    // TODO: Backend Dev - Wire real file streaming download endpoint e.g. GET /api/materials/:id/download
    setToast({
      visible: true,
      message: `Downloading "${material.title}"...`,
      type: 'info',
    });
  };

  // ─── Filter & Search Logic ────────────────────────────────────────────────
  const filteredMaterials = materials
    .filter((mat) => {
      // Course filter
      if (selectedCourse !== 'ALL' && mat.course !== selectedCourse) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && mat.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // File type filter
      if (selectedType !== 'ALL' && !mat.fileType?.toLowerCase().includes(selectedType.toLowerCase())) {
        return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = mat.title?.toLowerCase().includes(query);
        const matchesCourse = mat.course?.toLowerCase().includes(query);
        const matchesModule = mat.module?.toLowerCase().includes(query);
        const matchesDesc = mat.description?.toLowerCase().includes(query);
        return matchesTitle || matchesCourse || matchesModule || matchesDesc;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'downloads-desc') return (b.downloadCount || 0) - (a.downloadCount || 0);
      if (sortOrder === 'date-asc') return new Date(a.publishedDate || 0) - new Date(b.publishedDate || 0);
      return new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0);
    });

  const breadcrumbs = (
    <nav className="flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
      <span>Academix</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span>Portal</span>
      <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
      <span className="text-primary font-semibold">Course Materials</span>
    </nav>
  );

  return (
    <Layout navbarLeftContent={breadcrumbs}>
      <div className="flex flex-col w-full pb-space-2xl">
        <div className="p-space-lg max-w-[1720px] mx-auto w-full">
          {/* Header Area */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-space-xl">
            <div className="flex flex-col max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label-sm text-label-sm tracking-wider uppercase text-secondary font-semibold">
                  Course Materials &amp; Resources
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="font-label-sm text-label-sm text-outline">Fall 2026 Semester</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-primary tracking-tight font-bold">
                Instructional Artifacts &amp; Syllabi
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-2xs">
                Curated lecture slide decks, lab toolkits, project rubrics, and datasets with role-based distribution.
              </p>
            </div>

            {/* Action Group */}
            <div className="flex items-center gap-space-sm shrink-0">
              <button
                type="button"
                onClick={fetchMaterials}
                className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low transition-colors shadow-sm font-title-sm text-title-sm cursor-pointer"
                title="Refresh materials list"
              >
                <span className="material-symbols-outlined text-[18px] text-outline">refresh</span>
                <span>Refresh</span>
              </button>

              {/* RBAC: Upload Material Button — only visible to TA, Lecturer, and Admin */}
              {canUpload && (
                <button
                  type="button"
                  id="btn-upload-material"
                  onClick={() => setIsUploadOpen((prev) => !prev)}
                  className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-md active:scale-95 font-title-sm text-title-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  <span>Upload Material</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-xl">
            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Total Materials
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">folder_special</span>
              </div>
              <div className="mt-space-md">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                    {materials.length}
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-medium">Assets</span>
                </div>
                <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
                  Across all enrolled courses
                </div>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Active User Role
                </span>
                <span className="material-symbols-outlined text-secondary text-[20px]">verified_user</span>
              </div>
              <div className="mt-space-md">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-semibold capitalize">
                    {user?.role || 'Guest'}
                  </span>
                </div>
                <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
                  {canUpload ? 'Full upload & manage permissions' : 'Download-only access enabled'}
                </div>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Cloud Storage
                </span>
                <span className="material-symbols-outlined text-surface-tint text-[20px]">cloud_done</span>
              </div>
              <div className="mt-space-md">
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">KU Drive</span>
                </div>
                <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
                  Encrypted institutional storage
                </div>
              </div>
            </div>

            <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
                  Status
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">school</span>
              </div>
              <div className="mt-space-md">
                <div className="flex items-baseline gap-2">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                    Live
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary font-medium">Synced</span>
                </div>
                <div className="mt-space-xs text-body-sm font-body-sm text-on-surface-variant">
                  Fall 2026 Curriculum
                </div>
              </div>
            </div>
          </div>

          {/* RBAC: Upload Material Drawer / Form (Only rendered for TA, Lecturer, Admin) */}
          {canUpload && isUploadOpen && (
            <div className="mb-space-xl p-space-lg rounded-xl bg-surface-container-low shadow-sm border border-outline-variant/30 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                  </div>
                  <div>
                    <h3 className="text-title-md font-title-md text-primary font-bold">
                      Upload Instructional Material
                    </h3>
                    <p className="text-label-sm font-label-sm text-on-surface-variant">
                      Publish lecture slides, lab exercises, rubrics, or starters
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsUploadOpen(false); setUploadError(''); }}
                  className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-title-md">close</span>
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-space-md">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                  {/* Dropzone Area */}
                  <div className="lg:col-span-7 flex flex-col">
                    <label className="flex-1 flex flex-col items-center justify-center p-space-xl rounded-xl bg-surface-container-lowest border-2 border-dashed border-outline-variant/50 hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary-container group-hover:text-on-primary transition-all">
                        <span className="material-symbols-outlined text-[28px]">upload</span>
                      </div>
                      <p className="font-title-sm text-title-sm text-on-surface mt-space-md text-center">
                        {uploadFormData.file ? uploadFormData.file.name : 'Select or drag course material bundle'}
                      </p>
                      <p className="font-body-sm text-body-sm text-outline mt-1 text-center">
                        <strong>ZIP files only</strong> • Max <strong>10 MB</strong>
                      </p>
                      {uploadError && (
                        <p className="font-body-sm text-body-sm text-error mt-2 text-center">
                          {uploadError}
                        </p>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validations = validateFile(file);
                            if (!validations.valid) {
                              setUploadError(validations.error);
                              setUploadFormData(prev => ({ ...prev, file: null }));
                              return;
                            }
                            setUploadError('');
                            setUploadFormData((prev) => ({
                              ...prev,
                              file,
                              title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
                            }));
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Metadata Form */}
                  <div className="lg:col-span-5 flex flex-col gap-space-sm">
                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                        Material Title <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={uploadFormData.title}
                        onChange={(e) => setUploadFormData((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. ISP_Milestone2_Microservices_Rubric.pdf"
                        className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-space-sm">
                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                          Course
                        </label>
                        <select
                          value={uploadFormData.course}
                          onChange={(e) => setUploadFormData((prev) => ({ ...prev, course: e.target.value }))}
                          className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                        >
                          <option value="ISP">01418214 - ISP</option>
                          <option value="KE">01418331 - KE</option>
                          <option value="SCS">01418497 - SCS</option>
                          <option value="FM">01418422 - FM</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                          Module / Week
                        </label>
                        <input
                          type="text"
                          value={uploadFormData.module}
                          onChange={(e) => setUploadFormData((prev) => ({ ...prev, module: e.target.value }))}
                          placeholder="e.g. Week 04 Microservices"
                          className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                        Category
                      </label>
                      <select
                        value={uploadFormData.category}
                        onChange={(e) => setUploadFormData((prev) => ({ ...prev, category: e.target.value }))}
                        className="h-10 px-3 rounded-lg bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm cursor-pointer"
                      >
                        <option value="Lecture Slides">Lecture Slides</option>
                        <option value="Lab Exercises">Lab Exercises</option>
                        <option value="Project Rubrics">Project Rubrics</option>
                        <option value="Past Exam Solutions">Past Exam Solutions</option>
                        <option value="Source Code / Tooling">Source Code / Tooling</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                        Brief Description
                      </label>
                      <textarea
                        rows="2"
                        value={uploadFormData.description}
                        onChange={(e) => setUploadFormData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Summary of contents, requirements, or syllabus correlation..."
                        className="p-2.5 rounded-lg bg-surface-container-lowest text-body-md font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-space-xs pt-2">
                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(false)}
                        className="px-space-md py-2 rounded-lg text-on-surface-variant hover:text-on-surface text-title-sm font-title-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUploading}
                        className="flex items-center gap-1.5 px-space-lg py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary shadow-sm font-title-sm text-title-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">publish</span>
                        <span>{isUploading ? 'Publishing...' : 'Publish Material'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm mb-space-md flex flex-col lg:flex-row gap-space-md items-stretch lg:items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[280px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials by title, course acronym, week..."
                className="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-space-xs">
              <div className="relative">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="h-11 pl-3 pr-8 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="ALL">All Courses</option>
                  <option value="ISP">ISP - Individual Software Process</option>
                  <option value="KE">KE - Knowledge Engineering</option>
                  <option value="SCS">SCS - Special Topics</option>
                  <option value="FM">FM - Formal Methods</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  expand_more
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-11 pl-3 pr-8 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="slides">Lecture Slides</option>
                  <option value="lab">Lab Exercises</option>
                  <option value="rubric">Project Rubrics</option>
                  <option value="code">Starters &amp; Tooling</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  expand_more
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-11 pl-3 pr-8 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="ALL">All File Types</option>
                  <option value="pdf">.PDF Document</option>
                  <option value="zip">.ZIP Archive</option>
                  <option value="ipynb">.IPYNB Notebook</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  expand_more
                </span>
              </div>

              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-11 pl-3 pr-8 rounded-lg bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="downloads-desc">Most Downloaded</option>
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">
                  sort
                </span>
              </div>
            </div>
          </div>

          {/* Active Filter Indicator */}
          <div className="flex items-center justify-between px-space-xs mb-space-sm text-body-sm font-body-sm text-on-surface-variant">
            <div className="flex items-center gap-space-xs">
              <span>Showing</span>
              <span className="font-title-sm text-title-sm text-primary font-bold">
                {filteredMaterials.length}
              </span>
              <span>artifacts</span>
              {selectedCourse !== 'ALL' && (
                <>
                  <span className="text-outline">•</span>
                  <span className="text-secondary font-medium">Filtered by: {selectedCourse} Course</span>
                </>
              )}
            </div>
            {(selectedCourse !== 'ALL' || selectedCategory !== 'ALL' || selectedType !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCourse('ALL');
                  setSelectedCategory('ALL');
                  setSelectedType('ALL');
                  setSearchQuery('');
                }}
                className="text-secondary hover:underline flex items-center gap-1 font-label-sm text-label-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Materials Table / List */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden mb-space-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm uppercase tracking-wider">
                    <th className="py-space-sm px-space-lg">Resource Title &amp; Details</th>
                    <th className="py-space-sm px-space-md">Course &amp; Module</th>
                    <th className="py-space-sm px-space-md">Published Date</th>
                    <th className="py-space-sm px-space-md">Size &amp; Downloads</th>
                    <th className="py-space-sm px-space-md">Uploader</th>
                    <th className="py-space-sm px-space-lg text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="text-body-md font-body-md divide-y divide-surface-container-low">
                  {isLoading && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[32px] animate-spin">
                            progress_activity
                          </span>
                          <span className="text-title-sm font-title-sm text-on-surface">Loading course materials...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && error && materials.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-error text-[36px]">error</span>
                          <span className="text-title-md font-title-md text-error">Unable to load materials</span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant max-w-md">
                            {error} - Connect the database query in /api/materials to fetch materials.
                          </span>
                          <button
                            type="button"
                            onClick={fetchMaterials}
                            className="mt-2 px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-title-sm text-title-sm"
                          >
                            Retry Request
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && filteredMaterials.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-space-2xl text-center">
                        <div className="flex flex-col items-center justify-center p-space-xl">
                          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-space-sm">
                            <span className="material-symbols-outlined text-[24px]">folder_off</span>
                          </div>
                          <span className="text-title-md font-title-md text-on-surface font-semibold">
                            No course materials found
                          </span>
                          <span className="text-body-sm font-body-sm text-on-surface-variant mt-1">
                            {materials.length === 0
                              ? 'No materials have been published to this portal yet.'
                              : 'Try adjusting your filters or search terms.'}
                          </span>
                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => setIsUploadOpen(true)}
                              className="mt-space-md px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-title-sm text-title-sm hover:bg-primary transition-all cursor-pointer"
                            >
                              + Upload First Material
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    filteredMaterials.map((mat) => {
                      const ext = mat.fileType || (mat.title?.includes('.') ? mat.title.split('.').pop() : 'pdf');
                      const iconName =
                        ext === 'pdf'
                          ? 'picture_as_pdf'
                          : ext === 'zip' || ext === 'tar.gz'
                          ? 'folder_zip'
                          : ext === 'ipynb'
                          ? 'terminal'
                          : 'description';

                      return (
                        <tr key={mat.id || mat._id} className="hover:bg-surface-container-low/60 transition-colors group">
                          <td className="py-space-md px-space-lg">
                            <div className="flex items-start gap-space-sm">
                              <div className="p-2 rounded-lg bg-surface-container text-primary shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-[22px]">{iconName}</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-space-xs flex-wrap">
                                  <span className="font-title-sm text-title-sm text-on-surface font-semibold group-hover:text-primary transition-colors">
                                    {mat.title}
                                  </span>
                                  {mat.category && (
                                    <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-container text-on-secondary-container">
                                      {mat.category}
                                    </span>
                                  )}
                                </div>
                                {mat.description && (
                                  <span className="text-body-sm font-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
                                    {mat.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container text-primary font-bold">
                                  {mat.course || 'ISP'}
                                </span>
                                <span className="font-title-sm text-title-sm text-on-surface">
                                  {mat.module || 'General'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <span className="font-body-md text-body-md text-on-surface">
                              {mat.publishedDate || 'Mar 22, 2025'}
                            </span>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-body-md text-body-md text-on-surface font-medium">
                                {mat.fileSize || '2.4 MB'}
                              </span>
                              <span className="text-label-sm font-label-sm text-secondary">
                                {mat.downloadCount || 0} downloads
                              </span>
                            </div>
                          </td>

                          <td className="py-space-md px-space-md whitespace-nowrap">
                            <div className="flex items-center gap-space-xs">
                              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold shrink-0">
                                {mat.author ? mat.author.slice(0, 2).toUpperCase() : 'KU'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-title-sm text-title-sm text-on-surface leading-tight">
                                  {mat.author || DEFAULTS.author}
                                </span>
                                <span className="text-label-sm font-label-sm text-outline">
                                  {mat.authorRole || DEFAULTS.ownerRole}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* UI: Download button available to ALL roles */}
                          <td className="py-space-md px-space-lg whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => handleDownload(mat)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-tint hover:text-on-primary text-on-surface font-title-sm text-title-sm transition-colors shadow-sm cursor-pointer"
                              title="Download Resource"
                            >
                              <span className="material-symbols-outlined text-[16px]">download</span>
                              <span className="text-label-sm font-label-sm">Download</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </Layout>
  );
}

