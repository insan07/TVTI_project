import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import InquiryForm from '../components/InquiryForm'

export default function Contact() {
  useEffect(() => {
    document.title = 'Contact Us | Twintec Vocational Training Institute Puttalam'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Contact TVTI Puttalam. Reach us at 0117 270 270, email info@tvti.lk, view our campus location on maps, or submit a message directly.'
      )
    }
  }, [])

  return (
    <div className="flex flex-col w-full overflow-hidden select-none">
      
      {/* 1. PAGE HEADER BANNER */}
      <section className="bg-brand-black text-brand-white py-12 px-4 sm:px-6 lg:px-8 border-b border-brand-charcoal relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-left">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-xs font-sans uppercase tracking-widest text-brand-light/50">
              <Link to="/" className="hover:text-brand-orange transition-colors">Home</Link>
              <span>&gt;</span>
              <span className="text-brand-orange font-bold">Contact Us</span>
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-brand-white">
              Contact Us
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <span className="h-1.5 w-16 bg-brand-orange block rounded-full" />
          </div>
        </div>
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      </section>

      {/* 2. TWO-COLUMN LAYOUT (Details vs Map) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* LEFT: Contact details */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <SectionHeading
              title="Get In Touch"
              subtitle="Have questions about applications, classes, or corporate technical training?"
              align="left"
            />

            <div className="space-y-6">
              
              {/* Address details */}
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-brand-charcoal/50">Campus Address</h4>
                  <p className="font-sans text-brand-black text-sm sm:text-base font-semibold">
                    No. 45, Kurunegala Road, Puttalam, Sri Lanka
                  </p>
                </div>
              </div>

              {/* Phone details */}
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-brand-charcoal/50">Admissions Hotline</h4>
                  <p className="font-sans text-brand-black text-sm sm:text-base font-semibold">
                    0117 270 270
                  </p>
                </div>
              </div>

              {/* Email details */}
              <div className="flex items-start space-x-4">
                <div className="h-10 w-10 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-brand-charcoal/50">Support Email</h4>
                  <p className="font-sans text-brand-black text-sm sm:text-base font-semibold">
                    info@tvti.lk
                  </p>
                </div>
              </div>

            </div>

            {/* Opening Hours Styled Table */}
            <div className="space-y-3 pt-4">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-brand-charcoal/60">
                Opening Hours
              </h4>
              <div className="overflow-hidden rounded-xl border border-black/5 shadow-sm max-w-sm">
                <table className="min-w-full divide-y divide-black/5">
                  <thead className="bg-brand-light">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-heading font-bold text-brand-charcoal uppercase tracking-wider">Days</th>
                      <th scope="col" className="px-4 py-2.5 text-left text-xs font-heading font-bold text-brand-charcoal uppercase tracking-wider">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-brand-white divide-y divide-black/5 text-sm font-sans text-brand-charcoal">
                    <tr>
                      <td className="px-4 py-3 font-semibold">Monday - Friday</td>
                      <td className="px-4 py-3">8:30 AM - 4:30 PM</td>
                    </tr>
                    <tr className="bg-brand-light/20">
                      <td className="px-4 py-3 font-semibold">Saturday - Sunday</td>
                      <td className="px-4 py-3 text-red-500 font-semibold uppercase tracking-wider text-xs">Closed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Social media connections */}
            <div className="space-y-3 pt-4">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-brand-charcoal/60">
                Connect With Us
              </h4>
              <div className="flex items-center space-x-4 text-brand-charcoal/80">
                <a href="#facebook" aria-label="Facebook" className="hover:text-brand-orange transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                  </svg>
                </a>
                <a href="#youtube" aria-label="YouTube" className="hover:text-brand-orange transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="#instagram" aria-label="Instagram" className="hover:text-brand-orange transition-colors">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>

          </div>

          {/* RIGHT: Embedded Google Map */}
          <div className="lg:col-span-6 w-full h-full min-h-[320px]">
            {/* Map wrapper card */}
            <div className="w-full h-full overflow-hidden rounded-xl border border-black/5 shadow-md bg-brand-light">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3950.4856094611413!2d79.8271701!3d8.0308075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3afda5629c1fb29c%3A0xe54d4f3b7b3b9b9c!2sPuttalam%2C%20Sri%20Lanka!5e0!3m2!1sen!2slk!4v1690000000000"
                className="w-full h-80 sm:h-96 md:h-[450px] border-0"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="TVTI Puttalam Map Location"
              />
            </div>
          </div>

        </div>

        {/* 3. REUSED INQUIRY FORM COMPONENT */}
        <div className="mt-20 max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-brand-black uppercase tracking-tight">
              Have a Specific Question?
            </h3>
            <p className="font-sans text-brand-charcoal/70 text-sm max-w-md mx-auto">
              Fill out our general inquiry form below and we will get back to you within 24 hours.
            </p>
          </div>
          <InquiryForm />
        </div>

      </section>

    </div>
  )
}
