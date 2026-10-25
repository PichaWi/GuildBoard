# Stage 1: Build React application with Vite
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Build argument to toggle mock mode during production build
ARG VITE_USE_MOCK=false
ENV VITE_USE_MOCK=$VITE_USE_MOCK

# Copy frontend source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve built assets using Nginx
FROM nginx:alpine

# Copy compiled SPA bundle from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration supporting React Router & API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
