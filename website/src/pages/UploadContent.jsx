import React, { useState, useEffect } from 'react';

export default function UploadContent() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'my_uploads'
  const [contentType, setContentType] = useState('video'); // 'video' | 'material'
  const [videoMode, setVideoMode] = useState('youtube'); // 'youtube' | 'file'

  const [batches, setBatches] = useState([]);
  const [topics, setTopics] = useState([]);
  const [myVideos, setMyVideos] = useState([]);
  const [myMaterials, setMyMaterials] = useState([]);

  const [loadingBatches, setLoadingBatches] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingUploads, setFetchingUploads] = useState(false);

  // Form State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState('0');

  // File Upload State
  const [videoFile, setVideoFile] = useState(null);
  const [notesFile, setNotesFile] = useState(null);
  const [materialFile, setMaterialFile] = useState(null);

  // Quick Login State if token missing
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }
    fetchInitialData();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setSuccessMsg('Logged in successfully!');
      fetchInitialData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchInitialData = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoadingBatches(false);
      return;
    }

    setLoadingBatches(true);
    try {
      // Try instructor schedule first, fallback to all courses/batches for admin
      let bRes = await fetch(`${API_URL}/api/instructors/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!bRes.ok) {
        bRes = await fetch(`${API_URL}/api/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        setBatches(bData || []);
        if (bData.length > 0) {
          const firstId = bData[0]._id;
          setSelectedBatchId(firstId);
          fetchTopics(firstId);
        }
      }
    } catch (e) {
      console.warn('Failed to load batches:', e);
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchTopics = async (batchId) => {
    const token = getAuthToken();
    if (!token || !batchId) return;

    try {
      const res = await fetch(`${API_URL}/api/instructors/batches/${batchId}/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const tData = await res.json();
        setTopics(tData || []);
      }
    } catch (e) {
      setTopics([]);
    }
  };

  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId);
    setSelectedTopic('');
    setNewTopic('');
    fetchTopics(batchId);
  };

  const fetchMyUploads = async () => {
    const token = getAuthToken();
    if (!token) return;

    setFetchingUploads(true);
    try {
      const [vRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/instructors/videos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/instructors/materials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (vRes.ok) setMyVideos(await vRes.json());
      if (mRes.ok) setMyMaterials(await mRes.json());
    } catch (e) {
      console.warn('Failed to fetch my uploads:', e);
    } finally {
      setFetchingUploads(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_uploads') {
      fetchMyUploads();
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const token = getAuthToken();
    if (!token) {
      setErrorMsg('Please log in as Instructor or Admin to upload content.');
      return;
    }

    const finalTopic = newTopic.trim() || selectedTopic;
    if (!selectedBatchId) return setErrorMsg('Please select a target batch');
    if (!finalTopic) return setErrorMsg('Please select or enter a topic name');
    if (!title.trim()) return setErrorMsg('Please enter a content title');

    const formData = new FormData();
    formData.append('batch_id', selectedBatchId);
    formData.append('topic', finalTopic);
    formData.append('title', title.trim());
    formData.append('order_index', orderIndex || '0');

    setSubmitting(true);

    try {
      let endpoint = `${API_URL}/api/instructors/videos`;

      if (contentType === 'video') {
        if (videoMode === 'youtube') {
          if (!youtubeUrl.trim()) throw new Error('Please enter a YouTube video URL');
          formData.append('youtube_url', youtubeUrl.trim());
        } else {
          if (!videoFile) throw new Error('Please select a video file (MP4/WebM)');
          formData.append('video', videoFile);
        }
        if (notesFile) {
          formData.append('notes', notesFile);
        }
      } else {
        endpoint = `${API_URL}/api/instructors/materials`;
        if (!materialFile) throw new Error('Please select a material document (PDF/DOC/DOCX)');
        formData.append('material', materialFile);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Upload failed');

      setSuccessMsg(`✨ ${contentType === 'video' ? 'Video' : 'Material'} uploaded successfully to Cloudinary! Instant notification sent to enrolled students.`);
      
      // Reset form
      setTitle('');
      setYoutubeUrl('');
      setVideoFile(null);
      setNotesFile(null);
      setMaterialFile(null);
      setNewTopic('');

      // Refresh topics
      fetchTopics(selectedBatchId);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, itemTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${itemTitle}"?`)) return;

    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/instructors/videos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMyVideos((prev) => prev.filter((v) => v._id !== id));
        setMyMaterials((prev) => prev.filter((m) => m._id !== id));
        setSuccessMsg('Upload deleted successfully');
      }
    } catch (e) {
      setErrorMsg('Failed to delete upload');
    }
  };

  // If user is not logged in or token missing, show Quick Staff Login Form
  if (!getAuthToken()) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans py-20 px-4">
        <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <span className="text-brand-orange text-xs font-bold uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              Staff Portal Access
            </span>
            <h2 className="font-heading font-black text-2xl text-white mt-3 uppercase">Instructor & Admin Sign In</h2>
            <p className="text-xs text-zinc-400 mt-1">Please sign in to upload course videos and study notes to Cloudinary.</p>
          </div>

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-4 font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Staff Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="instructor@tvti.edu"
                className="w-full bg-black border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-brand-orange text-black font-heading font-black text-sm uppercase tracking-wider py-3.5 rounded-xl hover:bg-orange-400 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Signing In...' : 'Sign In to Upload Content'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-b border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-brand-orange text-xs font-bold uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              Cloudinary Media Upload Engine
            </span>
            <h1 className="font-heading font-black text-2xl sm:text-3xl text-white mt-2 uppercase tracking-wide">
              Upload Videos & Course Materials
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              Upload YouTube lectures, MP4 video streams, and PDF notes. Notifications will be pushed automatically to enrolled students.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'upload' ? 'bg-brand-orange text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Upload Form
            </button>
            <button
              onClick={() => setActiveTab('my_uploads')}
              className={`px-5 py-2.5 rounded-xl text-xs font-heading font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'my_uploads' ? 'bg-brand-orange text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              My Uploads
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Success & Error Banners */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-2xl mb-6 font-semibold flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} className="text-xs text-red-400 font-bold hover:underline">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-4 rounded-2xl mb-6 font-semibold flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-xs text-emerald-400 font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {activeTab === 'upload' ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Content Type Toggle */}
            <div className="flex bg-black border border-zinc-800 p-1 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={`flex-1 py-3 text-xs font-heading font-bold uppercase tracking-wider rounded-xl transition-all ${
                  contentType === 'video' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                🎥 Video Lecture (YouTube / MP4)
              </button>
              <button
                type="button"
                onClick={() => setContentType('material')}
                className={`flex-1 py-3 text-xs font-heading font-bold uppercase tracking-wider rounded-xl transition-all ${
                  contentType === 'material' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                📄 Study Material (PDF / Document)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Select Target Batch *
                </label>
                {loadingBatches ? (
                  <div className="text-xs text-zinc-500">Loading batches...</div>
                ) : (
                  <select
                    required
                    value={selectedBatchId}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="w-full bg-black border border-zinc-700 text-white text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange cursor-pointer"
                  >
                    {batches.length === 0 ? (
                      <option value="">No batches found</option>
                    ) : (
                      batches.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.name || b.course_id?.title || 'Batch'}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Topic Selector / New Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Existing Topic
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => { setSelectedTopic(e.target.value); setNewTopic(''); }}
                    className="w-full bg-black border border-zinc-700 text-white text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange cursor-pointer"
                  >
                    <option value="">-- Choose existing topic --</option>
                    {topics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Or Enter New Topic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engine Assembly & Diagnostics"
                    value={newTopic}
                    onChange={(e) => { setNewTopic(e.target.value); setSelectedTopic(''); }}
                    className="w-full bg-black border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Title & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    {contentType === 'video' ? 'Video Title *' : 'Material Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={contentType === 'video' ? 'e.g. Practical Engine Repair Part 1' : 'e.g. Wiring Diagram PDF'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Sort Order Index
                  </label>
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(e.target.value)}
                    className="w-full bg-black border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              {/* Video Specific Section */}
              {contentType === 'video' ? (
                <div className="space-y-4 pt-2 border-t border-zinc-800">
                  <div className="flex items-center space-x-6 text-xs font-bold text-zinc-400">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vMode"
                        checked={videoMode === 'youtube'}
                        onChange={() => setVideoMode('youtube')}
                        className="text-brand-orange focus:ring-0"
                      />
                      <span className={videoMode === 'youtube' ? 'text-brand-orange' : ''}>YouTube Link</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="vMode"
                        checked={videoMode === 'file'}
                        onChange={() => setVideoMode('file')}
                        className="text-brand-orange focus:ring-0"
                      />
                      <span className={videoMode === 'file' ? 'text-brand-orange' : ''}>Upload Video File (Cloudinary)</span>
                    </label>
                  </div>

                  {videoMode === 'youtube' ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                        YouTube Video URL *
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="w-full bg-black border border-zinc-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                        Select Video File (MP4, WebM) *
                      </label>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/*"
                        onChange={(e) => setVideoFile(e.target.files[0])}
                        className="w-full bg-black border border-zinc-700 text-zinc-400 text-xs rounded-xl p-3 file:bg-zinc-800 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Optional Attached PDF Notes */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Optional Attached PDF Notes
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setNotesFile(e.target.files[0])}
                      className="w-full bg-black border border-zinc-700 text-zinc-400 text-xs rounded-xl p-3 file:bg-zinc-800 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                /* Material Specific Section */
                <div className="pt-2 border-t border-zinc-800">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    Select Material Document (PDF, DOC, DOCX) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setMaterialFile(e.target.files[0])}
                    className="w-full bg-black border border-zinc-700 text-zinc-400 text-xs rounded-xl p-3 file:bg-zinc-800 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 cursor-pointer"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-orange text-black font-heading font-black text-sm uppercase tracking-wider py-4 rounded-2xl hover:bg-orange-400 transition-colors shadow-xl disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading to Cloudinary & Notifying Students...</span>
                  </>
                ) : (
                  <span>🚀 Upload Content Now</span>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* My Uploads List Tab */
          <div className="space-y-6">
            {fetchingUploads ? (
              <div className="text-center py-16 text-zinc-500">Loading your uploads...</div>
            ) : myVideos.length === 0 && myMaterials.length === 0 ? (
              <div className="p-12 bg-zinc-900 border border-zinc-800 rounded-3xl text-center text-zinc-400">
                <p className="font-semibold text-sm">No uploaded videos or materials found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-heading font-extrabold text-sm text-zinc-400 uppercase tracking-wider">
                  Uploaded Videos ({myVideos.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {myVideos.map((v) => (
                    <div key={v._id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{v.title}</h4>
                          <p className="text-xs text-zinc-400">Topic: {v.topic} | Batch: {v.batch_id?.name || 'Batch'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(v._id, v.title)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <h3 className="font-heading font-extrabold text-sm text-zinc-400 uppercase tracking-wider pt-6">
                  Uploaded Study Materials ({myMaterials.length})
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {myMaterials.map((m) => (
                    <div key={m._id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{m.title}</h4>
                          <p className="text-xs text-zinc-400">Topic: {m.topic} | Batch: {m.batch_id?.name || 'Batch'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(m._id, m.title)}
                        className="text-red-400 hover:text-red-300 text-xs font-bold p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
