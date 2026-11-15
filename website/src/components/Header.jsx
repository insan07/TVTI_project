import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logoImg from '../assets/logo.png'
import { useSiteSettings } from '../context/SiteSettingsContext'

export default function Header() {
  const { settings } = useSiteSettings()
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
      {/* Placeholder spacer div when navbar becomes fixed to prevent content layout jump */}
      {isScrolled && <div className="h-[44px] sm:h-[48px] w-full" />}

      {/* MAIN NAVIGATION BAR */}
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
              <a href="https://lms.twintec.edu.lk" target="_blank" rel="noopener noreferrer">
                <button className="bg-brand-orange text-brand-white font-heading font-bold text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full hover:bg-brand-black hover:text-brand-white shadow-xs hover:shadow-sm transition-all duration-300 flex items-center justify-center whitespace-nowrap min-h-[34px] cursor-pointer">
                  Apply Now
                </button>
              </a>
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
              <a href="https://lms.twintec.edu.lk" target="_blank" rel="noopener noreferrer" onClick={toggleMenu}>
                <button className="w-full bg-brand-orange text-brand-white font-heading font-bold text-sm uppercase py-3 rounded-lg hover:bg-brand-black hover:text-brand-white shadow-sm transition-all duration-300 min-h-[44px]">
                  Apply Now
                </button>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}
