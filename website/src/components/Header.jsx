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
      hasDropdown: false,
      dropdownItems: [
        { name: 'Institute Overview', path: '/about' },
        { name: 'Vision & Mission', path: '/about#vision' },
        { name: 'Senior Faculty', path: '/about#leaders' },
        { name: 'Workshop Facilities', path: '/about#facilities' },
      ],
    },
    {
      name: 'Courses',
      path: '/courses',
      hasDropdown: true,
      dropdownItems: [
        { name: 'All Technical Programs', path: '/courses' },
        { name: 'Mobile Hardware Repair', path: '/courses/mobile-phone-repairing-hardware' },
        { name: 'Mobile Hardware + Software', path: '/courses/mobile-phone-repairing-hardware-software' },
        { name: 'Laptop & Desktop Systems', path: '/courses/laptop-desktop-repairing' },
        { name: 'Home Appliances Repair', path: '/courses/home-appliances-repairing' },
        { name: 'CCTV Installation', path: '/courses/cctv-installation' },
        { name: 'Domestic Home Wiring', path: '/courses/home-wiring' },
      ],
    },
    {
      name: 'Verification',
      path: '/verify',
      hasDropdown: false,
    },
    {
      name: 'Gallery',
      path: '/gallery',
      hasDropdown: true,
      dropdownItems: [
        { name: 'Videos', path: '/gallery/videos' },
        { name: 'Photos', path: '/gallery/photos' },
      ],
    },
    {
      name: 'Contact Us',
      path: '/contact',
      hasDropdown: false,
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
    <header className="w-full z-50 font-sans select-none">
      {/* 1. TOP UTILITY BAR (scrolls away naturally) */}
      <div className="bg-brand-black text-brand-white text-[11px] h-7 sm:h-8 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-brand-charcoal">
        {/* Left utility text */}
        <div className="truncate">
          <Link
            to="/inquiry"
            className="text-brand-orange font-heading font-bold uppercase tracking-wider hover:underline hover:text-brand-orange/90 transition-colors text-[10px] sm:text-xs"
          >
            Register for Courses — Apply Now
          </Link>
        </div>
        {/* Right hotline and social links */}
        <div className="hidden sm:flex items-center space-x-4 lg:space-x-6 text-[11px]">
          <div className="flex items-center space-x-1.5 text-brand-light/90">
            <svg className="h-3 w-3 text-brand-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="font-semibold tracking-wide text-[10px] sm:text-[11px]">076 538 0715 / 078 538 0715</span>
          </div>

          <span className="h-3 w-px bg-brand-charcoal hidden md:block" />

          {/* Socials */}
          <div className="hidden md:flex items-center space-x-3 text-brand-light/75">
            <a href="#facebook" aria-label="Facebook" className="hover:text-brand-orange transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
              </svg>
            </a>
            <a href="#youtube" aria-label="YouTube" className="hover:text-brand-orange transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="#instagram" aria-label="Instagram" className="hover:text-brand-orange transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Placeholder spacer div when navbar becomes fixed to prevent content layout jump */}
      {isScrolled && <div className="h-[44px] sm:h-[48px] w-full" />}

      {/* 2. MAIN NAVIGATION BAR */}
      <nav
        className={`text-brand-black border-b border-black/5 transition-all duration-300 ${
          isScrolled
            ? 'fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md shadow-md py-1'
            : 'relative z-50 bg-white/95 backdrop-blur-sm shadow-xs py-1.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11 sm:h-12">
            
            {/* Left Brand Area (Logo Image + Wordmark) */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5 group" onClick={closeMenu}>
                <img
                  src={logoImg}
                  alt="Twintec Logo"
                  className="h-7 sm:h-9 w-auto transition-transform duration-300 group-hover:scale-105"
                />
                <div className="flex flex-col text-left justify-center">
                  <span className="font-heading font-bold text-sm sm:text-base leading-none tracking-wider text-brand-black uppercase">
                    Twintec
                  </span>
                  <span className="font-heading font-semibold text-[8px] sm:text-[9px] uppercase tracking-wider text-brand-charcoal/90 mt-0.5 whitespace-nowrap">
                    Vocational Training Institute
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Menu (Perfectly aligned horizontally) */}
            <div className="hidden lg:flex items-center space-x-1 xl:space-x-2 h-full">
              {menuItems.map((item) => {
                const isActive = isItemActive(item)
                return (
                  <div key={item.name} className="relative group flex items-center h-full">
                    <Link
                      to={item.path}
                      className={`flex items-center px-2.5 xl:px-3 py-1.5 text-xs font-heading font-semibold tracking-wide uppercase whitespace-nowrap transition-colors duration-200 ${
                        isActive
                          ? 'text-brand-orange'
                          : 'text-brand-charcoal hover:text-brand-orange'
                      }`}
                    >
                      <span>{item.name}</span>
                      {item.hasDropdown && (
                        <svg
                          className="w-3 h-3 ml-1 transition-transform duration-200 group-hover:rotate-180 text-current"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </Link>

                    {/* Clean active indicator line */}
                    {isActive && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-brand-orange rounded-full" />
                    )}

                    {/* Dropdown Menu on Hover */}
                    {item.hasDropdown && (
                      <div className="absolute left-0 top-full mt-0 w-56 bg-brand-white border border-black/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-50 p-1.5 space-y-0.5">
                        {item.dropdownItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className={`block px-3.5 py-2 text-xs font-heading font-medium rounded-lg transition-all duration-150 ${
                              currentPath === subItem.path
                                ? 'bg-brand-orange/10 text-brand-orange font-semibold'
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

            {/* Right Standout Apply Button */}
            <div className="hidden lg:flex items-center flex-shrink-0 ml-2">
              <Link to="/inquiry">
                <button className="bg-brand-orange text-brand-white font-heading font-bold text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full hover:bg-brand-black hover:text-brand-white shadow-xs hover:shadow-sm transition-all duration-300 flex items-center justify-center whitespace-nowrap min-h-[34px] cursor-pointer">
                  Apply Now
                </button>
              </Link>
            </div>

            {/* Hamburger Button for Mobile/Tablet (< 1024px) */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={toggleMenu}
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-lg text-brand-charcoal hover:text-brand-orange hover:bg-brand-light focus:outline-none transition-all border border-black/5 min-h-[42px] min-w-[42px]"
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

        {/* 3. MOBILE MENU SLIDE-DOWN DRAWER */}
        <div
          className={`lg:hidden absolute top-full left-0 right-0 z-40 bg-brand-white border-t border-black/10 shadow-2xl transition-all duration-300 ease-in-out transform ${
            isOpen ? 'max-h-[85vh] opacity-100 py-4' : 'max-h-0 opacity-0 pointer-events-none'
          } overflow-y-auto`}
          id="mobile-menu"
        >
          <div className="px-6 space-y-2">
            {menuItems.map((item, index) => {
              const isActive = isItemActive(item)
              const isAccordionOpen = openAccordion === index
              
              return (
                <div key={item.name} className="border-b border-black/5 pb-1">
                  {item.hasDropdown ? (
                    <div>
                      <button
                        onClick={() => toggleAccordion(index)}
                        className={`w-full flex items-center justify-between py-2.5 text-left font-heading font-bold text-base transition-colors ${
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

                      <div
                        className={`pl-4 space-y-1 transition-all duration-300 overflow-hidden ${
                          isAccordionOpen ? 'max-h-[350px] opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'
                        }`}
                      >
                        {item.dropdownItems.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            onClick={toggleMenu}
                            className={`block py-2 text-sm font-heading font-semibold transition-colors ${
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
                    <Link
                      to={item.path}
                      onClick={toggleMenu}
                      className={`block py-2.5 font-heading font-bold text-base transition-colors ${
                        isActive ? 'text-brand-orange' : 'text-brand-charcoal'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )}
                </div>
              )
            })}
            
            <div className="pt-4">
              <Link to="/inquiry" onClick={toggleMenu}>
                <button className="w-full bg-brand-orange text-brand-white font-heading font-bold text-sm uppercase py-3 rounded-lg hover:bg-brand-black hover:text-brand-white shadow-sm transition-all duration-300 min-h-[44px]">
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
