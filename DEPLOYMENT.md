# RowBot Deployment & Operations Guide

## 1. Production Architecture Overview

In production, RowBot operates as a decoupled web application consisting of:
1. **Frontend Static Bundle**: Pre-compiled React SPA assets hosted on a CDN or static web server (Vercel, Netlify, Cloudflare Pages, or Nginx).
2. **Backend API Service**: A Python WSGI/ASGI service powered by `Gunicorn` behind an HTTP reverse proxy (Nginx, Render, Railway, AWS ALB).

---

## 2. Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `5000` | Port for the Flask application server to bind. |
| `FLASK_ENV` | Optional | `production` | Set to `production` for security and performance. |
| `SECRET_KEY` | Recommended | `rowbot-default-secret` | Flask session and CSRF signature key. |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini API key for natural language Copilot. |
| `CORS_ORIGINS` | Optional | `*` | Comma-separated list of allowed frontend origins in production. |
| `MAX_CONTENT_LENGTH`| Optional | `52428800` (50MB) | Maximum file upload size limit in bytes. |

---

## 3. Docker Deployment

### 3.1 Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Run Gunicorn with 4 worker processes
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]
```

### 3.2 Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
```

---

## 4. Platform Deployment Guides

### 4.1 Render / Railway Deployment
1. **Backend Service**:
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 app:app`
   - Add Environment Variable: `GEMINI_API_KEY` (optional).
2. **Frontend Service**:
   - Environment: `Static Site` or `Node`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Configure rewrite rule: `/*` ➔ `/index.html`.

---

## 5. Security & Reverse Proxy Configuration (Nginx)

```nginx
server {
    listen 80;
    server_name rowbot.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rowbot.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/rowbot.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rowbot.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    # Frontend Single Page App
    location / {
        root /var/www/rowbot/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```
