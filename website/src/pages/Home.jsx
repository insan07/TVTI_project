import React, { useState, useEffect } from 'react'
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

// Animated Stat Counter helper
function StatCounter({ end, suffix = '', label, sublabel }) {
  return (
    <div className="space-y-1 text-center sm:text-left">
      <div className="font-heading font-black text-3xl sm:text-4xl text-orange-500 tracking-tight">
        {end}{suffix}
      </div>
      <div className="font-heading font-bold text-xs uppercase tracking-wider text-slate-900">
        {label}
      </div>
      {sublabel && (
        <div className="text-[11px] font-sans text-slate-500 font-medium">
          {sublabel}
        </div>
      )}
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

  // TESTIMONIALS STATE
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

  return (
    <div className="flex flex-col min-w-full font-sans select-none bg-[#FAFAFC] text-slate-800">
      
      {/* 1. HERO BANNER SLIDER */}
      <section className="relative h-[85vh] min-h-[540px] max-h-[720px] w-full overflow-hidden bg-slate-950 text-white">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center filter brightness-[0.35] transform scale-105 transition-transform duration-10000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            
            {/* Slide Text Content */}
            <div className="absolute inset-0 flex items-center justify-start max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl text-left space-y-5">
                <span className="inline-flex items-center space-x-2 bg-orange-500/20 text-orange-400 font-heading font-extrabold text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-orange-500/30">
                  <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span>{slide.tag}</span>
                </span>
                <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight uppercase">
                  {slide.title}
                </h1>
                <p className="font-sans text-slate-300 text-sm sm:text-lg max-w-xl font-normal leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link to="/courses">
                    <Button variant="primary" className="text-xs uppercase tracking-widest py-4 px-7 font-heading font-extrabold shadow-lg shadow-orange-500/20">
                      Explore All Programs
                    </Button>
                  </Link>
                  <Link to="/inquiry">
                    <Button variant="secondary" className="text-xs uppercase tracking-widest py-4 px-7 font-heading font-extrabold bg-white text-slate-900 hover:bg-slate-100">
                      Apply Online Today
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-slate-900/60 hover:bg-orange-500 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/10 focus:outline-none"
          aria-label="Previous Slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-slate-900/60 hover:bg-orange-500 text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/10 focus:outline-none"
          aria-label="Next Slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 transition-all rounded-full ${
                index === currentSlide ? 'w-8 bg-orange-500' : 'w-2.5 bg-white/40'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* FLOATING STATS STRIP */}
      <section className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200/80 grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCounter end="100" suffix="%" label="Practical Training" sublabel="Hands-on Workshop Labs" />
          <StatCounter end="100" suffix="%" label="Certified Programs" sublabel="TVTI Practical Standard" />
          <StatCounter end="6" suffix="+" label="Technical Disciplines" sublabel="Mobile, Laptop, CCTV, Wiring" />
          <StatCounter end="95" suffix="%" label="Graduate Placement" sublabel="Employment & Entrepreneurship" />
        </div>
      </section>

      {/* 2. INSTITUTE OVERVIEW & VALUE PROPOSITION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <SectionHeading
              title="Building Practical Skills for Certified Careers"
              subtitle="TVTI Puttalam is an emerging startup vocational institute providing hands-on practical certificate courses."
              align="left"
            />
            <p className="font-sans text-slate-600 text-sm sm:text-base leading-relaxed">
              Our practical training workshops provide real hands-on experience using modern repair kits, micro-soldering stations, multi-meters, and diagnostic software suites. Whether you aim to establish your own repair business or start a technical career, TVTI equips you with practical skills.
            </p>
          </div>

          <div className="relative">
            <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden hover-lift">
              <img
                src={courseMobile}
                alt="Practical Electronics Lab"
                className="w-full h-96 object-cover rounded-2xl shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COURSES CATALOG */}
      <section id="courses" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12 bg-slate-100/70 rounded-3xl my-6 border border-slate-200/60">
        <SectionHeading
          title="Our Practical Certificate Courses"
          subtitle="Hands-on certificate programs designed for immediate employment, freelancing, and technical entrepreneurship."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {coursesList.map((course, idx) => (
            <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden bg-white border border-slate-200 shadow-md hover-lift" hoverEffect={false}>
              <div>
                {/* Course Image Header */}
                <div className="h-52 overflow-hidden bg-slate-900 relative group">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </div>
                
                {/* Course Name */}
                <div className="p-6 text-left">
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 leading-snug">
                    {course.title}
                  </h3>
                </div>
              </div>

              {/* View Details Button */}
              <div className="px-6 pb-6 pt-2">
                <Link to={`/courses/${course.slug}`}>
                  <Button variant="outline" className="w-full text-xs py-3 font-heading font-extrabold uppercase tracking-wider min-h-[44px] hover:bg-orange-500 hover:text-white hover:border-orange-500">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. WHY CHOOSE TVTI - KEY ADVANTAGES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <SectionHeading
          title="Why Choose TVTI Puttalam?"
          subtitle="Equipping Sri Lanka's next generation of technicians with world-class hands-on skills."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Modern Micro-Labs</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Equipped with oscilloscopes, hot-air rework stations, ultrasonic bath cleaners, and digital microscopes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Industry Aligned Standards</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Curricula built around national occupational standards, recognized by technical employers nationwide.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Master Faculty</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              Learn directly from senior certified engineers with extensive field experience in commercial electronics and wiring.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-left space-y-4 hover-lift">
            <div className="h-12 w-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-heading font-extrabold text-base text-slate-900">Verification Registry</h4>
            <p className="font-sans text-xs text-slate-600 leading-relaxed">
              All student certificates are backed by our central online database registry for instant employer verification.
            </p>
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full bg-slate-900 text-white rounded-3xl my-6 relative overflow-hidden">
        <div className="space-y-10 relative z-10">
          <SectionHeading
            title="Graduate Success Stories"
            subtitle="Hear how TVTI practical certificate courses empowered our students to launch successful careers."
            align="center"
            dark={true}
          />

          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center space-x-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <blockquote className="font-sans text-base sm:text-xl text-slate-200 italic leading-relaxed">
              "{testimonials[activeTestimonial].quote}"
            </blockquote>

            <div className="space-y-1">
              <h4 className="font-heading font-extrabold text-lg text-white">
                {testimonials[activeTestimonial].name}
              </h4>
              <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
                {testimonials[activeTestimonial].course} &bull; Index: {testimonials[activeTestimonial].indexNo}
              </p>
            </div>

            <div className="flex justify-center space-x-3 pt-4">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === activeTestimonial ? 'w-8 bg-orange-500' : 'w-2.5 bg-slate-700'
                  }`}
                  aria-label={`Testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION (CTA) BANNER */}
     <section className="bg-brand-orange text-brand-white py-16 px-4 sm:px-6 lg:px-8 border-t border-brand-orange shadow-inner relative overflow-hidden">
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
