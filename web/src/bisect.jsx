import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function Box({ title, children }) {
  return (
    <div style={{ margin: "18px 0", padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #ddd" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Bisect() {
  const [v2, setV2] = useState("");
  const [v3, setV3] = useState("");
  const [v4, setV4] = useState("");
  const [v5, setV5] = useState("");

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, background: "#f3f5f7", minHeight: "100vh" }}>
      <h2>React 模式二分：请逐格打字（中文+英文）</h2>

      <Box title="格子1：React 非受控输入（无 state）">
        <input className={inputCls} placeholder="打字…" />
      </Box>

      <Box title="格子2：React 受控输入（useState，无样式）">
        <input value={v2} onChange={(e) => setV2(e.target.value)} placeholder="打字…" />
      </Box>

      <Box title="格子3：受控 + Tailwind 样式（与正式界面一致）">
        <input className={inputCls} value={v3} onChange={(e) => setV3(e.target.value)} placeholder="打字…" />
      </Box>

      <Box title="格子4：受控 + 联动只读预览框（模拟页眉编号预览）">
        <input className={inputCls} value={v4} onChange={(e) => setV4(e.target.value)} placeholder="打字…" />
        <input readOnly className={inputCls} style={{ marginTop: 6, background: "#f8f8f8" }}
               value={v4 ? `编号：SJ2026-经责-X-${v4}` : "（填写后自动预览）"} />
      </Box>

      <Box title="格子5：受控 textarea（模拟摘要框）">
        <textarea className={inputCls} rows={4} value={v5} onChange={(e) => setV5(e.target.value)} placeholder="打字…" />
      </Box>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Bisect />);
