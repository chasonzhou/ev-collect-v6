import { useRef, useState } from "react";
import { api } from "./api.js";

/**
 * 附件面板：拖拽/点选添加 → 自动命名 → 可改名/替换/排序/删除
 * props:
 *   attachments: [{id, orig_name, formal_name, size}]
 *   onChange(nextList)  列表变化（改名/排序/删除后）
 *   onAdded(att)        新附件添加成功
 *   onError(msg)
 */
export default function AttachmentPanel({ attachments, onChange, onAdded, onError }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const addInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceTarget = useRef(null);

  const fmtSize = (n) =>
    n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

  const readAsB64 = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("读取文件失败"));
      r.readAsDataURL(file);
    });

  const addFiles = async (fileList) => {
    const files = [...fileList];
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const b64 = await readAsB64(file);
        const res = await api.addAttachment(file.name, b64);
        if (res.ok) {
          onAdded(res.attachment);
        } else {
          onError(res.error || `添加失败：${file.name}`);
        }
      } catch (e) {
        onError(`读取文件失败：${file.name}`);
      }
    }
    setUploading(false);
  };

  const startReplace = (id) => {
    replaceTarget.current = id;
    replaceInputRef.current?.click();
  };

  const doReplace = async (fileList) => {
    const file = fileList?.[0];
    const id = replaceTarget.current;
    if (!file || !id) return;
    try {
      const b64 = await readAsB64(file);
      const res = await api.replaceAttachment(id, file.name, b64);
      if (res.ok) {
        onChange(
          attachments.map((a) =>
            a.id === id ? { ...a, orig_name: res.attachment.orig_name, size: res.attachment.size } : a
          )
        );
      } else {
        onError(res.error || "替换失败");
      }
    } catch {
      onError("读取替换文件失败");
    }
  };

  const remove = async (id) => {
    await api.removeAttachment(id).catch(() => {});
    onChange(attachments.filter((a) => a.id !== id));
  };

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= attachments.length) return;
    const next = [...attachments];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const rename = (id, name) => {
    onChange(attachments.map((a) => (a.id === id ? { ...a, formal_name: name } : a)));
  };

  const btn = "rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100";

  return (
    <div className="space-y-3">
      {/* 拖放区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => addInputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-6 text-center text-sm transition ${
          dragOver
            ? "border-blue-500 bg-blue-50 text-blue-600"
            : "border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400"
        }`}
      >
        {uploading ? "正在读取文件…" : "拖拽 PDF / Word / Excel 等文件到此处，或点击选择文件"}
      </div>

      <input
        ref={addInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          doReplace(e.target.files);
          e.target.value = "";
        }}
      />

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att, i) => (
            <li
              key={att.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <span className="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                附件{i + 1}
              </span>
              <input
                className="min-w-0 flex-1 rounded border border-transparent px-1.5 py-1 text-sm hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                value={att.formal_name}
                onChange={(e) => rename(att.id, e.target.value)}
                title="附件正式名称（可编辑）"
              />
              <span className="max-w-40 shrink-0 truncate text-xs text-slate-400" title={att.orig_name}>
                {att.orig_name} · {fmtSize(att.size)}
              </span>
              <button className={btn} onClick={() => move(i, -1)} disabled={i === 0} title="上移">↑</button>
              <button className={btn} onClick={() => move(i, 1)} disabled={i === attachments.length - 1} title="下移">↓</button>
              <button className={btn} onClick={() => startReplace(att.id)}>替换</button>
              <button
                className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
                onClick={() => remove(att.id)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      {attachments.length > 0 && (
        <p className="text-xs text-slate-400">
          共 {attachments.length} 个附件，将按以上顺序编号并生成到取证单末尾的附件目录
        </p>
      )}
    </div>
  );
}
