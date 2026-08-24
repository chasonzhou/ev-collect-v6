# 审计取证单生成器 V6（桌面版）

本地桌面应用：React 网页前端 + Python（pywebview）后端，双击即用，无需联网。

## 功能

- 按模板自动生成《审计（调查）取证单》docx
- 编号自动拼接：`SJ{年度}-{类型}-{简称}-{编号}`，页眉/文件名同步
- 被审计单位输入自动补全，简称（发文代字）自动填充
- 页脚自动带「第X页，共Y页」页码字段
- **附件整理**：拖拽/点选添加附件，自动编号命名，支持改名/替换/排序/删除；
  生成时输出**文件夹**（docx + 附件N-正式名称.原格式），附件目录自动生成在摘要单元格内
- 表单自动暂存（每 60 秒，含附件），下次打开自动恢复
- 「新增下一张」：编号 +1，仅清空事项/摘要/附件
- 用户手册见 `使用说明.md`（打包时会拷入产物目录）

## 目录结构

```
Evi_collect_pro/
├── app/
│   ├── main.py            # pywebview 入口 + JS API 桥接
│   └── backend.py         # 核心逻辑：docx 生成 / 状态 / 参考表
├── web/                   # React 前端（Vite + Tailwind）
│   └── dist/              # 前端构建产物（打包进 app）
├── ref/公司机构排序简称发文代字表.xlsx   # 单位简称参考表
├── 经济责任审计取证单.docx               # 取证单模板
├── output/                # 生成的取证单
├── requirements.txt
├── 打包-windows.spec       # Windows PyInstaller 配置
├── 打包-mac.spec           # macOS PyInstaller 配置
├── build_windows.bat       # Windows 一键打包
└── qzdd_generator.py      # 旧版 Tkinter V5（保留备用）
```

## 开发

```bash
# 1. 前端热更新开发（两个终端）
cd web && npm install && npm run dev     # 终端1：Vite 开发服务器
venv/bin/python app/main.py --dev        # 终端2：桌面窗口加载 dev server

# 2. 生产模式（本地运行完整版）
cd web && npm run build
venv/bin/python app/main.py

# 3. 纯浏览器预览（无后端，mock 数据）
cd web && npm run dev    # 直接开 http://localhost:5173
```

## 打包分发

### Windows（同事使用）

方式一：在任意 Windows 机器上双击 `build_windows.bat`（需预装 Python 3.10+ 和 Node.js 18+）。

方式二：推到 GitHub 后，Actions 页手动运行 `build-windows` 工作流，下载产物 `审计取证单生成器-windows.zip`。

产物 `dist/审计取证单生成器/` 整个文件夹发给同事，双击 `审计取证单生成器.exe` 即可。
首次运行 Windows 可能提示 SmartScreen，选「仍要运行」。

### macOS

```bash
cd web && npm run build
venv/bin/pip install pyinstaller
venv/bin/pyinstaller --noconfirm 打包-mac.spec
# 产物：dist/审计取证单生成器.app
```

## 测试

```bash
venv/bin/python tests/smoke_bridge.py      # 前后端桥接冒烟测试（会弹出一次窗口）
venv/bin/python tests/focus_regression.py  # 焦点保持回归测试（防 React 内嵌组件 bug）
```

## 注意事项

- 模板 `经济责任审计取证单.docx` 表格结构改动后，需同步调整 `app/backend.py` 中的单元格坐标
- 单位简称表更新后重新打包（或替换 exe 同级 `_internal/ref/` 下的 xlsx）
- 旧版 Tkinter 入口 `qzdd_generator.py` 仍可使用，与新版本共用模板和状态文件
