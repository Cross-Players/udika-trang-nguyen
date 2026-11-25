#!/usr/bin/env bash
# Thử tải cụm: 1 bộ định tuyến khởi chạy W tiến trình server.js + (R−1) bộ định tuyến phụ; K tiến trình kiểm thử chạy song song,
# mỗi tiến trình lo một nhóm phòng. Ví dụ (≈50.000 kết nối): W=3 R=6 bash test/load-cluster.sh "6000,6000,6000" "6000,6000,6000" "6000,6000,2000"
set -u
cd "$(dirname "$0")/.."
W=${W:-3}; R=${R:-6}; BASE=${BASE:-19200}; Q=${Q:-3}
DIR=$(mktemp -d); export ADMIN_PASSWORD=load-admin-password-strong SESSION_SECRET=load-session-secret-must-be-long-enough DATA_FILE=$DIR/rooms.json
TOTAL=0; for g in "$@"; do for n in ${g//,/ }; do TOTAL=$((TOTAL+n)); done; done
export MAX_ONLINE=$((TOTAL+1000)) MAX_PLAYERS=6100 MAX_ROOMS=300
PORT=$BASE LOCAL_WORKERS=$W WORKER_BASE_PORT=$((BASE+100)) node router.js > $DIR/r0.log 2>&1 & R0=$!
NODES=$(for i in $(seq 0 $((W-1))); do printf "http://127.0.0.1:%d," $((BASE+100+i)); done); NODES=${NODES%,}
PORTS=$BASE; for i in $(seq 1 $((R-1))); do PORT=$((BASE+i)) NODES=$NODES node router.js > $DIR/r$i.log 2>&1 & PORTS="$PORTS,$((BASE+i))"; done
for i in $(seq 1 100); do curl -sf http://127.0.0.1:$BASE/health >/dev/null && break; sleep 0.2; done
sleep 1; SPIDS=$(pgrep -f "router.js" | tr '\n' ','),$(pgrep -P $R0 | tr '\n' ','); SPIDS=${SPIDS//,,/,}; SPIDS=${SPIDS%,}
echo "== Cụm: $W tiến trình server.js, $R bộ định tuyến (cổng $PORTS) · $# tiến trình kiểm thử · tổng $TOTAL kết nối · máy thử $(nproc) nhân, $(free -g | awk '/Mem/{print $2}') GB RAM =="
k=0; PIDS=""; for g in "$@"; do k=$((k+1)); EXT_PORTS=$PORTS SERVER_PIDS=$SPIDS TAG="g$k-" OUT=$DIR/out$k.txt node test/load-multi.js "$g" $Q > $DIR/client$k.log 2>&1 & PIDS="$PIDS $!"; done
FAIL=0; for p in $PIDS; do wait $p || FAIL=1; done
k=0; for g in "$@"; do k=$((k+1)); echo "--- Nhóm $k ($g) ---"; cat $DIR/out$k.txt; done
echo "RAM tổng các tiến trình máy chủ cuối bài: $(ps -o rss= -p $SPIDS | awk '{s+=$1} END {printf "%d MB", s/1024}')"
kill $(pgrep -f "router.js") 2>/dev/null; sleep 2; pkill -P $R0 2>/dev/null; rm -rf $DIR
exit $FAIL
