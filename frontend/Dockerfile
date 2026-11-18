# ---- Build stage: compile the React app to static files ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Relative /api: nginx below forwards it to the backend container.
ENV VITE_API_BASE_URL=/api
RUN npm run build

# ---- Runtime stage: nginx serves the SPA and proxies /api ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
