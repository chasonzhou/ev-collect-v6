#!/usr/bin/env python3
"""二分定位输入卡死：依次弹出 3 个窗口，请用户逐个测试中文/英文输入。

W1: 完整 React 页面（file://）但无 js_api 桥接
W2: 纯 HTML + js_api 桥接（不主动调用）
W3: 纯 HTML + js_api 桥接 + 每2秒自动调一次桥接（模拟暂存干扰输入法）
"""
import sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import webview
from app.main import Api

DIST = str(Path(__file__).parent.parent / "web" / "dist" / "index.html")

HTML2 = """
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>body{font-family:sans-serif;padding:40px} input{display:block;width:100%;
padding:10px;font-size:16px;margin:10px 0}</style></head><body>
<h2>W2：纯 HTML + 有桥接（不主动调）</h2>
<input placeholder="试试打中文和英文…">
</body></html>
"""

HTML3 = """
<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<style>body{font-family:sans-serif;padding:40px} input{display:block;width:100%;
padding:10px;font-size:16px;margin:10px 0} #log{color:#999;font-size:12px}</style>
</head><body>
<h2>W3：纯 HTML + 桥接每2秒自动调用</h2>
<input placeholder="试试打中文和英文…">
<div id="log"></div>
<script>
  function tick() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.increment_doc_no('01').then(r => {
        document.getElementById('log').textContent = '桥接调用于 ' + new Date().toLocaleTimeString();
      });
    }
  }
  setInterval(tick, 2000);
</script>
</body></html>
"""

which = sys.argv[1] if len(sys.argv) > 1 else "w1"

if which == "w1":
    webview.create_window("W1 完整页面·无桥接", DIST, width=900, height=700)
elif which == "w2":
    webview.create_window("W2 纯HTML·有桥接", html=HTML2, js_api=Api(), width=600, height=400)
elif which == "w3":
    webview.create_window("W3 纯HTML·桥接每2秒", html=HTML3, js_api=Api(), width=600, height=400)

webview.start()
