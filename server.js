const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 정적 파일(HTML, CSS, JS, MP3 등) 폴더 지정
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'sender.html'));
});

app.get('/terminal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'terminal.html'));
});

// MP3 파일 명시적 라우팅 추가 (중요)
app.get('/alarm.mp3', (req, res) => {
  res.sendFile(path.join(__dirname, 'alarm.mp3'));
});

wss.on('connection', (ws) => {
  console.log('[ONLINE] 새로운 연결됨');

  ws.on('message', (message) => {
    const commandText = message.toString();
    console.log(`[지령 수신]: ${commandText}`);

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(commandText);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 정상 구동 (포트 ${PORT})`);
});
