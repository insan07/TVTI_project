import rateLimit from 'express-rate-limit';

export const emailRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many email requests. Please try again in 15 minutes.' },
});
export const otpAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many verification attempts. Please try again in 15 minutes.' },
});
export const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Too many submissions. Please try again in 15 minutes.' },
});
