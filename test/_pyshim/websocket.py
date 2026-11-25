"""Bản thay thế tối giản cho thư viện websocket-client (chỉ dùng khi máy không cài được gói đó).
Hỗ trợ đúng phần các bài kiểm thử dùng: create_connection(url, timeout, cookie), send, recv, settimeout, close."""
import socket,os,base64,struct,urllib.parse
class WebSocketTimeoutException(Exception):pass
class WebSocketConnectionClosedException(Exception):pass
class _WS:
    def __init__(self,sock):self.sock=sock;self.buf=b''
    def settimeout(self,t):self.sock.settimeout(t)
    def gettimeout(self):return self.sock.gettimeout()
    def _read(self,n):
        while len(self.buf)<n:
            try:d=self.sock.recv(65536)
            except socket.timeout as e:raise WebSocketTimeoutException('timed out') from e
            if not d:raise WebSocketConnectionClosedException('closed')
            self.buf+=d
        out,self.buf=self.buf[:n],self.buf[n:];return out
    def _frame(self,op,data):
        mask=os.urandom(4);n=len(data);h=bytes([0x80|op])
        h+=bytes([0x80|n]) if n<126 else bytes([0x80|126])+struct.pack('>H',n) if n<65536 else bytes([0x80|127])+struct.pack('>Q',n)
        self.sock.sendall(h+mask+bytes(b^mask[i%4] for i,b in enumerate(data)))
    def send(self,s):self._frame(1,s.encode('utf-8') if isinstance(s,str) else s)
    def recv(self):
        msg=b''
        while True:
            b1,b2=self._read(2);op=b1&15;n=b2&127
            if n==126:n=struct.unpack('>H',self._read(2))[0]
            elif n==127:n=struct.unpack('>Q',self._read(8))[0]
            mk=self._read(4) if b2&128 else None;data=self._read(n)
            if mk:data=bytes(b^mk[i%4] for i,b in enumerate(data))
            if op==9:self._frame(10,data);continue
            if op==10:continue
            if op==8:raise WebSocketConnectionClosedException('closed')
            msg+=data
            if b1&0x80:return msg.decode('utf-8')
    def close(self):
        try:self._frame(8,b'\x03\xe8')
        except Exception:pass
        try:self.sock.close()
        except Exception:pass
def create_connection(url,timeout=None,cookie=None,header=None,**_):
    u=urllib.parse.urlparse(url);port=u.port or 80
    s=socket.create_connection((u.hostname,port),timeout=timeout)
    key=base64.b64encode(os.urandom(16)).decode()
    req=f'GET {u.path or "/"}{"?"+u.query if u.query else ""} HTTP/1.1\r\nHost: {u.hostname}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n'
    if cookie:req+=f'Cookie: {cookie}\r\n'
    for h in header or []:req+=h+'\r\n'
    s.sendall((req+'\r\n').encode());resp=b''
    while b'\r\n\r\n' not in resp:
        d=s.recv(4096)
        if not d:raise WebSocketConnectionClosedException('handshake failed')
        resp+=d
    head,rest=resp.split(b'\r\n\r\n',1)
    if b' 101 ' not in head.split(b'\r\n')[0]:raise Exception('handshake failed: '+head.split(b'\r\n')[0].decode())
    w=_WS(s);w.buf=rest;return w
