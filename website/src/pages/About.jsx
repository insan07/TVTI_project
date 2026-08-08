import React from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import Button from '../components/Button'

// Asset imports
import facilityAuto from '../assets/facility_auto.png'
import facilityComputer from '../assets/facility_computer.png'
import facilityElectrical from '../assets/facility_electrical.png'
import facilityKitchen from '../assets/facility_kitchen.png'

export default function About() {
  const facilities = [
    {
      title: 'Auto Mechanics Workshop',
      description: 'Fully equipped with hydraulic car lifts, engine diagnostic systems, and specialized precision tools for hands-on automotive repair training.',
      image: facilityAuto,
    },
    {
      title: 'Computer & ICT Lab',
      description: 'Equipped with high-performance workstations, server infrastructure racks, and networking equipment simulating active enterprise data pipelines.',
      image: facilityComputer,
    },
    {
      title: 'Electrical & Electronics Lab',
      description: 'Features individual safety testing benches, PLC programming modules, circuit assembly panels, and professional troubleshooting gear.',
      image: facilityElectrical,
    },
    {
      title: 'Culinary Training Kitchen',
      description: 'A commercial-grade stainless steel kitchen featuring advanced ovens, range cookers, and service preparation areas for hospitality training.',
      image: facilityKitchen,
    },
  ]

  const instructors = [
    {
      name: 'Eng. Tharindu Perera',
      title: 'Head of Automotive & Engineering',
      initials: 'TP',
      bio: 'Over 12 years of active mechanical operations experience in light vehicle repair and diesel engine overhaul.',
    },
    {
      name: 'Mrs. Fathima Farzana',
      title: 'Lead IT & Cybersecurity Instructor',
      initials: 'FF',
      bio: 'Cisco Certified Specialist with 8 years of teaching experience in systems administration and cyber defense.',
    },
    {
      name: 'Mr. Roshan Silva',
      title: 'Senior Electronics & Automation Trainer',
      initials: 'RS',
      bio: 'Automation specialist focusing on PLC diagnostics, robotics assembly, and industrial manufacturing systems.',
    },
    {
      name: 'Chef Anura Kumara',
      title: 'Hospitality & Food Tech Supervisor',
      initials: 'AK',
      bio: 'Professional pastry chef with a decade of kitchen management experience in international luxury hotels.',
    },
  ]

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. PAGE HEADER BANNER (Small Hero) */}
      <section className="bg-brand-black text-brand-white py-12 px-4 sm:px-6 lg:px-8 border-b border-brand-charcoal relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-left">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs font-sans uppercase tracking-widest text-brand-light/50">
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold">About Us</span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-brand-white">
              About TVTI
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <span className="h-1.5 w-16 bg-brand-orange block rounded-full" />
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      </section>

      {/* 2. OVERVIEW SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <SectionHeading
              title="Overview"
              subtitle="Developing tomorrow's technical experts."
              align="left"
            />
          </div>
          <div className="lg:col-span-8 space-y-6 text-left font-sans text-brand-charcoal text-sm sm:text-base leading-relaxed">
            <p>
              Twintec Vocational Training Institute (TVTI) was established in Puttalam with a clear mission: to provide the local community with highly practical, workplace-oriented education. We recognize the growing global demand for skilled technical professionals, and we have built our programs to meet this need.
            </p>
            <p>
              Our history is defined by strong corporate alignments. Rather than focusing solely on classroom theory, TVTI partners with regional manufacturing plants, technology firms, and service industries to structure curriculums around current corporate roles. This ensures our graduates step out of labs directly into meaningful, long-term employment.
            </p>
            <p>
              Whether you are an aspiring mechanic, an electronics technician, a network manager, or a hospitality professional, TVTI provides you with the modern equipment, professional workspace simulations, and expert mentorship to build a secure career.
            </p>
          </div>
        </div>
      </section>

      {/* 3. VISION & MISSION (Side-by-side cards) */}
      <section className="bg-brand-light border-y border-black/5 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card hoverEffect={true} className="bg-brand-white">
            <div className="space-y-4 text-left">
              <div className="h-10 w-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-brand-black uppercase tracking-tight">Our Vision</h3>
              <p className="font-sans text-brand-charcoal/80 text-sm sm:text-base leading-relaxed">
                To stand as the premier national center for technological innovation and technical trade excellence, recognized for transforming student potential into global industry leadership through hands-on education.
              </p>
            </div>
          </Card>
          
          <Card hoverEffect={true} className="bg-brand-white">
            <div className="space-y-4 text-left">
              <div className="h-10 w-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading font-extrabold text-xl text-brand-black uppercase tracking-tight">Our Mission</h3>
              <p className="font-sans text-brand-charcoal/80 text-sm sm:text-base leading-relaxed">
                Through rigorous vocational instruction, state-of-the-art laboratory testing, and strong corporate alliances, we build resilient pipelines of skilled workforce talent prepared for the future of industrial challenges.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. FACILITIES SECTION (Grid of 4 facility cards with generated images) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
        <SectionHeading
          title="Our Facilities"
          subtitle="Take a look inside our high-tech workshop environments and modern labs."
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {facilities.map((fac, idx) => (
            <Card key={idx} className="flex flex-col h-full justify-between p-0 overflow-hidden" hoverEffect={true}>
              <div>
                {/* Facility Image */}
                <div className="h-48 overflow-hidden bg-brand-black relative">
                  <img
                    src={fac.image}
                    alt={fac.title}
                    className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-black/10 hover:bg-brand-black/0 transition-colors" />
                </div>
                {/* Content */}
                <div className="p-6 space-y-3 text-left">
                  <h3 className="font-heading font-bold text-lg text-brand-black leading-snug">
                    {fac.title}
                  </h3>
                  <p className="font-sans text-brand-charcoal/80 text-xs sm:text-sm leading-relaxed">
                    {fac.description}
                  </p>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 text-left">
                <span className="text-brand-orange text-xs font-heading font-bold uppercase tracking-wider">
                  Active Lab Facility
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. OUR INSTRUCTORS/LEADERS SECTION */}
      <section className="bg-brand-light border-y border-black/5 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          <SectionHeading
            title="Our Instructors"
            subtitle="Meet the industry professionals guiding you through every lab session."
            align="center"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {instructors.map((ins, idx) => (
              <Card key={idx} className="bg-brand-white text-center flex flex-col justify-between" hoverEffect={true}>
                <div className="space-y-4">
                  {/* Initials Avatar Badge */}
                  <div className="h-16 w-16 rounded-full bg-brand-black text-brand-orange flex items-center justify-center font-heading font-extrabold text-xl mx-auto border-2 border-brand-orange shadow-sm transition-transform duration-300 hover:scale-105">
                    {ins.initials}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-heading font-bold text-base text-brand-black">
                      {ins.name}
                    </h4>
                    <p className="text-brand-orange text-xs font-semibold uppercase tracking-wider">
                      {ins.title}
                    </p>
                  </div>
                  
                  <p className="font-sans text-brand-charcoal/85 text-xs leading-relaxed">
                    {ins.bio}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-black/5">
                  <span className="text-brand-charcoal/40 text-[10px] font-sans uppercase tracking-widest font-semibold">
                    Faculty Member
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA BANNER (Bottom CTA matched with home page style) */}
      <section className="bg-brand-orange text-brand-white py-16 px-4 sm:px-6 lg:px-8 border-t border-brand-orange shadow-inner relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-tight leading-none text-brand-white">
            Ready to Start Your Career?
          </h2>
          <p className="font-sans text-brand-white/90 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Apply online today and reserve your seat. Batches fill quickly. Speak with an admissions advisor for assistance.
          </p>
          <div className="pt-4">
            <Link to="/contact">
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
