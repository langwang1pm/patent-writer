"""共享的 datetime 序列化工具（所有 schema 的时间字段统一用此类型）"""
from datetime import datetime
from typing import Annotated
from pydantic.functional_serializers import PlainSerializer
from zoneinfo import ZoneInfo

# 北京时间（与 models/__init__.py 中的 CST_TZ 保持一致）
CST_TZ = ZoneInfo("Asia/Shanghai")


def serialize_dt(dt: datetime) -> str:
    """将 datetime 序列化为无时区后缀的北京时间字符串。
    
    dt 应为 timezone-aware（UTC），此处统一转换为 Asia/Shanghai 后格式化。
    """
    dt_cst = dt.astimezone(CST_TZ)
    return dt_cst.strftime("%Y-%m-%dT%H:%M:%S")


CstDatetime: type[datetime] = Annotated[datetime, PlainSerializer(serialize_dt, return_type=str)]
