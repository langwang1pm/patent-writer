# 构建阶段
FROM python:3.13-slim AS builder

WORKDIR /app

# 先复制依赖文件（利用 Docker 层缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --trusted-host pypi.tuna.tsinghua.edu.cn

# 运行时阶段 — 最小镜像
FROM python:3.13-slim

WORKDIR /app

# 只复制已安装的包
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制代码
COPY . .

# 非 root 用户
RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /app

# 创建上传目录并赋权（volume 挂载点需预先存在且可写）
RUN mkdir -p /app/uploads/knowledge_files && chown -R appuser:appuser /app/uploads

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300"]