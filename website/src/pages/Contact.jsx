import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Button from '../components/Button'
import Card from '../components/Card'

export default function Contact() {
  const [searchParams] = useSearchParams()
  const courseParam = searchParams.get('course') || 'general'

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    program: courseParam,
    message: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    alert(`Form submitted! Program: ${formData.program}, Name: ${formData.name}, Email: ${formData.email}`)
  }

  return (
    <div className="space-y-12 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <section>
        <SectionHeading
          title="Contact Us"
          subtitle="Get in touch with admissions, student services, or administration."
          align="left"
        />
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact details */}
        <div className="lg:col-span-1 space-y-6">
          <Card hoverEffect={false} className="h-full flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <h3 className="font-heading font-bold text-lg text-brand-black uppercase">
                Admissions Office
              </h3>
              <p className="text-brand-charcoal/80 text-sm leading-relaxed">
                Have questions about programs, scheduling, or tuition? Our admissions advisors are here to guide you.
              </p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-black/10">
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-brand-orange font-heading font-bold uppercase w-16">Call:</span>
                <span className="text-brand-charcoal">+1 (555) 019-2834</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-brand-orange font-heading font-bold uppercase w-16">Email:</span>
                <span className="text-brand-charcoal">admissions@tvti.edu</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <span className="text-brand-orange font-heading font-bold uppercase w-16">Hours:</span>
                <span className="text-brand-charcoal">Mon - Fri, 8AM - 5PM</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Form Container */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-brand-white border border-black/10 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="font-heading font-bold text-xl text-brand-black uppercase">
              Send a Message
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="program" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                Program of Interest
              </label>
              <select
                name="program"
                id="program"
                value={formData.program}
                onChange={handleChange}
                className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all"
              >
                <option value="general">General Admissions</option>
                <option value="automobile-repair-maintenance">Automobile Repair & Maintenance</option>
                <option value="mobile-phone-repairing">Mobile Phone Repairing</option>
                <option value="laptop-repairing">Laptop Repairing</option>
                <option value="home-appliances-repairing">Home Appliances Repairing</option>
                <option value="cctv-repairing">CCTV Repairing</option>
                <option value="home-wiring">Home Wiring</option>
                <option value="culinary-arts-hospitality">Culinary Arts & Hospitality Operations</option>
                <option value="modern-masonry-bricklaying">Modern Masonry & Bricklaying</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="message" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                Message / Inquiries
              </label>
              <textarea
                name="message"
                id="message"
                rows="4"
                required
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-2.5 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-all resize-none"
                placeholder="How can we help you?"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full sm:w-auto">
                Submit Inquiry
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
