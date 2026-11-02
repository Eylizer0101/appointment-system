# Appointment System — Render deployment

This is one Node.js / Express / EJS Web Service (not a separate Static Site).

## Render setup
- Repository: upload the `appointment_system` directory to GitHub.
- Root Directory: `appointment_system` if the folder is kept at repo root, or blank if its contents are at repo root.
- Runtime: Node
- Build Command: `npm install` (or `npm ci` if the lockfile is compatible)
- Start Command: `npm start`
- Instance: choose the available plan.

## Required environment variables
- `MONGO_URI`: a MongoDB Atlas `mongodb+srv://...` URI; do not use localhost for production. Configure Atlas IP access and database user credentials securely.
- `SESSION_SECRET`: a securely generated random string of at least 32 characters. Example generation: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `NODE_ENV`: `production`.
- `NODEMAILER_PASSWORD`: only if using password reset email. Confirm Gmail application password / SMTP setup.

`PORT` is provided automatically by Render; do not set it manually unless needed.

## Post-deploy verification
- Verify a public route loads.
- Verify `Connected to MongoDB` appears in logs.
- Test login, registration, session persistence, booking, staff actions, and password reset.
- Test all intended uploads and images.

## Important limitation
The existing system uses `public/uploads/`, which is **ephemeral storage** on a Render Free Web Service. User-uploaded files may disappear after restart or redeploy. Switch to persistent object storage (e.g. Cloudinary/S3) and adjust upload routes before relying on uploads for real records.

Do not upload a real `.env`, database credentials, or `node_modules` to GitHub.
