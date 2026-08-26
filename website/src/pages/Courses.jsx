import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import Button from '../components/Button'

// Asset imports
import facilityAuto from '../assets/facility_auto.png'
import courseMobile from '../assets/course_mobile.png'
import courseLaptop from '../assets/course_laptop.png'
import courseAppliances from '../assets/course_appliances.png'
import courseCctv from '../assets/course_cctv.png'
import courseWiring from '../assets/course_wiring.png'
import facilityKitchen from '../assets/facility_kitchen.png'
import courseBrick from '../assets/course_brick.png'

export default function Courses() {
  useEffect(() => {
    document.title = 'Our Courses | Twintec Vocational Training Institute Puttalam'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Explore our range of hands-on technical certificate courses in Puttalam. Categories include Mobile Repairing, Computer Engineering, Home Appliances, CCTV, and Wiring.'
      )
    }
  }, [])

  const [selectedCategory, setSelectedCategory] = useState('All')

  const categories = [
    'All',
    'ICT & Mobile',
    'Computers',
    'Electrical & Appliances',
    'Security Systems',
  ]

  const courses = [
    {
      slug: 'mobile-phone-repairing-hardware',
      title: 'Mobile Phone Repairing (Hardware)',
      professionalTitle: 'Certificate in Mobile Phone Hardware Repair',
      category: 'ICT & Mobile',
      image: courseMobile,
      duration: '3 Months',
      fee: 'LKR 25,000',
      description: 'Master micro-soldering, SMD component replacement, screen lamination, water damage recovery, and hardware diagnostics for modern smartphones.',
    },
    {
      slug: 'mobile-phone-repairing-hardware-software',
      title: 'Mobile Phone Repairing (Hardware + Software)',
      professionalTitle: 'Certificate in Mobile Phone Hardware & Software Repair',
      category: 'ICT & Mobile',
      image: courseMobile,
      duration: '4 Months',
      fee: 'LKR 35,000',
      description: 'Comprehensive chip-level hardware repair plus OS flashing, bootloop recovery, network unlocking, IMEI diagnostics, and firmware programming.',
    },
    {
      slug: 'laptop-desktop-repairing',
      title: 'Laptop & Desktop Repairing',
      professionalTitle: 'Certificate in Laptop & Desktop Repairing',
      category: 'Computers',
      image: courseLaptop,
      duration: '3 Months',
      fee: 'LKR 30,000',
      description: 'Learn motherboard schematic reading, power rail diagnostics, BGA chip reballing, desktop PC assembly, and BIOS EEPROM programming.',
    },
    {
      slug: 'home-appliances-repairing',
      title: 'Home Appliances Repairing',
      professionalTitle: 'Certificate in Home Appliances Repairing',
      category: 'Electrical & Appliances',
      image: courseAppliances,
      duration: '3 Months',
      fee: 'LKR 28,000',
      description: 'Diagnose, service, and repair major household electrical appliances including washing machines, inverter refrigerators, microwave ovens, and air coolers.',
    },
    {
      slug: 'cctv-installation',
      title: 'CCTV Installation',
      professionalTitle: 'Certificate in CCTV & Security Camera Installation',
      category: 'Security Systems',
      image: courseCctv,
      duration: '2 Months',
      fee: 'LKR 18,000',
      description: 'Hands-on training in IP camera mounting, DVR/NVR storage setup, network cabling, coaxial crimping, and remote smartphone surveillance monitoring.',
    },
    {
      slug: 'home-wiring',
      title: 'Home Wiring',
      professionalTitle: 'Certificate in Domestic Home Wiring',
      category: 'Electrical & Appliances',
      image: courseWiring,
      duration: '3 Months',
      fee: 'LKR 22,000',
      description: 'Become a certified electrician. Master single-phase and 3-phase domestic wiring, circuit breaker installations, earth pit testing, and safety codes.',
    },
  ]

  const filteredCourses = selectedCategory === 'All'
    ? courses
    : courses.filter((course) => course.category === selectedCategory)

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. PAGE HEADER BANNER */}
      <section className="bg-brand-black text-brand-white py-12 px-5 sm:px-8 lg:px-12 xl:px-16 border-b border-brand-charcoal relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-left">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs font-sans uppercase tracking-widest text-brand-light/50">
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold">Courses</span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-brand-white">
              Practical Vocational Certificate Courses
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <span className="h-1.5 w-16 bg-brand-orange block rounded-full" />
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      </section>

      {/* 2. FILTER BAR & COURSE CARDS GRID */}
      <section className="py-16 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full space-y-12">
        
        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full font-heading font-bold text-xs uppercase tracking-wider transition-all duration-300 min-h-[40px] ${
                selectedCategory === cat
                  ? 'bg-brand-orange text-brand-white shadow-sm scale-102'
                  : 'bg-brand-light text-brand-charcoal hover:bg-brand-orange/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {filteredCourses.map((course, idx) => (
              <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden" hoverEffect={true}>
                <div>
                  {/* Course Image */}
                  <div className="h-48 overflow-hidden bg-brand-black relative">
                    <img
                      src={course.image}
                      alt={course.title}
                      className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-brand-black/10 hover:bg-brand-black/0 transition-colors" />
                    
                    {/* Category pill overlays */}
                    <span className="absolute top-4 left-4 bg-brand-black/85 text-brand-orange font-heading font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-md border border-brand-orange/20">
                      {course.category}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-3 text-left">
                    <h3 className="font-heading font-bold text-lg text-brand-black leading-snug min-h-[56px] flex items-center">
                      {course.title}
                    </h3>
                    <p className="font-sans text-brand-charcoal/80 text-sm leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="px-6 pb-6 pt-3 border-t border-black/5 space-y-4">
                  <div className="flex flex-col text-xs text-brand-charcoal/70 text-left">
                    <span><strong className="text-brand-black">Duration:</strong> {course.duration}</span>
                    <span><strong className="text-brand-black">Fee:</strong> {course.fee}</span>
                  </div>
                  <Link to={`/courses/${course.slug}`}>
                    <Button variant="outline" className="w-full text-xs py-2 min-h-[40px] mt-2">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16 bg-brand-light rounded-2xl border border-black/5">
            <h3 className="font-heading font-bold text-lg text-brand-charcoal">No Courses Found</h3>
            <p className="text-brand-charcoal/70 text-sm mt-2">There are currently no courses listed under this category.</p>
          </div>
        )}
      </section>

      {/* 3. CTA BANNER */}
      <section className="bg-brand-orange text-brand-white py-16 px-5 sm:px-8 lg:px-12 xl:px-16 border-t border-brand-orange shadow-inner relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-none text-brand-white">
            Ready to Start Your Career?
          </h2>
          <p className="font-sans text-brand-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Apply online today and reserve your seat. Batches fill quickly. Speak with an admissions advisor for assistance.
          </p>
          <div className="pt-4">
            <Link to="/inquiry">
              <button className="bg-brand-black text-brand-white font-heading font-extrabold text-sm uppercase tracking-wider py-4 px-8 rounded-full hover:bg-brand-white hover:text-brand-black shadow-md hover:shadow-lg transition-all duration-300 min-h-[48px]">
                Apply Now
              </button>
            </Link>
          </div>
        </div>
        {/* Decorative circular shapes */}
        <div className="absolute -left-16 -top-16 w-64 h-64 bg-brand-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-brand-black/5 rounded-full blur-2xl pointer-events-none" />
      </section>

    </div>
  )
}
