const { WebSocketServer } = require('ws');

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[server] WebSocket 服务已启动 → ws://localhost:${PORT}`);

// ===== 五人五面 · 专属剧本 =====
const SCRIPTS = {
  zhang: {  // 张总 · 强势型/敏感型 → 渐升至 4 级
    name: '张总',
    entries: [
      { atSec: 3,  emotionLevel: 1, text: '你好，我想了解一下你们的产品方案。' },
      { atSec: 6,  emotionLevel: 2, text: '这个价格比别家贵了不少啊，你们有什么优势？' },
      { atSec: 9,  emotionLevel: 3, text: '你到底有没有搞清楚我的需求？别跟我绕弯子。' },
      { atSec: 12, emotionLevel: 4, text: '叫你们能做主的人来跟我谈！我不想再重复了。', recommendWording: '您说得对，这确实是我考虑不周。我马上为您对接业务总监，请稍等。' },
    ],
  },
  li: {  // 李女士 · 谨慎型/耐心型 → 全程平稳 1-2 级
    name: '李女士',
    entries: [
      { atSec: 3,  emotionLevel: 1, text: '你好，我想咨询一下你们最近的理财业务。' },
      { atSec: 6,  emotionLevel: 1, text: '嗯，你介绍的情况我大致了解了。' },
      { atSec: 9,  emotionLevel: 2, text: '这个条款我之前没注意到，能再详细解释一下吗？' },
      { atSec: 12, emotionLevel: 1, text: '好的，明白了，谢谢你的耐心解答。我先考虑一下。' },
    ],
  },
  wang: {  // 王经理 · 直爽型/高效型 → 微升后迅速回落
    name: '王经理',
    entries: [
      { atSec: 3,  emotionLevel: 1, text: '你好，我是王经理，长话短说。' },
      { atSec: 6,  emotionLevel: 2, text: '你直接说重点，前面的我都不关心。' },
      { atSec: 9,  emotionLevel: 1, text: '行，就这样，你尽快处理，有结果直接打我电话。' },
    ],
  },
  chen: {  // 陈先生 · 敏感型/情绪型 → 快速飙至 5 级
    name: '陈先生',
    entries: [
      { atSec: 3,  emotionLevel: 2, text: '你们这个电话怎么打了好几次才打通？' },
      { atSec: 6,  emotionLevel: 3, text: '上次的问题到现在都没解决，你们到底行不行？' },
      { atSec: 9,  emotionLevel: 4, text: '我不跟你说了，你根本不理解我的意思！给我转投诉部！' },
      { atSec: 12, emotionLevel: 5, text: '叫你们经理出来！我要投诉你们！什么垃圾服务！', recommendWording: '非常抱歉给您带来如此不便，我已为您开通绿色通道加急处理，并同步通知主管亲自跟进，请您给我一个机会为您解决。' },
    ],
  },
  liu: {  // 刘小姐 · 温和型/配合型 → 全程 1 级
    name: '刘小姐',
    entries: [
      { atSec: 3,  emotionLevel: 1, text: '你好，我想了解一下你们最近有什么优惠活动。' },
      { atSec: 6,  emotionLevel: 1, text: '好的，你说的这个我很感兴趣，能再详细说说吗？' },
      { atSec: 9,  emotionLevel: 1, text: '非常感谢你，你的服务态度真好，我就选这个方案吧。' },
    ],
  },
};

// ===== 默认剧本（未知客户 ID 时兜底） =====
const DEFAULT_SCRIPT = {
  name: '未知客户',
  entries: [
    { atSec: 3,  emotionLevel: 1, text: '你好，我想咨询一下业务。' },
    { atSec: 6,  emotionLevel: 3, text: '你们这个服务怎么回事？查个账单这么慢？' },
    { atSec: 9,  emotionLevel: 5, text: '办不了就让你们经理出来！我要投诉你们！', recommendWording: '非常抱歉给您带来不便，我已为您开通绿色通道加急处理...' },
  ],
};

wss.on('connection', (ws, req) => {
  // 从查询参数获取客户 ID，如 ws://localhost:8080?customerId=zhang
  const params = new URL(req.url || '/', `http://${req.headers.host}`).searchParams;
  const customerId = params.get('customerId') || 'zhang';
  const script = SCRIPTS[customerId] || DEFAULT_SCRIPT;

  const clientAddr = req.socket.remoteAddress;
  console.log(`[server] 客户端已连接: ${clientAddr} → 客户: ${script.name} (${customerId})`);

  // 先发送一条客户信息
  ws.send(JSON.stringify({
    type: 'customerInfo',
    customerId,
    customerName: script.name,
  }));

  let scriptIndex = 0;
  let elapsed = 0;

  const timer = setInterval(() => {
    elapsed += 3;

    if (scriptIndex < script.entries.length && elapsed >= script.entries[scriptIndex].atSec) {
      const entry = script.entries[scriptIndex];
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const timestamp = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      const payload = {
        type: 'emotion',
        timestamp,
        emotionLevel: entry.emotionLevel,
        text: entry.text,
        recommendWording: entry.recommendWording || '',
      };

      ws.send(JSON.stringify(payload));
      console.log(`[server] → [${script.name}] level=${entry.emotionLevel} at ${entry.atSec}s | ${entry.text.slice(0, 30)}...`);
      scriptIndex++;
    }

    if (scriptIndex >= script.entries.length) {
      clearInterval(timer);
      console.log(`[server] ✅ [${script.name}] 剧本已播完, 停止推送.`);
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
