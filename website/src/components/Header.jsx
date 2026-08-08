import React, { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ]

  const activeLinkClass = ({ isActive }) =>
    `relative py-2 font-heading font-semibold text-sm transition-all duration-300 ${
      isActive
        ? 'text-brand-orange after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-brand-orange'
        : 'text-brand-white hover:text-brand-orange after:content-[""] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-brand-orange hover:after:w-full after:transition-all after:duration-300'
    }`

  return (
    <header className="bg-brand-black text-brand-white sticky top-0 z-50 shadow-md border-b border-brand-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
              <span className="font-heading font-extrabold text-xl tracking-wider text-brand-white">
                T<span className="text-brand-orange">VTI</span>
              </span>
              <span className="hidden sm:inline-block h-4 w-px bg-brand-charcoal" />
              <span className="hidden sm:inline-block font-heading font-bold text-xs uppercase tracking-widest text-brand-light/60">
                Technical Institute
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={activeLinkClass}
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Call to Action Button */}
          <div className="hidden md:flex">
            <Link to="/contact">
              <button className="bg-brand-orange text-brand-white font-heading font-semibold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg hover:bg-brand-white hover:text-brand-black transition-all duration-300 min-h-[40px] flex items-center justify-center">
                Enroll Now
              </button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-brand-light/80 hover:text-brand-orange hover:bg-brand-charcoal focus:outline-none min-h-[44px] min-w-[44px] transition-all"
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

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-60 opacity-100 visible' : 'max-h-0 opacity-0 invisible overflow-hidden'
        } bg-brand-black border-t border-brand-charcoal`}
        id="mobile-menu"
      >
        <div className="px-2 pt-2 pb-4 space-y-1 sm:px-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={closeMenu}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-base font-heading font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-brand-orange bg-brand-charcoal/40 border-l-4 border-brand-orange'
                    : 'text-brand-light hover:text-brand-orange hover:bg-brand-charcoal/25'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
          <div className="pt-4 pb-2 px-3">
            <Link to="/contact" onClick={closeMenu}>
              <button className="w-full bg-brand-orange text-brand-white font-heading font-semibold text-sm uppercase py-3 rounded-lg hover:bg-brand-white hover:text-brand-black transition-all duration-300 min-h-[44px]">
                Enroll Now
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
