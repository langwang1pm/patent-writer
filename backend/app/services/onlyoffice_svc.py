"""OnlyOffice Document Server 集成服务

负责：
1. 生成编辑器配置（document、editorConfig、token）
2. 签名验证（JWT）
3. 回调处理（保存文件）

OnlyOffice Document Server 文档：
- 编辑器配置: https://api.onlyoffice.com/docs/docs-api/usage-api/config/
- 回调: https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler/
"""
import hashlib
import hmac
import json
import structlog
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings

logger = structlog.get_logger()


class OnlyOfficeService:
    """OnlyOffice 集成服务"""

    # OnlyOffice 支持的文件格式（可预览+可编辑）
    EDITABLE_EXTENSIONS = {"docx", "xlsx", "pptx", "docxf"}
    # 仅预览的格式
    VIEWABLE_EXTENSIONS = {"doc", "xls", "ppt", "odt", "ods", "odp", "csv"}
    # 所有 OnlyOffice 支持的格式
    ALL_SUPPORTED = EDITABLE_EXTENSIONS | VIEWABLE_EXTENSIONS

    def __init__(self):
        settings = get_settings()
        self.doc_server_url = settings.onlyoffice_doc_server_url.rstrip("/")
        self.secret_key = settings.onlyoffice_secret
        self.callback_base_url = settings.onlyoffice_callback_url.rstrip("/")
        self.jwt_enabled = bool(self.secret_key)

    @staticmethod
    def is_onlyoffice_file(filename: str) -> bool:
        """判断文件是否需要通过 OnlyOffice 预览"""
        ext = Path(filename).suffix.lstrip(".").lower()
        return ext in OnlyOfficeService.ALL_SUPPORTED

    @staticmethod
    def is_editable_file(filename: str) -> bool:
        """判断文件是否可编辑"""
        ext = Path(filename).suffix.lstrip(".").lower()
        return ext in OnlyOfficeService.EDITABLE_EXTENSIONS

    @staticmethod
    def get_file_mode(filename: str) -> str:
        """根据文件扩展名获取模式: edit / view"""
        ext = Path(filename).suffix.lstrip(".").lower()
        if ext in OnlyOfficeService.EDITABLE_EXTENSIONS:
            return "edit"
        return "view"

    def build_editor_config(
        self,
        *,
        file_key: str,
        file_name: str,
        file_url: str,
        mode: str = "view",
        user_id: str | None = None,
        user_name: str | None = None,
        callback_url: str | None = None,
    ) -> dict:
        """
        生成 OnlyOffice 编辑器配置

        Args:
            file_key: 文件唯一标识（用于 OnlyOffice 文档缓存 key）
            file_name: 文件名（含扩展名，OnlyOffice 依据此判断文档类型）
            file_url: OnlyOffice 可访问的文件下载 URL
            mode: "view" 或 "edit"
            user_id: 用户 ID（编辑模式下用于协同标识）
            user_name: 用户显示名
            callback_url: 编辑保存回调 URL（编辑模式必须）

        Returns:
            完整的编辑器配置 dict
        """
        ext = Path(file_name).suffix.lstrip(".").lower()

        # 文档类型: word / cell / slide
        if ext in {"docx", "doc", "odt", "docxf"}:
            document_type = "word"
        elif ext in {"xlsx", "xls", "ods", "csv"}:
            document_type = "cell"
        elif ext in {"pptx", "ppt", "odp"}:
            document_type = "slide"
        else:
            document_type = "word"

        # 生成 key（OnlyOffice 用此 key 做缓存，内容变更时需换 key）
        key = self._make_document_key(file_key)

        config: dict = {
            "document": {
                "fileType": ext,
                "key": key,
                "title": file_name,
                "url": file_url,
                "permissions": {
                    "edit": mode == "edit",
                    "download": True,
                    "print": True,
                    "review": mode == "edit",
                },
            },
            "documentType": document_type,
            "editorConfig": {
                "mode": mode,
                "lang": "zh-CN",
                "customization": {
                    "autosave": True,
                    "forcesave": True,
                    "chat": False,
                    "comments": True,
                    "compactHeader": False,
                    "compactToolbar": False,
                    "feedback": False,
                    "help": False,
                    "hideRightMenu": False,
                    "hideRulers": False,
                    "logo": {
                        "image": "",
                        "imageEmbedded": "",
                    },
                    "toolbarNoTabs": mode == "view",
                    "uiTheme": "theme-light",
                },
            },
            "type": "embedded" if mode == "view" else "desktop",
        }

        # 编辑模式需要回调 URL
        if mode == "edit":
            if callback_url:
                config["editorConfig"]["callbackUrl"] = callback_url

        # 用户信息
        if user_id:
            config["editorConfig"]["user"] = {
                "id": str(user_id),
                "name": user_name or "用户",
            }

        # JWT 签名
        if self.jwt_enabled:
            token = self._sign_token(config)
            config["token"] = token

        return config

    def _make_document_key(self, file_key: str) -> str:
        """
        生成文档 key（OnlyOffice 用此做缓存标识）
        key 变化 -> OnlyOffice 重新加载文档
        """
        raw = f"{file_key}:{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        return hashlib.md5(raw.encode()).hexdigest()[:20]

    def _sign_token(self, payload: dict) -> str:
        """
        用 JWT 对编辑器配置签名（OnlyOffice Document Server 要求）

        使用 HMAC-SHA256 实现简易 JWT，兼容 OnlyOffice 的 JWT 验证。
        """
        try:
            import jwt
            return jwt.encode(payload, self.secret_key, algorithm="HS256")
        except ImportError:
            return self._manual_jwt(payload)

    def _manual_jwt(self, payload: dict) -> str:
        """手动构建 JWT（无 PyJWT 依赖时的 fallback）"""
        import base64

        header = {"alg": "HS256", "typ": "JWT"}
        header_b64 = base64.urlsafe_b64encode(
            json.dumps(header, separators=(",", ":")).encode()
        ).rstrip(b"=").decode()

        payload_b64 = base64.urlsafe_b64encode(
            json.dumps(payload, separators=(",", ":")).encode()
        ).rstrip(b"=").decode()

        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            self.secret_key.encode(),
            signing_input.encode(),
            hashlib.sha256,
        ).digest()
        sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()

        return f"{signing_input}.{sig_b64}"

    def verify_callback_token(self, token: str) -> dict | None:
        """验证回调中的 JWT token"""
        if not self.jwt_enabled:
            return None
        try:
            import jwt
            return jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except ImportError:
            return self._manual_jwt_verify(token)
        except Exception as e:
            logger.warning("callback_token_verify_failed", error=str(e))
            return None

    def _manual_jwt_verify(self, token: str) -> dict | None:
        """手动验证 JWT"""
        import base64
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            header_b64, payload_b64, sig_b64 = parts

            signing_input = f"{header_b64}.{payload_b64}"
            expected_sig = hmac.new(
                self.secret_key.encode(),
                signing_input.encode(),
                hashlib.sha256,
            ).digest()

            actual_sig = base64.urlsafe_b64decode(sig_b64 + "==")

            if not hmac.compare_digest(expected_sig, actual_sig):
                return None

            payload_json = base64.urlsafe_b64decode(payload_b64 + "==")
            return json.loads(payload_json)
        except Exception as e:
            logger.warning("manual_jwt_verify_failed", error=str(e))
            return None


# 单例
_onlyoffice_svc: OnlyOfficeService | None = None


def get_onlyoffice_service() -> OnlyOfficeService:
    """获取 OnlyOffice 服务单例"""
    global _onlyoffice_svc
    if _onlyoffice_svc is None:
        _onlyoffice_svc = OnlyOfficeService()
    return _onlyoffice_svc
