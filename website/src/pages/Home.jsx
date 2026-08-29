import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import Button from '../components/Button'

// Asset imports
import courseMobile from '../assets/course_mobile.png'
import courseLaptop from '../assets/course_laptop.png'
import courseAppliances from '../assets/course_appliances.png'
import courseCctv from '../assets/course_cctv.png'
import courseWiring from '../assets/course_wiring.png'
import heroComputer from '../assets/hero_computer.png'
import heroElectrical from '../assets/hero_electrical.png'
import slideCert1 from '../assets/slide_cert_1.jpg'
import slideCert2 from '../assets/slide_cert_2.jpg'
import slideCert3 from '../assets/slide_cert_3.jpg'
import slideCert4 from '../assets/slide_cert_4.jpg'

// Animated Stat Counter helper (Sleek Compact Bar Item)
function StatCounter({ end, suffix = '', label, showDivider = true }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-1 sm:px-3 py-1 ${showDivider ? 'border-r border-slate-200/80' : ''}`}>
      <div className="font-heading font-extrabold text-xl sm:text-2xl lg:text-3xl text-brand-orange tracking-tight leading-none">
        {end}{suffix}
      </div>
      <div className="font-heading font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-900 mt-1">
        {label}
      </div>
    </div>
  )
}

export default function Home() {
  // Set page meta tags
  useEffect(() => {
    document.title = 'Home | Twintec Vocational Training Institute Puttalam'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Welcome to TVTI Puttalam. Build your future with our hands-on vocational courses in mobile repairing, laptop repair, home appliances, CCTV, and wiring.'
      )
    }
  }, [])

  // HERO SLIDER STATE
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = [
    {
      title: 'Certificate Awarding Ceremony 2025',
      subtitle: 'Celebrating our successful graduates in Advanced Mobile & Laptop Repairing at Twintec Vocational Training Institute.',
      image: slideCert1,
      tag: 'GRADUATION & SUCCESS'
    },
    {
      title: 'Empowering Skilled Technicians',
      subtitle: 'Recognizing excellence and practical achievements in vocational hardware repair and technical engineering.',
      image: slideCert2,
      tag: 'TVTI PUITTALAM'
    },
    {
      title: 'Industry-Ready Vocational Training',
      subtitle: '100% practical, hands-on training preparing students for immediate career success and technical entrepreneurship.',
      image: slideCert3,
      tag: 'PRACTICAL CERTIFICATION'
    },
    {
      title: 'Certificate Awarding Ceremony 2024',
      subtitle: 'Honoring our dedicated trainees and building the next generation of certified technical professionals in Sri Lanka.',
      image: slideCert4,
      tag: 'GRADUATION CEREMONY'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  // 6 Target Vocational Courses
  const coursesList = [
    {
      title: 'Mobile Phone Repairing (Hardware)',
      professionalTitle: 'Certificate in Mobile Phone Hardware Repair',
      slug: 'mobile-phone-repairing-hardware',
      image: courseMobile,
      category: 'ICT & Mobile',
      description: 'Master micro-soldering, SMD component replacement, screen lamination, and hardware diagnostics for smartphones.',
      duration: '3 Months',
      fee: 'LKR 25,000'
    },
    {
      title: 'Mobile Phone Repairing (Hardware + Software)',
      professionalTitle: 'Certificate in Mobile Phone Hardware & Software Repair',
      slug: 'mobile-phone-repairing-hardware-software',
      image: courseMobile,
      category: 'ICT & Mobile',
      description: 'Comprehensive chip-level hardware repair plus OS flashing, bootloop recovery, unlocking, and firmware programming.',
      duration: '4 Months',
      fee: 'LKR 35,000'
    },
    {
      title: 'Laptop & Desktop Repairing',
      professionalTitle: 'Certificate in Laptop & Desktop Repairing',
      slug: 'laptop-desktop-repairing',
      image: courseLaptop,
      category: 'Computers',
      description: 'Master motherboard schematic reading, power rail diagnostics, BGA chip reballing, and BIOS EEPROM programming.',
      duration: '3 Months',
      fee: 'LKR 30,000'
    },
    {
      title: 'Home Appliances Repairing',
      professionalTitle: 'Certificate in Home Appliances Repairing',
      slug: 'home-appliances-repairing',
      image: courseAppliances,
      category: 'Electrical & Appliances',
      description: 'Diagnose and repair major household electrical appliances including washing machines, refrigerators, and microwave ovens.',
      duration: '3 Months',
      fee: 'LKR 28,000'
    },
    {
      title: 'CCTV Installation',
      slug: 'cctv-installation',
      professionalTitle: 'Certificate in CCTV & Security Camera Installation',
      image: courseCctv,
      category: 'Security Systems',
      description: 'Hands-on training in IP camera mounting, DVR/NVR storage setup, network cabling, and remote smartphone monitoring.',
      duration: '2 Months',
      fee: 'LKR 18,000'
    },
    {
      title: 'Home Wiring',
      slug: 'home-wiring',
      professionalTitle: 'Certificate in Domestic Home Wiring',
      image: courseWiring,
      category: 'Electrical & Appliances',
      description: 'Master single-phase and 3-phase domestic wiring, circuit breaker installations, earth pit testing, and safety codes.',
      duration: '3 Months',
      fee: 'LKR 22,000'
    }
  ]

  // COURSES AUTOMATIC HORIZONTAL SCROLL (Infinite 1-by-1 Course Loop)
  const coursesScrollRef = useRef(null)
  const [activeCourseIndex, setActiveCourseIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCourseIndex((prev) => (prev + 1) % coursesList.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [coursesList.length])

  useEffect(() => {
    if (coursesScrollRef.current) {
      const firstCard = coursesScrollRef.current.querySelector('.course-card-item')
      if (firstCard) {
        const cardStep = firstCard.getBoundingClientRect().width + 24
        coursesScrollRef.current.scrollTo({
          left: activeCourseIndex * cardStep,
          behavior: activeCourseIndex === 0 ? 'auto' : 'smooth'
        })
      }
    }
  }, [activeCourseIndex])

  const scrollCoursesLeft = () => {
    setActiveCourseIndex((prev) => (prev - 1 + coursesList.length) % coursesList.length)
  }

  const scrollCoursesRight = () => {
    setActiveCourseIndex((prev) => (prev + 1) % coursesList.length)
  }

  // TESTIMONIALS STATE & AUTOMATIC ROTATION TIMER
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const testimonials = [
    {
      quote: "The practical classes at TVTI gave me the exact skills I needed to enter the job market. Within three weeks of graduation, I was hired as an automation technician.",
      name: "Aslan Mohamed",
      course: "Home Wiring Specialist",
      indexNo: "26T0001"
    },
    {
      quote: "The instructors here are actual industry experts. The workshop training isn't just about reading manuals—it is fully hands-on, simulating real workplace scenarios.",
      name: "Riza Farook",
      course: "Electronics Repair Technician",
      indexNo: "26T0002"
    },
    {
      quote: "Studying CCTV & Security Installation opened up incredible freelancing opportunities for me in Puttalam. Highly recommended!",
      name: "Kavindu Perera",
      course: "CCTV Installation Specialist",
      indexNo: "26T0003"
    }
  ]

  useEffect(() => {
    const testimonialTimer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 4500)
    return () => clearInterval(testimonialTimer)
  }, [testimonials.length])

  // LATEST NEWS & ANNOUNCEMENTS AUTOMATIC SCROLL TIMER
  const newsScrollRef = useRef(null)
  const [activeNewsIndex, setActiveNewsIndex] = useState(0)

  const newsItems = [
    {
      title: '2026 Enrollment Has Started',
      day: '23',
      month: 'DEC',
      category: 'ADMISSIONS',
      image: slideCert3,
      summary: '2026 Enrollment has started, for more information please call 076 538 0715 / 078 538 0715.'
    },
    {
      title: 'Certificate Awarding Ceremony 2025',
      day: '15',
      month: 'JAN',
      category: 'GRADUATION',
      image: slideCert1,
      summary: 'TVTI Puttalam awarded practical certificates to technical graduates working nationwide.'
    },
    {
      title: 'Advanced Lab Equipment Installed',
      day: '10',
      month: 'FEB',
      category: 'FACILITIES',
      image: courseLaptop,
      summary: 'New micro-soldering stations, digital oscilloscopes, and BGA reballing kits installed.'
    }
  ]

  useEffect(() => {
    const newsInterval = setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % newsItems.length)
    }, 4000)
    return () => clearInterval(newsInterval)
  }, [newsItems.length])

  useEffect(() => {
    if (newsScrollRef.current) {
      const firstNewsCard = newsScrollRef.current.querySelector('.news-card-item')
      if (firstNewsCard) {
        const cardStep = firstNewsCard.getBoundingClientRect().width + 24
        newsScrollRef.current.scrollTo({
          left: activeNewsIndex * cardStep,
          behavior: activeNewsIndex === 0 ? 'auto' : 'smooth'
        })
      }
    }
  }, [activeNewsIndex])

  const scrollNewsLeft = () => {
    setActiveNewsIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length)
  }

  const scrollNewsRight = () => {
    setActiveNewsIndex((prev) => (prev + 1) % newsItems.length)
  }

  return (
    <div className="flex flex-col min-w-full font-sans select-none bg-[#FAFAFC] text-slate-800">
      
      {/* 1. HERO BANNER SLIDER (Increased Height & Spacious Spacing) */}
      <section className="relative h-[75vh] min-h-[520px] max-h-[660px] w-full overflow-hidden bg-slate-950 text-white">
        {/* Background Image Carousel (Bright & Clear Photos) */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt="TVTI Vocational Training"
              className="w-full h-full object-cover object-center filter brightness-[0.75] saturate-[1.15] transform scale-105 transition-transform duration-10000"
            />
            {/* Soft gradient overlay for centered text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/40" />
          </div>
        ))}

        {/* FLOATING ANNOUNCEMENT GLASS PILL (Orange Glowing Outline & Dynamic Pulsing Alert Beacon) */}
        <div className="absolute top-2.5 sm:top-3.5 left-0 right-0 z-30 px-4 pointer-events-none">
          <div className="max-w-4xl mx-auto bg-slate-950/85 backdrop-blur-md text-slate-300 text-xs py-1.5 px-4 sm:px-6 rounded-full border border-brand-orange/60 shadow-[0_0_16px_rgba(242,112,28,0.4)] hover:shadow-[0_0_24px_rgba(242,112,28,0.6)] transition-all duration-300 flex items-center justify-between pointer-events-auto overflow-hidden">
            <div className="flex items-center space-x-3 overflow-hidden w-full sm:w-auto">
              {/* Dynamic Live Pulsing Alert Badge */}
              <div className="flex-shrink-0 flex items-center space-x-1.5 bg-brand-orange/20 text-orange-400 border border-brand-orange/50 font-heading font-bold text-[9px] tracking-wider px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-orange"></span>
                </span>
                <span>New Batch 2026</span>
              </div>
              <div className="overflow-hidden whitespace-nowrap w-full">
                <div className="inline-flex space-x-6 animate-text-marquee">
                  <p className="font-sans font-medium text-slate-100 text-xs flex-shrink-0">
                    Admissions open for Mobile Repair, CCTV, and Domestic Wiring courses. Speak with an admissions advisor today! &bull;
                  </p>
                  <p className="font-sans font-medium text-slate-100 text-xs flex-shrink-0">
                    Admissions open for Mobile Repair, CCTV, and Domestic Wiring courses. Speak with an admissions advisor today! &bull;
                  </p>
                </div>
              </div>
            </div>
            <Link
              to="/inquiry"
              className="hidden sm:inline-flex items-center space-x-1 font-heading font-bold text-xs text-orange-400 hover:text-white transition-colors duration-200 flex-shrink-0 ml-4 cursor-pointer"
            >
              <span>Register Online</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Hero Text Overlay (Shifted lower with generous top breathing room) */}
        <div className="absolute inset-0 z-20 flex items-center justify-center pt-16 sm:pt-20 pb-8 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 pointer-events-none text-center">
          <div className="max-w-3xl text-center space-y-5 pointer-events-auto flex flex-col items-center">
            {/* Compact Professional Title */}
            <h1 className="font-heading font-bold text-2xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-snug text-center">
              Practical Vocational Training & Technical Certification
            </h1>
            
            {/* Subtitle */}
            <p className="font-sans text-slate-200 text-xs sm:text-base max-w-2xl font-normal leading-relaxed text-center mx-auto">
              Build real industry skills with 100% hands-on workshop training in mobile repair, laptop systems, home appliances, CCTV, and electrical wiring.
            </p>

            {/* High-Contrast Pill Buttons (Centered) */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link to="/courses" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-brand-orange text-white hover:bg-brand-black active:scale-95 font-heading font-semibold text-xs uppercase tracking-wider py-3 px-7 rounded-full shadow-lg transition-all duration-200 cursor-pointer min-h-[42px] flex items-center justify-center">
                  Explore Programs
                </button>
              </Link>
              <Link to="/inquiry" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-white/10 backdrop-blur-md text-white border border-white/30 hover:bg-white hover:text-brand-black active:scale-95 font-heading font-semibold text-xs uppercase tracking-wider py-3 px-7 rounded-full shadow-lg transition-all duration-200 cursor-pointer min-h-[42px] flex items-center justify-center">
                  Apply Online Today
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Left Side Navigation Arrow (Low opacity translucent button) */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 sm:h-9 sm:w-9 bg-black/25 hover:bg-black/50 active:scale-95 text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs rounded-full border border-white/20 group/arrow"
          aria-label="Previous Slide"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover/arrow:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right Side Navigation Arrow (Low opacity translucent button) */}
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 sm:h-9 sm:w-9 bg-black/25 hover:bg-black/50 active:scale-95 text-white/90 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs rounded-full border border-white/20 group/arrow"
          aria-label="Next Slide"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover/arrow:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicator Dots (Centered at bottom) */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex space-x-2.5 pointer-events-auto">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 transition-all rounded-full cursor-pointer ${
                index === currentSlide ? 'w-8 bg-brand-orange' : 'w-2.5 bg-white/40 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* FLOATING STATS STRIP (Sleek Minimal Bar - 3 Columns Across All Screens) */}
      <section className="relative z-30 max-w-3xl mx-auto px-3 sm:px-6 -mt-6 sm:-mt-8">
        <div className="bg-white/95 backdrop-blur-md rounded-xl py-3 px-2 sm:py-4 sm:px-6 shadow-md border border-slate-200/90 grid grid-cols-3 items-center justify-center text-center">
          <StatCounter end="100" suffix="%" label="Practical Training" showDivider={true} />
          <StatCounter end="6" suffix="+" label="Technical Disciplines" showDivider={true} />
          <StatCounter end="200" suffix="+" label="Successful Students" showDivider={false} />
        </div>
      </section>

      {/* 2. AUTOMATICALLY SCROLLING COURSES CAROUSEL */}
      <section id="courses" className="pt-8 pb-4 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full relative">
        <div className="text-left mb-6 border-b border-slate-200 pb-3">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Our Vocational Courses
          </h2>
        </div>

        {/* Carousel Outer Wrapper with side arrow buttons overlaying left & right */}
        <div className="relative group">
          {/* Left Translucent Side Arrow Button (Compact Small Size) */}
          <button
            onClick={scrollCoursesLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-6 sm:h-9 sm:w-7 bg-slate-800/40 hover:bg-slate-900/90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-md rounded-r-md active:scale-95"
            aria-label="Scroll Left"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Translucent Side Arrow Button (Compact Small Size) */}
          <button
            onClick={scrollCoursesRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-6 sm:h-9 sm:w-7 bg-slate-800/40 hover:bg-slate-900/90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-md rounded-l-md active:scale-95"
            aria-label="Scroll Right"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scrolling Cards Row */}
          <div
            ref={coursesScrollRef}
            className="flex space-x-6 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {coursesList.map((course, idx) => (
              <div
                key={idx}
                className="course-card-item flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start flex flex-col justify-between bg-white text-left shadow-sm rounded-none border border-slate-200/90 group/card transition-shadow hover:shadow-md"
              >
                <div>
                  {/* Photo Header */}
                  <div className="h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-105"
                    />
                  </div>
                  
                  {/* Content Area */}
                  <div className="p-4 space-y-2">
                    {/* Title */}
                    <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2 min-h-[44px]">
                      {course.title}
                    </h3>
                    
                    {/* Description with arrow */}
                    <p className="font-sans text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {course.description} <span className="text-orange-600 font-bold ml-1">&rarr;</span>
                    </p>
                  </div>
                </div>

                {/* Bottom Border Line & Bottom Right Read More Button (Orange Color) */}
                <div className="px-4 pb-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-sans text-slate-500 font-semibold">{course.duration}</span>
                  <Link to={`/courses/${course.slug}`}>
                    <button className="bg-brand-orange hover:bg-brand-black text-white font-sans font-semibold text-xs px-3.5 py-1.5 rounded transition-colors cursor-pointer shadow-sm">
                      Read More
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHY CHOOSE TVTI - KEY ADVANTAGES */}
      <section className="pt-4 pb-8 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full space-y-6">
        <SectionHeading
          title="Why Choose TVTI Puttalam?"
          subtitle="Providing practical technical training to build real career skills in Puttalam."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">100% Practical Training</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Hands-on practice in fully equipped technical labs with modern tools and diagnostic equipment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Job-Oriented Courses</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Short-term certificate programs designed to prepare students for technical jobs and self-employment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Experienced Instructors</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Learn directly from skilled trainers with years of real-world technical and industry experience.
            </p>
          </div>
        </div>
      </section>

      {/* 4. LATEST NEWS & ANNOUNCEMENTS SECTION (Matched to reference layout with TVTI Brand Colors) */}
      <section id="news" className="pt-4 pb-8 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full space-y-4">
        {/* Header with Title and Top Right Navigation Arrows */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="text-left">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight flex items-center space-x-2">
              <span>Latest</span>
              <span className="text-brand-orange">News</span>
            </h2>
            {/* Orange underline accent line */}
            <span className="block h-1 w-14 bg-brand-orange rounded-full mt-1" />
          </div>

          {/* Top Right Arrow Controls (< & >) */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={scrollNewsLeft}
              className="h-7 w-7 sm:h-8 sm:w-8 bg-white border border-slate-300 hover:bg-brand-orange hover:text-white hover:border-brand-orange text-slate-700 flex items-center justify-center transition-colors rounded shadow-xs cursor-pointer active:scale-95"
              aria-label="Previous News"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={scrollNewsRight}
              className="h-7 w-7 sm:h-8 sm:w-8 bg-white border border-slate-300 hover:bg-brand-orange hover:text-white hover:border-brand-orange text-slate-700 flex items-center justify-center transition-colors rounded shadow-xs cursor-pointer active:scale-95"
              aria-label="Next News"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* News Cards Carousel Row */}
        <div
          ref={newsScrollRef}
          className="flex space-x-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth"
        >
          {newsItems.map((news, idx) => (
            <div
              key={idx}
              className="news-card-item flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] snap-start bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col justify-between"
            >
              <div>
                {/* Poster Image Area with Floating Date Badge on Bottom-Right */}
                <div className="relative h-56 sm:h-60 w-full overflow-hidden bg-slate-100">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating Date Badge (TVTI Brand Orange with Day on top & Month below) */}
                  <div className="absolute bottom-0 right-0 bg-brand-orange text-white text-center px-3 py-1.5 min-w-[50px] shadow-md">
                    <span className="font-heading font-extrabold text-base sm:text-lg leading-none block">
                      {news.day}
                    </span>
                    <span className="font-heading font-bold text-[9px] uppercase tracking-wider block mt-0.5">
                      {news.month}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 text-left space-y-2">
                  <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 leading-snug tracking-tight group-hover:text-brand-orange transition-colors line-clamp-2">
                    {news.title}
                  </h3>
                  <p className="font-sans text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {news.summary}
                  </p>
                </div>
              </div>

              {/* Bottom View Details Link */}
              <div className="px-5 pb-5 pt-0 text-left">
                <Link
                  to="/inquiry"
                  className="font-heading font-semibold text-xs text-brand-orange hover:text-slate-900 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Details</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. SUCCESS STORIES (Compact & Sleek Design) */}
      <section className="py-8 px-5 sm:px-8 max-w-3xl mx-auto w-full my-5 relative overflow-hidden rounded-2xl shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 group">
        {/* Ambient Orange Spotlight & Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-orange/15 rounded-full filter blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600/10 rounded-full filter blur-3xl pointer-events-none -ml-16 -mb-16" />
        
        {/* Subtle Decorative Technical Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#F2701C_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="space-y-5 relative z-10">
          <SectionHeading
            title="Success Stories"
            subtitle="Real experiences from TVTI certificate students thriving in the industry."
            align="center"
            dark={true}
          />

          <div className="max-w-2xl mx-auto text-center space-y-3.5 bg-white/5 backdrop-blur-md p-4 sm:p-5 rounded-xl border border-white/10 shadow-md">
            {/* Rating Stars */}
            <div className="flex justify-center space-x-1 text-brand-orange">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Dynamic Auto-Fading Quote Card */}
            <div className="min-h-[64px] flex items-center justify-center transition-all duration-500">
              <blockquote className="font-sans text-xs sm:text-sm text-slate-100 italic leading-relaxed px-3">
                "{testimonials[activeTestimonial].quote}"
              </blockquote>
            </div>

            {/* Student Info */}
            <div className="space-y-0.5 pt-0.5">
              <h4 className="font-heading font-extrabold text-sm sm:text-base text-white tracking-wide">
                {testimonials[activeTestimonial].name}
              </h4>
              <p className="text-orange-400 text-[10px] sm:text-xs font-semibold tracking-wider uppercase">
                {testimonials[activeTestimonial].course} &bull; Index: {testimonials[activeTestimonial].indexNo}
              </p>
            </div>

            {/* Dynamic Interactive Dot Indicators */}
            <div className="flex justify-center items-center space-x-2 pt-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === activeTestimonial
                      ? 'w-6 bg-brand-orange shadow-[0_0_8px_rgba(242,112,28,0.7)]'
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={`Testimonial slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
