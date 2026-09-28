# AI WeatherWise API

**Intelligent weather forecasts and AI-powered insights** — Built with Node.js + Express + MongoDB + Google Gemini + Open-Meteo

**Developer**: Hasna | **Institution**: Mohamed Sathak College of Arts and Science | **Year**: 3rd Year BCA

---

## 🚀 Live Demo & Repository

🔗 **GitHub Repository**: [https://github.com/hasnarizwan028-commits/AI-WeatherWise-API](https://github.com/hasnarizwan028-commits/AI-WeatherWise-API)

🌐 **Project Demo**: [http://localhost:5000](http://localhost:5000) (or deploy on Render/Railway/Vercel)

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Frontend Pages](#frontend-pages)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Author](#author)

---

## ✨ Features

### 🌤️ Weather Engine
- **Free weather data** from Open-Meteo (no API key required)
- Search any city by name or use coordinates (latitude/longitude)
- Current weather metrics: temperature, humidity, wind speed, precipitation, pressure, cloud cover, UV index
- **5-day forecast** with daily min/max temperatures, rain probability, and sunrise/sunset
- Supports both Celsius and Fahrenheit

### 🤖 AI Engine (Google Gemini)
- **AI-powered weather summaries** — get a natural language overview of current conditions
- **Personalized recommendations** — what to wear, safety notes, and activity suggestions
- **Activity ideas** — outdoor and indoor activity suggestions based on weather
- **Fallback mode** — if no Gemini API key is configured, a deterministic template engine provides the same insights
- Gemini is optional — the app works 100% without an API key

### 🔐 Authentication & Authorization
- **User registration & login** with JWT-based authentication
- **Password hashing** using bcryptjs
- **Role-based access control** (reader → user → admin)
- Protected routes with role matrix enforcement
- Account suspension/reactivation by admins
- Profile updates and password changes

### 📍 Location Management
- Add favourite cities with auto geocoding
- View saved favourite locations with live weather
- Update and delete favourite locations
- Public city search with autocomplete
- Duplicate detection

### 🛡️ Security
- **NoSQL injection prevention** — strips `$ne`, `$gt`, `$regex` and other operators
- **XSS protection** — strips HTML tags and JavaScript payloads
- **Request sanitization** — normalizes keys starting with `$` or containing `.`
- **Input validation** — server-side validation middleware for all request parts

### 📊 Admin Panel
- System statistics (user count, active users, location count)
- Full user list with role management
- Suspend/reactivate/delete users
- API request logs (last 100 requests)
- Access control: admin-only routes

### 📝 Logging
- Lightweight request logger tracking method, path, status, user, and response time
- Accessible via `/api/admin/logs` (admin only)

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB + Mongoose |
| **AI** | Google Gemini (via `@google/genai`) |
| **Weather** | Open-Meteo API (free) + OpenWeatherMap (fallback) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Validation** | Custom middleware |
| **Security** | Custom sanitize middleware (NoSQL + XSS) |
| **Testing** | In-memory MongoDB + smoke tests |
| **Frontend** | Vanilla HTML/CSS/JS (no framework) |

---

## 🏗️ Architecture

```
index.js                    → Application entry point, server boot
├── config/db.js            → MongoDB connection (Mongoose)
├── middleware/
│   ├── authMiddleware.js   → JWT protect middleware
│   ├── roleMiddleware.js   → Role-based authorization
│   ├── validateMiddleware.js → Request validation
│   ├── sanitizeMiddleware.js → NoSQL + XSS sanitization
│   └── errorMiddleware.js  → Centralized error handling
├── controllers/
│   ├── authController.js   → Register, login, profile, password
│   ├── weatherController.js → Get weather (public + favourites)
│   ├── locationController.js → CRUD for favourite cities
│   ├── aiController.js     → AI summaries, recommendations, activities
│   └── adminController.js  → Admin stats, users, logs, role management
├── routes/
│   ├── authRoutes.js       → /api/auth/*
│   ├── weatherRoutes.js    → /api/weather/*
│   ├── locationRoutes.js   → /api/locations/*
│   ├── aiRoutes.js         → /api/ai/*
│   └── adminRoutes.js      → /api/admin/*
├── models/
│   ├── User.js             → User schema with bcrypt, role, virtuals
│   └── Location.js         → Location schema (user reference)
├── services/
│   ├── weatherService.js   → Open-Meteo + OpenWeatherMap clients
│   └── aiService.js        → Gemini client + deterministic fallback
├── utils/
│   ├── ApiError.js         → Custom error class (badRequest, unauthorized, etc.)
│   ├── asyncHandler.js     → Async wrapper for route handlers
│   ├── logger.js           → Request logger with getLogs()
│   └── seedAdmin.js        → Seed first admin account
├── tests/
│   ├── smoke.test.js       → Full API test suite (47 tests)
│   └── preview.js          → Preview server with in-memory MongoDB
└── public/                 → Frontend HTML, CSS, JS
    ├── index.html          → Login & Register page
    ├── dashboard.html      → Main dashboard (weather, AI, favourites)
    ├── admin.html          → Admin console
    ├── home.html           → Landing page
    ├── css/style.css       → Dark theme stylesheet
    └── js/
        ├── app.js          → Shared API client, UI helpers, navbar
        ├── auth.js         → Login/register logic
        ├── dashboard.js    → Dashboard features (weather, AI, cities)
        └── admin.js        → Admin panel logic
```

---

## 🌐 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | Login with email + password |
| GET | `/me` | User | Get current user profile |
| PUT | `/profile` | User | Update name/email |
| PUT | `/password` | User | Change password |

### Locations (`/api/locations`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/search?q=` | Public | Search cities |
| GET | `/` | User | List favourite locations |
| POST | `/` | User | Add a favourite city |
| PUT | `/:id` | Owner | Update a location |
| DELETE | `/:id` | Owner | Delete a location |

### Weather (`/api/weather`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/?city=` | Public | Get weather by city name |
| GET | `/?latitude=&longitude=` | Public | Get weather by coordinates |
| GET | `/favourite/:id` | Owner | Get weather for a saved location |

### AI (`/api/ai`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/status` | Public | Check if Gemini is enabled |
| POST | `/summary` | Public | Get weather summary |
| POST | `/recommendation` | Public | Get recommendations |
| POST | `/activity` | Public | Get activity ideas |
| GET | `/favourite/:id?type=` | Owner | Get AI insight for a saved location |

### Admin (`/api/admin`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/stats` | Admin | System statistics |
| GET | `/users` | Admin | List all users |
| GET | `/logs` | Admin | API request logs |
| PUT | `/users/:id/role` | Admin | Change user role |
| PUT | `/users/:id/suspend` | Admin | Suspend/reactivate user |
| DELETE | `/users/:id` | Admin | Delete user |

### Info (`/api`)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Server health check |
| GET | `/info` | Public | Application info |
| GET | `/docs` | Public | Full API documentation |

---

## 📦 Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- [Optional] Google Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/hasnarizwan028-commits/AI-WeatherWise-API.git
cd AI-WeatherWise-API
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/ai_weatherwise
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key_here    # Optional - app works without it
GEMINI_MODEL=gemini-2.5-flash
WEATHER_PROVIDER=open-meteo
OPENWEATHER_API_KEY=                       # Optional
```

### 4. Seed Admin Account (Optional)
```bash
npm run seed
```
Default admin: `hasna@weatherwise.com` / `hasna@1234`

### 5. Start the Server
```bash
npm run dev    # Development with nodemon
# or
npm start      # Production
```

The server starts at `http://localhost:5000`.

### 🧪 Running Tests
```bash
npm test       # 47 end-to-end smoke tests with in-memory MongoDB
```

### 🔍 Preview Mode (No MongoDB needed)
```bash
npm run preview    # Uses mongodb-memory-server, runs on port 5000
```

---

## 📄 Project Structure

```
AI-WeatherWise-API/
├── .env                        # Environment variables (NOT in git)
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── index.js                    # Application entry point
├── config/
│   └── db.js                   # MongoDB connection
├── middleware/                 # 5 middleware files
├── controllers/                # 5 controller files
├── routes/                     # 5 route files
├── models/                     # 2 Mongoose models
├── services/                   # 2 service files
├── utils/                      # 4 utility files
├── tests/                      # Test files
├── public/                     # Frontend
│   ├── index.html              # Login/Register
│   ├── dashboard.html          # Main dashboard
│   ├── admin.html              # Admin console
│   ├── home.html               # Landing page
│   ├── css/style.css           # Dark theme CSS
│   └── js/                     # 4 JS files (app, auth, dashboard, admin)
└── node_modules/               # Installed dependencies
```

---

## 🎨 Frontend

The frontend uses **vanilla HTML, CSS, and JavaScript** — no frameworks needed.

### Pages
- **`/`** — Login & Register page with quick public weather check
- **`/dashboard.html`** — Main dashboard with favourite cities, live weather, AI insights, explore, and profile
- **`/admin.html`** — Admin console with user management and logs
- **`/home.html`** — Landing page with feature overview and quick weather check

### Features
- Dark theme with responsive design
- Navbar with auth-aware navigation (login/logout, admin link)
- Real-time weather display with icons
- AI insights panel with multiple task types
- Skeleton loading animations
- Toast-style notifications
- LocalStorage for session management

---

## 🧪 Testing

The project includes **47 automated smoke tests** covering:

1. **System** — Health, docs, AI status
2. **Validation + Sanitisation** — Invalid payloads, XSS stripping, NoSQL injection, protected routes
3. **Auth** — Registration, login, profile update, password change, duplicate detection
4. **Role Matrix** — Reader blocked from admin routes, admin access
5. **Location CRUD** — Create, read, update, delete, duplicate detection
6. **Weather Engine** — Public weather by city, coordinates, favourite locations
7. **AI Service** — Summary, recommendation, activity, favourite insight
8. **Admin Operations** — Stats, users, role management, suspend/reactivate, delete

```bash
npm test
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `7d`) |
| `GEMINI_API_KEY` | No | Google Gemini API key (app works without it) |
| `GEMINI_MODEL` | No | Gemini model (default: `gemini-2.5-flash`) |
| `WEATHER_PROVIDER` | No | Weather provider (`open-meteo` or `openweathermap`) |
| `OPENWEATHER_API_KEY` | No | OpenWeatherMap API key (if using that provider) |
| `PORT` | No | Server port (default: `5000`) |
| `CLIENT_ORIGIN` | No | Allowed CORS origins (comma-separated) |
| `ADMIN_EMAIL` | No | Admin email for seeding (default: `hasna@weatherwise.com`) |
| `ADMIN_PASSWORD` | No | Admin password for seeding (default: `hasna@1234`) |

---

## 📝 API Documentation

Run `npm start` and visit **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)** for the full inline API documentation listing all 22 endpoints.

---

## 🔍 How to Check the Project (For Professor)

To review this project, you can either:

1. **View the code on GitHub**: [https://github.com/hasnarizwan028-commits/AI-WeatherWise-API](https://github.com/hasnarizwan028-commits/AI-WeatherWise-API)
2. **Run the project locally**: Clone the repo, install dependencies, and start the server
3. **Run the tests**: `npm test` to see all 47 tests passing
4. **Preview mode**: `npm run preview` to run without MongoDB installation

---

## 📝 Notes

- The app works **without any API keys** — weather data comes from Open-Meteo (free), and AI insights use a deterministic fallback engine if Gemini is not configured
- MongoDB is required for the database (use `mongodb-memory-server` for testing without installation)
- The project uses Express 5.x, Mongoose 8.x, and Node.js 24.x
- All API responses follow a consistent JSON envelope format (`{ success, message, data }`)

---

## 👤 Author

**Hasna** — 3rd Year BCA, Mohamed Sathak College of Arts and Science

GitHub: [https://github.com/hasnarizwan028-commits](https://github.com/hasnarizwan028-commits)

---

## 📄 License

MIT License — Feel free to use and contribute.
