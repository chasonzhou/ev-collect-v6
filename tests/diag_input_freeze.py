#!/usr/bin/env python3
"""诊断：模拟输入一个字母，分阶段检测窗口是否卡死"""
import sys, threading, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import webview
from app.main import Api

LOG = []


def ping(win, tag):
    t0 = time.time()
    try:
        r = win.evaluate_js("1+1")
        LOG.append(f"[{tag}] 主线程响应 ✓ ({time.time()-t0:.2f}s) -> {r}")
        return True
    except Exception as e:
        LOG.append(f"[{tag}] 主线程无响应 ✗ {e}")
        return False


def drive(win):
    time.sleep(1.5)  # 等 React 挂载

    win.evaluate_js("""
      window.__errs = [];
      window.onerror = (m) => window.__errs.push('err:' + m);
      window.addEventListener('unhandledrejection', (e) => window.__errs.push('rej:' + e.reason));
    """)

    ping(win, "输入前")

    # 向第一个可编辑 input（取证单编号）输入字母 'a'
    win.evaluate_js("""
      (() => {
        const el = [...document.querySelectorAll('input')].find(i => !i.readOnly);
        if (!el) { window.__errs.push('no input found'); return; }
        el.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, 'a');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      })();
    """)

    time.sleep(0.3)   # 防抖尚未触发（800ms）
    ping(win, "输入后0.3s（暂存未触发）")

    time.sleep(2.0)   # 暂存已触发
    ping(win, "输入后2.3s（暂存已触发）")

    errs = win.evaluate_js("window.__errs")
    val = win.evaluate_js("[...document.querySelectorAll('input')].find(i=>!i.readOnly).value")
    LOG.append(f"输入框值: {val!r}")
    LOG.append(f"页面错误: {errs}")
    win.destroy()


api = Api()
win = webview.create_window(
    "诊断", str(Path(__file__).parent.parent / "web" / "dist" / "index.html"),
    js_api=api, width=900, height=700)
win.events.loaded += lambda: threading.Thread(target=drive, args=(win,), daemon=True).start()
webview.start()

print("== 诊断结果 ==")
for line in LOG:
    print(" ", line)
