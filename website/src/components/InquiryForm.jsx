import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Button from './Button'
import Card from './Card'

export default function InquiryForm({ defaultCourse = null }) {
  const [searchParams] = useSearchParams()
  const courseParam = defaultCourse || searchParams.get('course') || 'general'

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    course: courseParam,
    message: '',
  })

  // Validation error states
  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    email: '',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Technical course options
  const courses = [
    { value: 'general', label: 'General Admissions / Other' },
    { value: 'automobile-repair-maintenance', label: 'Automobile Repair & Maintenance' },
    { value: 'mobile-phone-repairing', label: 'Mobile Phone Repairing' },
    { value: 'laptop-repairing', label: 'Laptop Repairing' },
    { value: 'home-appliances-repairing', label: 'Home Appliances Repairing' },
    { value: 'cctv-repairing', label: 'CCTV Repairing' },
    { value: 'home-wiring', label: 'Home Wiring' },
    { value: 'culinary-arts-hospitality', label: 'Culinary Arts & Hospitality Operations' },
    { value: 'modern-masonry-bricklaying', label: 'Modern Masonry & Bricklaying' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear validation error on type
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Client side validation logic
  const validateForm = () => {
    let isValid = true
    const newErrors = { name: '', phone: '', email: '' }

    // Name check
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
      isValid = false
    }

    // Phone check
    const phoneRegex = /^\+?[0-9\s\-()]{9,15}$/
    if (!formData.phone.trim()) {
      newErrors.phone = 'Contact number is required'
      isValid = false
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number (9-15 digits)'
      isValid = false
    }

    // Email check (optional, but validate format if filled)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email.trim() && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)

    // Log the form data to console (as requested)
    console.log('Inquiry Form Data submitted:', formData)

    // ONE-LINE SWAP: To connect to a real backend / email service (e.g. EmailJS, Formspree),
    // replace the simulateNetworkRequest() call below with your actual API fetch call.
    simulateNetworkRequest()
  }

  // Simulated API request
  const simulateNetworkRequest = () => {
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 1200) // 1.2s delay to show loading state
  }

  return (
    <Card hoverEffect={false} className="bg-brand-white border border-black/5 p-8 sm:p-10 shadow-lg rounded-2xl">
      {!isSubmitted ? (
        /* 1. RENDER FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Headers */}
          <div className="space-y-2 text-center pb-2 border-b border-black/5">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-brand-black uppercase tracking-tight">
              Online Inquiry
            </h2>
            <p className="font-sans text-brand-charcoal/70 text-xs sm:text-sm">
              Register your interest or ask questions. An advisor will contact you shortly.
            </p>
          </div>

          {/* Full Name field */}
          <div className="space-y-2 text-left">
            <label htmlFor="name" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
              Full Name <span className="text-brand-orange font-bold">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full bg-brand-light border rounded-lg px-4 py-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all ${
                errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-black/10 focus:border-brand-orange'
              }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-xs font-semibold">{errors.name}</p>}
          </div>

          {/* Contact Number field */}
          <div className="space-y-2 text-left">
            <label htmlFor="phone" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
              Contact Number <span className="text-brand-orange font-bold">*</span>
            </label>
            <input
              type="text"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full bg-brand-light border rounded-lg px-4 py-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all ${
                errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-black/10 focus:border-brand-orange'
              }`}
              placeholder="e.g. +94 77 123 4567"
            />
            {errors.phone && <p className="text-red-500 text-xs font-semibold">{errors.phone}</p>}
          </div>

          {/* Email field */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <label htmlFor="email" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                Email Address
              </label>
              <span className="text-[10px] text-brand-charcoal/40 font-semibold uppercase tracking-wider">Optional</span>
            </div>
            <input
              type="text"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-brand-light border rounded-lg px-4 py-3 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all ${
                errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-black/10 focus:border-brand-orange'
              }`}
              placeholder="e.g. name@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs font-semibold">{errors.email}</p>}
          </div>

          {/* Course selection field */}
          <div className="space-y-2 text-left">
            <label htmlFor="course" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
              Course of Interest
            </label>
            <select
              name="course"
              id="course"
              value={formData.course}
              onChange={handleChange}
              className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-3 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all min-h-[44px]"
            >
              {courses.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Message field */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center">
              <label htmlFor="message" className="block text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal">
                Message / Additional Info
              </label>
              <span className="text-[10px] text-brand-charcoal/40 font-semibold uppercase tracking-wider">Optional</span>
            </div>
            <textarea
              name="message"
              id="message"
              rows="4"
              value={formData.message}
              onChange={handleChange}
              className="w-full bg-brand-light border border-black/10 rounded-lg px-4 py-3 text-sm font-sans focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/50 transition-all resize-none"
              placeholder="Enter details about your inquiry..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full min-h-[48px] text-sm uppercase tracking-wider"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center space-x-2">
                  {/* Spinner */}
                  <svg className="animate-spin h-5 w-5 text-brand-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </span>
              ) : (
                'Submit Inquiry'
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* 2. RENDER SUCCESS STATE */
        <div className="text-center py-8 space-y-6">
          {/* Success Badge */}
          <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/25 shadow-sm">
            <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading font-extrabold text-2xl text-brand-black uppercase tracking-tight">
              Inquiry Submitted!
            </h3>
            <p className="font-sans text-brand-charcoal text-sm sm:text-base leading-relaxed max-w-sm mx-auto">
              Thank you! We've received your inquiry and will contact you soon.
            </p>
          </div>
          <div className="pt-4 border-t border-black/5 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/courses">
              <Button variant="outline" className="w-full sm:w-auto text-xs py-2 min-h-[40px]">
                Browse More Courses
              </Button>
            </Link>
            <Link to="/">
              <Button variant="secondary" className="w-full sm:w-auto text-xs py-2 min-h-[40px]">
                Go to Home
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}
