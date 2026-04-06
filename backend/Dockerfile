# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-slim
# Ensure the app directory is owned by the node user from the start
WORKDIR /app
RUN chown node:node /app

# Switch to non-root user for security
USER node

# Copy only production dependencies and compiled code
COPY --from=builder --chown=node:node /app/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV KAFKAJS_NO_PARTITIONER_WARNING=1

EXPOSE 8080

CMD ["npm", "run", "start:all:prod"]
