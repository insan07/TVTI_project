import React, { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
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

export default function CourseDetail() {
  const { slug } = useParams()

  const coursesDb = {
    'mobile-phone-repairing-hardware': {
      slug: 'mobile-phone-repairing-hardware',
      title: 'Mobile Phone Repairing (Hardware)',
      professionalTitle: 'Certificate in Mobile Phone Hardware Repair',
      category: 'ICT & Mobile',
      image: courseMobile,
      duration: '3 Months',
      fee: 'LKR 25,000',
      description: 'Master micro-soldering, SMD component replacement, screen lamination, water damage recovery, and hardware diagnostic tools for modern Android and iOS smartphones.',
      syllabus: [
        'Micro-soldering, SMD chip replacement, and hot-air rework station safety.',
        'Screen lamination, OCA glue separation, and digitizer glass repairs.',
        'Water damage diagnostics, ultrasonic bath cleaning, and short circuit drying.',
        'Multimeter testing, power IC tracing, and battery management circuitry.',
      ],
      requirements: [
        'Open to all learners; no prior experience required.',
        'Good hand-eye coordination for delicate micro-soldering work.',
        'Basic physical fitness and attention to detail.',
      ],
      schedule: {
        startDate: 'September 10, 2026',
        days: 'Tue & Thu',
        times: '9:00 AM - 12:00 PM',
      },
    },
    'mobile-phone-repairing-hardware-software': {
      slug: 'mobile-phone-repairing-hardware-software',
      title: 'Mobile Phone Repairing (Hardware + Software)',
      professionalTitle: 'Certificate in Mobile Phone Hardware & Software Repair',
      category: 'ICT & Mobile',
      image: courseMobile,
      duration: '4 Months',
      fee: 'LKR 35,000',
      description: 'Comprehensive chip-level hardware repair plus OS flashing, bootloop recovery, network unlocking, IMEI diagnostics, and box/dongle firmware programming.',
      syllabus: [
        'Advanced micro-soldering, CPU/RAM reballing, and power IC replacement.',
        'Firmware flashing, unbricking dead phones, and bootloop recovery.',
        'FRP lock removal, network unlocking, and IMEI repair protocols.',
        'Hardware-software combined diagnostic workflow for shop owners.',
      ],
      requirements: [
        'Basic computer operation skills.',
        'Enthusiasm for mobile tech, software tools, and electronics.',
      ],
      schedule: {
        startDate: 'September 15, 2026',
        days: 'Mon, Wed & Fri',
        times: '1:00 PM - 4:00 PM',
      },
    },
    'laptop-desktop-repairing': {
      slug: 'laptop-desktop-repairing',
      title: 'Laptop & Desktop Repairing',
      professionalTitle: 'Certificate in Laptop & Desktop Repairing',
      category: 'Computers',
      image: courseLaptop,
      duration: '3 Months',
      fee: 'LKR 30,000',
      description: 'Advanced course on diagnostics and chip-level repair of laptops, PC motherboards, power delivery systems, BGA rework, and BIOS EEPROM programming.',
      syllabus: [
        'Motherboard schematic reading and Boardview tool utilization.',
        'Power rail tracking, short circuit isolation, and DC jack replacements.',
        'BGA chip reballing, reflow techniques, and GPU rework.',
        'EEPROM flashing, BIOS editing, and custom desktop assembly.',
      ],
      requirements: [
        'Basic understanding of electronic components or mobile repair background.',
        'Familiarity with computer hardware configurations and operating systems.',
      ],
      schedule: {
        startDate: 'October 05, 2026',
        days: 'Sat & Sun',
        times: '1:00 PM - 5:00 PM',
      },
    },
    'home-appliances-repairing': {
      slug: 'home-appliances-repairing',
      title: 'Home Appliances Repairing',
      professionalTitle: 'Certificate in Home Appliances Repairing',
      category: 'Electrical & Appliances',
      image: courseAppliances,
      duration: '3 Months',
      fee: 'LKR 28,000',
      description: 'A hands-on training module covering the repair, servicing, and installation of major home utilities like washing machines, refrigerators, and microwave ovens.',
      syllabus: [
        'Inverter compressor diagnostics and refrigerant gas charging.',
        'Washing machine drum repair, PCB control boards, and motor rewinding.',
        'Microwave magnetron diagnostics and safety interlock switches.',
        'Safety insulation testing (megger checks) and electrical codes.',
      ],
      requirements: [
        'Passed G.C.E. O/L or basic mathematics preferred.',
        'Interest in electrical circuits and appliance diagnostics.',
      ],
      schedule: {
        startDate: 'September 20, 2026',
        days: 'Mon & Fri',
        times: '2:00 PM - 5:00 PM',
      },
    },
    'cctv-installation': {
      slug: 'cctv-installation',
      title: 'CCTV Installation',
      professionalTitle: 'Certificate in CCTV & Security Camera Installation',
      category: 'Security Systems',
      image: courseCctv,
      duration: '2 Months',
      fee: 'LKR 18,000',
      description: 'Comprehensive security system installation course teaching IP cameras, analog systems, network routing, coaxial crimping, and cloud surveillance.',
      syllabus: [
        'IP and analog camera mounting, focal lengths, and night-vision alignment.',
        'DVR/NVR storage calculation, disk configuration, and RAID metrics.',
        'Remote cloud integration, router port forwarding, and mobile app setups.',
        'Coaxial compression crimping, RJ45 cabling, and network basics.',
      ],
      requirements: [
        'Basic computer network concepts or basic computing knowledge.',
        'Ability to work with basic wiring tools.',
      ],
      schedule: {
        startDate: 'September 01, 2026',
        days: 'Sun',
        times: '9:00 AM - 3:00 PM',
      },
    },
    'home-wiring': {
      slug: 'home-wiring',
      title: 'Home Wiring',
      professionalTitle: 'Certificate in Domestic Home Wiring',
      category: 'Electrical & Appliances',
      image: courseWiring,
      duration: '3 Months',
      fee: 'LKR 22,000',
      description: 'Become a professional domestic electrician. Learn standard electrical codes, distribution box installations, safety systems, and single/3-phase power routing.',
      syllabus: [
        'Single-phase and 3-phase domestic wiring diagram planning.',
        'Distribution board (DB) layout, RCCB/MCB breaker sizing, and trip safety.',
        'Conduit laying, surface wiring, and switchboard installation.',
        'Earth pit testing, insulation resistance measurements, and safety codes.',
      ],
      requirements: [
        'No prior qualifications required.',
        'Basic physical fitness suitable for electrical installation work.',
      ],
      schedule: {
        startDate: 'October 01, 2026',
        days: 'Tue & Thu',
        times: '1:00 PM - 4:30 PM',
      },
    },
  }

  // Lookup course, fallback to Automobile if not found
  const course = coursesDb[slug] || coursesDb['automobile-repair-maintenance']

  // Scroll to top and set dynamic SEO metadata on slug change
  useEffect(() => {
    window.scrollTo(0, 0)
    if (course) {
      document.title = `${course.title} | TVTI Puttalam`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', course.description)
      }
    }
  }, [slug, course])

  // Find 3 related courses from the same category (excluding current course)
  const allCoursesList = Object.values(coursesDb)
  const relatedCourses = allCoursesList
    .filter(c => c.category === course.category && c.slug !== course.slug)
    .slice(0, 3)

  // Fallback related courses if there aren't enough in the same category
  const finalRelatedCourses = relatedCourses.length >= 3
    ? relatedCourses
    : relatedCourses.concat(
        allCoursesList.filter(c => c.slug !== course.slug && !relatedCourses.includes(c))
      ).slice(0, 3)

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. HERO BANNER */}
      <section className="relative h-[180px] sm:h-[220px] lg:h-[250px] bg-brand-black overflow-hidden flex items-center">
        {/* Background Image */}
        <img
          src={course.image}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-brand-black/80" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 w-full text-left">
          <div className="max-w-3xl space-y-2.5">
            <span className="inline-block bg-brand-orange text-brand-white font-heading font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-md border border-brand-orange/30">
              {course.category}
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-brand-white leading-tight tracking-tight">
              {course.title}
            </h1>
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs font-sans uppercase tracking-widest text-brand-light/60 pt-1">
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              <span>&gt;</span>
              <Link to="/courses" className="hover:text-brand-orange transition-colors">Courses</Link>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold truncate max-w-[200px] sm:max-w-none">{course.title}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DUAL COLUMN LAYOUT */}
      <section className="py-8 sm:py-10 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Main Info */}
          <div className="lg:col-span-8 space-y-8 text-left">
            
            {/* Course Description */}
            <div className="space-y-3">
              <h2 className="font-heading font-bold text-lg sm:text-xl tracking-wider text-brand-black border-b border-black/5 pb-2">
                Course Description
              </h2>
              <p className="font-sans text-brand-charcoal text-sm sm:text-base leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* What You'll Learn (Syllabus) */}
            <div className="space-y-3">
              <h2 className="font-heading font-bold text-lg sm:text-xl tracking-wider text-brand-black border-b border-black/5 pb-2">
                What You'll Learn
              </h2>
              <ul className="space-y-3 font-sans text-brand-charcoal text-sm sm:text-base">
                {course.syllabus.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Requirements/Eligibility */}
            <div className="space-y-4">
              <h2 className="font-heading font-bold text-xl uppercase tracking-wider text-brand-black border-b border-black/5 pb-2">
                Requirements & Eligibility
              </h2>
              <ul className="space-y-3 font-sans text-brand-charcoal text-sm sm:text-base">
                {course.requirements.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-brand-black/10 text-brand-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="h-1.5 w-1.5 bg-brand-charcoal rounded-full" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Schedule */}
            <div className="space-y-4">
              <h2 className="font-heading font-bold text-xl uppercase tracking-wider text-brand-black border-b border-black/5 pb-2">
                Training Schedule
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-brand-light p-6 rounded-xl border border-black/5">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-heading font-bold text-brand-charcoal/50">Next Start Date</span>
                  <p className="font-heading font-bold text-brand-black text-sm uppercase">{course.schedule.startDate}</p>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-black/10 sm:pl-4 pt-3 sm:pt-0">
                  <span className="text-[10px] uppercase tracking-wider font-heading font-bold text-brand-charcoal/50">Class Days</span>
                  <p className="font-heading font-bold text-brand-black text-sm uppercase">{course.schedule.days}</p>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-black/10 sm:pl-4 pt-3 sm:pt-0">
                  <span className="text-[10px] uppercase tracking-wider font-heading font-bold text-brand-charcoal/50">Class Times</span>
                  <p className="font-heading font-bold text-brand-black text-sm uppercase">{course.schedule.times}</p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Sidebar Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <Card hoverEffect={false} className="border-t-4 border-brand-orange bg-brand-light p-6 sm:p-8 space-y-6 text-left shadow-md">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-heading font-bold text-brand-charcoal/50">Total Course Fee</span>
                <p className="font-heading font-extrabold text-brand-orange text-3xl">{course.fee}</p>
                <span className="text-[10px] text-brand-charcoal/40 italic block">*Flexible payment plans available</span>
              </div>
              
              <div className="border-t border-black/10 pt-4 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-brand-charcoal/70">Duration</span>
                  <span className="font-heading font-bold text-brand-black">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-brand-charcoal/70">Class Mode</span>
                  <span className="font-heading font-bold text-brand-black">In-Person (Workshop Labs)</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-brand-charcoal/70">Certification</span>
                  <span className="font-heading font-bold text-brand-black">TVTI Vocational Certificate</span>
                </div>
              </div>

              <div className="pt-2">
                <Link to={`/inquiry?course=${course.slug}`}>
                  <button className="w-full bg-brand-orange text-brand-white font-heading font-extrabold text-sm uppercase py-4 rounded-lg hover:bg-brand-black hover:text-brand-white transition-all duration-300 min-h-[48px] shadow-sm hover:shadow-md flex items-center justify-center">
                    Apply Now
                  </button>
                </Link>
              </div>
            </Card>
          </div>

        </div>
      </section>

      {/* 3. RELATED COURSES */}
      <section className="bg-brand-light border-t border-black/5 py-20 px-5 sm:px-8 lg:px-12 xl:px-16 w-full">
        <div className="max-w-7xl mx-auto space-y-12">
          <SectionHeading
            title="Related Courses"
            subtitle="Explore other professional vocational tracks from our department."
            align="center"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {finalRelatedCourses.map((rel, idx) => (
              <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden bg-brand-white" hoverEffect={true}>
                <div>
                  <div className="h-40 overflow-hidden bg-brand-black relative">
                    <img
                      src={rel.image}
                      alt={rel.title}
                      className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-brand-black/10" />
                  </div>
                  <div className="p-5 space-y-2 text-left">
                    <span className="text-[10px] text-brand-orange font-heading font-bold uppercase tracking-wider block">
                      {rel.category}
                    </span>
                    <h4 className="font-heading font-bold text-base text-brand-black leading-snug min-h-[40px] flex items-center">
                      {rel.title}
                    </h4>
                  </div>
                </div>
                <div className="px-5 pb-5 pt-3 border-t border-black/5">
                  <Link to={`/courses/${rel.slug}`}>
                    <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">
                      View Details
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
