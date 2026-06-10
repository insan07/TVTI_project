
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected');
CREATE TYPE attendance_status AS ENUM ('present', 'absent');

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    profile_photo TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Courses
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fee NUMERIC(10, 2) NOT NULL,
    duration_weeks INT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Batches
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    course_id INT REFERENCES courses(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_json JSONB NOT NULL,
    capacity INT NOT NULL,
    instructor_id INT REFERENCES users(id) ON DELETE SET NULL
);

-- Enrollments
CREATE TABLE enrollments (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Videos
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
    topic VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    notes_url TEXT,
    order_index INT NOT NULL
);

-- Equipment
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    is_available BOOLEAN DEFAULT true
);

-- Bookings
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    equipment_id INT REFERENCES equipment(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    status booking_status DEFAULT 'pending',
    admin_note TEXT
);

-- Attendance
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    status attendance_status NOT NULL
);

-- Results
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    batch_id INT REFERENCES batches(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    marks NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(10)
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



