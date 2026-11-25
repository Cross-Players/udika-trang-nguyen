#!/bin/sh
# ĐẨY NHÁNH udika-v15 LÊN GITHUB TỪ MÁY CỦA BẠN (dùng khi Claude không có quyền ghi vào kho – lỗi 403).
# Cần: git, quyền ghi vào kho Cross-Players/udika-trang-nguyen (đăng nhập GitHub trên máy của bạn như bình thường).
# Dùng:  sh day_len_github.sh  <đường dẫn tới udika-v15.bundle>  [thư mục kho, mặc định ./udika-trang-nguyen]
# An toàn: chỉ tạo/cập nhật nhánh udika-v15 (không đụng nhánh main, không ép ghi đè --force). Sau đó mở Pull Request trên GitHub.
set -e
BUNDLE="${1:-udika-v15.bundle}"; DIR="${2:-udika-trang-nguyen}"; REPO="https://github.com/Cross-Players/udika-trang-nguyen.git"
[ -f "$BUNDLE" ] || { echo "Không thấy tệp $BUNDLE"; exit 1; }
BUNDLE="$(cd "$(dirname "$BUNDLE")" && pwd)/$(basename "$BUNDLE")"
if [ ! -d "$DIR/.git" ]; then echo "Tải kho về $DIR …"; git clone "$REPO" "$DIR"; fi
cd "$DIR"
git fetch origin
echo "Kiểm tra gói…"; git bundle verify "$BUNDLE"
git fetch "$BUNDLE" "refs/heads/udika-v15:refs/remotes/goi/udika-v15"
if git show-ref --verify --quiet refs/heads/udika-v15; then
  git checkout udika-v15
  git merge --ff-only goi/udika-v15 || { echo "Nhánh udika-v15 trên máy bạn có thay đổi khác – không tự trộn. Xem: git log udika-v15 goi/udika-v15"; exit 1; }
else
  git checkout -b udika-v15 goi/udika-v15
fi
git push -u origin udika-v15
echo; echo "XONG. Mở Pull Request: https://github.com/Cross-Players/udika-trang-nguyen/compare/main...udika-v15"
