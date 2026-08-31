const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(__dirname));

// 기본 라우팅 설정
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'sender.html'));
});

app.get('/terminal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'terminal.html'));
});

// 웹소켓 실시간 연결 처리
wss.on('connection', (ws) => {
  console.log('[ONLINE] 새로운 단말기/발신기 연결됨');

  ws.on('message', (message) => {
    const commandText = message.toString();
    console.log(`[PRESCRIPT RECEIVE]: ${commandText}`);

    // 접속된 모든 터미널로 실시간 메시지 전파
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(commandText);
      }
    });
  });
});

// Render 포트 수신
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`CITY WILL SERVER ONLINE (PORT ${PORT})`);
});
