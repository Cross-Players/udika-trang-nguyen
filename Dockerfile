# UDIKA Khoa Bảng V15 – chạy bộ định tuyến router.js + nhiều tiến trình server.js (mỗi nhân CPU một tiến trình)
FROM node:22.12.0-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_FILE=/app/data/rooms.json MEDIA_DIR=/app/data/media
COPY package.json package-lock.json* ./
# Có package-lock.json thì cài ĐÚNG phiên bản đã khoá (npm ci); chưa có thì cài theo package.json (pg ghim cứng 8.16.3)
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force
# R1: MỌI tệp máy chủ đọc lúc chạy phải có ở đây (test/test-release-v15.js ca DONG_GOI tự kiểm)
COPY server.js router.js importer.js pay.js events.js questions.json practice_sample.json ./
COPY public ./public
RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1
# LOCAL_WORKERS mặc định = số nhân CPU; đặt LOCAL_WORKERS=1 để chạy một tiến trình
CMD ["node", "router.js"]
