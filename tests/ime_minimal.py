#!/usr/bin/env python3
"""最小化输入法测试：纯 HTML 输入框，无 React、无 Python 桥接。
如果这个窗口里中文输入法正常 → 问题在 React 代码；
如果这个窗口里也卡 → 问题在 pywebview/系统层。"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import webview

HTML = """
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>
  body { font-family: sans-serif; padding: 40px; background: #f5f5f5; }
  input, textarea { display: block; width: 100%; margin: 10px 0; padding: 10px;
                    font-size: 16px; border: 1px solid #ccc; border-radius: 6px; }
  p { color: #666; }
</style></head><body>
  <h2>纯 HTML 输入法测试（无 React / 无后端）</h2>
  <p>请切换中文输入法，在下面的框里输入拼音测试：</p>
  <input placeholder="单行输入框，试试打中文…">
  <textarea rows="5" placeholder="多行输入框，试试打中文…"></textarea>
</body></html>
"""

webview.create_window("输入法最小测试", html=HTML, width=600, height=450)
webview.start()
