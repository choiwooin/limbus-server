const express = require('express');
const http = require('http');
const path = require('path');
const app = express();

app.use(express.json());
// 현재 폴더의 모든 HTML/JS 파일 정적 접근 허용
app.use(express.static(__dirname));

// 연결된 웹소켓/SSE 클라이언트 맵 (ID -> res)
const clients = new Map();

// 1. 기본 주소( / )로 들어오면 자동으로 sender.html을 보여줌
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'sender.html'));
});

// 2. /sender.html 주소 직접 접근 허용
app.get('/sender.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'sender.html'));
});

// 3. /terminal.html 주소 직접 접근 허용
app.get('/terminal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'terminal.html'));
});

// 단말기 SSE 접속 엔드포인트
app.get('/api/terminal', (req, res) => {
  const terminalId = req.query.id ? String(req.query.id).trim() : '1';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (clients.has(terminalId)) {
    try { clients.get(terminalId).end(); } catch (e) {}
  }

  clients.set(terminalId, res);
  console.log(`[ONLINE] 단말기 ${terminalId}번 접속완료`);

  req.on('close', () => {
    if (clients.get(terminalId) === res) {
      clients.delete(terminalId);
      console.log(`[OFFLINE] 단말기 ${terminalId}번 접속해제`);
    }
  });
});

// 발신기 지령 전송 API
app.post('/api/command', (req, res) => {
  const target = String(req.body.target || '').trim();
  const command = req.body.command || '';

  if (target === "ALL") {
    clients.forEach((clientRes) => {
      clientRes.write(`data: ${JSON.stringify({ target, command })}\n\n`);
    });
    return res.json({ success: true });
  }

  const targetClient = clients.get(target);
  if (targetClient) {
    targetClient.write(`data: ${JSON.stringify({ target, command })}\n\n`);
    return res.json({ success: true, delivered: true });
  } else {
    return res.json({ success: true, delivered: false, message: "Terminal Offline" });
  }
});

// Render 등 클라우드 환경용 PORT 자동 인식 설정
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CITY WILL SERVER ONLINE (PORT ${PORT})`);
});
