# Lapaas Course Discovery — Stage 2

Independent internship prototype by Anish Kumar. React/Vite frontend and secure Node FAQ API.

Preserve the sibling data and app folders.

Local setup: npm ci --include=dev --prefix lapaas-course-advisor; npm run dev --prefix lapaas-course-advisor.

Render: Root Directory blank; Build: npm ci --include=dev --prefix lapaas-course-advisor; Start: npm run api --prefix lapaas-course-advisor. Set API_HOST=0.0.0.0, APP_ORIGIN to the exact Vercel HTTPS origin, omit API_PORT, and use Render PORT. Gemini credentials belong only in Render server environment variables.

UptimeRobot: HTTP(s) monitor of the Render URL /api/health, five-minute interval. GET and HEAD are supported without Gemini calls. Monitoring does not guarantee uninterrupted service or prevent platform suspension.
