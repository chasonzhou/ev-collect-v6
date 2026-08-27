@echo off
chcp 65001 >nul
REM ============================================
REM  审计取证单生成器 - Windows 一键打包脚本
REM  前置条件：本机已安装 Python 3.10+
REM  （web\dist 已存在时无需 Node.js，自动跳过前端构建）
REM ============================================
setlocal
cd /d "%~dp0"

if exist web\dist\index.html (
    echo [1/4] 检测到前端已构建，跳过 npm 步骤
) else (
    echo [1/4] 构建前端（需要 Node.js）...
    cd web
    call npm ci || goto :err
    call npm run build || goto :err
    cd ..
)

echo [2/4] 准备 Python 环境...
if not exist venv (
    python -m venv venv || goto :err
)
call venv\Scripts\activate.bat || goto :err
pip install -r requirements.txt pyinstaller || goto :err

echo [3/4] PyInstaller 打包...
pyinstaller --noconfirm 打包-windows.spec || goto :err

echo [4/4] 完成！
echo.
echo 产物目录: dist\审计取证单生成器\
echo 把整个文件夹（或压缩后）发给同事即可，双击 审计取证单生成器.exe 运行。
echo 生成的取证单保存在 exe 同级的 output\ 文件夹。
goto :eof

:err
echo.
echo 打包失败，请检查上方错误信息。
exit /b 1
