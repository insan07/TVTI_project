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
  const [otpInput, setOtpInput] = useState('')
  
  // Step state: 'input' | 'preview' | 'otp' | 'result'
  const [step, setStep] = useState('input')
  
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const [previewStudent, setPreviewStudent] = useState(null)
  const [studentInfo, setStudentInfo] = useState(null)
  const [resultData, setResultData] = useState(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [otpErrorMsg, setOtpErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [resendCooldown, setResendCooldown] = useState(0)

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

  // Cooldown Timer
  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Auto-trigger search if URL param is present on initial load
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearchStudent(initialQuery.trim())
    }
  }, [initialQuery])

  // STEP 1: Search Student Record (No email sent yet)
  const handleSearchStudent = async (searchKey) => {
    const key = (searchKey || queryInput).trim()
    if (!key) return

    setLoading(true)
    setErrorMsg('')
    setOtpErrorMsg('')
    setSuccessMsg('')
    setPreviewStudent(null)

    // Update URL param without page reload
    setSearchParams({ query: key })

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_URL}/api/certificates/search?query=${encodeURIComponent(key)}`)
      const data = await response.json()

      if (response.ok && data.found) {
        setPreviewStudent(data.student)
        setStep('preview')
      } else {
        setErrorMsg(data.message || 'No official student record found matching the provided identifier.')
        setStep('input')
      }
    } catch (err) {
      console.warn('API error searching student:', err)
      setErrorMsg('Unable to connect to verification server. Please check your network connection.')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  // STEP 2: Trigger Sending OTP Code to Email
  const handleSendOtpCode = async () => {
    if (!previewStudent) return

    setOtpSending(true)
    setOtpErrorMsg('')
    setSuccessMsg('')

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_URL}/api/certificates/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: previewStudent.index_number || queryInput })
      })

      const data = await response.json()

      if (response.ok && data.requires_otp) {
        setStudentInfo(data)
        setStep('otp')
        setResendCooldown(60)
        setSuccessMsg(data.message || 'Verification code sent to email.')
      } else {
        setOtpErrorMsg(data.message || 'Unable to send verification code to student email.')
      }
    } catch (err) {
      console.warn('API error requesting verification OTP:', err)
      setOtpErrorMsg('Unable to connect to verification server. Please try again.')
    } finally {
      setOtpSending(false)
    }
  }

  // STEP 3: Confirm OTP & Render Full Certificate
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault()

    const code = otpInput.trim()
    if (!code || code.length !== 6) {
      setOtpErrorMsg('Please enter a valid 6-digit verification code.')
      return
    }

    setOtpLoading(true)
    setOtpErrorMsg('')

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_URL}/api/certificates/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: previewStudent?.index_number || queryInput,
          otp: code
        })
      })

      const data = await response.json()

      if (response.ok && data.verified) {
        setResultData(data)
        setStep('result')
      } else {
        setOtpErrorMsg(data.message || 'Invalid or expired verification code. Please check and try again.')
      }
    } catch (err) {
      console.warn('API error verifying OTP:', err)
      setOtpErrorMsg('Server error during code verification. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return
    setResending(true)
    setOtpErrorMsg('')
    setSuccessMsg('')

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${API_URL}/api/certificates/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: previewStudent?.index_number || queryInput })
      })

      const data = await response.json()

      if (response.ok && data.requires_otp) {
        setStudentInfo(data)
        setResendCooldown(60)
        setSuccessMsg(data.message || 'A new 6-digit verification code has been dispatched.')
      } else {
        setOtpErrorMsg(data.message || 'Unable to resend verification code.')
      }
    } catch (err) {
      setOtpErrorMsg('Failed to send resend request. Please try again.')
    } finally {
      setResending(false)
    }
  }

  // Reset Search
  const handleResetSearch = () => {
    setStep('input')
    setQueryInput('')
    setOtpInput('')
    setPreviewStudent(null)
    setStudentInfo(null)
    setResultData(null)
    setErrorMsg('')
    setOtpErrorMsg('')
    setSuccessMsg('')
    setSearchParams({})
  }

  const handleSubmitStep1 = (e) => {
    e.preventDefault()
    handleSearchStudent(queryInput)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col min-w-full font-sans select-none bg-brand-white text-brand-black">
      
      {/* 1. PAGE HEADER BANNER */}
      <section className="bg-brand-black text-brand-white py-8 sm:py-10 px-5 sm:px-8 lg:px-12 xl:px-16 border-b border-brand-charcoal text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <span className="inline-block bg-brand-orange text-brand-white font-heading font-extrabold text-[10px] uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-brand-orange/30 shadow-sm">
            OFFICIAL REGISTRY &bull; TVTI SRI LANKA
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight text-brand-white">
            Student Certificate Verification
          </h1>
          <p className="font-sans text-brand-light/75 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Enter a student Index Number (e.g. <span className="text-brand-orange font-bold font-mono">26T0001</span>) or Student NIC to locate student credentials in our official registry.
          </p>

          {/* SEARCH FORM (ENABLED IN STEP 1 OR PREVIEW RE-SEARCH) */}
          {step === 'input' && (
            <form onSubmit={handleSubmitStep1} className="max-w-2xl mx-auto pt-6 flex flex-col sm:flex-row gap-3">
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
                  'Search Student Record'
                )}
              </Button>
            </form>
          )}

          {step === 'input' && (
            <p className="text-[11px] text-brand-light/60 pt-1">
              Sample test index numbers: <button type="button" onClick={() => { setQueryInput('26T0001'); handleSearchStudent('26T0001'); }} className="underline hover:text-brand-orange font-bold">26T0001</button> or <button type="button" onClick={() => { setQueryInput('26T0006'); handleSearchStudent('26T0006'); }} className="underline hover:text-brand-orange font-bold">26T0006</button>
            </p>
          )}
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <section className="py-12 sm:py-16 px-5 sm:px-8 lg:px-12 xl:px-16 max-w-5xl mx-auto w-full">
        
        {/* Loading Indicator */}
        {loading && (
          <div className="py-16 text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-orange border-t-transparent"></div>
            <p className="font-heading font-bold text-sm text-brand-charcoal uppercase tracking-wider">
              Querying TVTI Central Student Registry...
            </p>
          </div>
        )}

        {/* STEP 1 ERROR / NOT FOUND CARD */}
        {!loading && step === 'input' && errorMsg && (
          <Card hoverEffect={false} className="bg-brand-white border border-black/10 p-8 sm:p-12 text-center rounded-3xl space-y-6 shadow-md max-w-2xl mx-auto">
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
                <li>Double check that the Index Number (e.g. <strong>26T0001</strong>) or NIC number matches official documents.</li>
                <li>If the student recently applied, their registration may be pending TVTI Admin review.</li>
                <li>For support or manual verifications, contact <strong>twintec.official@gmail.com</strong> or call <strong>076 538 0715 / 078 538 0715</strong>.</li>
              </ul>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <Button variant="outline" onClick={() => { setQueryInput('26T0001'); handleSearchStudent('26T0001'); }} className="text-xs py-2">
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

        {/* STEP 2: STUDENT RECORD PREVIEW & VERIFY BUTTON */}
        {!loading && step === 'preview' && previewStudent && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-left">
            <Card hoverEffect={false} className="bg-brand-white border-2 border-brand-orange/40 p-8 sm:p-10 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
              
              {/* Green Header Badge */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center space-x-4">
                <div className="h-12 w-12 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="font-heading font-extrabold text-sm text-emerald-900 uppercase tracking-tight block">
                    Student Record Located
                  </span>
                  <p className="text-xs text-emerald-800 font-sans mt-0.5">
                    Matching student record found in the Twintec Vocational Registry.
                  </p>
                </div>
              </div>

              {/* Student Metadata Box */}
              <div className="bg-brand-light/80 border border-black/10 rounded-2xl p-6 space-y-4">
                <h4 className="text-xs font-heading font-extrabold uppercase text-brand-black tracking-wider border-b border-black/10 pb-2">
                  Student Verification Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-brand-charcoal/60 uppercase font-heading font-semibold block">Student Full Name:</span>
                    <span className="font-heading font-extrabold text-lg text-brand-black">{previewStudent.name}</span>
                  </div>
                  <div>
                    <span className="text-brand-charcoal/60 uppercase font-heading font-semibold block">Student Index Number:</span>
                    <span className="font-mono font-extrabold text-base text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded inline-block mt-0.5">{previewStudent.index_number}</span>
                  </div>
                  <div>
                    <span className="text-brand-charcoal/60 uppercase font-heading font-semibold block">NIC / Identity No:</span>
                    <span className="font-mono font-bold text-sm text-brand-black">{previewStudent.nic_masked || '****'}</span>
                  </div>
                  <div>
                    <span className="text-brand-charcoal/60 uppercase font-heading font-semibold block">Registered Student Email:</span>
                    <span className="font-mono font-bold text-sm text-brand-black">{previewStudent.email_masked}</span>
                  </div>
                </div>
              </div>

              {/* Security Prompt Box */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                <span className="font-heading font-extrabold uppercase block tracking-wider">🔒 Identity Verification Notice</span>
                <p className="text-amber-800 leading-relaxed">
                  To protect student privacy and view full certified grades, qualification levels, and official gold seal transcript, please click the button below to send a 6-digit security code to the student's registered email (<strong>{previewStudent.email_masked}</strong>).
                </p>
              </div>

              {/* OTP Error Message if any */}
              {otpErrorMsg && (
                <div className="bg-red-50 border border-red-300 text-red-700 p-3.5 rounded-xl text-xs font-heading font-medium flex items-center space-x-2">
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{otpErrorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSendOtpCode}
                  variant="primary"
                  className="flex-grow py-4 text-xs uppercase tracking-widest font-heading font-extrabold shadow-lg flex justify-center items-center space-x-2"
                  disabled={otpSending}
                >
                  {otpSending ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4 text-brand-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Sending Verification Code...</span>
                    </span>
                  ) : (
                    <>
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Send Verification Code to Email</span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleResetSearch}
                  variant="outline"
                  className="py-4 px-6 text-xs uppercase tracking-widest font-heading font-extrabold"
                >
                  Search Different Student
                </Button>
              </div>

            </Card>
          </div>
        )}

        {/* STEP 3: EMAIL OTP CODE ENTRY FORM */}
        {!loading && step === 'otp' && studentInfo && (
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            <Card hoverEffect={false} className="bg-brand-white border-2 border-brand-orange/40 p-8 rounded-3xl shadow-xl space-y-6 text-left relative overflow-hidden">
              
              <div className="flex items-center space-x-4 border-b border-black/10 pb-6">
                <div className="h-14 w-14 bg-brand-orange text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-orange block">
                    SECURITY CHECK REQUIRED
                  </span>
                  <h3 className="font-heading font-extrabold text-2xl text-brand-black uppercase tracking-tight">
                    Enter Verification Code
                  </h3>
                </div>
              </div>

              {/* Student Target Summary Box */}
              <div className="bg-brand-light/75 border border-brand-charcoal/15 rounded-2xl p-5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-brand-charcoal/70">
                  <span className="font-heading font-semibold uppercase">Student Name:</span>
                  <span className="font-heading font-bold text-brand-black">{studentInfo.student_name}</span>
                </div>
                <div className="flex justify-between items-center text-brand-charcoal/70">
                  <span className="font-heading font-semibold uppercase">Index Number:</span>
                  <span className="font-mono font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded">{studentInfo.index_number}</span>
                </div>
                <div className="flex justify-between items-center text-brand-charcoal/70 pt-2 border-t border-black/10">
                  <span className="font-heading font-semibold uppercase">Verification Code Sent To:</span>
                  <span className="font-mono font-extrabold text-brand-black text-sm">{studentInfo.email_masked}</span>
                </div>
              </div>

              {/* DEV OTP ALERT BOX (When SMTP simulated) */}
              {studentInfo.devOtp && (
                <div className="bg-amber-50 border-2 border-amber-400/80 rounded-2xl p-4 text-xs space-y-1">
                  <div className="flex items-center space-x-2 text-amber-900 font-heading font-extrabold uppercase">
                    <svg className="h-4 w-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>DEV SIMULATION CODE NOTICE</span>
                  </div>
                  <p className="text-amber-800">
                    SMTP email delivery is simulated. Use 6-digit test code: <strong className="font-mono text-lg text-brand-orange px-2 py-0.5 bg-white rounded border border-amber-300 inline-block tracking-widest">{studentInfo.devOtp}</strong>
                  </p>
                </div>
              )}

              {/* SUCCESS NOTICE */}
              {successMsg && !studentInfo.devOtp && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded-xl text-xs font-heading font-medium flex items-center space-x-2">
                  <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* OTP ERROR MESSAGE */}
              {otpErrorMsg && (
                <div className="bg-red-50 border border-red-300 text-red-700 p-3.5 rounded-xl text-xs font-heading font-medium flex items-center space-x-2">
                  <svg className="h-4 w-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{otpErrorMsg}</span>
                </div>
              )}

              {/* OTP INPUT FORM */}
              <form onSubmit={handleVerifyOtp} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-heading font-extrabold uppercase text-brand-black block tracking-wider">
                    Enter 6-Digit Code Received via Email
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 0 0 0 0 0"
                    className="w-full text-center text-3xl font-mono font-extrabold tracking-[0.5em] px-4 py-4 rounded-xl border-2 border-black/20 focus:border-brand-orange focus:outline-none bg-brand-light/30 shadow-inner"
                    autoFocus
                  />
                  <p className="text-[11px] text-brand-charcoal/60 text-center">
                    Check inbox or spam folder for the email code. Code expires in 10 minutes.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-4 text-xs uppercase tracking-widest font-heading font-extrabold shadow-lg flex justify-center items-center"
                  disabled={otpLoading || otpInput.trim().length !== 6}
                >
                  {otpLoading ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-4 w-4 text-brand-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating Code...</span>
                    </span>
                  ) : (
                    'Verify Code & View Certificate'
                  )}
                </Button>
              </form>

              {/* FOOTER ACTIONS */}
              <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-black/10 gap-3 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending}
                  className="text-brand-orange font-heading font-bold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {resending
                    ? 'Resending...'
                    : resendCooldown > 0
                    ? `Resend Code in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="text-brand-charcoal/70 hover:text-brand-black font-heading font-semibold"
                >
                  &larr; Back to Student Preview
                </button>
              </div>

            </Card>
          </div>
        )}

        {/* STEP 4: VERIFIED CERTIFICATE DIPLOMA RESULT */}
        {!loading && step === 'result' && resultData && resultData.verified && (
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
                      EMAIL AUTHENTICATED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 font-sans mt-0.5">
                    This document matches an authentic record in the Twintec Vocational Training Institute Registry.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleResetSearch}
                  className="text-xs py-2.5 px-4 print:hidden"
                >
                  Verify Another
                </Button>
                <Button
                  variant="secondary"
                  onClick={handlePrint}
                  className="text-xs py-2.5 px-5 flex items-center justify-center space-x-2 print:hidden"
                >
                  <svg className="h-4 w-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Official Transcript</span>
                </Button>
              </div>
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
                  <p>Authorized Verification Document &bull; Verified via Email OTP Authentication</p>
                </div>
                <div className="font-mono text-[10px] bg-brand-light px-3 py-1.5 rounded-lg border border-black/10">
                  Verification Timestamp: {new Date().toLocaleString()}
                </div>
              </div>

            </Card>

          </div>
        )}

      </section>

    </div>
  )
}
