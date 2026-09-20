import { CorsOptions } from 'cors';

/**
 * Validates whether the requesting origin is authorized to access the API.
 */
export const isAllowedOrigin = (origin?: string): boolean => {
  // Allow requests with no origin (such as mobile native apps, curl, Postman, server-to-server)
  if (!origin) return true;

  // 1. Allow all localhost and loopback addresses on any port (React 3000, Vite 5173, Expo 8081, etc.)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  // 2. Allow local private network IP addresses for physical device testing over Wi-Fi
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(origin)) {
    return true;
  }

  // 3. Allow Expo development clients
  if (origin.startsWith('exp://')) {
    return true;
  }

  // 4. Allow official Twintec domains and all subdomains (lms, api, admin, www, etc.)
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*twintec\.edu\.lk(:\d+)?$/i.test(origin)) {
    return true;
  }

  // 5. Allow Vercel preview & production deployments (*.vercel.app)
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/i.test(origin)) {
    return true;
  }

  // 6. Support explicitly configured CORS_ORIGINS from environment variables
  if (process.env.CORS_ORIGINS) {
    const configuredOrigins = process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
    if (
      configuredOrigins.includes('*') ||
      configuredOrigins.includes(origin) ||
      configuredOrigins.includes(origin.replace(/\/$/, ''))
    ) {
      return true;
    }
  }

  return false;
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
    // Returning callback(null, false) instructs cors to withhold access headers,
    // allowing the browser to block the cross-origin request gracefully without crashing with an HTTP 500 error.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};
