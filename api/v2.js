import {
  getAgent,
  getCloudflareHint,
  makeRequest,
  maskProxyUrl,
  resolveProxyUrl,
} from './lib/proxy.js';

export default async function handler(req, res) {
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
    const proxyUrl = resolveProxyUrl(parsedBody.proxy);

    const forwardBody = { ...parsedBody };
    delete forwardBody.proxy;

    const agent = getAgent(proxyUrl);
    if (proxyUrl) {
      console.log(`[v2-proxy] Using proxy: ${maskProxyUrl(proxyUrl)}`);
    } else if (process.env.VERCEL) {
      console.warn('[v2-proxy] No proxy configured on Vercel — Cloudflare may block requests');
    }

    const response = await makeRequest('https://like.vn/api/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      body: JSON.stringify(forwardBody),
      agent,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 300) };
    }

    if (!response.ok) {
      let errorMsg = `Failed to fetch from Like.vn API v2: ${response.status}`;
      if (response.status === 403) {
        errorMsg += getCloudflareHint(proxyUrl);
      }
      return res.status(response.status).json({ error: errorMsg, details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Lỗi máy chủ proxy: ${err.message}` });
  }
}
