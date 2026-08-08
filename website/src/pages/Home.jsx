import React from 'react'
import SectionHeading from '../components/SectionHeading'
import Button from '../components/Button'
import Card from '../components/Card'

export default function Home() {
  return (
    <div className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="bg-brand-black text-brand-white rounded-2xl p-8 md:p-12 lg:p-16 relative overflow-hidden border border-brand-charcoal">
        <div className="relative z-10 max-w-2xl space-y-6">
          <span className="text-brand-orange font-heading font-bold text-xs uppercase tracking-widest bg-brand-orange/10 px-3 py-1 rounded-full">
            Technical & Vocational Training Institute
          </span>
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight uppercase leading-none">
            Empowering <br />
            <span className="text-brand-orange">Technical Careers</span>
          </h1>
          <p className="text-brand-light/70 font-sans text-base sm:text-lg leading-relaxed">
            Gain industry-ready expertise with our state-of-the-art labs, hands-on courses, and world-class faculty.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button variant="primary">Explore Programs</Button>
            <Button variant="darkOutline">Request Info</Button>
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </section>

      {/* Programs Preview Section */}
      <section className="space-y-8">
        <SectionHeading
          title="Featured Programs"
          subtitle="Explore our top technical disciplines designed to get you hired."
          align="left"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Card>
            <div className="space-y-4">
              <span className="text-brand-orange font-heading font-bold text-xs tracking-wider uppercase">01 / INDUSTRIAL</span>
              <h3 className="font-heading font-bold text-xl text-brand-black">Robotics & Automation</h3>
              <p className="text-brand-charcoal/80 text-sm leading-relaxed">
                Master industrial robotics programming, PLC configurations, and automated production systems control.
              </p>
              <div className="pt-2">
                <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">Learn More</Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <span className="text-brand-orange font-heading font-bold text-xs tracking-wider uppercase">02 / MECHANICAL</span>
              <h3 className="font-heading font-bold text-xl text-brand-black">Precision Machining</h3>
              <p className="text-brand-charcoal/80 text-sm leading-relaxed">
                Develop advanced skills in CNC programming, CAD/CAM design, and precision metal manufacturing.
              </p>
              <div className="pt-2">
                <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">Learn More</Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <span className="text-brand-orange font-heading font-bold text-xs tracking-wider uppercase">03 / TECHNOLOGY</span>
              <h3 className="font-heading font-bold text-xl text-brand-black">Cybersecurity & Networking</h3>
              <p className="text-brand-charcoal/80 text-sm leading-relaxed">
                Build secure architectures, monitor enterprise networks, and defend against modern cyber threat vectors.
              </p>
              <div className="pt-2">
                <Button variant="outline" className="w-full text-xs py-2 min-h-[40px]">Learn More</Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Info Stats Section */}
      <section className="bg-brand-light rounded-2xl p-8 border border-black/5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-orange">95%</p>
            <p className="font-sans text-xs uppercase tracking-wider text-brand-charcoal font-semibold">Placement Rate</p>
          </div>
          <div className="space-y-1 border-l border-black/10">
            <p className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-orange">12,000+</p>
            <p className="font-sans text-xs uppercase tracking-wider text-brand-charcoal font-semibold">Graduates</p>
          </div>
          <div className="space-y-1 border-l border-black/10">
            <p className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-orange">25+</p>
            <p className="font-sans text-xs uppercase tracking-wider text-brand-charcoal font-semibold">Lab Facilities</p>
          </div>
          <div className="space-y-1 border-l border-black/10">
            <p className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-orange">150+</p>
            <p className="font-sans text-xs uppercase tracking-wider text-brand-charcoal font-semibold">Industry Partners</p>
          </div>
        </div>
      </section>
    </div>
  )
}
