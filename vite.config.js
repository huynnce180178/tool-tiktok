import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import url from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// HTML parsing function to scrape the order rows
function parseOrdersHtml(html) {
  const tableMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tableMatch) return [];

  const tbodyContent = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const parsedOrders = [];
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tbodyContent)) !== null) {
    const rowHtml = rowMatch[1];
    
    // 1. Database ID
    const dbIdMatch = rowHtml.match(/<td class="d-none">([\s\S]*?)<\/td>/i);
    const dbId = dbIdMatch ? dbIdMatch[1].trim() : '';

    // 2. Order Code (Mã đơn)
    const orderIdMatch = rowHtml.match(/class="font-bold text-sm">([\s\S]*?)<\/span>/i);
    const orderId = orderIdMatch ? orderIdMatch[1].trim() : '';

    // 3. Status (Trạng thái)
    const statusMatch = rowHtml.match(/class="badge badge-[^"]*">([\s\S]*?)<\/span>/i) ||
                        rowHtml.match(/class="status-order-custom">[^<]*<span[^>]*>([\s\S]*?)<\/span>/i);
    const status = statusMatch ? statusMatch[1].replace(/<[^>]*>/g, '').trim() : 'Không rõ';

    // 4. Dates
    const createdAtMatch = rowHtml.match(/Tạo đơn:\s*([0-9\-\s:]+)/i);
    const createdAt = createdAtMatch ? createdAtMatch[1].trim() : '';
    const updatedAtMatch = rowHtml.match(/Cập nhật gần nhất:[\s\S]*?([0-9\-\s:]+)/i);
    const updatedAt = updatedAtMatch ? updatedAtMatch[1].trim() : '';

    // 5. Service Name
    const serviceNameMatch = rowHtml.match(/class="text-sm">([\s\S]*?)<\/span>/i);
    let serviceName = serviceNameMatch ? serviceNameMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

    // 6. Link
    const linkMatch = rowHtml.match(/href="([^"]*)"[^>]*class="d-flex"/i) || 
                      rowHtml.match(/href="([^"]*)"/i); // fallback
    const link = linkMatch ? linkMatch[1].trim() : '';

    // 7. Payment (Tổng thanh toán)
    const paymentMatch = rowHtml.match(/Tổng thanh toán:[\s\S]*?class="text-blue">([\s\S]*?)<\/span>/i) ||
                         rowHtml.match(/Tổng thanh toán:[\s\S]*?>([\s\S]*?)<\/span>/i);
    const charge = paymentMatch ? paymentMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '0';

    // 8. Progress (Số lượng, Bắt đầu, Đã chạy)
    const qtyMatch = rowHtml.match(/Số lượng<\/span>:\s*([0-9]+)/i);
    const quantity = qtyMatch ? qtyMatch[1].trim() : '0';
    
    const startMatch = rowHtml.match(/Bắt đầu<\/span>:\s*([0-9]+)/i);
    const startCount = startMatch ? startMatch[1].trim() : '0';

    const progressMatch = rowHtml.match(/Đã\s*chạy<\/span>:\s*([0-9]+)/i) || 
                          rowHtml.match(/Còn\s*lại<\/span>:\s*([0-9]+)/i);
    const runCount = progressMatch ? progressMatch[1].trim() : '0';

    parsedOrders.push({
      dbId,
      orderId,
      status,
      createdAt,
      updatedAt,
      serviceName,
      link,
      charge,
      quantity,
      startCount,
      runCount
    });
  }

  return parsedOrders;
}

function getAgent(proxyUrl) {
  if (!proxyUrl) return undefined;
  let formattedUrl = proxyUrl.trim();
  
  // Convert ip:port:user:pass to http://user:pass@ip:port
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
    console.error('[vite-proxy] Proxy agent error:', e.message);
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

// Place order via the actual like.vn web API (same request the browser sends after 120s countdown)
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

  if (response.status === 403) {
    return {
      status: 403,
      data: { error: 'Không thể kết nối (403 Cloudflare Blocked). Vui lòng cấu hình Proxy trong phần Cấu hình để vượt qua tường lửa!' }
    };
  }

  const text = await response.text();
  try { return { status: response.status, data: JSON.parse(text) }; }
  catch(e) { return { status: response.status, data: { error: text.slice(0, 300) } }; }
}

// Custom Vite server plugin to handle the scraped history
const historyProxyPlugin = () => ({
  name: 'history-proxy',
  configureServer(server) {
    // --- Endpoint: API v2 Proxy ---
    server.middlewares.use('/api/v2', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const proxyUrl = parsed.proxy;

            const forwardBody = { ...parsed };
            delete forwardBody.proxy;

            const agent = getAgent(proxyUrl);
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
              res.writeHead(response.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errorMsg, details: data }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Lỗi máy chủ proxy: ${err.message}` }));
          }
        });
      } else {
        next();
      }
    });

    // --- Endpoint: Place order via cookie ---
    server.middlewares.use('/api/custom-order', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { cookie, serviceId, link, quantity, apiToken, proxy } = parsed;
            if (!cookie || !serviceId || !link || !quantity) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields: cookie, serviceId, link, quantity' }));
              return;
            }
            console.log(`[custom-order] Placing order: service=${serviceId}, qty=${quantity}, link=${link.slice(0,60)}`);
            const result = await placeOrderViaCookie(cookie, serviceId, link, quantity, apiToken, proxy);
            console.log(`[custom-order] Response status: ${result.status}`, JSON.stringify(result.data).slice(0, 200));
            res.writeHead(result.status < 500 ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.data));
          } catch (err) {
            console.error('[custom-order] Error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });

    server.middlewares.use('/api/custom-history', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            console.log('--- CUSTOM HISTORY PROXY REQUEST ---');
            console.log('Parsed body keys:', Object.keys(parsed));
            
            const userCookies = parsed.cookie || parsed.cookies;
            const proxyUrl = parsed.proxy;
            console.log('User cookies length:', userCookies ? userCookies.length : 0);
            console.log('User Agent header:', req.headers['user-agent']);
            
            if (!userCookies) {
              console.log('Error: Cookie string is empty or undefined!');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cookie string is required' }));
              return;
            }

            const agent = getAgent(proxyUrl);
            const response = await makeRequest('https://like.vn/history/orders', {
              headers: {
                'Cookie': userCookies,
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://like.vn/'
              },
              agent
            });

            console.log('Like.vn Response Status:', response.status);
            const html = await response.text();
            console.log('Like.vn Response Body Snippet:', html.slice(0, 500));
            
            const orders = parseOrdersHtml(html);

            if (orders.length === 0) {
              if (html.includes('<title>Đăng nhập') || html.includes('name="username"') || html.includes('/login')) {
                console.log('Unauthorized: Login page elements detected!');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Cookie không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật Cookie trong mục Cấu hình!' }));
                return;
              }
            }

            if (!response.ok) {
              let errorMsg = `Failed to fetch orders from Like.vn: ${response.status}`;
              if (response.status === 403) {
                errorMsg += ' (Cloudflare Blocked. Vui lòng cấu hình Proxy trong phần Cấu hình để vượt qua tường lửa)';
              }
              throw new Error(errorMsg);
             }

            // Sort logic: Keep "Đang chạy", "Đang xử lý", "Chờ duyệt" on top
            orders.sort((a, b) => {
              const activeStatuses = ['đang chạy', 'đang xử lý', 'chờ duyệt', 'đang chạy...'];
              const isAActive = activeStatuses.includes(a.status.toLowerCase());
              const isBActive = activeStatuses.includes(b.status.toLowerCase());
              
              if (isAActive && !isBActive) return -1;
              if (!isAActive && isBActive) return 1;
              return 0;
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(orders));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Lỗi máy chủ proxy: ${err.message}` }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), historyProxyPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'https://like.vn',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
