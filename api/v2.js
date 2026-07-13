import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

function getAgent(proxyUrl) {
  if (!proxyUrl) return undefined;
  try {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    console.error('[v2-proxy] Proxy agent error:', e.message);
    return undefined;
  }
}

function makeRequest(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(targetUrl);
      const reqOpts = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        agent: options.agent,
        timeout: 15000,
      };

      const req = https.request(reqOpts, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            text: async () => body,
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsedBody = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const proxyUrl = parsedBody.proxy;
    
    // Create a copy and remove proxy from the forward body
    const forwardBody = { ...parsedBody };
    delete forwardBody.proxy;

    const agent = getAgent(proxyUrl);
    if (proxyUrl) {
      console.log(`[v2-proxy] Using proxy: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);
    }

    const response = await makeRequest('https://like.vn/api/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      body: JSON.stringify(forwardBody),
      agent
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { error: text.slice(0, 300) };
    }

    if (!response.ok) {
      let errorMsg = `Failed to fetch from Like.vn API v2: ${response.status}`;
      if (response.status === 403) {
        errorMsg += ' (Cloudflare Blocked. Vui lòng cấu hình Proxy trong phần Cấu hình để khắc phục)';
      }
      return res.status(response.status).json({ error: errorMsg, details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Lỗi máy chủ proxy: ${err.message}` });
  }
}
