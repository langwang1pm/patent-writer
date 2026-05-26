"""
配置检查工具 - 检查后端环境是否就绪

运行方式:
    python check_config.py
"""

import os
import sys


def check_python_version():
    """检查 Python 版本"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print(f"❌ Python 版本过低: {version.major}.{version.minor}.{version.micro}")
        print("   需要 Python 3.11+")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_virtualenv():
    """检查虚拟环境"""
    venv_path = os.path.join(os.path.dirname(__file__), 'backend', 'venv')
    if os.path.exists(venv_path):
        print(f"✓ 虚拟环境已创建: {venv_path}")
        return True
    else:
        print(f"⚠ 虚拟环境未创建，运行: cd backend && python -m venv venv")
        return False


def check_backend_deps():
    """检查后端依赖是否安装"""
    try:
        import fastapi
        import sqlalchemy
        import httpx
        import structlog
        print("✓ 后端依赖已安装")
        return True
    except ImportError as e:
        print(f"❌ 缺少依赖: {e.name}")
        print("   运行: pip install -r backend/requirements.txt")
        return False


def check_env_file():
    """检查 .env 文件"""
    env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
    root_env = os.path.join(os.path.dirname(__file__), '.env')

    if os.path.exists(env_path):
        print(f"✓ .env 文件已创建: {env_path}")
        return True
    elif os.path.exists(root_env):
        print(f"✓ .env 文件已创建（根目录）: {root_env}")
        return True
    else:
        print(f"⚠ .env 文件未创建，运行: copy .env.example .env")
        return False


def check_database():
    """检查数据库连接"""
    try:
        from app.config import settings
        print(f"✓ 数据库配置: {settings.DATABASE_HOST}:{settings.DATABASE_PORT}")
        return True
    except Exception as e:
        print(f"⚠ 数据库配置读取失败: {e}")
        return False


def main():
    print("=" * 50)
    print("PatentWriter 配置检查")
    print("=" * 50)
    print()

    results = [
        ("Python 版本", check_python_version()),
        ("虚拟环境", check_virtualenv()),
        ("后端依赖", check_backend_deps()),
        (".env 文件", check_env_file()),
        ("数据库配置", check_database()),
    ]

    print()
    print("=" * 50)
    print("检查结果汇总")
    print("=" * 50)

    all_passed = True
    for name, passed in results:
        status = "✓" if passed else "❌"
        print(f"  {status} {name}")

    if all(passed for _, passed in results):
        print()
        print("✓ 所有检查通过！可以启动后端服务")
        print("  运行: cd backend && uvicorn app.main:app --reload --port 8000")
    else:
        print()
        print("⚠ 部分检查未通过，请先完成上述配置")

    return all_passed


if __name__ == "__main__":
    main()