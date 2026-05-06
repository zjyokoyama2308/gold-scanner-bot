const http = require('http');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM = `You are a gold trading assistant for a retail trader. Search the web for latest news when asked about market direction or geopolitical developments. Give clear BULLISH, BEARISH or NEUTRAL verdict. Be concise and direct. Plain English only. No jargon.

Strategy context: XAUUSD, 15m chart, BB+RSI+MACD entry, 5% risk, Swissquote MT5, $2000 account.`;

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
      const userMsg = context ? 'Market context: ' + context + '\n\nQuestion: ' + message : message;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05'
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
      console.log('Response status:', response.status);
      if (data.error) console.log('API error:', JSON.stringify(data.error));
      
      let reply = '';
      if (data.content) {
        reply = data.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n')
          .trim();
      }
      
      if (!reply) reply = 'Error: ' + JSON.stringify(data.error || 'No response');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      console.log('Catch error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: 'Server error: ' + e.message }));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Gold bot running on port ' + PORT));
