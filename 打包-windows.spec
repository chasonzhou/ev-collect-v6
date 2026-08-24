# -*- mode: python ; coding: utf-8 -*-
"""
Windows 打包配置（在 Windows 机器或 GitHub Actions 上执行）：
  pyinstaller 打包-windows.spec
产物：dist/审计取证单生成器/审计取证单生成器.exe
"""

a = Analysis(
    ['app/main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('经济责任审计取证单.docx', '.'),
        ('ref/公司机构排序简称发文代字表.xlsx', 'ref'),
        ('web/dist', 'web/dist'),
    ],
    hiddenimports=[
        'webview.platforms.winforms',
        'webview.platforms.edgechromium',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='审计取证单生成器',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,      # GUI 模式（无黑窗口）
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='审计取证单生成器',
)
