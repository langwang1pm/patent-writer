# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 再复制源代码，构建
COPY . .
RUN npm run build

# 运行阶段 — 最小镜像
FROM node:20-alpine

WORKDIR /app

# 只复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .

# 使用 serve 或 nginx 来托管静态文件
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]