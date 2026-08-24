#!/usr/bin/env python3
"""
取证单生成器 - 桌面版入口（pywebview）

用法：
  开发模式（前端热更新）：先 pnpm --dir web dev，再 python app/main.py --dev
  生产模式：python app/main.py            （加载 web/dist 构建产物）
  打包后：双击 审计取证单生成器.exe / .app
"""

import sys
from pathlib import Path

# 保证可以 import app.backend（开发模式从项目根运行）
sys.path.insert(0, str(Path(__file__).parent.parent))

import webview  # noqa: E402

from app import backend  # noqa: E402

DEV_SERVER_URL = "http://localhost:5173"
WINDOW_TITLE = "审计取证单生成器"


class Api:
    """暴露给前端 JS 的 API（window.pywebview.api.*）"""

    # ── 初始化数据 ──
    def get_bootstrap(self):
        """返回参考表单位列表 + 上次保存的表单状态 + 审计类型选项"""
        return {
            "units": backend.load_unit_ref(),
            "state": backend.load_state(),
            "audit_types": backend.AUDIT_TYPES,
            "version": "6.0-web",
        }

    # ── 生成 ──
    def generate(self, data):
        result = backend.generate(data)
        if result.get("ok"):
            backend.save_state(data)  # 生成成功后自动暂存
        return result

    # ── 状态 ──
    def save_state(self, data):
        backend.save_state(data)
        return {"ok": True}

    def load_state(self):
        return backend.load_state()

    # ── 编号工具 ──
    def increment_doc_no(self, current):
        return backend.increment_doc_no(current)

    # ── 附件 ──
    def add_attachment(self, filename, data_b64):
        return backend.add_attachment(filename, data_b64)

    def replace_attachment(self, att_id, filename, data_b64):
        return backend.replace_attachment(att_id, filename, data_b64)

    def remove_attachment(self, att_id):
        return backend.remove_attachment(att_id)

    def clear_attachments(self):
        return backend.clear_attachments()

    # ── 输出目录 ──
    def open_output_dir(self):
        return {"ok": True, "path": backend.open_output_dir()}


def main():
    dev = "--dev" in sys.argv
    dist = Path(__file__).parent.parent / "web" / "dist" / "index.html"

    if dev:
        url = DEV_SERVER_URL
    else:
        if getattr(sys, "frozen", False):
            dist = Path(sys._MEIPASS) / "web" / "dist" / "index.html"
        if not dist.exists():
            print(f"[错误] 前端构建产物不存在: {dist}")
            print("请先在 web/ 目录执行 pnpm install && pnpm build")
            sys.exit(1)
        url = str(dist)

    api = Api()
    webview.create_window(
        WINDOW_TITLE,
        url,
        js_api=api,
        width=980,
        height=760,
        min_size=(860, 640),
        text_select=True,
    )
    webview.start(debug=dev)


if __name__ == "__main__":
    main()
