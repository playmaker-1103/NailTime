# Luna Nails Studio Booking App

A complete junior-friendly full-stack portfolio project for booking nail salon appointments. Customers can browse services and submit booking requests, while an admin can manage bookings and nail services from a protected dashboard.

## Features

- Public home page with featured services and booking call to action
- Services page with prices, descriptions, and durations
- Booking form with frontend and backend validation
- Booking confirmation page
- JWT-based admin login from environment variables
- Protected admin dashboard for booking status updates
- Admin service create, edit, delete, and active/inactive controls
- MongoDB models with Mongoose timestamps
- Seed script for sample salon services
- Basic backend route tests with Jest, Supertest, and MongoDB Memory Server

## Tech Stack

- Frontend: React, Vite, React Router, plain CSS
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT admin login
- Testing: Jest, Supertest, MongoDB Memory Server
- Package manager: npm

## Folder Structure

```text
nails-booking-app/
  client/
    public/images/
    src/
      components/
      context/
      pages/
      services/
      App.jsx
      main.jsx
      styles.css
  server/
    config/
    controllers/
    middleware/
    models/
    routes/
    tests/
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

Start MongoDB locally, then seed sample services:

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
MONGO_URI=mongodb://127.0.0.1:27017/nails-booking-app
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password123
CLIENT_URL=http://localhost:5173
```

Frontend `client/.env`:

```env
VITE_API_URL=http://localhost:5050/api
```

The admin password is compared as plain text to keep the project easy to understand. Before production, store a hashed password or use a real authentication provider.

## API Endpoints

Auth:

- `POST /api/auth/login`
- `GET /api/auth/me`

Services:

- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services` admin only
- `PUT /api/services/:id` admin only
- `DELETE /api/services/:id` admin only

Bookings:

- `GET /api/bookings` admin only
- `GET /api/bookings/:id` admin only
- `POST /api/bookings`
- `PUT /api/bookings/:id/status` admin only
- `DELETE /api/bookings/:id` admin only

## Admin Login Setup

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in `server/.env`. Use the same email and password on the `/admin/login` page.

Example:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=password123
JWT_SECRET=change-this-secret
```

## Tests

Run backend tests:

```bash
cd server
npm test
```

The tests cover admin login, protected service creation, booking creation, booking validation, booking filtering, and status updates.

## Screenshots

Add screenshots here after running the app locally:

- Home page
- Services page
- Booking form
- Admin dashboard

## Future Improvements

- Real user accounts
- Email confirmation
- Payment integration
- Calendar availability system
- Better admin security with hashed passwords and refresh strategy
- Deployment instructions
- Admin search and pagination for large booking lists
- Prevent double bookings for the same date and time
