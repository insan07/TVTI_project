import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import InquiryForm from '../components/InquiryForm'

export default function Inquiry() {
  useEffect(() => {
    document.title = 'Online Inquiry | Twintec Vocational Training Institute Puttalam'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Submit an online application or ask a question about our technical training courses in Puttalam.'
      )
    }
  }, [])

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 font-sans select-none">
      <div className="w-full max-w-[620px] space-y-6">
        
        {/* Back Link */}
        <div className="text-left">
          <Link to="/courses" className="inline-flex items-center space-x-2 text-xs uppercase tracking-wider font-heading font-bold text-brand-charcoal/60 hover:text-brand-orange transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Courses</span>
          </Link>
        </div>

        {/* Reusable Form */}
        <InquiryForm />

      </div>
    </div>
  )
}
