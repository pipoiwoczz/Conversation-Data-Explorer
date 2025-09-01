FROM node:20-alpine
WORKDIR /app
COPY front-end/package*.json ./
RUN npm ci
COPY front-end ./
ENV HOST=0.0.0.0
# dev-time base path; Vite proxy handles /api → backend
ENV VITE_API_BASE=/api
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]