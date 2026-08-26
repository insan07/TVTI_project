import React from 'react'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import Button from '../components/Button'

export default function About() {
  return (
    <div className="space-y-12 py-12 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-7xl mx-auto">
      {/* Intro Section */}
      <section className="space-y-6">
        <SectionHeading
          title="About TVTI"
          subtitle="Our history, mission, and dedication to vocational excellence."
          align="left"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 items-center">
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-xl text-brand-black uppercase">
              Shaping the Future of Technical Trades
            </h3>
            <p className="text-brand-charcoal text-sm sm:text-base leading-relaxed">
              Founded to bridge the gap between classroom theory and industry practice, the Technical & Vocational Training Institute (TVTI) provides intensive training pathways for technical careers.
            </p>
            <p className="text-brand-charcoal text-sm sm:text-base leading-relaxed">
              Our curriculums are designed in partnership with manufacturing and technology leaders, ensuring every graduate has the precise skill set sought by employers.
            </p>
          </div>
          <div className="bg-brand-charcoal text-brand-white p-8 rounded-xl space-y-4 border border-black/5 shadow-sm">
            <h4 className="font-heading font-bold text-lg text-brand-orange uppercase">Our Core Goal</h4>
            <blockquote className="font-sans italic text-brand-light/90 border-l-2 border-brand-orange pl-4 py-2">
              "To deliver industry-aligned vocational education that enables learners to achieve meaningful careers and supports local economic growth."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Vision & Mission Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <Card hoverEffect={false}>
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-lg text-brand-black uppercase">Our Vision</h3>
            <p className="text-brand-charcoal/80 text-sm leading-relaxed">
              To be the premier national hub for technological innovation and technical trade excellence, recognized for transforming student potential into global industry leadership.
            </p>
          </div>
        </Card>

        <Card hoverEffect={false}>
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-lg text-brand-black uppercase">Our Mission</h3>
            <p className="text-brand-charcoal/80 text-sm leading-relaxed">
              Through rigorous instruction, hands-on learning labs, and strong corporate alignments, we build resilient pipelines of skilled workforce talent prepared for future industrial challenges.
            </p>
          </div>
        </Card>
      </section>

      {/* Campus CTA */}
      <section className="bg-brand-light rounded-xl p-8 border border-black/5 text-center space-y-6">
        <h3 className="font-heading font-bold text-xl text-brand-black uppercase">
          Ready to See Our Facility?
        </h3>
        <p className="text-brand-charcoal/80 text-sm max-w-xl mx-auto">
          We schedule weekly campus tours and lab walkthroughs for prospective students and business representatives.
        </p>
        <div>
          <Button variant="primary">Schedule a Tour</Button>
        </div>
      </section>
    </div>
  )
}
