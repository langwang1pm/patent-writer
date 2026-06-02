# 构建阶段 — 使用阿里云镜像加速
FROM node:22-alpine AS builder

# npm 使用淘宝镜像
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /app

# 先复制依赖文件，安装依赖
COPY package.json package-lock.json* ./
RUN npm install

# 再复制源代码，构建
COPY . .
RUN npm run build

# 运行阶段 — 最小镜像
FROM node:22-alpine AS runner

# npm 使用淘宝镜像
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /app

# 安装 serve
RUN npm install -g serve

# 只复制构建产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]