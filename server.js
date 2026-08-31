const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// 연결된 단말기 맵 (ID -> res)
const clients = new Map();

// 단말기 SSE 접속 엔드포인트
app.get('/api/terminal', (req, res) => {
  const terminalId = req.query.id ? String(req.query.id).trim() : null;
  
  if (!terminalId) {
    return res.status(400).send("ID Required");
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // 기존 연결이 있다면 정리
  if (clients.has(terminalId)) {
    try { clients.get(terminalId).end(); } catch (e) {}
  }

  // 레지스트리에 저장
  clients.set(terminalId, res);
  console.log(`[ONLINE] 단말기 ${terminalId}번 접속완료 (현재 접속 목록: [ ${Array.from(clients.keys()).join(', ')} ])`);

  // 연결 종료 시 맵에서 제거
  req.on('close', () => {
    if (clients.get(terminalId) === res) {
      clients.delete(terminalId);
      console.log(`[OFFLINE] 단말기 ${terminalId}번 접속해제 (현재 접속 목록: [ ${Array.from(clients.keys()).join(', ')} ])`);
    }
  });
});

// 발신기 지령 전송 API
app.post('/api/command', (req, res) => {
  const target = String(req.body.target || '').trim();
  const command = req.body.command || '';

  console.log(`\n----------------------------------------`);
  console.log(`[발신] TARGET: "${target}" | COMMAND: "${command}"`);
  console.log(`[현재 접속 중인 단말기들]: [ ${Array.from(clients.keys()).join(', ')} ]`);

  if (target === "ALL") {
    let count = 0;
    clients.forEach((clientRes) => {
      clientRes.write(`data: ${JSON.stringify({ target, command })}\n\n`);
      count++;
    });
    console.log(`-> 전체 단말기(${count}개)에 지령 발송 성공`);
    return res.json({ success: true, count });
  }

  const targetClient = clients.get(target);
  if (targetClient) {
    targetClient.write(`data: ${JSON.stringify({ target, command })}\n\n`);
    console.log(`-> ID "${target}" 단말기에 전달 성공!`);
    return res.json({ success: true, delivered: true });
  } else {
    console.log(`-> ID "${target}" 전달 실패! (해당 ID의 단말기가 접속해있지 않음)`);
    return res.json({ success: true, delivered: false, message: "Terminal Offline" });
  }
});

app.listen(3000, () => {
  console.log("========================================");
  console.log("   CITY WILL SERVER ONLINE (PORT 3000)   ");
  console.log("========================================");
});