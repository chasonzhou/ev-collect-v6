# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller 打包配置
- macOS: pyinstaller 审计取证单生成器.spec → dist/审计取证单生成器.app
- Windows: pyinstaller 审计取证单生成器.spec → dist/审计取证单生成器.exe
"""

a = Analysis(
    ['qzdd_generator.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('经济责任审计取证单.docx', '.'),
        ('ref/公司机构排序简称发文代字表.xlsx', 'ref'),
    ],
    hiddenimports=[],
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
    a.binaries,
    a.datas,
    [],
    name='审计取证单生成器',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,      # GUI 模式（无终端窗口）
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

app = BUNDLE(
    coll,
    name='审计取证单生成器.app',
    icon=None,
    bundle_identifier=None,
    info_plist={
        'NSHighResolutionCapable': 'True',
    },
)
