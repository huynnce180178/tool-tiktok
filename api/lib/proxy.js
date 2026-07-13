import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export function resolveProxyUrl(clientProxy) {
  const fromClient = (clientProxy || '').trim();
  const fromEnv = (process.env.LIKE_VN_PROXY || '').trim();
  return fromClient || fromEnv || '';
}

export function maskProxyUrl(proxyUrl) {
  if (!proxyUrl) return '';
  return proxyUrl.replace(/:[^:@]+@/, ':***@');
}

export function getProxySource(clientProxy) {
  if ((clientProxy || '').trim()) return 'client';
  if ((process.env.LIKE_VN_PROXY || '').trim()) return 'env';
  return 'none';
}

export function getCloudflareHint(proxyUrl) {
  if (proxyUrl) {
    return ' (Cloudflare Blocked. Proxy hiện tại có thể không hoạt động hoặc bị Like.vn chặn.)';
  }
  if (process.env.VERCEL) {
    return ' (Cloudflare Blocked. Thêm LIKE_VN_PROXY trên Vercel Dashboard HOẶC nhập Proxy trong tab Cấu hình.)';
  }
  return ' (Cloudflare Blocked. Vui lòng cấu hình Proxy trong phần Cấu hình để vượt qua tường lửa)';
}

export function getAgent(proxyUrl) {
  if (!proxyUrl) return undefined;
  let formattedUrl = proxyUrl.trim();

  const parts = formattedUrl.split(':');
  if (parts.length === 4) {
    const [ip, port, user, pass] = parts;
    if (!ip.includes('/') && !ip.includes('http') && !ip.includes('socks')) {
      formattedUrl = `http://${user}:${pass}@${ip}:${port}`;
    }
  } else if (!formattedUrl.includes('://')) {
    formattedUrl = `http://${formattedUrl}`;
  }

  try {
    if (formattedUrl.startsWith('socks')) {
      return new SocksProxyAgent(formattedUrl);
    }
    return new HttpsProxyAgent(formattedUrl);
  } catch (e) {
    console.error('[proxy] Agent error:', e.message);
    return undefined;
  }
}

export function makeRequest(targetUrl, options = {}) {
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

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) req.write(options.body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}
