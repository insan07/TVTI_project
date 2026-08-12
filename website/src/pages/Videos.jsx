import React, { useState, useEffect } from 'react';

export default function Videos() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [videos, setVideos] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamLoading, setStreamLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'materials'

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/students/batches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data || []);
        if (data.length > 0) {
          setSelectedBatchId(data[0]._id);
          fetchBatchContent(data[0]._id);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch batches:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchContent = async (batchId) => {
    const token = getAuthToken();
    if (!token || !batchId) return;

    setLoading(true);
    try {
      const [vRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/students/batches/${batchId}/videos`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/students/batches/${batchId}/materials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (vRes.ok) {
        const vData = await vRes.json();
        setVideos(vData || []);
        if (vData.length > 0) {
          playVideo(vData[0]);
        } else {
          setSelectedVideo(null);
          setStreamData(null);
        }
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setMaterials(mData || []);
      }
    } catch (e) {
      console.warn('Failed to load batch content:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = (batchId) => {
    setSelectedBatchId(batchId);
    fetchBatchContent(batchId);
  };

  const playVideo = async (video) => {
    setSelectedVideo(video);
    setStreamLoading(true);

    const token = getAuthToken();
    if (!token) {
      setStreamLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/students/videos/${video._id}/stream-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStreamData(data);
      }
    } catch (e) {
      console.warn('Failed to get stream url:', e);
    } finally {
      setStreamLoading(false);
    }
  };

  // Group videos by topic
  const groupedVideos = videos.reduce((acc, v) => {
    const topic = v.topic || 'General Module';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(v);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-black to-zinc-900 border-b border-zinc-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-brand-orange text-xs font-bold uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              Student Learning Portal
            </span>
            <h1 className="font-heading font-black text-2xl sm:text-4xl text-white mt-3 uppercase tracking-wide">
              Course Video Lectures & Study Notes
            </h1>
            <p className="text-zinc-400 text-sm mt-1 max-w-xl">
              Access your interactive practical modules, HD video demonstrations, and downloadable PDF study notes.
            </p>
          </div>

          {/* Batch Selector */}
          {batches.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl min-w-[280px]">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Select Active Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full bg-black border border-zinc-700 text-white text-sm font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-orange cursor-pointer"
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name || b.course_id?.title || 'Batch'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-zinc-400 text-sm">Loading course modules...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8">
            <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="font-heading font-extrabold text-xl text-white uppercase">No Enrolled Batches Found</h3>
            <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
              You are currently not enrolled in an active course batch. Please await admin application review or contact support.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left/Main Column: Video Player & Overview (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Tab Selector */}
              <div className="flex border-b border-zinc-800 space-x-6">
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`pb-3 font-heading font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'videos'
                      ? 'border-brand-orange text-brand-orange'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  Video Lectures ({videos.length})
                </button>
                <button
                  onClick={() => setActiveTab('materials')}
                  className={`pb-3 font-heading font-bold text-sm uppercase tracking-wider transition-colors border-b-2 ${
                    activeTab === 'materials'
                      ? 'border-brand-orange text-brand-orange'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  Study Materials ({materials.length})
                </button>
              </div>

              {activeTab === 'videos' ? (
                <>
                  {/* Video Player Display Container */}
                  <div className="bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl relative min-h-[320px] flex items-center justify-center">
                    {streamLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs text-zinc-400">Loading video stream...</p>
                      </div>
                    ) : streamData?.url ? (
                      streamData.type === 'youtube' ? (
                        <iframe
                          src={streamData.url}
                          title={selectedVideo?.title || 'Video Player'}
                          className="w-full aspect-video border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <video
                          src={streamData.url}
                          controls
                          controlsList="nodownload"
                          className="w-full aspect-video bg-black"
                        ></video>
                      )
                    ) : (
                      <div className="text-center p-8">
                        <svg className="w-16 h-16 mx-auto text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-zinc-400 font-medium">Select a video module from the playlist to watch</p>
                      </div>
                    )}
                  </div>

                  {/* Active Video Meta */}
                  {selectedVideo && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Topic: {selectedVideo.topic || 'General'}
                          </span>
                          <h2 className="font-heading font-black text-xl text-white mt-2">
                            {selectedVideo.title}
                          </h2>
                        </div>
                      </div>

                      {/* Notes download button if attached */}
                      {selectedVideo.notes_url && (
                        <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white">Attached Study Notes</h4>
                              <p className="text-xs text-zinc-400">PDF File</p>
                            </div>
                          </div>
                          <a
                            href={selectedVideo.notes_url.startsWith('/uploads/') ? `${API_URL}${selectedVideo.notes_url}` : selectedVideo.notes_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-brand-orange text-black font-extrabold text-xs px-4 py-2 rounded-xl hover:bg-orange-400 transition-colors uppercase tracking-wider"
                          >
                            Download PDF
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Materials List Tab */
                <div className="space-y-3">
                  {materials.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-3xl">
                      <p className="text-sm font-semibold">No document materials posted yet.</p>
                    </div>
                  ) : (
                    materials.map((mat) => {
                      const fileUrl = mat.cloudinary_url?.startsWith('/uploads/')
                        ? `${API_URL}${mat.cloudinary_url}`
                        : mat.cloudinary_url;

                      return (
                        <div key={mat._id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:border-zinc-700 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white">{mat.title}</h4>
                              <p className="text-xs text-zinc-400 mt-0.5">Topic: {mat.topic}</p>
                            </div>
                          </div>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                          >
                            Open Document
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Topics & Modules Playlist (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-heading font-extrabold text-lg text-white uppercase tracking-wider">
                Course Playlist
              </h3>

              {Object.keys(groupedVideos).length === 0 ? (
                <div className="p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-center text-zinc-500">
                  <p className="text-sm font-medium">No videos available for this batch yet.</p>
                </div>
              ) : (
                Object.keys(groupedVideos).map((topic, idx) => (
                  <div key={topic} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="bg-zinc-800/60 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                      <h4 className="font-heading font-extrabold text-xs text-amber-500 uppercase tracking-widest">
                        MODULE {idx + 1}: {topic}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-semibold bg-black/40 px-2 py-0.5 rounded">
                        {groupedVideos[topic].length} VIDEOS
                      </span>
                    </div>

                    <div className="divide-y divide-zinc-800/60">
                      {groupedVideos[topic].map((v) => {
                        const isSelected = selectedVideo?._id === v._id;
                        return (
                          <div
                            key={v._id}
                            onClick={() => playVideo(v)}
                            className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-orange-500/10 border-l-4 border-brand-orange' : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-brand-orange text-black' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                              <div className="truncate">
                                <h5 className={`text-xs font-bold truncate ${isSelected ? 'text-brand-orange' : 'text-white'}`}>
                                  {v.title}
                                </h5>
                                {v.notes_url && (
                                  <span className="text-[10px] text-zinc-400 block mt-0.5">📄 Includes PDF Notes</span>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <span className="text-[10px] font-extrabold text-brand-orange bg-orange-500/20 px-2 py-0.5 rounded">
                                PLAYING
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
