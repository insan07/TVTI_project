import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'

export default function GalleryVideos() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeVideo, setActiveVideo] = useState(null)

  useEffect(() => {
    document.title = 'Video Gallery | Twintec Vocational Training Institute'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Watch our classroom demonstrations, student projects, practical guides, and facility walkthroughs at Twintec Vocational Training Institute.'
      )
    }
  }, [])

  const categories = ['All', 'Course Practical Guides', 'Student Showcases', 'Facility Tours']

  const videos = [
    {
      youtubeId: 'S2pPyA2xV1s',
      title: 'Mobile Phone Hardware Micro-soldering Demonstration',
      category: 'Course Practical Guides',
      duration: '4:15',
      description: 'A detailed walkthrough of logic board chip replacement, micro-soldering techniques, and safety protocols taught in our course.',
    },
    {
      youtubeId: '5aB6P3oF79A',
      title: 'Laptop Motherboard Power Rail Diagnostics',
      category: 'Course Practical Guides',
      duration: '5:42',
      description: 'Learn how our instructors guide students in tracing power schemas, reading schematics, and using osciloscopes.',
    },
    {
      youtubeId: 'G_Z_m53K1qU',
      title: 'Single-phase Domestic Home Wiring Guide',
      category: 'Course Practical Guides',
      duration: '6:10',
      description: 'Step-by-step assembly of main distribution boards, circuit breakers, earth leakage relays, and consumer wiring layouts.',
    },
    {
      youtubeId: '6BswzMvYpIQ',
      title: 'IP Camera Mounting & NVR Remote Configuration',
      category: 'Course Practical Guides',
      duration: '3:50',
      description: 'Practical training on CCTV setup, PoE switch connectivity, digital video storage configuration, and mobile viewing.',
    },
    {
      youtubeId: '2d7a2Gk7XwE',
      title: 'Internal Combustion Engine Assembly and Tuning',
      category: 'Student Showcases',
      duration: '7:25',
      description: 'Twintec students working collectively to disassemble, inspect, and re-tune a multi-cylinder automotive engine in our workshops.',
    },
    {
      youtubeId: 'tSgPjGfNlY8',
      title: 'Inverter Refrigerator Gas Charging & Compressor Diagnostics',
      category: 'Student Showcases',
      duration: '5:15',
      description: 'Demonstrating evacuation, leak testing, and refrigerant recharging on modern home appliances.',
    },
  ]

  const filteredVideos = selectedCategory === 'All'
    ? videos
    : videos.filter(video => video.category === selectedCategory)

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. PAGE HEADER BANNER */}
      <section className="bg-brand-black text-brand-white py-6 sm:py-7 px-5 sm:px-8 lg:px-12 xl:px-16 border-b border-brand-charcoal relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 text-left">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs font-sans uppercase tracking-widest text-brand-light/50">
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold">Gallery</span>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold">Videos</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-brand-white">
              Video Gallery
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <span className="h-1.5 w-16 bg-brand-orange block rounded-full" />
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      </section>

      {/* 2. FILTER BAR & VIDEO GRID */}
      <section className="py-6 sm:py-8 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full space-y-4">
        
        {/* Filter Pills (Matching reference bar design with TVTI brand colors) */}
        <div className="flex flex-wrap items-center justify-start gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 font-heading font-semibold text-xs sm:text-sm tracking-wide transition-all cursor-pointer rounded-xs flex items-center ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white border-l-4 border-brand-orange shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200 hover:text-slate-950'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Videos Grid (Tight 3-column edge-to-edge layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 pt-1">
          {filteredVideos.map((video, idx) => (
            <div 
              key={idx} 
              className="relative group overflow-hidden aspect-[4/3] bg-slate-900 cursor-pointer shadow-xs"
              onClick={() => setActiveVideo(video)}
            >
              {/* Video Thumbnail */}
              <img
                src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Faint ambient title displayed at top right of card */}
              <div className="absolute top-3 right-3 z-10 opacity-75 group-hover:opacity-0 transition-opacity">
                <span className="text-[11px] font-sans font-medium text-white/90 drop-shadow-md bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-xs">
                  {video.duration}
                </span>
              </div>

              {/* Play Button Overlay (Center) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-orange text-white p-3.5 rounded-full shadow-xl transform scale-90 group-hover:scale-110 transition-transform duration-300 flex items-center justify-center border border-white/20">
                <svg className="h-5 w-5 fill-current pl-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              {/* Hover Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-left">
                {/* Category Pill Top Left */}
                <div className="flex items-center justify-between">
                  <span className="bg-brand-orange text-white font-heading font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-xs shadow-xs">
                    {video.category}
                  </span>
                  <span className="bg-black/60 text-white font-mono text-[10px] px-2 py-0.5 rounded-xs">
                    {video.duration}
                  </span>
                </div>

                {/* Title & Description at Bottom */}
                <div className="space-y-1 z-10">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-white leading-snug drop-shadow-md">
                    {video.title}
                  </h3>
                  <p className="font-sans text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. VIDEO LIGHTBOX MODAL */}
      {activeVideo && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center bg-brand-black/95 p-4 md:p-10 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setActiveVideo(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-brand-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-brand-charcoal/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 z-10 bg-brand-black/85 text-brand-white hover:text-brand-orange p-2 rounded-full transition-colors border border-brand-charcoal/20"
              onClick={() => setActiveVideo(null)}
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video Player */}
            <div className="relative aspect-video w-full bg-brand-black">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?autoplay=1`}
                title={activeVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>

            {/* Description Area */}
            <div className="p-8 text-left bg-brand-white space-y-3">
              <span className="text-xs font-heading font-extrabold uppercase tracking-widest text-brand-orange">
                {activeVideo.category}
              </span>
              <h2 className="font-heading font-extrabold text-2xl text-brand-black leading-tight">
                {activeVideo.title}
              </h2>
              <p className="font-sans text-brand-charcoal text-sm sm:text-base leading-relaxed">
                {activeVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
