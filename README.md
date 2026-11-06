<div align="center">

# 🎵 Banda ni Shano — Appointment Management System

**An event and live-band booking management web application**

A centralized platform for submitting band performance bookings, managing event schedules, maintaining client records, and tracking appointment activity.

[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-Web_Framework-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![EJS](https://img.shields.io/badge/EJS-Templates-B4CA65)](https://ejs.co/)
[![Render](https://img.shields.io/badge/Render-Deployment-46E3B7?logo=render&logoColor=black)](https://render.com/)

[Overview](#overview) • [Features](#key-features) • [Installation](#getting-started) • [Deployment](#deployment) • [Author](#author)

</div>

---

## Overview

**Banda ni Shano Appointment Management System** is a web-based application designed to organize bookings for live band performances at events and special occasions. Visitors can request performance appointments and provide their preferred event details, while authorized personnel can manage appointment records and scheduling from a centralized interface.

The application uses **Node.js**, **Express.js**, **EJS**, and **MongoDB**. The user interface is rendered on the server, so there is **no separate React frontend or frontend build service**.

### Project goals

- Simplify the process of requesting a live band performance for an event.
- Keep event dates and appointment details organized in one place.
- Reduce overlapping schedules by checking for existing reservations.
- Help staff review bookings, maintain client information, and monitor appointment trends.

## Key Features

### For visitors and clients

- Browse the public-facing website and access booking-related pages.
- Submit event booking details, including desired start and end dates, event type, location, and contact information.
- Select from the booking packages offered in the application.
- Receive a response when a requested date conflicts with an existing appointment.
- Access account registration and login pages where applicable.

### For authorized staff / administrators

- Access a dashboard and appointment management pages.
- Review appointment details and schedules.
- Track booking states such as **Pending**, **Success**, and **Cancelled**.
- Maintain client records and account information.
- View archived appointment records.
- Review analytics for bookings, package distribution, event categories, clients, and payment status.
- Filter analytics by dates, weeks, months, years, or a custom date range.

> **Booking workflow:** This is a request-and-schedule system for booking a band's event performance. It is not an online music streaming platform or an automatic payment gateway. A submitted booking should not be interpreted as an automatically confirmed performance unless staff has approved it.

## Technology Stack

| Category | Technology | Purpose |
| --- | --- | --- |
| Server runtime | Node.js | Runs the application |
| Web framework | Express.js | Handles routing and HTTP requests |
| Server-side views | EJS and ejs-mate | Renders website pages and layouts |
| Database | MongoDB / MongoDB Atlas | Stores users, appointments, and related records |
| Sessions | express-session + connect-mongodb-session | Persists user sessions in MongoDB |
| Password handling | bcryptjs | Supports password hashing and verification |
| Email | Nodemailer | Supports email-related flows where configured |
| File handling | express-fileupload / multer | Upload-related dependencies included in the project |
| Styling | CSS, Tailwind CSS tooling | Styles website pages |
| Deployment | Render | Runs the Node.js web service |

The project also lists packages such as `pdfkit`, `exceljs`, `cloudinary`, `resend`, and `@sendgrid/mail`. Their presence in `package.json` does **not** necessarily mean every related integration or feature is enabled in the deployed application.

## How the System Works

1. **Explore:** A visitor opens the website and reviews the band's offerings.
2. **Book:** The visitor provides the event date range, package, event information, venue, and contact details.
3. **Validate:** The application checks whether an active appointment overlaps the requested date range.
4. **Record:** An available booking is saved to MongoDB with its initial status.
5. **Manage:** Authorized personnel review appointments, manage their status, and monitor the schedule.
6. **Analyze:** Authorized personnel use the dashboard and analytics to review booking activity and trends.

## Project Structure

```text
appointment-system/
├── public/                 # Public static assets and upload directory
├── views/                  # EJS templates and page layouts
├── .env.example            # Example environment variables (no real secrets)
├── .gitignore              # Git exclusions
├── RENDER_DEPLOYMENT.md    # Render-specific setup instructions
├── app.js                  # Express server, middleware, routes, and database access
├── package.json            # Dependencies and npm scripts
├── package-lock.json       # Locked npm dependency versions
└── README.md               # Project documentation
```

> This diagram summarizes the confirmed top-level repository structure. Additional assets and view templates are located inside `public/` and `views/`.

## Getting Started

### Prerequisites

Before starting, install or prepare:

- **Node.js** and npm (use a supported Node.js LTS release).
- A **MongoDB Atlas** cluster or another accessible MongoDB server.
- **Git** for cloning the repository.
- A code editor, such as Visual Studio Code.

### 1. Clone the repository

```bash
git clone https://github.com/Eylizer0101/appointment-system.git
cd appointment-system
```

### 2. Install dependencies

```bash
npm install
```

If you want a clean install using the committed lockfile, use `npm ci` instead, provided that `package-lock.json` is compatible with `package.json`.

### 3. Configure the environment

Copy `.env.example` to a new file named `.env` in the project root.

For macOS / Linux:

```bash
cp .env.example .env
```

For Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Example **local-development** configuration:

```dotenv
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@YOUR-CLUSTER.mongodb.net/appointment_system
SESSION_SECRET=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
NODE_ENV=development
PORT=3030
# Optional; required only for the configured password-reset email flow:
# NODEMAILER_PASSWORD=YOUR_EMAIL_APP_PASSWORD
```

**Important configuration notes:**

- Replace the placeholder MongoDB URI with credentials from your own Atlas cluster.
- Set a strong, unpredictable `SESSION_SECRET` of at least **32 characters**. The application enforces this requirement at startup.
- `NODE_ENV=development` is appropriate for local testing; set `NODE_ENV=production` in production.
- `PORT` is optional locally; the application defaults to **3030**.
- Password-reset email functionality requires the appropriate email transport configuration. Check the source before enabling this in production.
- **Never commit `.env`, API keys, email passwords, or database credentials to GitHub.**

To generate a secure session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set up MongoDB Atlas

1. Create a MongoDB Atlas cluster and database user.
2. Configure network access for your development environment.
3. Copy the connection string from Atlas.
4. Paste it into `MONGO_URI` inside `.env`.
5. Ensure your connection string includes the intended database name.

### 5. Run the application

For regular execution:

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

Open **http://localhost:3030** in your browser, unless you set a different `PORT`.

The scripts are defined in `package.json` as:

```json
{
  "start": "node app.js",
  "dev": "nodemon app.js"
}
```

## Main Application Pages and Routes

The source code includes the following routes (not an exhaustive API reference):

| Route | Function | Access |
| --- | --- | --- |
| `/` | Website landing page | Public |
| `/lg` | Login page | Public |
| `/rg` | Registration page | Public |
| `/forgot` | Password recovery page | Public |
| `/dsb` | Management dashboard | Login required |
| `/sched` | Schedule page | Login required |
| `/app` | Appointment management | Login required |
| `/archive` | Archived appointment records | Login required |
| `/clt` | Client records | Login required |
| `/prf` | Profile page | Login required |
| `/booked-dates` | Returns existing non-cancelled booking dates | Public API endpoint |
| `/analytics` | Returns appointment analytics data | **Review access control before production use** |

> Route access is based on the checked middleware in `app.js`. A login-only check does not necessarily enforce administrator-level authorization. Review role permissions before use with real client information.

## Booking Data

Appointment records can include:

- Client name and contact information
- Event type and selected package
- Event start and end dates
- Venue address, landmark, and other location details
- Booking status
- Payment status
- Creation timestamp and archive state

The current booking routes check for overlapping active appointments before saving a new one. Booking state and payment status are tracked in application records; do not assume that an external payment processor is integrated.

## Security Considerations

The codebase contains MongoDB-backed sessions, secure-cookie configuration for production, and bcrypt-based password verification on its primary login route. However, **these measures do not establish that the entire application has passed a security review**.

Before handling real user records, review and test:

- Authentication and password hashing consistently across **all** login and account creation routes.
- Staff/admin authorization for sensitive pages and data endpoints.
- Input validation, rate limiting, and protection against malicious requests.
- Logging practices to ensure passwords, session contents, and other sensitive information are not exposed.
- Safe uploads, file size/type restrictions, and persistent media storage.
- Session cookies, HTTPS, database network access, and secret rotation.

**Do not use default, shared, or hard-coded credentials in production.**

## Deployment on Render

The existing repository includes a deployment guide at [`RENDER_DEPLOYMENT.md`](./RENDER_DEPLOYMENT.md).

1. Push the project to GitHub.
2. On Render, create a **Web Service** (not a Static Site).
3. Connect this repository and select the deployment branch.
4. Leave **Root Directory** blank when `app.js` and `package.json` are at the repository root.
5. Choose the Node runtime.
6. Set **Build Command** to `npm install` (or `npm ci` when compatible).
7. Set **Start Command** to `npm start`.
8. Add `MONGO_URI`, `SESSION_SECRET`, and `NODE_ENV=production` in Render's Environment settings.
9. Add the email-related secret only if the corresponding feature is configured.
10. Deploy and verify database connection, page loading, login, booking, and management flows.

Render normally provides `PORT` automatically.

### Uploaded files on Render

The application creates or uses `public/uploads/`. On an instance with **ephemeral storage**, files stored there may disappear on restart or redeployment. Configure durable object storage and update the upload code before relying on local uploads for production data.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| `MONGO_URI is required` | `.env` exists in the project root and includes `MONGO_URI`. |
| Session secret error | `SESSION_SECRET` has at least 32 characters. |
| MongoDB connection fails | Atlas credentials, database URI, networking, and IP access. |
| Port or site cannot be reached | Check terminal logs and open `http://localhost:3030` or your configured port. |
| Login fails | Database records, login route behavior, and password format. |
| A date is unavailable | An existing non-archived appointment may overlap the selected dates. |
| Uploaded images disappear on Render | Replace ephemeral local storage with persistent media storage. |
| Email recovery does not send | Check the configured email transport and required secrets. |

## Testing and Maintenance

The checked `package.json` does **not** define an automated `npm test` script. Do not interpret this README as proof of test coverage. Recommended manual checks include:

- Landing page, registration, login, and logout
- Booking submission and overlapping-date rejection
- Appointment review, updates, cancellation, and archiving
- Dashboard data and analytics filters
- Profile/account editing and session expiration
- Mobile and desktop layout behavior
- Restart and deployment checks for database connectivity and uploaded files

## Possible Future Improvements

- Comprehensive role-based access controls
- Consistent hashing for every authentication and account-creation path
- Automated tests and continuous integration
- Persistent cloud file storage
- Improved booking notifications and confirmations
- Additional validation, audit logs, and accessibility checks

These are **proposed enhancements**, not claims about current functionality.

## Author

**Eylizer De Afria**  
Bachelor of Science in Information Technology, major in System Development  
PHINMA Araullo University

- **GitHub:** [github.com/Eylizer0101](https://github.com/Eylizer0101)
- **Portfolio:** [eylizer-portfolio.onrender.com](https://eylizer-portfolio.onrender.com)
- **LinkedIn:** [Eylizer De Afria](https://www.linkedin.com/in/eylizer-de-afria-040724430)

## License

© 2026 Eylizer De Afria. All Rights Reserved.

This project is provided publicly for educational, portfolio, viewing, and evaluation purposes only. **No permission is granted to copy, modify, redistribute, sublicense, or use the project commercially** without prior written permission from the relevant copyright holder(s).

Public availability on GitHub does not make the project open source. Any license field in a `package.json` file should not be interpreted as a repository-wide permission grant. Third-party libraries, assets, and contributions remain subject to their own licenses and ownership rights.

For permission inquiries, contact the repository owner through GitHub.

---

<div align="center">

**Banda ni Shano Appointment Management System**  
*Organizing live-event bookings and schedules in one place.*

</div>
