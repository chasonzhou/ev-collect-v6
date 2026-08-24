#!/usr/bin/env python3
"""诊断2：用 macOS System Events 发送真实键盘按键，复现输入卡死"""
import subprocess, sys, threading, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import webview
from app.main import Api

LOG = []


def ping(win, tag):
    t0 = time.time()
    try:
        r = win.evaluate_js("1+1")
        LOG.append(f"[{tag}] 主线程响应 ✓ ({time.time()-t0:.2f}s)")
        return True
    except Exception as e:
        LOG.append(f"[{tag}] 主线程无响应 ✗ {e}")
        return False


def drive(win):
    time.sleep(1.5)

    win.evaluate_js("""
      window.__errs = [];
      window.onerror = (m) => window.__errs.push('err:' + m);
      window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej:' + e.reason));
      window.__keys = [];
      document.addEventListener('keydown', (e) => window.__keys.push('down:' + e.key));
      document.addEventListener('keyup', (e) => window.__keys.push('up:' + e.key));
      // 聚焦第一个可编辑输入框
      const el = [...document.querySelectorAll('input')].find(i => !i.readOnly);
      el.focus();
      window.__focused = document.activeElement.tagName + '/' + (document.activeElement.readOnly ? 'ro' : 'rw');
    """)

    ping(win, "按键前")

    # 真实键盘输入（经由 macOS 事件系统，等同用户敲键盘）
    subprocess.run(["osascript", "-e",
                    'tell application "System Events" to keystroke "a"'],
                   capture_output=True, timeout=10)

    time.sleep(0.5)
    ping(win, "按键后0.5s")
    time.sleep(2.0)
    ping(win, "按键后2.5s")

    LOG.append(f"焦点元素: {win.evaluate_js('window.__focused')}")
    LOG.append(f"键事件: {win.evaluate_js('window.__keys')}")
    js_val = "[...document.querySelectorAll('input')].find(i=>!i.readOnly).value"
    LOG.append(f"输入框值: {win.evaluate_js(js_val)!r}")
    LOG.append(f"页面错误: {win.evaluate_js('window.__errs')}")
    win.destroy()


api = Api()
win = webview.create_window(
    "诊断2", str(Path(__file__).parent.parent / "web" / "dist" / "index.html"),
    js_api=api, width=900, height=700)
win.events.loaded += lambda: threading.Thread(target=drive, args=(win,), daemon=True).start()
webview.start()

print("== 诊断结果 ==")
for line in LOG:
    print(" ", line)
