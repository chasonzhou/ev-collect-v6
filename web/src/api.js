/**
 * 后端 API 封装。
 * - 桌面模式：window.pywebview.api（pywebview 注入）
 * - 浏览器开发模式：localStorage mock，便于纯前端调试
 */

const isDesktop = () => !!window.pywebview?.api;

// pywebview 的 js_api 在页面加载后异步注入，等待其就绪
export function waitReady() {
  return new Promise((resolve) => {
    if (isDesktop()) return resolve(true);
    const timer = setInterval(() => {
      if (isDesktop()) {
        clearInterval(timer);
        resolve(true);
      }
    }, 50);
    // 3 秒超时 → 判定为浏览器模式
    setTimeout(() => {
      clearInterval(timer);
      resolve(false);
    }, 3000);
  });
}

const MOCK_KEY = "qzdd_mock_state";

// file:// 协议下 WKWebView 禁止 localStorage，降级为内存存储
const memStore = {};
const store = {
  get(k) {
    try { return localStorage.getItem(k); } catch { return memStore[k] ?? null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch { memStore[k] = v; }
  },
};

const mock = {
  _mockAtts: [],
  async get_bootstrap() {
    const saved = store.get(MOCK_KEY);
    return {
      units: {
        四川能源发展集团有限责任公司: "川能发展",
        凉山生态公司: "凉山生态",
        四川水电投资经营有限公司: "四川水电",
      },
      state: saved
        ? JSON.parse(saved)
        : {
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
            year: "2026",
            month: "1",
            day: "1",
            attachments: [],
          },
      audit_types: ["经责", "财务收支", "专项审计", "工程审计", "绩效审计"],
      version: "mock",
    };
  },
  async generate(data) {
    store.set(MOCK_KEY, JSON.stringify(data));
    const base = `SJ${data.audit_year}-${data.audit_type}-${data.unit_abbr}-${data.doc_no}-${data.matter_name || "未命名事项"}`;
    return {
      ok: true,
      path: `/mock/output/${base}/`,
      filename: `${base}.docx`,
      code: `SJ${data.audit_year}-${data.audit_type}-${data.unit_abbr}-${data.doc_no}`,
      attachments: (data.attachments || []).length,
    };
  },
  async save_state(data) {
    store.set(MOCK_KEY, JSON.stringify(data));
    return { ok: true };
  },
  async load_state() {
    const saved = store.get(MOCK_KEY);
    return saved ? JSON.parse(saved) : null;
  },
  async increment_doc_no(current) {
    const s = String(current || "").trim();
    if (/^\d+$/.test(s)) return String(parseInt(s, 10) + 1).padStart(s.length, "0");
    const d = s.replace(/\D/g, "");
    return d ? String(parseInt(d, 10) + 1).padStart(d.length, "0") : "01";
  },
  async add_attachment(filename, data_b64) {
    const att = {
      id: Math.random().toString(16).slice(2, 14),
      orig_name: filename,
      formal_name: filename.replace(/\.[^.]+$/, ""),
      size: Math.floor(data_b64.length * 0.75),
    };
    this._mockAtts.push(att);
    return { ok: true, attachment: att };
  },
  async replace_attachment(att_id, filename, data_b64) {
    return { ok: true, attachment: { id: att_id, orig_name: filename, size: Math.floor(data_b64.length * 0.75) } };
  },
  async remove_attachment(att_id) {
    this._mockAtts = this._mockAtts.filter((a) => a.id !== att_id);
    return { ok: true };
  },
  async clear_attachments() {
    this._mockAtts = [];
    return { ok: true };
  },
  async open_output_dir() {
    return { ok: true, path: "/mock/output" };
  },
};

let desktopMode = false;

export async function initApi() {
  desktopMode = await waitReady();
  return desktopMode;
}

function call(name, ...args) {
  if (desktopMode) return window.pywebview.api[name](...args);
  return mock[name](...args);
}

export const api = {
  getBootstrap: () => call("get_bootstrap"),
  generate: (data) => call("generate", data),
  saveState: (data) => call("save_state", data),
  incrementDocNo: (current) => call("increment_doc_no", current),
  addAttachment: (filename, dataB64) => call("add_attachment", filename, dataB64),
  replaceAttachment: (id, filename, dataB64) => call("replace_attachment", id, filename, dataB64),
  removeAttachment: (id) => call("remove_attachment", id),
  clearAttachments: () => call("clear_attachments"),
  openOutputDir: () => call("open_output_dir"),
  isDesktop: () => desktopMode,
};
