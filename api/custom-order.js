import https from 'https';
import url from 'url';
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
    console.error('[custom-order] Proxy agent error:', e.message);
    return undefined;
  }
}

function makeRequest(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const reqOpts = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path,
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
  });
}

async function placeOrderViaCookie(cookie, serviceId, link, quantity, apiToken, proxyUrl) {
  const isLike = String(serviceId) === '1385';
  const pagePath = isLike ? 'https://like.vn/mua-like-tiktok' : 'https://like.vn/mua-view-tiktok';
  const endpoint = isLike
    ? 'https://like.vn/api/mua-like-tiktok/order'
    : 'https://like.vn/api/mua-view-tiktok/order';
  const serverOrder = isLike ? '4' : '5'; // SV4 for like, SV5 for view

  const agent = getAgent(proxyUrl);

  // Step 1: Fetch the page to extract the real <meta name="csrf-token"> value
  let csrfToken = '';
  try {
    const pageResp = await makeRequest(pagePath, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      agent
    });
    const html = await pageResp.text();
    const metaMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/i);
    if (metaMatch) {
      csrfToken = metaMatch[1];
      console.log(`[custom-order] Extracted CSRF token: ${csrfToken}`);
    } else {
      console.warn('[custom-order] Could not find csrf-token meta tag in page.');
    }
  } catch(e) {
    console.error('[custom-order] Failed to fetch order page for CSRF:', e.message);
  }

  // Step 2: Submit the order
  const formBody = new URLSearchParams({
    objectId: link,
    server_order: serverOrder,
    free: '1',
    amount: String(quantity),
    note: '',
  }).toString();

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    'Cookie': cookie,
    'X-CSRF-Token': csrfToken,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': pagePath,
    'Origin': 'https://like.vn',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };
  if (apiToken) headers['api-token'] = apiToken;

  const response = await makeRequest(endpoint, {
    method: 'POST',
    headers,
    body: formBody,
    agent
  });

  const text = await response.text();
  try { return { status: response.status, data: JSON.parse(text) }; }
  catch(e) { return { status: response.status, data: { error: text.slice(0, 300) } }; }
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
    const { cookie, serviceId, link, quantity, apiToken, proxy } = req.body;
    if (!cookie || !serviceId || !link || !quantity) {
      return res.status(400).json({ error: 'Missing required fields: cookie, serviceId, link, quantity' });
    }

    const result = await placeOrderViaCookie(cookie, serviceId, link, quantity, apiToken, proxy);
    return res.status(result.status < 500 ? 200 : 500).json(result.data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
