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

# Replace placeholder API URL in source code, then build production bundle     replace placeholder with actual backend URL     find all TypeScript files and replace the placeholder    
RUN npm run build

# ========== PHASE2 — RUN WITH NGINX ==========
FROM nginx:alpine AS runner  

# Copy custom nginx configuration    
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf   COPY --from=builder /app/dist /usr/share/nginx/html  

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
