# Honey Nails Booking App

A complete junior-friendly full-stack portfolio project for booking nail salon appointments. Customers can open the app and book right away without signing in. The app lists available appointment times every 5 minutes and prevents two active appointments from using the same date and time.

## Features

- Booking-first home page
- Services page with prices, descriptions, and durations
- Booking form with frontend and backend validation
- Customer notice explaining slot behavior
- Appointment time dropdown with 5-minute slots
- Availability endpoint that hides booked times
- Duplicate booking protection for the same date and time
- Booking confirmation page
- Appointment notice panel with WhatsApp follow-up links
- JWT admin login for protected appointment and service management
- Protected appointment dashboard for booking status updates
- Service create, edit, delete, and active/inactive controls
- Supabase Postgres tables with timestamp triggers
- Seed script for sample salon services
- Basic backend route tests with Jest, Supertest, and a mocked Supabase client

## Tech Stack

- Frontend: React, Vite, React Router, plain CSS
- Backend: Node.js, Express.js
- Database: Supabase Postgres
- Authentication: JWT admin login for owner-only management
- Testing: Jest, Supertest, mocked Supabase client
- Package manager: npm

## Folder Structure

```text
nails-booking-app/
  client/
    public/images/
    src/
      components/
      pages/
      services/
      App.jsx
      main.jsx
      styles.css
  server/
    config/
    controllers/
    migrations/
    routes/
    tests/
    utils/
    app.js
    seed.js
    server.js
  README.md
```

## How to Run Locally

Install backend dependencies:

```bash
cd server
npm install
```

Install frontend dependencies:

```bash
cd ../client
npm install
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Create a Supabase project, then run the SQL in `server/migrations/001_create_supabase_schema.sql` in the Supabase SQL editor.

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `server/.env`, then seed sample services:

```bash
cd server
npm run seed
```

Run the backend:

```bash
cd server
npm run dev
```

Run the frontend in a second terminal:

```bash
cd client
npm run dev
```

The frontend runs at `http://localhost:5173`. The API runs at `http://localhost:5050`.

## Environment Variables

Backend `server/.env`:

```env
PORT=5050
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me-admin-password
JWT_SECRET=change-me-long-random-secret
JWT_EXPIRES_IN=1d
```

Frontend `client/.env`:

```env
VITE_API_URL=http://localhost:5050/api
VITE_DEFAULT_COUNTRY_CODE=353
```

`VITE_DEFAULT_COUNTRY_CODE` is used when a customer enters a local phone number that starts with `0`. For example, `0871234567` becomes `353871234567` for WhatsApp links.

## API Endpoints

Services:

- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services` admin JWT required
- `PUT /api/services/:id` admin JWT required
- `DELETE /api/services/:id` admin JWT required

Bookings:

- `GET /api/bookings` admin JWT required
- `GET /api/bookings/availability?date=YYYY-MM-DD`
- `GET /api/bookings/:id` admin JWT required
- `POST /api/bookings`
- `PUT /api/bookings/:id/status` admin JWT required
- `DELETE /api/bookings/:id` admin JWT required

Auth:

- `POST /api/auth/login`
- `GET /api/auth/me` admin JWT required

Service create, update, delete, and inactive service listing require an admin JWT. Customers can still view active services, check availability, and create bookings without signing in.

## Tests

Run backend tests:

```bash
cd server
npm test
```

The tests cover admin login, protected admin routes, service creation, booking creation, booking validation, 5-minute availability, duplicate booking prevention, filtering, and status updates.

## Screenshots

Add screenshots here after running the app locally:

- Booking page
- Services page
- Appointment dashboard

## Future Improvements

- Email confirmation
- Payment integration
- Staff calendar and service-duration-aware availability
- Better admin security
- Deployment instructions
- Admin search and pagination for large booking lists
