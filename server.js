const http = require('http');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are a gold trading assistant for a retail trader using this strategy:
- Assets: XAUUSD (primary), XAGUSD, US500, NAS100
- Timeframes: Daily (bias) then 1H (confirm levels) then 15m (entry trigger)
- Entry conditions all 3 must fire on 15m: Bollinger Bands (10) at extreme, RSI (14) at extreme turning, MACD (12,26,9) pink crosses blue
- No trade if RSI 42-58 mid range
- Stop loss just beyond swing high/low around 10-12pts gold ATR adjusted
- TP1 middle Bollinger Band close half move SL to entry
- TP2 outer Bollinger Band reassess trail if strong
- Risk 5% per trade max 2 simultaneous trades
- Account around 2000 USD leverage 1:100 on Swissquote MT5
- 75% fundamentals 25% technical approach
- Never trade against major news. Check Forex Factory every morning.
Keep answers short, clear and practical. No jargon. Plain English only.`;

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
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: SYSTEM,
          messages: [{ role: 'user', content: userMsg }]
        })
      });

      const data = await response.json();
      const reply = data.content && data.content[0] ? data.content[0].text : 'Sorry, could not get a response.';
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
