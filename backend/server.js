const { WebSocketServer } = require('ws');

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[server] WebSocket 服务已启动 → ws://localhost:${PORT}`);

// 剧本数据（相对秒数）
const SCRIPT = [
  { atSec: 3,  emotionLevel: 1, text: '你好，我想咨询一下业务。' },
  { atSec: 6,  emotionLevel: 3, text: '你们这个服务怎么回事？查个账单这么慢？' },
  { atSec: 9,  emotionLevel: 5, text: '办不了就让你们经理出来！我要投诉你们！', recommendWording: '非常抱歉给您带来不便，我已为您开通绿色通道加急处理...' },
];

wss.on('connection', (ws, req) => {
  const clientAddr = req.socket.remoteAddress;
  console.log(`[server] 客户端已连接: ${clientAddr}`);

  let scriptIndex = 0;
  let elapsed = 0;

  const timer = setInterval(() => {
    elapsed += 3;

    // 查找当前时间应发送的剧本条目
    if (scriptIndex < SCRIPT.length && elapsed >= SCRIPT[scriptIndex].atSec) {
      const entry = SCRIPT[scriptIndex];
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const payload = {
        timestamp,
        emotionLevel: entry.emotionLevel,
        text: entry.text,
        recommendWording: entry.recommendWording || '',
      };

      ws.send(JSON.stringify(payload));
      console.log(`[server] → 推送: level=${entry.emotionLevel} | ${entry.text}`);

      scriptIndex++;
    }

    // 剧本播完 → 停止定时器
    if (scriptIndex >= SCRIPT.length) {
      clearInterval(timer);
      console.log(`[server] 剧本已播完, 停止推送. 等待客户端断开...`);
    }
  }, 3000);

  ws.on('close', () => {
    clearInterval(timer);
    console.log(`[server] 客户端已断开: ${clientAddr}`);
  });

  ws.on('error', () => {
    clearInterval(timer);
  });
});
