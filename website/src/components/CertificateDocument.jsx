import React from 'react'
import logoImg from '../assets/logo.png'

export default function CertificateDocument({ student, certificate, verifiedAt }) {
  const completed = certificate.completion_status === 'Certified / Passed'
  const registration = student.registration_number || student.index_number || 'Not recorded'
  const verifiedDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' }).format(verifiedAt)
  const grade = certificate.grade && certificate.grade !== 'Not recorded' ? certificate.grade : null

  return (
    /* OFFICIAL DIPLOMA CERTIFICATE CARD */
    <article className="certificate-document" aria-label={completed ? 'Certificate of completion' : 'Student training record'}>
      {/* Background Watermark Badge */}
      {/* The institute logo is retained in the letterhead; the document uses an unmarked paper background. */}
      <div className="certificate-document__frame">
        {/* Certificate Top Header */}
        <header className="certificate-document__header">
          <img src={logoImg} alt="Twintec VTI" className="certificate-document__logo" />
          <div>
            <p className="certificate-document__institute">Twintec Vocational<br />Training Institute</p>
            <p className="certificate-document__location">Puttalam, Sri Lanka</p>
          </div>
        </header>

        {/* Gold Verification Badge */}
        <p className="certificate-document__eyebrow">Student registry · Verification copy</p>
        <h2 className="certificate-document__title">{completed ? 'Certificate of Completion' : 'Student Training Record'}</h2>
        <p className="certificate-document__introduction">{completed ? 'This is to certify that' : 'This record confirms the registration of'}</p>

        {/* Student Metadata Grid */}
        <p className="certificate-document__name">{student.name}</p>
        <p className="certificate-document__identity">
          Registration no. <strong>{registration}</strong>
          {student.nic_number && student.nic_number !== 'N/A' && <><span aria-hidden="true"> / </span>NIC {student.nic_number}</>}
        </p>

        {/* Certification Programs Table */}
        <p className="certificate-document__statement">
          {completed ? 'has completed the programme in' : 'is registered for the programme in'}
        </p>
        <h3 className="certificate-document__course">{certificate.course_title}</h3>
        <p className="certificate-document__qualification">{certificate.qualification_level || certificate.nvq_level || 'Vocational training programme'}</p>
        {completed && grade && <p className="certificate-document__grade">Overall grade: <strong>{grade}</strong>
          {Number.isFinite(certificate.average_marks) && <span> · {certificate.average_marks}%</span>}
        </p>}
        {!completed && <p className="certificate-document__progress">{certificate.completion_status || 'Training in progress'}</p>}

        <dl className="certificate-document__details">
          <div><dt>Certificate reference</dt><dd>{certificate.certificate_no || 'Not recorded'}</dd></div>
          <div><dt>Registered on</dt><dd>{formatRecordDate(certificate.enrolled_date || student.registered_at)}</dd></div>
          <div><dt>Verified on</dt><dd>{verifiedDate}</dd></div>
        </dl>

        {/* Bottom Footer & Seal */}
        <footer className="certificate-document__footer">
          <div><strong>Twintec VTI</strong><span>Student records office</span></div>
          <p>Matched to the institute’s student registry<br />following email verification.</p>
          <div className="certificate-document__reference"><strong>{registration}</strong><span>twintec.edu.lk</span></div>
        </footer>
      </div>
    </article>
  )
}

function formatRecordDate(value) {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' }).format(date)
    : 'Not recorded'
}
