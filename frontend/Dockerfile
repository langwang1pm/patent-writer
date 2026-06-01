# 构建阶段
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package.json ./
RUN npm install --legacy-peer-deps

# 复制代码
COPY . .

# 构建
RUN npm run build

# 运行
CMD ["npm", "run", "dev"]