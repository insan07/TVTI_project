import React from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ]

  return (
    <footer className="bg-brand-black text-brand-white border-t border-brand-charcoal pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Brand info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <img
                src={logoImg}
                alt="TVTI Logo"
                className="h-12 w-auto brightness-0 invert"
              />
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-xl tracking-wider text-brand-white uppercase">
                  TV<span className="text-brand-orange">TI</span>
                </span>
                <span className="font-heading font-bold text-[9px] uppercase tracking-widest text-brand-light/60 mt-0.5">
                  Puttalam
                </span>
              </div>
            </Link>
            <p className="text-brand-light/60 text-sm max-w-sm leading-relaxed">
              Empowering individuals with advanced technical and vocational training to build professional careers in industry and technology.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-brand-orange">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-brand-light/75 text-sm hover:text-brand-orange transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-brand-orange">
              Contact Info
            </h3>
            <ul className="space-y-2.5 text-brand-light/75 text-sm">
              <li className="flex items-start space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>120 Technology Drive, Innovation Park, Cityville</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+1 (555) 019-2834</span>
              </li>
              <li className="flex items-center space-x-2.5">
                <svg className="h-5 w-5 text-brand-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>admissions@tvti.edu</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright section */}
        <div className="border-t border-brand-charcoal/50 pt-6 flex flex-col sm:flex-row items-center justify-between text-brand-light/40 text-xs">
          <p>&copy; {currentYear} TVTI. All rights reserved.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <a href="#" className="hover:text-brand-orange transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-orange transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
