import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Inquiry from './pages/Inquiry'
import Verify from './pages/Verify'

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-brand-white selection:bg-brand-orange/30 selection:text-brand-black">
        {/* Shared Layout Header */}
        <Header />

        {/* Dynamic Route Pages */}
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/inquiry" element={<Inquiry />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/verify" element={<Verify />} />
          </Routes>
        </main>

        {/* Shared Layout Footer */}
        <Footer />
      </div>
    </Router>
  )
}

export default App
