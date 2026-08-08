import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logoImg from '../assets/logo.png'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [openAccordion, setOpenAccordion] = useState(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname

  // Handle scroll detection for sticky navbar shadow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 36) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus on path change
  useEffect(() => {
    setIsOpen(false)
    setOpenAccordion(null)
  }, [location])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
    setOpenAccordion(null)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setOpenAccordion(null)
  }

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index)
  }

  const menuItems = [
    {
      name: 'Home',
      path: '/',
      hasDropdown: false,
    },
    {
      name: 'About Us',
      path: '/about',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Overview', path: '/about' },
        { name: 'Vision & Mission', path: '#vision' },
        { name: 'Our Leaders/Instructors', path: '#leaders' },
        { name: 'Contact Details', path: '/contact' },
      ],
    },
    {
      name: 'Student',
      path: '/inquiry',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Apply Online', path: '/inquiry' },
        { name: 'Student Comments', path: '#' },
        { name: 'Success Stories', path: '#' },
      ],
    },
    {
      name: 'Courses',
      path: '/courses',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Course Listing', path: '/courses' },
        { name: 'Course Details / Brochure', path: '/courses/automobile-repair-maintenance' },
      ],
    },
    {
      name: 'Information',
      path: '#information',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Right to Information', path: '#rti' },
        { name: 'Certificate Verification', path: '#verification' },
        { name: 'Downloads', path: '#downloads' },
      ],
    },
    {
      name: 'Gallery',
      path: '#gallery',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Photo Gallery', path: '#photos' },
        { name: 'Video Gallery', path: '#videos' },
      ],
    },
    {
      name: 'Contact Us',
      path: '/contact',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Inquiries', path: '/contact' },
        { name: 'Center/Location', path: '#location' },
        { name: 'Contact Details', path: '/contact' },
      ],
    },
  ]

  // Check if a main menu item or any of its dropdown children is active
  const isItemActive = (item) => {
    if (currentPath === item.path) return true
    if (item.hasDropdown) {
      return item.dropdownItems.some(subItem => subItem.path === currentPath)
    }
    return false
  }

  return (
    <header className="w-full z-50 flex flex-col font-sans">
      {/* 1. TOP UTILITY BAR (thin strip, black background, white/orange text, ~36px tall) */}
      <div className="bg-brand-black text-brand-white text-xs h-9 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-brand-charcoal">
        {/* Left utility text */}
        <div>
          <Link
            to="/inquiry"
            className="text-brand-orange font-heading font-bold uppercase tracking-wider hover:underline hover:text-brand-orange/90 transition-colors"
          >
            Register for Courses — Apply Now
          </Link>
        </div>
        {/* Right hotline and social links */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-brand-light/90">
            <svg className="h-3.5 w-3.5 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="font-semibold tracking-wide">0117 270 270</span>
          </div>

          <span className="h-3.5 w-px bg-brand-charcoal" />

          {/* Socials */}
          <div className="flex items-center space-x-3.5 text-brand-light/75">
            {/* Facebook */}
            <a href="#facebook" aria-label="Facebook" className="hover:text-brand-orange transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
              </svg>
            </a>
            {/* YouTube */}
            <a href="#youtube" aria-label="YouTube" className="hover:text-brand-orange transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href="#instagram" aria-label="Instagram" className="hover:text-brand-orange transition-colors">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION BAR (white background, sticky on scroll, shadow on scroll) */}
      <nav
        className={`bg-brand-white text-brand-black sticky top-0 z-50 border-b border-black/5 transition-all duration-300 ${
          isScrolled ? 'shadow-md py-2' : 'shadow-sm py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[56px]">
            {/* Left Brand Area (Logo Image + wordmark) */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-3 group" onClick={closeMenu}>
                {/* Logo Image */}
                <img
                  src={logoImg}
                  alt="Twintec Logo"
                  className="h-11 sm:h-12 lg:h-14 w-auto transition-transform duration-300 group-hover:scale-105"
                />
                {/* Logo text wordmark */}
                <div className="flex flex-col text-left">
                  <span className="font-heading font-extrabold text-base sm:text-lg lg:text-xl leading-none tracking-wider text-brand-black uppercase">
                    Twintec
                  </span>
                  <span className="font-heading font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.18em] text-brand-charcoal/70 mt-1 whitespace-nowrap">
                    Vocational Training Institute
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Center/Right Menu */}
            <div className="hidden md:flex items-center space-x-0.5 md:space-x-1 lg:space-x-2 xl:space-x-4">
              {menuItems.map((item, idx) => {
                const isActive = isItemActive(item)
                return (
                  <div key={item.name} className="relative group py-2">
                    {item.hasDropdown ? (
                      /* Dropdown Trigger Link */
                      <Link
                        to={item.path}
                        className={`px-1.5 md:px-2 lg:px-3.5 py-2 font-heading font-bold text-xs lg:text-sm tracking-wider uppercase transition-all duration-200 focus:outline-none cursor-pointer ${
                          isActive
                            ? 'text-brand-orange border-b-2 border-brand-orange'
                            : 'text-brand-charcoal hover:text-brand-orange border-b-2 border-transparent'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      /* Standard Link */
                      <Link
                        to={item.path}
                        className={`px-1.5 md:px-2 lg:px-3.5 py-2 font-heading font-bold text-xs lg:text-sm tracking-wider uppercase transition-all duration-200 ${
                          isActive
                            ? 'text-brand-orange border-b-2 border-brand-orange'
                            : 'text-brand-charcoal hover:text-brand-orange border-b-2 border-transparent'
                        }`}
                      >
                        {item.name}
                      </Link>
                    )}

                    {/* Dropdown Menu (on hover) */}
                    {item.hasDropdown && (
                      <div className="absolute left-0 top-full mt-1 w-60 bg-brand-white border border-black/5 rounded-xl shadow-[0_10px_35px_-8px_rgba(0,0,0,0.1)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 p-2 space-y-1">
                        {item.dropdownItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className={`block px-4 py-2.5 text-xs font-heading font-semibold rounded-lg transition-all duration-150 ${
                              currentPath === subItem.path
                                ? 'bg-brand-orange/10 text-brand-orange font-bold'
                                : 'text-brand-charcoal hover:bg-brand-light hover:text-brand-orange'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Standout Cta Button (Apply Now) */}
            <div className="hidden md:flex items-center">
              <Link to="/inquiry">
                <button className="bg-brand-orange text-brand-white font-heading font-extrabold text-xs uppercase tracking-widest py-2.5 px-4 lg:px-6 rounded-full hover:bg-brand-black hover:text-brand-white shadow-sm hover:shadow-md transition-all duration-300 min-h-[44px] flex items-center justify-center whitespace-nowrap">
                  Apply Now
                </button>
              </Link>
            </div>

            {/* Hamburger Icon button (Mobile only < 768px) */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-lg text-brand-charcoal hover:text-brand-orange hover:bg-brand-light focus:outline-none min-h-[44px] min-w-[44px] transition-all border border-black/5"
                aria-controls="mobile-menu"
                aria-expanded={isOpen}
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. MOBILE MENU DRAWERS/SLIDE-IN (Mobile only < 768px) */}
        <div
          className={`md:hidden fixed inset-0 top-[88px] z-40 bg-brand-white border-t border-black/10 transition-all duration-300 ease-in-out transform ${
            isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          } overflow-y-auto pb-12`}
          id="mobile-menu"
        >
          <div className="px-4 py-6 space-y-3">
            {menuItems.map((item, index) => {
              const isActive = isItemActive(item)
              const isAccordionOpen = openAccordion === index
              
              return (
                <div key={item.name} className="border-b border-black/5 pb-2">
                  {item.hasDropdown ? (
                    /* Accordion Trigger */
                    <div>
                      <button
                        onClick={() => toggleAccordion(index)}
                        className={`w-full flex items-center justify-between py-3 text-left font-heading font-bold text-base transition-colors ${
                          isActive ? 'text-brand-orange' : 'text-brand-charcoal'
                        }`}
                      >
                        <span>{item.name}</span>
                        <svg
                          className={`h-5 w-5 text-current transition-transform duration-200 ${
                            isAccordionOpen ? 'rotate-180 text-brand-orange' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Accordion Content */}
                      <div
                        className={`pl-4 space-y-2 mt-1 transition-all duration-300 overflow-hidden ${
                          isAccordionOpen ? 'max-h-[350px] opacity-100 py-2' : 'max-h-0 opacity-0 pointer-events-none'
                        }`}
                      >
                        {item.dropdownItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            onClick={toggleMenu}
                            className={`block py-3 text-sm font-heading font-semibold transition-colors ${
                              currentPath === subItem.path
                                ? 'text-brand-orange pl-2 border-l-2 border-brand-orange'
                                : 'text-brand-charcoal/80 hover:text-brand-orange'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Standard Mobile Link */
                    <Link
                      to={item.path}
                      onClick={toggleMenu}
                      className={`block py-3 font-heading font-bold text-base transition-colors ${
                        isActive ? 'text-brand-orange' : 'text-brand-charcoal'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              )
            })}
            
            {/* Standout Apply Now button inside mobile drawer */}
            <div className="pt-6">
              <Link to="/inquiry" onClick={toggleMenu}>
                <button className="w-full bg-brand-orange text-brand-white font-heading font-bold text-sm uppercase py-3.5 rounded-lg hover:bg-brand-black hover:text-brand-white shadow-sm transition-all duration-300 min-h-[48px]">
                  Apply Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
