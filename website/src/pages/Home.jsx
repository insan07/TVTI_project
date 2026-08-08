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
  // 1. HERO SLIDER STATE
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = [
    {
      title: 'Build Your Future With Hands-On Skills Training',
      subtitle: 'Gain practical expertise in cutting-edge industrial fields and secure a high-demand professional career.',
      image: heroAutomotive,
      tag: 'AUTOMOTIVE LAB'
    },
    {
      title: 'Master Technical Disciplines & Modern Technology',
      subtitle: 'Learn from industry professionals in high-tech environments designed to simulate real-world workshops.',
      image: heroElectrical,
      tag: 'ELECTRICAL ENGINEERING'
    },
    {
      title: 'Accelerate Your Path Into High-Demand Digital Careers',
      subtitle: 'Develop software engineering, network administration, and cybersecurity skills designed for current market needs.',
      image: heroComputer,
      tag: 'INFORMATION TECHNOLOGY'
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
      title: 'Mobile Phone Repairing',
      image: courseMobile,
      description: 'Learn chip-level diagnostics, screen replacements, and hardware troubleshooting for Android and iOS devices.',
      duration: '3 Months',
      fee: 'LKR 25,000'
    },
    {
      title: 'Laptop Repairing',
      image: courseLaptop,
      description: 'Master motherboard repairing, BGA soldering, firmware flashing, and operating system recovery.',
      duration: '3 Months',
      fee: 'LKR 30,000'
    },
    {
      title: 'Home Appliances Repairing',
      image: courseAppliances,
      description: 'Troubleshoot and fix domestic appliances like washing machines, refrigerators, and microwave ovens.',
      duration: '3 Months',
      fee: 'LKR 28,000'
    },
    {
      title: 'CCTV Repairing',
      image: courseCctv,
      description: 'Set up security cameras, configure digital video recorders (DVRs/NVRs), and set up remote IP monitoring.',
      duration: '2 Months',
      fee: 'LKR 18,000'
    },
    {
      title: 'Home Wiring',
      image: courseWiring,
      description: 'Master domestic electrical wiring, distribution board assembly, switches, and electrical safety standards.',
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
      course: "Mobile Phone Repairing",
      avatarLetter: "R"
    },
    {
      quote: "Thanks to TVTI's modern networking labs, I was able to pass my Cisco certifications and land a role as a network administrator immediately after completing my program.",
      name: "Fathima Rizna",
      course: "Laptop & PC Diagnostics",
      avatarLetter: "F"
    }
  ]

  const nextTestimonial = () => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
  const prevTestimonial = () => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. HERO SECTION (Auto-rotating image slider with dark overlay) */}
      <section className="relative h-[550px] sm:h-[600px] lg:h-[650px] bg-brand-black overflow-hidden">
        {/* Slides */}
        {slides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Background Image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center transform scale-102 transition-transform duration-6000 ease-out"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-brand-black/75" />
            
            {/* Slide Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-left">
                <div className="max-w-3xl space-y-6">
                  <span className="inline-block text-brand-orange font-heading font-extrabold text-xs sm:text-sm uppercase tracking-widest bg-brand-orange/15 border border-brand-orange/30 px-3 py-1.5 rounded-md">
                    {slide.tag}
                  </span>
                  <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl text-brand-white leading-tight uppercase tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="font-sans text-brand-light/80 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <a href="#courses">
                      <Button variant="primary" className="w-full sm:w-auto">Explore Courses</Button>
                    </a>
                    <Link to="/inquiry">
                      <Button variant="darkOutline" className="w-full sm:w-auto">Enroll Now</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-brand-white/10 hover:bg-brand-orange text-brand-white p-2 rounded-full transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center border border-brand-white/20 focus:outline-none"
          aria-label="Previous slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-brand-white/10 hover:bg-brand-orange text-brand-white p-2 rounded-full transition-all duration-300 min-h-[44px] min-w-[44px] flex items-center justify-center border border-brand-white/20 focus:outline-none"
          aria-label="Next slide"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                idx === currentSlide ? 'w-8 bg-brand-orange' : 'w-2 bg-brand-white/50 hover:bg-brand-white'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* 2. INSTITUTE OVERVIEW STRIP */}
      <section className="bg-brand-light border-y border-black/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-4xl text-left space-y-2">
            <h2 className="font-heading font-extrabold text-sm uppercase tracking-widest text-brand-orange">
              Who We Are
            </h2>
            <p className="font-sans text-brand-charcoal text-sm sm:text-base leading-relaxed">
              Twintec Vocational Training Institute (TVTI) is Puttalam's premier center for technical education. We specialize in transforming student potential into immediate career success through high-intensity, workshop-driven courses in engineering, IT, and specialized vocational services.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link to="/about" className="inline-flex items-center space-x-1.5 font-heading font-bold text-xs uppercase tracking-wider text-brand-orange hover:text-brand-black transition-colors py-2 border-b-2 border-brand-orange">
              <span>Read More About Us</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COURSES */}
      <section id="courses" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <SectionHeading
          title="Our Courses"
          subtitle="Select from our range of practical programs built in cooperation with industrial partners."
          align="center"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pt-4">
          {coursesList.map((course, idx) => (
            <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden" hoverEffect={true}>
              <div>
                {/* Course Image */}
                <div className="h-40 overflow-hidden bg-brand-black relative">
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-black/10 hover:bg-brand-black/0 transition-colors" />
                </div>
                
                {/* Content */}
                <div className="p-5 space-y-3 text-left">
                  <h3 className="font-heading font-bold text-base text-brand-black leading-snug min-h-[48px] flex items-center">
                    {course.title}
                  </h3>
                  <p className="font-sans text-brand-charcoal/80 text-xs leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* Footer Section */}
              <div className="px-5 pb-5 pt-3 border-t border-black/5 space-y-4">
                <div className="flex flex-col text-[11px] text-brand-charcoal/70 text-left">
                  <span><strong className="text-brand-black">Duration:</strong> {course.duration}</span>
                  <span><strong className="text-brand-black">Fee:</strong> {course.fee}</span>
                </div>
                <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">View Details</Button>
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
