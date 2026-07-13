import https from 'https';
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
  try {
    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    }
    return new HttpsProxyAgent(proxyUrl);
  } catch (e) {
    console.error('[custom-history] Proxy agent error:', e.message);
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
    const userCookies = parsedBody.cookie || parsedBody.cookies;
    const proxyUrl = parsedBody.proxy;

    if (!userCookies) {
      return res.status(400).json({ error: 'Cookie string is required' });
    }

    const agent = getAgent(proxyUrl);
    if (proxyUrl) {
      console.log(`[custom-history] Using proxy: ${proxyUrl.replace(/:[^:@]+@/, ':***@')}`);
    }

    const response = await makeRequest('https://like.vn/history/orders', {
      headers: {
        'Cookie': userCookies,
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://like.vn/'
      },
      agent
    });

    const html = await response.text();
    const orders = parseOrdersHtml(html);

    if (orders.length === 0) {
      if (html.includes('<title>Đăng nhập') || html.includes('name="username"') || html.includes('/login')) {
        return res.status(401).json({ error: 'Cookie không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật Cookie trong mục Cấu hình!' });
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

    return res.status(200).json(orders);
  } catch (err) {
    return res.status(500).json({ error: `Lỗi máy chủ proxy: ${err.message}` });
  }
}
