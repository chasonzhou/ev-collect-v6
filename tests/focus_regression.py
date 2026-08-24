#!/usr/bin/env python3
"""回归测试：连续输入 5 个字符，每次输入后检查焦点仍在输入框内。
复现并防止 "Section 组件内嵌定义导致每敲一字焦点丢失" 的回归。"""
import sys, threading, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import webview
from app.main import Api

RESULT = {}


def drive(win):
    time.sleep(1.8)  # 等 React 挂载 + 初始化

    # 逐字符输入，每次检查焦点
    js = """
    (async () => {
      const el = [...document.querySelectorAll('input')].find(i => !i.readOnly);
      if (!el) return { ok: false, error: 'no input' };
      el.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const log = [];
      let text = '';
      for (const ch of ['2', '0', '2', '6', '年']) {
        text += ch;
        setter.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 150));  // 等 React 重渲染
        const focused = document.activeElement === el;
        log.push(ch + ':' + (focused ? 'focus✓' : 'FOCUS LOST✗'));
        if (!focused) break;
      }
      return { ok: document.activeElement === el && el.value === text,
               log, value: el.value,
               active: document.activeElement.tagName };
    })()
    """
    # evaluate_js 不支持 Promise 返回，用回调方式
    win.evaluate_js(f"window.__focusResult = null; ({js}).then(r => window.__focusResult = r);")
    for _ in range(30):
        time.sleep(0.3)
        r = win.evaluate_js("window.__focusResult")
        if r:
            RESULT.update(r if isinstance(r, dict) else {"raw": r})
            break
    win.destroy()


api = Api()
win = webview.create_window(
    "焦点回归测试", str(Path(__file__).parent.parent / "web" / "dist" / "index.html"),
    js_api=api, width=900, height=700)
win.events.loaded += lambda: threading.Thread(target=drive, args=(win,), daemon=True).start()
webview.start()

print("== 焦点回归测试 ==")
print("  逐字符:", RESULT.get("log"))
print("  最终值:", RESULT.get("value"), "| 焦点元素:", RESULT.get("active"))
assert RESULT.get("ok"), f"焦点丢失或值错误: {RESULT}"
print("通过 ✓ —— 连续输入后焦点保持在输入框内")
