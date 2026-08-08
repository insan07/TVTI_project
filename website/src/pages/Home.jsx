import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Button from '../components/Button'
import Card from '../components/Card'

// Asset imports
import heroAutomotive from '../assets/hero_automotive.png'
import heroElectrical from '../assets/hero_electrical.png'
import heroComputer from '../assets/hero_computer.png'

// Course image imports
import courseMobile from '../assets/course_mobile.png'
import courseLaptop from '../assets/course_laptop.png'
import courseAppliances from '../assets/course_appliances.png'
import courseCctv from '../assets/course_cctv.png'
import courseWiring from '../assets/course_wiring.png'

// Reusable Counter component that triggers animation on scroll
function StatCounter({ end, duration = 1500, suffix = '' }) {
  const [count, setCount] = useState(0)
  const elementRef = useRef(null)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (elementRef.current) {
      observer.observe(elementRef.current)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!hasStarted) return

    let startTimestamp = null
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const currentVal = Math.floor(progress * end)
      setCount(currentVal)
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }
    window.requestAnimationFrame(step)
  }, [hasStarted, end, duration])

  return (
    <span ref={elementRef} className="font-heading font-extrabold text-4xl sm:text-5xl text-brand-orange">
      {count}{suffix}
    </span>
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

  // 1. HERO SLIDER STATE
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = [
    {
      title: 'Master Smartphone & Laptop Chip-Level Repair',
      subtitle: 'Gain hands-on micro-soldering, hardware diagnostics, and firmware programming skills to launch your own repair business.',
      image: heroComputer,
      tag: 'MOBILE & LAPTOP REPAIR'
    },
    {
      title: 'Professional Home Wiring & CCTV Camera Installation',
      subtitle: 'Become a certified electrician and security systems installer. Learn domestic power wiring, DB layouts, IP camera mounting, and remote monitoring.',
      image: heroElectrical,
      tag: 'ELECTRICAL & SECURITY SYSTEMS'
    },
    {
      title: 'Expert Home Appliances Maintenance & Servicing',
      subtitle: 'Master inverter refrigerator servicing, washing machine PCB troubleshooting, and microwave repairs in state-of-the-art practical workshops.',
      image: courseAppliances,
      tag: 'DOMESTIC APPLIANCES REPAIR'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [slides.length])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  // Course configurations
  const coursesList = [
    {
      title: 'Mobile Phone Repairing (Hardware)',
      slug: 'mobile-phone-repairing-hardware',
      image: courseMobile,
      description: 'Master micro-soldering, SMD component replacement, screen lamination, and hardware diagnostics for smartphones.',
      duration: '3 Months',
      fee: 'LKR 25,000'
    },
    {
      title: 'Mobile Phone Repairing (Hardware + Software)',
      slug: 'mobile-phone-repairing-hardware-software',
      image: courseMobile,
      description: 'Comprehensive chip-level hardware repair plus OS flashing, bootloop recovery, unlocking, and firmware programming.',
      duration: '4 Months',
      fee: 'LKR 35,000'
    },
    {
      title: 'Laptop & Desktop Repairing',
      slug: 'laptop-desktop-repairing',
      image: courseLaptop,
      description: 'Master motherboard schematic reading, power rail diagnostics, BGA chip reballing, and BIOS EEPROM programming.',
      duration: '3 Months',
      fee: 'LKR 30,000'
    },
    {
      title: 'Home Appliances Repairing',
      slug: 'home-appliances-repairing',
      image: courseAppliances,
      description: 'Diagnose and repair major household electrical appliances including washing machines, refrigerators, and microwave ovens.',
      duration: '3 Months',
      fee: 'LKR 28,000'
    },
    {
      title: 'CCTV Installation',
      slug: 'cctv-installation',
      image: courseCctv,
      description: 'Hands-on training in IP camera mounting, DVR/NVR storage setup, network cabling, and remote smartphone surveillance monitoring.',
      duration: '2 Months',
      fee: 'LKR 18,000'
    },
    {
      title: 'Home Wiring',
      slug: 'home-wiring',
      image: courseWiring,
      description: 'Master single-phase and 3-phase domestic wiring, circuit breaker installations, earth pit testing, and safety codes.',
      duration: '3 Months',
      fee: 'LKR 22,000'
    }
  ]

  // 6. TESTIMONIALS STATE
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const testimonials = [
    {
      quote: "The practical classes at TVTI gave me the exact skills I needed to enter the job market. Within three weeks of graduation, I was hired as an automation technician.",
      name: "Aslan Mohamed",
      course: "Home Wiring Specialist",
      avatarLetter: "A"
    },
    {
      quote: "The instructors here are actual industry experts. The workshop training isn't just about reading manuals—it is fully hands-on, simulating real workplace scenarios.",
      name: "Riza Farook",
      course: "Electronics Repair Technician",
      avatarLetter: "R"
    },
    {
      quote: "Studying CCTV & Security Installation opened up incredible freelancing opportunities for me in Puttalam. Highly recommended!",
      name: "Kavindu Perera",
      course: "CCTV Installation Specialist",
      avatarLetter: "K"
    }
  ]

  const nextTestimonial = () => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
  const prevTestimonial = () => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <div className="flex flex-col min-w-full font-sans select-none bg-brand-white text-brand-black">
      {/* 1. HERO BANNER SLIDER */}
      <section className="relative h-[85vh] min-h-[500px] max-h-[700px] w-full overflow-hidden bg-brand-black text-brand-white">
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
              className="w-full h-full object-cover object-center filter brightness-[0.4]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
            
            {/* Slide Text Content */}
            <div className="absolute inset-0 flex items-center justify-start max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl text-left space-y-4">
                <span className="inline-block bg-brand-orange text-brand-white font-heading font-extrabold text-[10px] sm:text-xs uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {slide.tag}
                </span>
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-brand-white tracking-tight leading-tight">
                  {slide.title}
                </h1>
                <p className="font-sans text-brand-light/90 text-sm sm:text-lg max-w-xl font-normal leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="pt-4 flex flex-wrap gap-4">
                  <Link to="/courses">
                    <Button variant="primary" className="text-xs uppercase tracking-wider py-3.5 px-6">
                      Explore All Courses
                    </Button>
                  </Link>
                  <Link to="/inquiry">
                    <Button variant="secondary" className="text-xs uppercase tracking-wider py-3.5 px-6">
                      Enroll Today
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
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-brand-orange text-brand-white p-3 rounded-full backdrop-blur-sm transition-all focus:outline-none"
          aria-label="Previous Slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-brand-orange text-brand-white p-3 rounded-full backdrop-blur-sm transition-all focus:outline-none"
          aria-label="Next Slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 transition-all rounded-full ${
                index === currentSlide ? 'w-8 bg-brand-orange' : 'w-2.5 bg-brand-white/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 2. INSTITUTE OVERVIEW & VALUE PROPOSITION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <SectionHeading
              title="Building Practical Skills for a Brighter Future"
              subtitle="TVTI Puttalam is dedicated to transforming ambitious learners into certified technical professionals through industry-standard vocational education."
              align="left"
            />
            <p className="font-sans text-brand-charcoal text-sm leading-relaxed">
              Our state-of-the-art training facilities provide real hands-on experience using modern machinery, modern repair kits, and industrial software tools. Whether you aim to start your own repair shop or join leading engineering teams, our accredited courses set you up for long-term career success.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="border-l-4 border-brand-orange pl-4 space-y-1">
                <span className="font-heading font-extrabold text-2xl text-brand-black">100%</span>
                <p className="font-sans text-xs text-brand-charcoal/80 font-medium">Practical Workshop Training</p>
              </div>
              <div className="border-l-4 border-brand-orange pl-4 space-y-1">
                <span className="font-heading font-extrabold text-2xl text-brand-black">NVQ</span>
                <p className="font-sans text-xs text-brand-charcoal/80 font-medium">Industry Aligned Standards</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <Card hoverEffect={false} className="bg-brand-light p-4 rounded-2xl border border-black/5 shadow-md">
              <img
                src={courseMobile}
                alt="Practical Training Workshop"
                className="w-full h-80 object-cover rounded-xl shadow-inner"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COURSES */}
      <section id="courses" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12 bg-brand-light/40 rounded-3xl my-6">
        <SectionHeading
          title="Our Specialized Courses"
          subtitle="Hands-on vocational technical courses designed for immediate employment and entrepreneurship."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {coursesList.map((course, idx) => (
            <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden bg-brand-white border border-black/5" hoverEffect={true}>
              <div>
                {/* Course Image */}
                <div className="h-48 overflow-hidden bg-brand-black relative">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-black/10 hover:bg-brand-black/0 transition-colors" />
                </div>
                
                {/* Content */}
                <div className="p-5 space-y-3 text-left">
                  <h3 className="font-heading font-bold text-base text-brand-black leading-snug min-h-[44px] flex items-center">
                    {course.title}
                  </h3>
                  <p className="font-sans text-brand-charcoal/80 text-xs leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* Footer Section */}
              <div className="px-5 pb-5 pt-3 border-t border-black/5 space-y-4">
                <div className="flex flex-col text-[11px] text-brand-charcoal/70 text-left space-y-0.5">
                  <span><strong className="text-brand-black">Duration:</strong> {course.duration}</span>
                  <span><strong className="text-brand-black">Fee:</strong> {course.fee}</span>
                </div>
                <Link to={`/courses/${course.slug}`}>
                  <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">View Details</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. WHY CHOOSE US */}
      <section className="bg-brand-light border-y border-black/5 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <SectionHeading
            title="Why Choose Us"
            subtitle="Providing the gold standard in vocational education to match industrial workloads."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            
            {/* Feature 1 */}
            <div className="text-center space-y-3 p-4 bg-brand-white rounded-xl border border-black/5 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-base text-brand-black uppercase">Skilled Trainers</h4>
              <p className="font-sans text-brand-charcoal/80 text-xs sm:text-sm leading-relaxed">
                Learn directly from experienced specialists working active engineering shifts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center space-y-3 p-4 bg-brand-white rounded-xl border border-black/5 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-base text-brand-black uppercase">Modern Labs</h4>
              <p className="font-sans text-brand-charcoal/80 text-xs sm:text-sm leading-relaxed">
                Train inside state-of-the-art facilities with active testing jigs and heavy tools.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center space-y-3 p-4 bg-brand-white rounded-xl border border-black/5 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-base text-brand-black uppercase">Job Oriented</h4>
              <p className="font-sans text-brand-charcoal/80 text-xs sm:text-sm leading-relaxed">
                Curriculums engineered around precise industrial job specifications.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center space-y-3 p-4 bg-brand-white rounded-xl border border-black/5 shadow-sm">
              <div className="h-12 w-12 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-heading font-bold text-base text-brand-black uppercase">Recognized</h4>
              <p className="font-sans text-brand-charcoal/80 text-xs sm:text-sm leading-relaxed">
                Obtain validated credentials recognized by leading engineering corporations.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. STATS COUNTERS */}
      <section className="bg-brand-black text-brand-white py-16 px-4 sm:px-6 lg:px-8 border-y border-brand-charcoal">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          
          <div className="space-y-2">
            <p className="flex items-center justify-center">
              <StatCounter end={2500} suffix="+" />
            </p>
            <p className="font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider text-brand-light/60">
              Students Trained
            </p>
          </div>

          <div className="space-y-2">
            <p className="flex items-center justify-center">
              <StatCounter end={30} suffix="+" />
            </p>
            <p className="font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider text-brand-light/60">
              Courses Offered
            </p>
          </div>

          <div className="space-y-2">
            <p className="flex items-center justify-center">
              <StatCounter end={15} suffix="+" />
            </p>
            <p className="font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider text-brand-light/60">
              Years of Excellence
            </p>
          </div>

          <div className="space-y-2">
            <p className="flex items-center justify-center">
              <StatCounter end={95} suffix="%" />
            </p>
            <p className="font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider text-brand-light/60">
              Employment Rate
            </p>
          </div>

        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12 relative">
        <SectionHeading
          title="Student Testimonials"
          subtitle="Read how our professional vocational training programs transformed their careers."
          align="center"
        />

        {/* Testimonials Slider */}
        <div className="relative max-w-3xl mx-auto pt-6">
          <div className="overflow-hidden">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className={`transition-all duration-500 ease-in-out ${
                  idx === activeTestimonial ? 'block scale-100 opacity-100' : 'hidden scale-95 opacity-0'
                }`}
              >
                <div className="bg-brand-light border border-black/5 rounded-2xl p-8 sm:p-10 text-center space-y-6 shadow-sm">
                  {/* Quote icon */}
                  <span className="inline-block text-brand-orange text-5xl font-serif leading-none h-6">“</span>
                  
                  <p className="font-sans text-brand-charcoal text-sm sm:text-base md:text-lg italic leading-relaxed">
                    {t.quote}
                  </p>

                  <div className="flex flex-col items-center space-y-3 pt-4 border-t border-black/10 max-w-xs mx-auto">
                    {/* Stylized Avatar Letter */}
                    <div className="h-12 w-12 rounded-full bg-brand-orange text-brand-white flex items-center justify-center font-heading font-bold text-lg border-2 border-brand-white shadow-sm">
                      {t.avatarLetter}
                    </div>
                    <div className="text-center">
                      <h4 className="font-heading font-bold text-sm text-brand-black">{t.name}</h4>
                      <p className="text-brand-orange text-xs font-semibold uppercase tracking-wider">{t.course}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial arrows */}
          <div className="flex justify-center items-center space-x-6 mt-8">
            <button
              onClick={prevTestimonial}
              className="bg-brand-white border border-black/10 hover:bg-brand-orange hover:text-brand-white hover:border-brand-orange text-brand-charcoal p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm focus:outline-none"
              aria-label="Previous testimonial"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex space-x-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                    idx === activeTestimonial ? 'w-6 bg-brand-orange' : 'w-2 bg-brand-charcoal/30'
                  }`}
                  aria-label={`Go to testimonial ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="bg-brand-white border border-black/10 hover:bg-brand-orange hover:text-brand-white hover:border-brand-orange text-brand-charcoal p-2 rounded-full transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm focus:outline-none"
              aria-label="Next testimonial"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER (Full-width Orange layout) */}
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
