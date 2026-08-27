import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SectionHeading from '../components/SectionHeading'
import Card from '../components/Card'
import Button from '../components/Button'
import logoImg from '../assets/logo.png'

export default function Verify() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('query') || searchParams.get('id') || searchParams.get('index') || ''

  const [queryInput, setQueryInput] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [resultData, setResultData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Meta Title Tag
  useEffect(() => {
    document.title = 'Certificate Verification | Twintec Vocational Training Institute Puttalam'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Verify official TVTI student certificates, vocational diplomas, and academic transcripts against our central student registry.'
      )
    }
  }, [])

  // Auto-search if query param present in URL
  useEffect(() => {
    if (initialQuery.trim()) {
      handlePerformVerification(initialQuery.trim())
    }
  }, [initialQuery])

  const handlePerformVerification = async (searchKey) => {
    if (!searchKey.trim()) return

    setLoading(true)
    setErrorMsg('')
    setResultData(null)
    setHasSearched(true)

    // Update URL param without page reload
    setSearchParams({ query: searchKey })

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_URL}/api/certificates/verify?query=${encodeURIComponent(searchKey.trim())}`)
      const data = await response.json()

      if (response.ok && data.verified) {
        setResultData(data)
      } else {
        setErrorMsg(data.message || 'No official certificate record found matching the provided identifier.')
        if (data.status === 'pending_application') {
          setErrorMsg(data.message)
        }
      }
    } catch (err) {
      console.warn('API connection error during verification:', err)
      setErrorMsg('Unable to connect to verification server. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    handlePerformVerification(queryInput)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col min-w-full font-sans select-none bg-brand-white text-brand-black">
      
      {/* 1. PAGE HEADER BANNER */}
      <section className="bg-brand-black text-brand-white py-6 sm:py-8 px-5 sm:px-8 lg:px-12 xl:px-16 border-b border-brand-charcoal text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <span className="inline-block bg-brand-orange text-brand-white font-heading font-extrabold text-[10px] uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-brand-orange/30">
            OFFICIAL REGISTRY &bull; TVTI SRI LANKA
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-brand-white">
            Student Certificate Verification
          </h1>
          <p className="font-sans text-brand-light/75 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Enter a student Index Number (e.g. <span className="text-brand-orange font-bold font-mono">26T0001</span>) or Student NIC to verify official TVTI practical certificate credentials.
          </p>

          {/* SEARCH FORM */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto pt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter Index Number (e.g. 26T0001) or NIC Number..."
                className="w-full bg-brand-white text-brand-black px-5 py-4 rounded-xl text-sm font-heading font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-lg placeholder:font-normal placeholder:text-brand-charcoal/60"
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={() => setQueryInput('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-charcoal/40 hover:text-brand-black font-bold text-lg"
                >
                  &times;
                </button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              className="py-4 px-8 text-xs uppercase tracking-widest font-heading font-extrabold shadow-lg min-h-[52px]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-brand-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Searching...</span>
                </span>
              ) : (
                'Verify Credential'
              )}
            </Button>
          </form>
          <p className="text-[11px] text-brand-light/60 pt-1">
            Sample test index numbers: <button type="button" onClick={() => { setQueryInput('26T0001'); handlePerformVerification('26T0001'); }} className="underline hover:text-brand-orange font-bold">26T0001</button> or <button type="button" onClick={() => { setQueryInput('26T0002'); handlePerformVerification('26T0002'); }} className="underline hover:text-brand-orange font-bold">26T0002</button>
          </p>
        </div>
      </section>

      {/* 2. RESULTS DISPLAY CONTAINER */}
      <section className="py-16 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-5xl mx-auto w-full">
        
        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent"></div>
            <p className="font-heading font-bold text-sm text-brand-charcoal uppercase tracking-wider">
              Querying TVTI Student & Certificate Registry...
            </p>
          </div>
        )}

        {/* Verified Certificate Result */}
        {!loading && resultData && resultData.verified && (
          <div className="space-y-8 animate-fade-in print:p-0">
            
            {/* Verification Status Header Banner */}
            <div className="bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="inline-flex items-center space-x-2">
                    <span className="font-heading font-extrabold text-lg text-emerald-900 uppercase tracking-tight">
                      Official Credential Verified
                    </span>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                      ACTIVE RECORD
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-sans mt-0.5">
                    This document matches an authentic record in the Twintec Vocational Training Institute Registry.
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={handlePrint}
                className="w-full sm:w-auto text-xs py-2.5 px-5 flex items-center justify-center space-x-2 print:hidden"
              >
                <svg className="h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Official Transcript</span>
              </Button>
            </div>

            {/* OFFICIAL DIPLOMA CERTIFICATE CARD */}
            <Card hoverEffect={false} className="bg-brand-white border-2 border-brand-orange/30 p-8 sm:p-12 shadow-2xl rounded-3xl relative overflow-hidden text-left">
              
              {/* Background Watermark Badge */}
              <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] pointer-events-none">
                <img src={logoImg} alt="Watermark" className="w-96 h-96" />
              </div>

              {/* Certificate Top Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b border-black/10 gap-6">
                <div className="flex items-center space-x-4">
                  <img src={logoImg} alt="TVTI Logo" className="h-16 w-auto" />
                  <div className="flex flex-col">
                    <span className="font-heading font-extrabold text-xl text-brand-black tracking-wider uppercase">
                      Twintec Vocational Training Institute
                    </span>
                    <span className="font-heading font-bold text-xs uppercase tracking-widest text-brand-orange">
                      Puttalam, Sri Lanka &bull; Official Student Registry
                    </span>
                  </div>
                </div>

                {/* Gold Verification Badge */}
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center space-x-3 shadow-inner">
                  <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white shadow-md">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="font-heading font-extrabold text-xs uppercase tracking-wider text-amber-900 block">
                      TVTI VERIFIED SEAL
                    </span>
                    <span className="text-[10px] text-amber-800/80 font-mono font-bold block">
                      SECURED & AUDITED
                    </span>
                  </div>
                </div>
              </div>

              {/* Student Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8 border-b border-black/10">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-heading font-bold text-brand-charcoal/60 block">
                    Student Full Name
                  </span>
                  <span className="font-heading font-extrabold text-lg text-brand-black block">
                    {resultData.student.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase font-heading font-bold text-brand-charcoal/60 block">
                    Student Index Number
                  </span>
                  <span className="font-mono font-extrabold text-base text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-md inline-block">
                    {resultData.student.index_number}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-xs uppercase font-heading font-bold text-brand-charcoal/60 block">
                    NIC / Identity No.
                  </span>
                  <span className="font-mono font-bold text-base text-brand-black block">
                    {resultData.student.nic_number}
                  </span>
                </div>
              </div>

              {/* Certification Programs Table */}
              <div className="py-8 space-y-6">
                <h3 className="font-heading font-extrabold text-base uppercase text-brand-black tracking-wider">
                  Accredited Vocational Qualifications
                </h3>

                <div className="space-y-6">
                  {resultData.certifications.map((cert, index) => (
                    <div key={index} className="bg-brand-light/60 border border-black/10 rounded-2xl p-6 space-y-4">
                      
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-black/10">
                        <div>
                          <span className="text-[10px] font-mono text-brand-charcoal/60 uppercase block">
                            Certificate Serial: {cert.certificate_no}
                          </span>
                          <h4 className="font-heading font-extrabold text-xl text-brand-black uppercase mt-0.5">
                            {cert.course_title}
                          </h4>
                        </div>
                        <span className="bg-brand-orange text-brand-white font-heading font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                          {cert.completion_status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-brand-charcoal/60 block font-heading font-semibold">Overall Grade:</span>
                          <span className="font-heading font-extrabold text-brand-black text-sm text-emerald-700">{cert.grade} ({cert.average_marks}%)</span>
                        </div>
                        <div>
                          <span className="text-brand-charcoal/60 block font-heading font-semibold">Qualification:</span>
                          <span className="font-heading font-bold text-brand-black">{cert.qualification_level || cert.nvq_level || 'Professional Diploma'}</span>
                        </div>
                        <div>
                          <span className="text-brand-charcoal/60 block font-heading font-semibold">Issued Date:</span>
                          <span className="font-heading font-bold text-brand-black">{cert.issued_date}</span>
                        </div>
                        <div>
                          <span className="text-brand-charcoal/60 block font-heading font-semibold">Accreditation:</span>
                          <span className="font-heading font-bold text-brand-black">TVTI Academic Board</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer & Seal */}
              <div className="pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center text-xs text-brand-charcoal/70 gap-4">
                <div className="space-y-1">
                  <p className="font-bold text-brand-black">Twintec Vocational Training Institute &bull; Puttalam Regional Campus</p>
                  <p>Authorized Verification Document &bull; Validated via Central Database API</p>
                </div>
                <div className="font-mono text-[10px] bg-brand-light px-3 py-1.5 rounded-lg border border-black/10">
                  Verification Timestamp: {new Date().toLocaleString()}
                </div>
              </div>

            </Card>

          </div>
        )}

        {/* Not Found / Error State */}
        {!loading && hasSearched && (!resultData || !resultData.verified) && (
          <Card hoverEffect={false} className="bg-brand-white border border-black/10 p-8 sm:p-12 text-center rounded-3xl space-y-6 shadow-md">
            <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto border-4 border-red-500/20">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-heading font-extrabold text-2xl text-brand-black uppercase">
                Credential Not Found
              </h3>
              <p className="font-sans text-brand-charcoal text-sm leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="bg-brand-light p-4 rounded-xl max-w-lg mx-auto text-left text-xs space-y-2 border border-black/5">
              <span className="font-heading font-bold text-brand-black block uppercase">Verification Tips:</span>
              <ul className="list-disc pl-4 space-y-1 text-brand-charcoal/80">
                <li>Double check that the Index Number (e.g. <strong>26T0001</strong>) or NIC number matches the student's official documents.</li>
                <li>If the student recently applied, their registration may be pending TVTI Admin review.</li>
                <li>For support or manual verifications, contact <strong>info@tvti.edu.lk</strong> or call <strong>076 538 0715 / 078 538 0715</strong>.</li>
              </ul>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <Button variant="outline" onClick={() => handlePerformVerification('26T0001')} className="text-xs py-2">
                Try Sample Index (26T0001)
              </Button>
              <Link to="/contact">
                <Button variant="secondary" className="text-xs py-2">
                  Contact Registry Office
                </Button>
              </Link>
            </div>
          </Card>
        )}

      </section>

    </div>
  )
}
