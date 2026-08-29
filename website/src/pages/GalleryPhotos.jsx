import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'

// Asset imports
import facilityAuto from '../assets/facility_auto.png'
import facilityComputer from '../assets/facility_computer.png'
import facilityElectrical from '../assets/facility_electrical.png'
import facilityKitchen from '../assets/facility_kitchen.png'
import courseMobile from '../assets/course_mobile.png'
import courseWiring from '../assets/course_wiring.png'
import slideLab from '../assets/slide_lab.jpg'
import slideCert1 from '../assets/slide_cert_1.jpg'
import slideCert2 from '../assets/slide_cert_2.jpg'
import slideCert3 from '../assets/slide_cert_3.jpg'
import slideCert4 from '../assets/slide_cert_4.jpg'

export default function GalleryPhotos() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeImage, setActiveImage] = useState(null)

  useEffect(() => {
    document.title = 'Photo Gallery | Twintec Vocational Training Institute'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Explore our state-of-the-art workshops, vocational labs, student activities, and certificate ceremonies at Twintec Vocational Training Institute.'
      )
    }
  }, [])

  const categories = ['All', 'Workshops & Labs', 'Practical Sessions', 'Certificates & Events']

  const photos = [
    {
      src: facilityAuto,
      title: 'Automotive Mechanics Lab',
      category: 'Workshops & Labs',
      description: 'Equipped with modern engines, lifts, and diagnostic tools for hands-on auto mechanics training.',
    },
    {
      src: facilityComputer,
      title: 'Computer Hardware & Network Lab',
      category: 'Workshops & Labs',
      description: 'Our digital classroom where students learn laptop, desktop repair, and network management.',
    },
    {
      src: facilityElectrical,
      title: 'Electrical Installation Setup',
      category: 'Workshops & Labs',
      description: 'Workstations configured for domestic wiring, breaker testing, and electrical safety diagnostics.',
    },
    {
      src: facilityKitchen,
      title: 'Home Appliances Workshop',
      category: 'Workshops & Labs',
      description: 'Students training in troubleshooting and repairing major household appliances and inverter technologies.',
    },
    {
      src: courseMobile,
      title: 'Micro-soldering Station',
      category: 'Practical Sessions',
      description: 'Close-up look at mobile phone micro-soldering, SMD replacement, and logic board repair.',
    },
    {
      src: courseWiring,
      title: 'Domestic House Wiring Demonstration',
      category: 'Practical Sessions',
      description: 'Hands-on practical boards demonstrating single-phase and three-phase domestic electrical circuits.',
    },
    {
      src: slideLab,
      title: 'Practical Training Laboratory',
      category: 'Practical Sessions',
      description: 'Students working on equipment and diagnostic systems under senior faculty supervision.',
    },
    {
      src: slideCert1,
      title: 'Batch A Graduation Ceremony',
      category: 'Certificates & Events',
      description: 'Celebrating the achievements of our successful Mobile Hardware Repair graduates.',
    },
    {
      src: slideCert2,
      title: 'Vocational Competency Awarding',
      category: 'Certificates & Events',
      description: 'Students receiving their certified technical credentials from the director.',
    },
    {
      src: slideCert3,
      title: 'Technical Certification Meet',
      category: 'Certificates & Events',
      description: 'Graduating class of the CCTV Installation and domestic electrical system programs.',
    },
    {
      src: slideCert4,
      title: 'Annual Student Showcase',
      category: 'Certificates & Events',
      description: 'Exhibiting student-built micro-circuit projects and custom wiring modules to industry guests.',
    },
  ]

  const filteredPhotos = selectedCategory === 'All'
    ? photos
    : photos.filter(photo => photo.category === selectedCategory)

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
              <span className="text-brand-orange font-bold">Photos</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight text-brand-white">
              Photo Gallery
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <span className="h-1.5 w-16 bg-brand-orange block rounded-full" />
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      </section>

      {/* 2. FILTER BAR & PHOTO GRID */}
      <section className="py-6 sm:py-8 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full space-y-4">
        
        {/* Filter Pills (Matching exact reference bar design with TVTI brand colors & accent border) */}
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

        {/* Photos Grid (Tight 3-column edge-to-edge layout like screenshot) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 pt-1">
          {filteredPhotos.map((photo, idx) => (
            <div 
              key={idx} 
              className="relative group overflow-hidden aspect-[4/3] bg-slate-900 cursor-pointer shadow-xs"
              onClick={() => setActiveImage(photo)}
            >
              {/* Main Photo */}
              <img
                src={photo.src}
                alt={photo.title}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />

              {/* Faint ambient title displayed at top right of card (similar to 'New Appointments in VTA' overlay in reference image) */}
              <div className="absolute top-3 right-3 z-10 opacity-75 group-hover:opacity-0 transition-opacity">
                <span className="text-[11px] font-sans font-medium text-white/90 drop-shadow-md bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-xs">
                  {photo.title}
                </span>
              </div>

              {/* Hover Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4 text-left">
                {/* Category Pill Top Left */}
                <div className="flex items-center justify-between">
                  <span className="bg-brand-orange text-white font-heading font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-xs shadow-xs">
                    {photo.category}
                  </span>
                </div>

                {/* Center Hover Photo Badge Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-xs p-3 rounded-full border border-white/30 text-white transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Title & Description at Bottom */}
                <div className="space-y-1 z-10">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-white leading-snug drop-shadow-md">
                    {photo.title}
                  </h3>
                  <p className="font-sans text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {photo.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LIGHTBOX MODAL */}
      {activeImage && (
        <div 
          className="fixed inset-0 z-100 flex items-center justify-center bg-brand-black/95 p-4 md:p-10 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setActiveImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-brand-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-brand-charcoal/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              className="absolute top-4 right-4 z-10 bg-brand-black/85 text-brand-white hover:text-brand-orange p-2 rounded-full transition-colors border border-brand-charcoal/20"
              onClick={() => setActiveImage(null)}
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Large Image */}
            <div className="md:w-3/5 bg-brand-black flex items-center justify-center max-h-[60vh] md:max-h-[80vh]">
              <img 
                src={activeImage.src} 
                alt={activeImage.title}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Description Area */}
            <div className="md:w-2/5 p-8 flex flex-col justify-between text-left bg-brand-white">
              <div className="space-y-4">
                <span className="text-xs font-heading font-extrabold uppercase tracking-widest text-brand-orange">
                  {activeImage.category}
                </span>
                <h2 className="font-heading font-extrabold text-2xl text-brand-black leading-tight">
                  {activeImage.title}
                </h2>
                <p className="font-sans text-brand-charcoal text-sm leading-relaxed">
                  {activeImage.description}
                </p>
              </div>
              
              <div className="pt-6 border-t border-brand-light flex justify-between items-center text-xs text-brand-charcoal/50">
                <span>Twintec Facility Tour</span>
                <button 
                  onClick={() => setActiveImage(null)}
                  className="text-brand-orange hover:underline font-bold"
                >
                  Back to Gallery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
