import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, initApi } from "./api.js";
import AttachmentPanel from "./Attachments.jsx";

const EMPTY_FORM = {
  doc_no: "",
  audit_year: "",
  audit_type: "经责",
  unit_abbr: "",
  project_name: "",
  unit_name: "",
  matter_name: "",
  summary: "",
  auditor1: "",
  auditor2: "",
  year: "",
  month: "",
  day: "",
};

// 诊断开关：file:///…/index.html?noac=1 关闭自动补全下拉框
const NO_AC = new URLSearchParams(window.location.search).has("noac");

// 全局统一的标签列宽：按最长标签「审计（调查）事项摘要：」定为 11rem
// 所有区块共用 → 全部输入框左边线对齐
const GRID_1 = "grid grid-cols-[11rem_1fr] items-center gap-x-3 gap-y-3";
const GRID_2 = "grid grid-cols-[11rem_1fr_8rem_1fr] items-center gap-x-3 gap-y-3";
const LABEL = "text-right text-sm text-slate-600 whitespace-nowrap";
const INPUT =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

function todayParts() {
  const t = new Date();
  return { year: String(t.getFullYear()), month: String(t.getMonth() + 1), day: String(t.getDate()) };
}

// 组件必须定义在 App 外部：定义在内部会导致每次渲染都生成新组件类型，
// React 会销毁重建整个子树，输入框每敲一个字就丢失焦点
function Section({ title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <header className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700">
        {title}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState([]);
  const [units, setUnits] = useState({}); // {全称: 简称}
  const [auditTypes, setAuditTypes] = useState(["经责"]);
  const [status, setStatus] = useState("正在初始化…");
  const [ready, setReady] = useState(false);
  const [generated, setGenerated] = useState(false); // 控制"新增下一张"显示
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // 生成成功弹窗
  const [errors, setErrors] = useState([]); // 校验错误弹窗
  const skipAutosave = useRef(true);

  // ── 初始化 ──
  useEffect(() => {
    (async () => {
      try {
        const desktop = await initApi();
        const boot = await api.getBootstrap();
        setUnits(boot.units || {});
        setAuditTypes(boot.audit_types || ["经责"]);
        const { attachments: atts, ...fields } = boot.state || {};
        setForm({ ...EMPTY_FORM, ...todayParts(), ...fields });
        setAttachments(Array.isArray(atts) ? atts : []);
        setStatus(desktop ? "已恢复上次保存的内容" : "浏览器预览模式（数据仅存于浏览器）");
      } catch (e) {
        setStatus(`初始化异常：${e?.message || e}（数据不会持久化）`);
      } finally {
        setReady(true);
        // 初始化完成后再允许自动保存
        setTimeout(() => (skipAutosave.current = false), 300);
      }
    })();
  }, []);

  // ── 自动暂存：每 60 秒一次，仅在有改动时 ──
  const formRef = useRef(form);
  const attRef = useRef(attachments);
  const dirtyRef = useRef(false);

  useEffect(() => {
    formRef.current = form;
    attRef.current = attachments;
    if (ready && !skipAutosave.current) dirtyRef.current = true;
  }, [form, attachments, ready]);

  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        api.saveState({ ...formRef.current, attachments: attRef.current })
          .then(() => setStatus("已自动暂存 ✓"))
          .catch(() => {});
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [ready]);

  const set = useCallback((key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ── 页眉编号预览 ──
  const headerCode = useMemo(() => {
    const { audit_year: y, audit_type: t, unit_abbr: a, doc_no: n } = form;
    if (y && t && a && n) return `SJ${y}-${t}-${a}-${n}`;
    if (y || t || a || n) return null; // 部分填写
    return undefined; // 全空
  }, [form.audit_year, form.audit_type, form.unit_abbr, form.doc_no]);

  // ── 单位自动补全 ──
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(0);
  const matches = useMemo(() => {
    const text = form.unit_name.trim();
    if (!text) return [];
    return Object.entries(units).filter(([full]) => full.includes(text)).slice(0, 8);
  }, [form.unit_name, units]);

  const applyUnit = useCallback((full, abbr) => {
    setForm((f) => ({ ...f, unit_name: full, unit_abbr: abbr }));
    setAcOpen(false);
  }, []);

  const onUnitChange = (value) => {
    setForm((f) => {
      const next = { ...f, unit_name: value };
      // 精准匹配 → 自动填简称
      if (units[value.trim()]) next.unit_abbr = units[value.trim()];
      return next;
    });
    setAcOpen(true);
    setAcIndex(0);
  };

  const onUnitKeyDown = (e) => {
    if (!acOpen || matches.length === 0) {
      if (e.key === "Escape") setAcOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAcIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAcIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const [full, abbr] = matches[acIndex];
      applyUnit(full, abbr);
    } else if (e.key === "Escape") {
      setAcOpen(false);
    }
  };

  // ── 附件 ──
  const onAttachmentAdded = useCallback((att) => {
    setAttachments((list) => [...list, att]);
  }, []);

  const onAttachmentError = useCallback((msg) => {
    setErrors([msg]);
  }, []);

  // ── 操作 ──
  const doGenerate = async () => {
    if (busy) return;
    setBusy(true);
    setStatus("正在生成…");
    try {
      const res = await api.generate({ ...form, attachments });
      if (res.ok) {
        setGenerated(true);
        setResult(res);
        setStatus(`已生成: ${res.filename}`);
      } else {
        setErrors(res.errors || ["生成失败"]);
        setStatus("生成失败");
      }
    } catch (e) {
      setErrors([`生成异常：${e?.message || e}`]);
      setStatus("生成失败");
    } finally {
      setBusy(false);
    }
  };

  const doSave = async () => {
    await api.saveState({ ...form, attachments });
    dirtyRef.current = false;
    setStatus("已暂存 ✓");
  };

  const doClear = async () => {
    setForm({ ...EMPTY_FORM, ...todayParts() });
    setAttachments([]);
    await api.clearAttachments().catch(() => {});
    setGenerated(false);
    setAcOpen(false);
    setStatus("已清空");
  };

  const doClearMatters = () => {
    setForm((f) => ({ ...f, matter_name: "", summary: "" }));
    setStatus("已清空审计事项和摘要");
  };

  const doNewNext = async () => {
    const next = await api.incrementDocNo(form.doc_no);
    setForm((f) => ({ ...f, doc_no: next, matter_name: "", summary: "" }));
    // 附件属于当前取证单，新增下一张时清空
    setAttachments([]);
    await api.clearAttachments().catch(() => {});
    setStatus(`已准备下一张: ${next}（附件已清空）`);
  };

  const openOutput = async () => {
    await api.openOutputDir();
  };

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">正在加载…</div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 主体 */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-5">
          <h1 className="mb-4 text-xl font-bold text-slate-800">审计（调查）取证单 生成器</h1>

          <div className="space-y-4">
            {/* ═══ 编号信息 ═══ */}
            <Section title="编号信息">
              <div className={GRID_2}>
                <label className={LABEL}>取证单编号：</label>
                <input className={INPUT} value={form.doc_no}
                       onChange={(e) => set("doc_no", e.target.value)} placeholder="如 01" />

                <label className={LABEL}>审计项目类型：</label>
                <select className={INPUT} value={form.audit_type}
                        onChange={(e) => set("audit_type", e.target.value)}>
                  {auditTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <label className={LABEL}>审计项目计划年度：</label>
                <div className="flex items-center gap-2">
                  <input className={INPUT} value={form.audit_year}
                         onChange={(e) => set("audit_year", e.target.value)} placeholder="2026" />
                  <span className="shrink-0 text-sm text-slate-400">年</span>
                </div>

                <label className={LABEL}>被审计单位简称：</label>
                <input className={INPUT} value={form.unit_abbr}
                       onChange={(e) => set("unit_abbr", e.target.value)} placeholder="自动填充" />

                <label className={LABEL}>页眉编号预览：</label>
                <input
                  readOnly
                  className="col-span-3 w-full cursor-text select-all rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-sm text-slate-700"
                  value={
                    headerCode === undefined
                      ? "（填写后自动预览）"
                      : headerCode === null
                        ? "（部分信息未填）"
                        : `编号：${headerCode}`
                  }
                />
              </div>
            </Section>

            {/* ═══ 项目信息 ═══ */}
            <Section title="项目信息">
              <div className={GRID_1}>
                {/* 被审计单位 + 自动补全 */}
                <label className={LABEL}>被审计（调查）单位：</label>
                <div className="relative">
                  <input
                    className={INPUT}
                    value={form.unit_name}
                    onChange={(e) => onUnitChange(e.target.value)}
                    onKeyDown={onUnitKeyDown}
                    onFocus={() => setAcOpen(true)}
                    onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                    placeholder="输入关键字自动匹配…"
                  />
                  {!NO_AC && acOpen && matches.length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                      {matches.map(([full, abbr], i) => (
                        <li
                          key={full}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            applyUnit(full, abbr);
                          }}
                          onMouseEnter={() => setAcIndex(i)}
                          className={`cursor-pointer px-3 py-1.5 text-sm ${
                            i === acIndex ? "bg-blue-50 text-blue-700" : "text-slate-700"
                          }`}
                        >
                          {full}
                          <span className="ml-2 text-xs text-slate-400">（{abbr}）</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <label className={LABEL}>项目名称：</label>
                <input className={INPUT} value={form.project_name}
                       onChange={(e) => set("project_name", e.target.value)} />

                <label className={LABEL}>审计（调查）事项：</label>
                <input className={INPUT} value={form.matter_name}
                       onChange={(e) => set("matter_name", e.target.value)} />

                <label className={`${LABEL} self-start pt-1.5`}>审计（调查）事项摘要：</label>
                <textarea
                  className={`${INPUT} min-h-48 resize-y leading-relaxed`}
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />

                <span />
                <div className="flex justify-end">
                  <button
                    onClick={doClearMatters}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
                  >
                    清空审计事项和摘要
                  </button>
                </div>
              </div>
            </Section>

            {/* ═══ 附件 ═══ */}
            <Section title="附件（可选）">
              <div className={GRID_1}>
                <label className={`${LABEL} self-start pt-1.5`}>取证单附件：</label>
                <AttachmentPanel
                  attachments={attachments}
                  onChange={setAttachments}
                  onAdded={onAttachmentAdded}
                  onError={onAttachmentError}
                />
              </div>
            </Section>

            {/* ═══ 审计人员 ═══ */}
            <Section title="审计人员">
              <div className={GRID_2}>
                <label className={LABEL}>审计人员1：</label>
                <input className={INPUT} value={form.auditor1}
                       onChange={(e) => set("auditor1", e.target.value)} />

                <label className={LABEL}>审计人员2：</label>
                <input className={INPUT} value={form.auditor2}
                       onChange={(e) => set("auditor2", e.target.value)} />
              </div>
            </Section>

            {/* ═══ 编制日期 ═══ */}
            <Section title="编制日期">
              <div className={GRID_1}>
                <label className={LABEL}>日期：</label>
                <div className="flex items-center gap-2">
                  <input className={`${INPUT} max-w-24`} value={form.year}
                         onChange={(e) => set("year", e.target.value)} />
                  <span className="text-sm text-slate-600">年</span>
                  <input className={`${INPUT} max-w-16`} value={form.month}
                         onChange={(e) => set("month", e.target.value)} />
                  <span className="text-sm text-slate-600">月</span>
                  <input className={`${INPUT} max-w-16`} value={form.day}
                         onChange={(e) => set("day", e.target.value)} />
                  <span className="text-sm text-slate-600">日</span>
                  <button
                    onClick={() => setForm((f) => ({ ...f, ...todayParts() }))}
                    className="ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    今天
                  </button>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>

      {/* 底部按钮栏 */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-3">
          {generated && (
            <button
              onClick={doNewNext}
              className="rounded-md border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              新增下一张 ▶
            </button>
          )}
          <div className="flex-1" />
          <button onClick={doClear}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            清空
          </button>
          <button onClick={doSave}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            暂存
          </button>
          <button
            onClick={doGenerate}
            disabled={busy}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "生成中…" : "生成取证单 ▶"}
          </button>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-1.5 text-xs text-slate-500">
          {status}
        </div>
      </footer>

      {/* 成功弹窗 */}
      {result && (
        <Modal onClose={() => setResult(null)}>
          <div className="mb-2 text-base font-semibold text-emerald-700">✓ 取证单已生成</div>
          <p className="mb-1 break-all text-sm text-slate-600">{result.path}</p>
          <p className="mb-4 text-sm text-slate-400">
            {result.attachments > 0
              ? `含 ${result.attachments} 个附件；取证单末尾已生成附件目录。`
              : "可点击「新增下一张」继续添加。"}
          </p>
          <div className="flex justify-end gap-2">
            {api.isDesktop() && (
              <button
                onClick={() => {
                  openOutput();
                  setResult(null);
                }}
                className="rounded-md border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                打开输出文件夹
              </button>
            )}
            <button
              onClick={() => setResult(null)}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              好的
            </button>
          </div>
        </Modal>
      )}

      {/* 错误弹窗 */}
      {errors.length > 0 && (
        <Modal onClose={() => setErrors([])}>
          <div className="mb-2 text-base font-semibold text-amber-700">请完善以下信息</div>
          <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-slate-600">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <div className="flex justify-end">
            <button
              onClick={() => setErrors([])}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              知道了
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
