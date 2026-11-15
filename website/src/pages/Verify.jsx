import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

import CertificateDocument from '../components/CertificateDocument'
import './verification.css'

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
  const [selectedCertificate, setSelectedCertificate] = useState(0)
  const [verifiedAt, setVerifiedAt] = useState(new Date())
  const searchedQuery = useRef('')

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
    if (initialQuery.trim() && searchedQuery.current !== initialQuery.trim()) {
      handleSearchStudent(initialQuery.trim())
    }
  }, [initialQuery])

  // STEP 1: Search Student Record (No email sent yet)
  const handleSearchStudent = async (searchKey) => {
    const key = (searchKey || queryInput).trim()
    if (!key || loading) return
    searchedQuery.current = key
    setQueryInput(key)

    setLoading(true)
    setErrorMsg('')
    setOtpErrorMsg('')
    setSuccessMsg('')
    setPreviewStudent(null)

    // Update URL param without page reload
    setSearchParams({ query: key }, { replace: true })

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
        body: JSON.stringify({ query: previewStudent.registration_number || previewStudent.index_number || queryInput })
      })

      const data = await response.json()

      if (response.ok && data.requires_otp) {
        setStudentInfo(data)
        setStep('otp')
        setResendCooldown(data.cooldownRemaining || data.resend_after || 60)
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
    if (!/^\d{6}$/.test(code)) {
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
          query: previewStudent?.registration_number || previewStudent?.index_number || queryInput,
          otp: code
        })
      })

      const data = await response.json()

      if (response.ok && data.verified) {
        setResultData(data)
        setSelectedCertificate(0)
        setVerifiedAt(new Date())
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
        body: JSON.stringify({ query: previewStudent?.registration_number || previewStudent?.index_number || queryInput })
      })

      const data = await response.json()

      if (response.ok && data.requires_otp) {
        setStudentInfo(data)
        setResendCooldown(data.cooldownRemaining || data.resend_after || 60)
        setSuccessMsg(data.message || 'A new 6-digit verification code has been dispatched.')
      } else {
        setOtpErrorMsg(data.message || 'Unable to resend verification code.')
      }
    } catch {
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
    setResendCooldown(0)
    setSelectedCertificate(0)
    searchedQuery.current = ''
    setSearchParams({}, { replace: true })
  }

  const handleSubmitStep1 = (e) => {
    e.preventDefault()
    handleSearchStudent(queryInput)
  }

  const handlePrint = () => {
    window.print()
  }

  const certificates = Array.isArray(resultData?.certifications) ? resultData.certifications : []
  const certificate = certificates[selectedCertificate]
  const currentStep = step === 'input' || step === 'preview' ? 0 : step === 'otp' ? 1 : 2

  return (
    <div className="verification-page">
      {/* 1. PAGE HEADER BANNER */}
      <div className="verification-heading">
        <h1>Certificate verification</h1>
        <p>Look up a student’s training record using their registration number or NIC, then confirm access by email.</p>
      </div>

      {/* MAIN CONTENT AREA */}
      {step !== 'result' && <div className="verification-layout">
        <section className="verification-panel" aria-label="Verify a student record" aria-busy={loading || otpSending || otpLoading}>
          <ol className="verification-steps" aria-label="Verification progress">
            {['Find a record', 'Confirm email', 'View record'].map((label, index) => (
              <li key={label} aria-current={index === currentStep ? 'step' : undefined}><span>{index + 1}.</span>{label}</li>
            ))}
          </ol>
          <div className="verification-panel__body">
            {/* SEARCH FORM (ENABLED IN STEP 1 OR PREVIEW RE-SEARCH) */}
            {step === 'input' && <>
              <h2>Find a student record</h2>
              <p className="verification-copy">Enter the details shown on the student’s registration documents.</p>
              <form className="verification-form" onSubmit={handleSubmitStep1}>
                <label htmlFor="registration-query">Registration number or NIC</label>
                <input id="registration-query" className="verification-input" type="text" autoComplete="off"
                  value={queryInput} onChange={event => setQueryInput(event.target.value)}
                  placeholder="e.g. 26T0001" maxLength={100} required disabled={loading}
                  aria-describedby="registration-hint" aria-invalid={!!errorMsg} />
                <p id="registration-hint" className="verification-hint">Use the full registration number or NIC exactly as it appears on the document.</p>
                {/* Loading Indicator */}
                <div className="verification-actions">
                  <button className="verification-button" type="submit" disabled={loading || !queryInput.trim()}>
                    {loading ? 'Searching…' : 'Find record'}
                    {!loading && <ArrowIcon />}
                  </button>
                </div>
              </form>
              {/* STEP 1 ERROR / NOT FOUND CARD */}
              {errorMsg && <div className="verification-message verification-message--error" role="alert">
                {errorMsg} <Link to="/contact" className="underline underline-offset-2">Contact the institute</Link> if you need help with the record.
              </div>}
            </>}

            {/* STEP 2: STUDENT RECORD PREVIEW & VERIFY BUTTON */}
            {step === 'preview' && previewStudent && <>
              {/* Green Header Badge */}
              <h2>Confirm the student’s details</h2>
              <p className="verification-copy">We found a matching record. Check the details below before requesting a verification code.</p>
              {/* Student Metadata Box */}
              <dl className="verification-record">
                <div><dt>Student name</dt><dd className="verification-record__name">{previewStudent.name}</dd></div>
                <div><dt>Registration number</dt><dd>{previewStudent.registration_number || previewStudent.index_number || 'Not recorded'}</dd></div>
                <div><dt>NIC</dt><dd>{previewStudent.nic_masked || 'Not recorded'}</dd></div>
                <div><dt>Registered email</dt><dd>{previewStudent.email_masked}</dd></div>
              </dl>
              {/* Security Prompt Box */}
              <p className="verification-copy verification-privacy">A six-digit code will be sent to the student’s registered email. Enter that code to view the full record.</p>
              {/* OTP Error Message if any */}
              {otpErrorMsg && <p className="verification-message verification-message--error" role="alert">{otpErrorMsg}</p>}
              {/* Action Buttons */}
              <div className="verification-actions">
                <button className="verification-button" type="button" onClick={handleSendOtpCode} disabled={otpSending}>
                  {otpSending ? 'Sending code…' : 'Send verification code'}
                </button>
                <button className="verification-text-button" type="button" onClick={handleResetSearch} disabled={otpSending}>Search another student</button>
              </div>
            </>}

            {/* STEP 3: EMAIL OTP CODE ENTRY FORM */}
            {step === 'otp' && studentInfo && <>
              <h2>Check the student’s email</h2>
              <p className="verification-copy">Enter the six-digit code sent to <strong>{studentInfo.email_masked || previewStudent?.email_masked}</strong>.</p>
              {/* Student Target Summary Box */}
              <dl className="verification-record">
                <div><dt>Student</dt><dd>{studentInfo.student_name || previewStudent?.name}</dd></div>
                <div><dt>Registration number</dt><dd>{studentInfo.registration_number || studentInfo.index_number || previewStudent?.registration_number}</dd></div>
              </dl>
              {/* DEV OTP ALERT BOX (When SMTP simulated) */}
              {/* Verification codes are delivered by email and are never displayed on this page. */}
              {/* OTP INPUT FORM */}
              <form className="verification-form" onSubmit={handleVerifyOtp}>
                <label htmlFor="verification-code">Verification code</label>
                <input id="verification-code" className="verification-input verification-otp" type="text" inputMode="numeric"
                  autoComplete="one-time-code" value={otpInput} maxLength={6} pattern="[0-9]{6}" required
                  onChange={event => setOtpInput(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" autoFocus disabled={otpLoading} aria-invalid={!!otpErrorMsg} aria-describedby="verification-code-hint" />
                <p id="verification-code-hint" className="verification-hint">The code expires after 10 minutes. Check the spam folder if it hasn’t arrived.</p>
                {/* SUCCESS NOTICE */}
                {successMsg && <p className="verification-message verification-message--success" role="status">{successMsg}</p>}
                {/* OTP ERROR MESSAGE */}
                {otpErrorMsg && <p className="verification-message verification-message--error" role="alert">{otpErrorMsg}</p>}
                <div className="verification-actions">
                  <button className="verification-button" type="submit" disabled={otpLoading || resending || otpInput.length !== 6}>
                    {otpLoading ? 'Verifying…' : 'Verify and view record'}
                  </button>
                </div>
              </form>
              {/* FOOTER ACTIONS */}
              <div className="verification-otp-actions">
                <button className="verification-text-button verification-text-button--accent" type="button" onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || resending || otpLoading}>
                  {resending ? 'Sending…' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                </button>
                <button className="verification-text-button" type="button" disabled={otpLoading || resending} onClick={handleResetSearch}>Search another student</button>
              </div>
            </>}
          </div>
        </section>

        <aside className="verification-sidebar">
          <h2>How verification works</h2>
          <ol>
            <li><span>01</span><div><strong>Find the student</strong><p>Use the registration number or NIC from the student’s documents.</p></div></li>
            <li><span>02</span><div><strong>Confirm access</strong><p>The student receives a code at their registered email address.</p></div></li>
            <li><span>03</span><div><strong>View the record</strong><p>Review the training details and print a verification copy.</p></div></li>
          </ol>
          <div className="verification-help"><strong>Need help?</strong><p>Contact the institute if the details are incorrect or the registered email is no longer available.</p><Link to="/contact">Contact the institute <ArrowIcon /></Link></div>
        </aside>
      </div>}

      {/* STEP 4: VERIFIED CERTIFICATE OR TRAINING RECORD */}
      {step === 'result' && resultData?.verified && resultData.student && <section className="verification-result" aria-label="Verified student record">
        {/* Verification Status Header Banner */}
        <div className="verification-toolbar">
          <div className="verification-toolbar__status">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div><h2>Student record verified</h2><p>{resultData.student.name} · Email verification complete</p></div>
          </div>
          <div className="verification-actions">
            <button className="verification-text-button" type="button" onClick={handleResetSearch}>Verify another student</button>
            {certificate && <button className="verification-button" type="button" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7z" strokeLinejoin="round" /></svg>
              Print / Save PDF
            </button>}
          </div>
        </div>
        {certificates.length > 1 && <div className="verification-selector">
          <label htmlFor="certificate-programme">Programme</label>
          <select id="certificate-programme" className="verification-input" value={selectedCertificate} onChange={event => setSelectedCertificate(Number(event.target.value))}>
            {certificates.map((item, index) => <option key={item.certificate_no || index} value={index}>{item.course_title}</option>)}
          </select>
        </div>}
        {certificate ? <CertificateDocument student={resultData.student} certificate={certificate} verifiedAt={verifiedAt} />
          : <div className="verification-empty"><h3>No certificate records available</h3><p>The student’s identity has been verified, but there are no programme records available to display. Contact the institute for assistance.</p></div>}
      </section>}
    </div>
  )
}

function ArrowIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
