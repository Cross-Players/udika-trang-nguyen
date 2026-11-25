@echo off
chcp 65001 >nul
REM DAY NHANH udika-v15 LEN GITHUB TU MAY WINDOWS CUA BAN (khi Claude bi loi 403).
REM Dung: day_len_github.bat  duong\dan\udika-v15.bundle  [thu muc kho]
REM An toan: chi tao/cap nhat nhanh udika-v15, khong dung nhanh main, khong --force.
setlocal
set "BUNDLE=%~f1"
if "%BUNDLE%"=="" set "BUNDLE=%cd%\udika-v15.bundle"
set "DIR=%~2"
if "%DIR%"=="" set "DIR=udika-trang-nguyen"
if not exist "%BUNDLE%" ( echo Khong thay tep %BUNDLE% & exit /b 1 )
if not exist "%DIR%\.git" git clone https://github.com/Cross-Players/udika-trang-nguyen.git "%DIR%" || exit /b 1
cd /d "%DIR%"
git fetch origin || exit /b 1
git bundle verify "%BUNDLE%" || exit /b 1
git fetch "%BUNDLE%" "refs/heads/udika-v15:refs/remotes/goi/udika-v15" || exit /b 1
git show-ref --verify --quiet refs/heads/udika-v15
if errorlevel 1 ( git checkout -b udika-v15 goi/udika-v15 ) else ( git checkout udika-v15 && git merge --ff-only goi/udika-v15 ) || exit /b 1
git push -u origin udika-v15 || exit /b 1
echo.
echo XONG. Mo Pull Request: https://github.com/Cross-Players/udika-trang-nguyen/compare/main...udika-v15
