# Ngrok test setup

Use this for quick public testing before deployment.

## 1) Backend

From project root:

```bash
copy server\.env.ngrok server\.env
cd server
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

Expected URL:
- http://localhost:8080

## 2) Frontend

In another terminal:

```bash
copy client\.env.ngrok client\.env
cd client
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Expected URL:
- http://localhost:5173

## 3) Tunnel with ngrok

Open a new terminal and run:

```bash
ngrok http 5173
```

Then copy the HTTPS forwarding URL and replace `YOUR_NGROK_URL` in `client/.env.ngrok`.

For backend socket/webhook testing you can also expose the server:

```bash
ngrok http 8080
```

## 4) Important note

If you want the frontend to call the backend through ngrok, update:
- client/.env.ngrok
  - `VITE_API_BASE_URL=https://<your-ngrok-backend-url>/api/v1`
  - `VITE_SOCKET_URL=https://<your-ngrok-backend-url>`

## 5) If CORS errors appear

Make sure the ngrok domain is allowed in `server/.env.ngrok`:
- `CORS_ORIGINS=...,https://*.ngrok-free.app,https://*.ngrok.app`
