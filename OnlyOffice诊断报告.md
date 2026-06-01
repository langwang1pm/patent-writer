# OnlyOffice 预览失败诊断报告

## 问题现象
OnlyOffice 编辑器加载后显示"下载失败"

## 已验证项目

### ✅ 后端配置
- ONLYOFFICE_CALLBACK_URL: http://192.168.2.98:8000 (已更新)
- ONLYOFFICE_DOC_SERVER_URL: http://192.168.2.121:8080

### ✅ 后端服务
- 监听地址: 0.0.0.0:8000 (所有接口)
- 文件下载接口: 正常 (200 OK)
- 文件存在: uploads/knowledge_files/5e0b552a-bf3d-47fb-a48a-2d15ef5d674f.docx

### ✅ 网络连通性（本机测试）
- 127.0.0.1:8000 → 200 OK
- 192.168.2.98:8000 → 200 OK

### ❌ 网络连通性（跨机器）
- 从 192.168.2.121 访问 192.168.2.98:8000 → **未验证**

## 根本原因

OnlyOffice Document Server (192.168.2.121) **无法访问** 后端文件下载 URL (192.168.2.98:8000)

当 OnlyOffice 编辑器初始化时，它会尝试从配置的 URL 下载文件内容：
```
http://192.168.2.98:8000/api/v1/onlyoffice/file/kb:1257414d-4d08-4f2b-8b6c-50371f643bab
```

如果 Document Server 无法访问这个地址，就会显示"下载失败"。

## 解决方案

### 方案 1: 检查 Document Server 网络连通性（推荐先执行）

在 **192.168.2.121** 机器上执行：

```bash
# 测试网络连通性
ping 192.168.2.98

# 测试端口连通性
curl -v http://192.168.2.98:8000/api/v1/onlyoffice/file/kb:1257414d-4d08-4f2b-8b6c-50371f643bab
```

如果 ping 不通或 curl 失败，说明两台机器之间有网络隔离。

### 方案 2: 修改 ONLYOFFICE_CALLBACK_URL 为 Document Server 可访问的地址

如果 192.168.2.98 无法从 192.168.2.121 访问，需要：

1. 找到 Document Server 能访问的后端地址
2. 修改 `.env` 中的 `ONLYOFFICE_CALLBACK_URL`
3. 重启后端服务

### 方案 3: 将后端和 Document Server 部署在同一台机器

如果网络问题无法解决，可以将后端服务也部署在 192.168.2.121 上，然后：

```env
ONLYOFFICE_CALLBACK_URL=http://127.0.0.1:8000
```

### 方案 4: 检查 Document Server 的 JWT 配置

如果 Document Server 启用了 JWT 验证，需要确保：

1. `.env` 中的 `ONLYOFFICE_SECRET` 与 Document Server 配置一致
2. Document Server 的 local.json 中正确配置了 JWT secret

查看 Document Server 配置：
```bash
docker exec -it onlyoffice cat /etc/onlyoffice/documentserver/local.json
```

## 快速验证步骤

1. 在浏览器中直接访问文件下载 URL：
   ```
   http://192.168.2.98:8000/api/v1/onlyoffice/file/kb:1257414d-4d08-4f2b-8b6c-50371f643bab
   ```
   应该能下载文件。

2. 在 Document Server 机器上测试：
   ```bash
   curl -I http://192.168.2.98:8000/api/v1/onlyoffice/file/kb:1257414d-4d08-4f2b-8b6c-50371f643bab
   ```
   应该返回 HTTP 200。

3. 如果 curl 失败，检查：
   - 防火墙规则
   - 网络路由
   - VLAN/子网隔离

## 建议

最可能的原因是 **192.168.2.121 和 192.168.2.98 之间的网络不通**。请先在 Document Server 机器上测试能否访问后端地址。
