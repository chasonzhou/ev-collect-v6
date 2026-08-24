#!/usr/bin/env python3
"""自动化冒烟测试：启动窗口 → JS 调用 Python API → 校验结果 → 退出"""
import sys, threading, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import webview
from app.main import Api

RESULTS = {}


def check(win):
    js = """
    (async () => {
      const out = {};
      try {
        const boot = await window.pywebview.api.get_bootstrap();
        out.units = Object.keys(boot.units).length;
        out.doc_no = boot.state.doc_no;
        out.types = boot.audit_types.length;
        const inc = await window.pywebview.api.increment_doc_no("02");
        out.inc = inc;
        out.vue_ready = !!document.querySelector('#root').children.length;
        out.title = document.querySelector('h1')?.textContent || '';
        out.ok = true;
      } catch (e) {
        out.ok = false; out.error = String(e);
      }
      window.__test_out = out;
    })();
    """
    win.evaluate_js(js)
    for _ in range(40):
        time.sleep(0.25)
        r = win.evaluate_js("window.__test_out || null")
        if r:
            RESULTS.update(r)
            break
    win.destroy()


api = Api()
win = webview.create_window("冒烟测试", str(Path(__file__).parent.parent / "web" / "dist" / "index.html"),
                            js_api=api, width=900, height=700)
win.events.loaded += lambda: threading.Thread(target=check, args=(win,), daemon=True).start()
webview.start()

print("== 冒烟测试结果 ==")
for k, v in RESULTS.items():
    print(f"  {k}: {v}")
assert RESULTS.get("ok"), RESULTS
assert RESULTS["units"] >= 30
assert RESULTS["inc"] == "03"
assert RESULTS["vue_ready"]
assert "取证单" in RESULTS["title"]
print("冒烟测试通过 ✓")
