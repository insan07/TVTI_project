import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [email, setEmail] = useState('')

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!email) return
    alert(`Thank you for subscribing! We've sent a confirmation to: ${email}`)
    setEmail('')
  }

  const usefulLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Courses', path: '/courses' },
    { name: 'Video Gallery', path: '/gallery/videos' },
    { name: 'Photo Gallery', path: '/gallery/photos' },
    { name: 'Certificate Verification', path: '/verify' },
    { name: 'Online Application', path: '/inquiry' },
    { name: 'Contact Us', path: '/contact' },
  ]

  return (
    <footer className="bg-brand-black text-brand-white border-t border-brand-charcoal pt-16 pb-8 font-sans select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 4-Column Desktop Grid / Stacked Mobile Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 text-left">
          
          {/* Column 1: Logo, Tagline, Social Icons (3 Cols Desktop) */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src={logoImg}
                alt="Twintec Logo"
                className="h-14 w-auto"
              />
              <div className="flex flex-col text-left">
                <span className="font-heading font-extrabold text-base sm:text-lg leading-none tracking-wider text-brand-white uppercase">
                  Twintec
                </span>
                <span className="font-heading font-extrabold text-[10px] sm:text-[11px] lg:text-xs uppercase tracking-wider text-brand-light/80 mt-0.5 whitespace-nowrap">
                  Vocational Training Institute
                </span>
              </div>
            </Link>
            <p className="text-brand-light/60 text-sm leading-relaxed max-w-sm">
              Empowering students in Puttalam with premium, hands-on industrial expertise and certified vocational training.
            </p>
            {/* Social media links */}
            <div className="flex items-center space-x-4 text-brand-light/60 pt-2">
              <a href="#facebook" aria-label="Facebook" className="hover:text-brand-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a href="#youtube" aria-label="YouTube" className="hover:text-brand-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="#instagram" aria-label="Instagram" className="hover:text-brand-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Useful Links (2 Cols Desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-brand-orange">
              Useful Links
            </h3>
            <ul className="space-y-2">
              {usefulLinks.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.path}
                    className="text-brand-light/75 text-sm hover:text-brand-orange hover:underline transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact & Hours (3 Cols Desktop) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-brand-orange">
              Contact Info
            </h3>
            <ul className="space-y-3 text-brand-light/75 text-sm">
              <li className="flex items-start space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Mannar Road, Puttalam, Sri Lanka</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>076 538 0715 / 078 538 0715</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@tvti.edu.lk</span>
              </li>
              <li className="flex items-start space-x-2.5 pt-1 border-t border-brand-charcoal/50">
                <svg className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex flex-col text-xs text-brand-light/65">
                  <span className="font-bold text-brand-light">Sat - Thu: 8:30 AM - 5:00 PM</span>
                  <span className="text-red-400 font-semibold">Friday Closed</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter (3 Cols Desktop) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="font-heading font-extrabold text-sm uppercase tracking-wider text-brand-orange">
              Newsletter
            </h3>
            <p className="text-brand-light/60 text-xs sm:text-sm leading-relaxed">
              Subscribe to stay updated with new batches, intake announcements, and scholarship openings.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2 pt-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full bg-brand-charcoal text-brand-white border border-brand-charcoal focus:border-brand-orange focus:outline-none rounded-lg px-4 py-2.5 text-xs font-sans placeholder-brand-light/30 transition-all min-h-[40px]"
              />
              <button
                type="submit"
                className="w-full bg-brand-orange text-brand-white font-heading font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg hover:bg-brand-white hover:text-brand-black transition-all duration-300 min-h-[40px]"
              >
                Subscribe
              </button>
            </form>
          </div>

        </div>

        {/* Thin bottom copyright bar */}
        <div className="border-t border-brand-charcoal/50 pt-8 mt-8 text-center">
          <p className="text-brand-light/35 text-xs tracking-wider">
            Copyright &copy; {currentYear} TVTI. All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
