const http = require('http');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are a gold trading assistant for a retail trader. You have access to web search - always search for the latest news before answering questions about market direction or geopolitical developments.

Trading strategy:
- Assets: XAUUSD primary
- Entry: Bollinger Bands (10) at extreme + RSI (14) at extreme turning + MACD (12,26,9) pink crosses blue - all 3 required
- No trade if RSI 42-58 mid range
- Stop loss ATR adjusted around 10-12pts
- TP1 middle Bollinger Band, TP2 outer band
- Risk 5% per trade, account around 2000 USD on Swissquote MT5
- 75% fundamentals 25% technical

When asked about market direction or news: ALWAYS search the web first for today's latest gold market news, geopolitical developments, Fed comments, dollar moves. Then give a clear BULLISH, BEARISH or NEUTRAL verdict with reasoning. Be direct and concise. Plain English only.`;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST' || req.url !== '/chat') { res.writeHead(404); res.end(); return; }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { message, context } = JSON.parse(body);
      const userMsg = context ? 'Current market context:\n' + context + '\n\nTrader question: ' + message : message;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          tools: [{"type": "web_search_20250305", "name": "web_search"}],
          system: SYSTEM,
          messages: [{ role: 'user', content: userMsg }]
        })
      });

      const data = await response.json();
      
      // Extract only text blocks from response
      let reply = '';
      if (data.content) {
        reply = data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n')
          .trim();
      }
      
      if (!reply) reply = 'Could not get a response. Please try again.';
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: 'Error: ' + e.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Gold bot running on port ' + PORT));
