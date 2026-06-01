# 专利撰写系统 - 简化部署指南

## 📋 项目完整性确认

### ✅ 已检查项目结构
- **后端（backend/）**：所有Python文件完整
- **前端（frontend/）**：所有React/TypeScript文件完整
- **Docker配置**：docker-compose.yml、Dockerfile都已就绪
- **依赖文件**：requirements.txt已创建，package.json已存在

### 🔧 需要创建的文件
1. **`.env`** - 环境变量配置文件（必须）
2. **前端生产环境配置** - `frontend/.env.production`（可选）

## 🚀 快速部署步骤

### 步骤1：创建环境变量文件
在项目根目录（`D:\PycharmProject\patent-writer\`）创建 `.env` 文件：

```env
# 数据库配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=patent_writer
DATABASE_USER=postgres
DATABASE_<SECRET_REDACTED>

# Dify配置（本地Dify服务）
DIFY_BASE_URL=http://localhost:8080
DIFY_API_KEY=your_dify_api_key

# OnlyOffice配置（本地OnlyOffice服务）
ONLYOFFICE_DOC_SERVER_URL=http://localhost:8080
ONLYOFFICE_<SECRET_REDACTED>
ONLYOFFICE_CALLBACK_URL=http://localhost:8000/api/v1/onlyoffice/callback

# 应用配置
DEBUG=False
SECRET_KEY=patent-writer-secret-2024
```

**注意**：请根据实际安装的PostgreSQL、OnlyOffice、Dify服务修改上述配置。

### 步骤2：清理项目（可选但推荐）
在上传到服务器前，清理开发环境文件：

```powershell
# 方法1：手动删除
# 删除后端虚拟环境（将在Docker中重新创建）
Remove-Item -Recurse -Force D:\PycharmProject\patent-writer\backend\venv

# 删除前端依赖（将在Docker中重新安装）
Remove-Item -Recurse -Force D:\PycharmProject\patent-writer\frontend\node_modules

# 删除前端构建产物（将在Docker中重新构建）
Remove-Item -Recurse -Force D:\PycharmProject\patent-writer\frontend\dist

# 方法2：使用清理脚本（如果有权限问题）
# 手动右键删除上述文件夹
```

### 步骤3：上传到服务器
在Windows PowerShell中执行：

```powershell
# 使用SCP上传整个项目
scp -r D:\PycharmProject\patent-writer\* pgx@192.168.110.44:/home/pgx/patent-writer/
```

**如果遇到权限问题**，可以使用 **WinSCP** 图形工具上传。

### 步骤4：在服务器上部署
SSH登录到服务器并执行：

```bash
# 1. 登录服务器
ssh pgx@192.168.110.44

# 2. 进入项目目录
cd /home/pgx/patent-writer

# 3. 赋予部署脚本执行权限
chmod +x quick_deploy.sh

# 4. 执行一键部署
bash quick_deploy.sh
```

### 步骤5：验证部署
部署脚本会自动检查以下内容：

```bash
# 检查容器状态
docker-compose ps

# 检查前端访问
curl <INTERNAL_URL>

# 检查后端API
curl <INTERNAL_URL>

# 查看实时日志
docker-compose logs -f
```

## 🔍 验证清单

部署完成后，确认以下事项：

- [ ] 所有Docker容器正常运行（`docker-compose ps`）
- [ ] 前端可访问：`http://192.168.110.44:3000`
- [ ] 后端API可访问：`http://192.168.110.44:8000`
- [ ] 数据库连接正常（检查后端日志）
- [ ] OnlyOffice服务可访问（检查后端日志）
- [ ] Dify API可访问（检查后端日志）
- [ ] 离线运行测试通过（断开网络测试）

## ⚠️ 常见问题

### 1. 权限被拒绝（清理项目时）
**解决**：手动右键删除文件夹，或以管理员身份运行PowerShell

### 2. SCP上传失败
**解决**：
- 确保SSH服务正在服务器上运行
- 检查防火墙设置
- 使用WinSCP图形工具代替

### 3. Docker构建失败
**解决**：
- 检查ARM64架构兼容性
- 确保Docker和Docker Compose已安装
- 检查requirements.txt和package.json

### 4. 服务无法访问
**解决**：
- 检查PostgreSQL、OnlyOffice、Dify服务是否启动
- 检查`.env`文件配置是否正确
- 检查防火墙端口是否开放（3000、8000、5432、8080）

### 5. 离线运行问题
**解决**：
- 确保所有Docker镜像已下载
- 确保没有外部API调用
- 所有依赖已打包在Docker镜像中

## 📁 项目文件说明

### 已创建的文件
1. **requirements.txt** - Python依赖列表
2. **PROJECT_CHECKLIST.md** - 项目完整性检查清单
3. **DEPLOYMENT_GUIDE.md** - 详细部署指南
4. **DEPLOYMENT_SUMMARY.md** - 部署总结
5. **SIMPLE_DEPLOY_GUIDE.md** - 本文档，简化部署指南
6. **quick_deploy.sh** - 服务器一键部署脚本
7. **upload_and_deploy.ps1** - Windows上传脚本

### 需要手动创建的文件
1. **`.env`** - 环境变量配置（参考上面模板）

## 🎯 下一步行动

1. **立即执行**：
   - ✅ 创建`.env`文件
   - ✅ 清理项目（删除venv、node_modules、dist）
   - ✅ 上传项目到服务器

2. **部署后执行**：
   - ✅ 运行`quick_deploy.sh`
   - ✅ 验证所有服务正常运行
   - ✅ 进行离线运行测试

3. **可选优化**：
   - 配置HTTPS证书
   - 配置域名访问
   - 配置自动启动服务
   - 配置监控和告警

---

## 📞 技术支持

如在部署过程中遇到问题，请准备以下信息：
- 服务器系统信息：`uname -a`
- Docker信息：`docker version`、`docker-compose version`
- 容器状态：`docker-compose ps`
- 错误日志：`docker-compose logs --tail=100`

**祝部署顺利！**
