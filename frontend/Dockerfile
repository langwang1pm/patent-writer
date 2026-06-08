# ========== PHASE1 — BUILD ==========
FROM node:22-alpine AS builder

# npm registry mirror for China network acceleration  
RUN npm config set registry https://registry.npmmirror.com  

WORKDIR /app  

# Copy dependency files first (leverage layer cache)
COPY package.json package-lock.json* ./  
RUN npm install  

# Receive build arg from docker-compose.yml   build-arg   
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN echo "Starting build..." && \
    npm run build 2>&1 || { \
        echo "========================================"; \
        echo "BUILD FAILED. Checking for common issues..."; \
        echo "========================================"; \
        echo "Checking if src directory exists:"; \
        ls -la src/ 2>&1 || echo "src directory not found!"; \
        echo "========================================"; \
        echo "Checking for TypeScript errors:"; \
        npx tsc --noEmit 2>&1 || echo "TypeScript check failed"; \
        echo "========================================"; \
        echo "Checking vite.config.ts:"; \
        cat vite.config.* 2>&1 || echo "vite.config not found"; \
        echo "========================================"; \
        echo "Checking index.html:"; \
        cat index.html 2>&1 || echo "index.html not found"; \
        echo "========================================"; \
        exit 1; \
    }

# 如果构建成功，检查产物
RUN echo "Build successful! Checking dist directory:" && \
    ls -la dist/ && \
    echo "Dist contents:" && \
    find dist -type f | head -20

# ========== PHASE2 — RUN WITH NGINX ==========
FROM nginx:alpine AS runner  

# Copy custom nginx configuration    
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
