import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';
import url from 'url';
import fs from 'fs';
import path from 'path';

// HTML parsing function to extract logged in username
function parseUsername(html) {
  // Approach 1: general div with style="font-size: 17px"
  const generalMatch = html.match(/<div[^>]*style="font-size:\s*17px[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (generalMatch) {
    const name = generalMatch[1].replace(/<[^>]*>/g, '').trim();
    if (name && name !== 'Bạn chưa đăng nhập') {
      return name;
    }
  }

  // Approach 2: dropdown user menu p tag
  const userHeaderMatch = html.match(/<li[^>]*class="user-header"[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  if (userHeaderMatch) {
    const text = userHeaderMatch[1].replace(/<[^>]*>/g, '').trim();
    const firstLine = text.split('\n')[0].trim();
    if (firstLine && firstLine !== 'Bạn chưa đăng nhập') {
      return firstLine;
    }
  }
  
  return '';
}

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
async function placeOrderViaCookie(cookie, serviceId, link, quantity, apiToken) {
  const isLike = String(serviceId) === '1385';
  const pagePath = isLike ? 'https://like.vn/mua-like-tiktok' : 'https://like.vn/mua-view-tiktok';
  const endpoint = isLike
    ? 'https://like.vn/api/mua-like-tiktok/order'
    : 'https://like.vn/api/mua-view-tiktok/order';
  const serverOrder = isLike ? '4' : '5'; // SV4 for like, SV5 for view

  // Step 1: Fetch the page to extract the real <meta name="csrf-token"> value
  let csrfToken = '';
  try {
    const pageResp = await makeRequest(pagePath, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
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
    body: formBody
  });

  if (response.status === 403) {
    return {
      status: 403,
      data: { error: 'Không thể kết nối (403 Cloudflare Blocked). IP máy tính của bạn bị Like.vn chặn.' }
    };
  }

  const text = await response.text();
  try { return { status: response.status, data: JSON.parse(text) }; }
  catch(e) { return { status: response.status, data: { error: text.slice(0, 300) } }; }
}

const SESSION_FILE = path.join(process.cwd(), 'bot-session.json');
const LINK_FILE = path.join(process.cwd(), 'tiktok_link.txt');
const DEFAULT_LINK = 'https://www.tiktok.com/@learnlab.vn/video/7661165953190825230';

const AUTO_CHECK_INTERVAL_SECONDS = 420;
const ORDER_CREATION_WAIT = 120;

let botState = {
  isAutoRunning: false,
  links: [],
  currentLinkIndex: 0,
  cookieString: '',
  autoTimeWindow: '6h',
  apiKey: '',
  autoPhase: 'checking', // 'checking' | 'creating'
  countdown: 0,
  creationCountdown: 0,
  logs: [],
  scanCount: 0,
  likeOrderCount: 0,
  viewOrderCount: 0,
  nextType: 'view',
  typesToCreate: [],
  startTime: null,
  autoCheckInterval: AUTO_CHECK_INTERVAL_SECONDS,
};

let botInterval = null;
let isRunningCheck = false;

function addBotLog(text) {
  const time = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  botState.logs.push({ time, text });
  console.log(`[BOT LOG] [${time}] ${text}`);
  if (botState.logs.length > 500) {
    botState.logs.shift();
  }
  saveSession();
}

function saveSession() {
  try {
    const dataToSave = {
      isAutoRunning: botState.isAutoRunning,
      links: botState.links,
      currentLinkIndex: botState.currentLinkIndex,
      cookieString: botState.cookieString,
      autoTimeWindow: botState.autoTimeWindow,
      apiKey: botState.apiKey,
      autoPhase: botState.autoPhase,
      countdown: botState.countdown,
      creationCountdown: botState.creationCountdown,
      logs: botState.logs,
      scanCount: botState.scanCount,
      likeOrderCount: botState.likeOrderCount,
      viewOrderCount: botState.viewOrderCount,
      nextType: botState.nextType,
      typesToCreate: botState.typesToCreate || [],
      startTime: botState.startTime,
      autoCheckInterval: botState.autoCheckInterval,
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
  } catch (err) {
    console.error('[BOT] Failed to save session:', err.message);
  }
}


async function runAutoCheck() {
  if (isRunningCheck) return;
  if (botState.autoPhase === 'creating') return;

  isRunningCheck = true;
  try {
    const activeLink = botState.links[botState.currentLinkIndex];
    if (!activeLink || !activeLink.url) {
      addBotLog('Lỗi Auto: Hàng đợi rỗng hoặc không tìm thấy Link hoạt động!');
      stopBot();
      return;
    }
    if (!botState.cookieString) {
      addBotLog('Lỗi Auto: Chưa có Cookies!');
      stopBot();
      return;
    }

    botState.scanCount += 1;
    addBotLog(`Bắt đầu quét (Lần ${botState.scanCount}): ${activeLink.url}`);
    addBotLog('Đang đồng bộ hóa lịch sử đơn hàng từ Like.vn...');

    const response = await makeRequest('https://like.vn/history/orders', {
      headers: {
        'Cookie': botState.cookieString,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://like.vn/'
      }
    });

    if (!response.ok) {
      let errorMsg = `Failed to fetch orders from Like.vn: ${response.status}`;
      if (response.status === 403) {
        errorMsg += ' (Cloudflare Blocked. IP của bạn bị Like.vn chặn)';
      }
      throw new Error(errorMsg);
    }

    const html = await response.text();
    const orders = parseOrdersHtml(html);

    if (orders.length === 0) {
      if (html.includes('<title>Đăng nhập') || html.includes('name="username"') || html.includes('/login')) {
        addBotLog('Lỗi: Cookie không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật Cookie trong mục Cấu hình!');
        stopBot();
        return;
      }
    }

    addBotLog('Đồng bộ thành công! Quét đơn TikTok đang chạy...');

    const activeStatuses = ['đang chạy', 'đang xử lý', 'chờ duyệt', 'đang chạy...', 'pending', 'processing', 'in progress'];
    let isLikeActive = false;
    let isViewActive = false;

    orders.forEach(o => {
      const isCurrentLink = o.link && o.link.toLowerCase().includes(activeLink.url.toLowerCase().trim());
      const isActive = activeStatuses.includes(o.status.toLowerCase());
      if (isCurrentLink && isActive) {
        const nameLower = o.serviceName.toLowerCase();
        if (nameLower.includes('like') || nameLower.includes('tim') || nameLower.includes('heart')) {
          isLikeActive = true;
          addBotLog(`  -> Đơn Like đang chạy: #${o.orderId} | ${o.serviceName} | ${o.status}`);
        } else if (nameLower.includes('view') || nameLower.includes('xem')) {
          isViewActive = true;
          addBotLog(`  -> Đơn View đang chạy: #${o.orderId} | ${o.serviceName} | ${o.status}`);
        }
      }
    });

    const mode = activeLink.mode || 'all';
    let needsLike = false;
    let needsView = false;

    if (mode === 'all' || mode === 'all_like_first') {
      needsLike = !isLikeActive;
      needsView = !isViewActive;
    } else if (mode === 'like') {
      needsLike = !isLikeActive;
    } else if (mode === 'view') {
      needsView = !isViewActive;
    }

    if (needsLike || needsView) {
      botState.typesToCreate = [];
      if (needsLike && needsView) {
        if (mode === 'all_like_first') {
          botState.typesToCreate = ['like', 'view'];
        } else {
          botState.typesToCreate = ['view', 'like'];
        }
      } else {
        if (needsLike) botState.typesToCreate.push('like');
        if (needsView) botState.typesToCreate.push('view');
      }

      botState.autoPhase = 'creating';
      botState.creationCountdown = ORDER_CREATION_WAIT;
      const typesText = botState.typesToCreate.map(t => t === 'like' ? 'Like (SV4)' : 'View (SV5)').join(' và ');
      addBotLog(`Không có đủ đơn đang chạy cho link này (Cần thêm: ${typesText}). Bắt đầu tạo đơn...`);
      addBotLog(`Chuẩn bị tạo đơn: ${typesText}. Đếm ngược ${ORDER_CREATION_WAIT}s (like.vn yêu cầu đợi)...`);
    } else {
      addBotLog(`Đơn đã chạy đủ/đang hoạt động cho link này. Đợi ${botState.autoCheckInterval}s kiểm tra lại...`);
      botState.countdown = botState.autoCheckInterval;
    }
  } catch (err) {
    addBotLog(`Lỗi đồng bộ/quét: ${err.message}`);
    botState.countdown = botState.autoCheckInterval;
  } finally {
    isRunningCheck = false;
    saveSession();
  }
}

async function executeOrderCreation() {
  const activeLink = botState.links[botState.currentLinkIndex];
  if (!activeLink || !activeLink.url) {
    addBotLog('Lỗi Auto: Hàng đợi rỗng hoặc không tìm thấy Link hoạt động!');
    stopBot();
    return;
  }

  const types = botState.typesToCreate || [];
  if (types.length === 0) {
    addBotLog('Không có loại đơn nào cần tạo.');
    botState.autoPhase = 'checking';
    botState.countdown = 0;
    saveSession();
    return;
  }

  addBotLog(`Hết đếm ngược. Bắt đầu gửi yêu cầu tạo đơn cho link #${botState.currentLinkIndex + 1}...`);
  
  const link = activeLink.url;
  const mode = activeLink.mode || 'all';

  for (const type of types) {
    addBotLog(`Loại đơn: ${type === 'like' ? 'Like (SV4)' : 'View (SV5)'}`);
    
    if (type === 'like') {
      addBotLog('Đang tạo đơn Like miễn phí (SV4)...');
      try {
        const res = await placeOrderViaCookie(botState.cookieString, '1385', link, 10, botState.apiKey);
        if (res && res.status === 200 && res.data && res.data.status === 'success') {
          addBotLog(`TẠO ĐƠN LIKE THÀNH CÔNG! ${res.data.message || ''}`);
          botState.likeOrderCount += 1;
          activeLink.currentOrders = (activeLink.currentOrders || 0) + 1;
          
          if (mode === 'all' || mode === 'all_view_first' || mode === 'all_like_first') {
            botState.nextType = 'view';
          } else if (mode === 'view') {
            botState.nextType = 'view';
          } else {
            botState.nextType = 'like';
          }
        } else {
          const errMsg = res?.data?.message || res?.data?.error || JSON.stringify(res?.data).slice(0, 100);
          addBotLog(`Thất bại tạo đơn Like: ${errMsg}`);
        }
      } catch (e) {
        addBotLog(`Thất bại tạo đơn Like: ${e.message}`);
      }
    } else {
      addBotLog('Đang tạo đơn View miễn phí (SV5)...');
      try {
        const res = await placeOrderViaCookie(botState.cookieString, '8559', link, 100, botState.apiKey);
        if (res && res.status === 200 && res.data && res.data.status === 'success') {
          addBotLog(`TẠO ĐƠN VIEW THÀNH CÔNG! ${res.data.message || ''}`);
          botState.viewOrderCount += 1;
          activeLink.currentOrders = (activeLink.currentOrders || 0) + 1;
          
          if (mode === 'all' || mode === 'all_view_first' || mode === 'all_like_first') {
            botState.nextType = 'like';
          } else if (mode === 'like') {
            botState.nextType = 'like';
          } else {
            botState.nextType = 'view';
          }
        } else {
          const errMsg = res?.data?.message || res?.data?.error || JSON.stringify(res?.data).slice(0, 100);
          addBotLog(`Thất bại tạo đơn View: ${errMsg}`);
        }
      } catch (e) {
        addBotLog(`Thất bại tạo đơn View: ${e.message}`);
      }
    }

    // Add a tiny delay between requests if there are multiple types to create
    if (types.length > 1 && type === types[0]) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Clear types to create
  botState.typesToCreate = [];

  // Check if current active link completed its target
  let transitionCompleted = false;
  if (activeLink.currentOrders >= activeLink.targetOrders) {
    addBotLog(`[HÀNG ĐỢI] Đã hoàn thành mục tiêu ${activeLink.targetOrders} đơn cho link #${botState.currentLinkIndex + 1}: ${activeLink.url}`);
    activeLink.status = 'completed';
    
    // Find next pending link
    let foundNext = false;
    for (let i = botState.currentLinkIndex + 1; i < botState.links.length; i++) {
      if (botState.links[i].status !== 'completed') {
        botState.currentLinkIndex = i;
        botState.links[i].status = 'running';
        
        // Configure initial nextType for the next link
        const nextLink = botState.links[i];
        const nextMode = nextLink.mode || 'all';
        if (nextMode === 'like') {
          botState.nextType = 'like';
        } else if (nextMode === 'view') {
          botState.nextType = 'view';
        } else if (nextMode === 'all_like_first') {
          botState.nextType = 'like';
        } else {
          botState.nextType = 'view';
        }
        
        addBotLog(`[HÀNG ĐỢI] Chuyển sang chạy link tiếp theo (#${i + 1}): ${nextLink.url} (Chế độ: ${nextMode})`);
        foundNext = true;
        transitionCompleted = true;
        break;
      }
    }
    
    if (!foundNext) {
      addBotLog('[HÀNG ĐỢI] Đã hoàn thành toàn bộ các link trong hàng đợi. Tự động dừng bot.');
      stopBot();
      return;
    }
  }

  if (botState.isAutoRunning) {
    botState.autoPhase = 'checking';
    if (transitionCompleted) {
      botState.countdown = 0; // Check the next link immediately!
    } else {
      botState.countdown = botState.autoCheckInterval;
      addBotLog(`Hoàn tất đợt tạo đơn. Chờ ${botState.autoCheckInterval}s để quét kiểm tra lại...`);
    }
  }
  saveSession();
}

function setupBotInterval() {
  if (botInterval) clearInterval(botInterval);
  
  botInterval = setInterval(() => {
    if (!botState.isAutoRunning) {
      clearInterval(botInterval);
      botInterval = null;
      return;
    }

    if (botState.autoPhase === 'checking') {
      if (botState.countdown <= 0) {
        botState.countdown = botState.autoCheckInterval;
        runAutoCheck();
      } else {
        botState.countdown -= 1;
        if (botState.countdown % 10 === 0) saveSession();
      }
    } else if (botState.autoPhase === 'creating') {
      if (botState.creationCountdown <= 0) {
        botState.creationCountdown = ORDER_CREATION_WAIT;
        executeOrderCreation();
      } else {
        botState.creationCountdown -= 1;
        if (botState.creationCountdown % 5 === 0) saveSession();
      }
    }
  }, 1000);
}

function startBot(config) {
  // Sync target links to configuration file
  try {
    const linksList = Array.isArray(config.autoLinks) ? config.autoLinks : [];
    const urlsText = linksList.map(l => l.url).filter(Boolean).join('\n') || DEFAULT_LINK;
    fs.writeFileSync(LINK_FILE, urlsText, 'utf8');
  } catch (err) {
    console.error('[BOT] Failed to write links file:', err.message);
  }

  // Load cookies and api key
  botState.cookieString = config.cookieString;
  botState.autoTimeWindow = config.autoTimeWindow || '6h';
  botState.apiKey = config.apiKey || '';
  botState.autoCheckInterval = typeof config.autoCheckInterval === 'number' ? config.autoCheckInterval : AUTO_CHECK_INTERVAL_SECONDS;
  
  // Set links queue
  const incomingLinks = Array.isArray(config.autoLinks) ? config.autoLinks : [];
  botState.links = incomingLinks.map((link, idx) => ({
    id: link.id || `link_${idx}_${Date.now()}`,
    url: link.url,
    targetOrders: typeof link.targetOrders === 'number' ? link.targetOrders : 4,
    currentOrders: 0, // Reset run count when manual start is clicked
    mode: link.mode || 'all',
    status: idx === 0 ? 'running' : 'pending' // First link runs first
  }));
  botState.currentLinkIndex = 0;

  botState.isAutoRunning = true;
  botState.startTime = Date.now();
  botState.autoPhase = 'checking';
  botState.countdown = 0; // Check immediately
  botState.creationCountdown = 0;
  botState.logs = [];
  botState.scanCount = 0;
  botState.likeOrderCount = 0;
  botState.viewOrderCount = 0;
  
  // Configure initial nextType for the first link
  const activeLink = botState.links[0];
  const firstMode = activeLink ? (activeLink.mode || 'all') : 'all';
  if (firstMode === 'like') {
    botState.nextType = 'like';
  } else if (firstMode === 'view') {
    botState.nextType = 'view';
  } else if (firstMode === 'all_like_first') {
    botState.nextType = 'like';
  } else {
    botState.nextType = 'view';
  }
  
  isRunningCheck = false;

  const modeText = activeLink ? (firstMode === 'like' ? 'Chỉ chạy đơn Like' : firstMode === 'view' ? 'Chỉ chạy đơn View' : firstMode === 'all_like_first' ? '1 đơn Like + 1 đơn View' : '1 đơn View + 1 đơn Like') : '1 đơn View + 1 đơn Like';
  addBotLog(`Khởi chạy chế độ tự động cho ${botState.links.length} link video.`);
  if (activeLink) {
    addBotLog(`Link đang chạy (#1): ${activeLink.url} (Chế độ: ${modeText}, Chỉ tiêu: ${activeLink.targetOrders} đơn)`);
  }
  addBotLog(`Cấu hình mốc kiểm tra: ${botState.autoTimeWindow === 'all' ? 'Toàn thời gian' : `Trong vòng ${botState.autoTimeWindow}`}`);
  addBotLog('Quét đợt đầu tiên ngay bây giờ...');

  setupBotInterval();
  saveSession();
}


function stopBot() {
  botState.isAutoRunning = false;
  botState.startTime = null;
  botState.autoPhase = 'checking';
  botState.countdown = 0;
  botState.creationCountdown = 0;
  isRunningCheck = false;
  
  if (botInterval) {
    clearInterval(botInterval);
    botInterval = null;
  }
  
  addBotLog('Đã dừng chế độ tự động.');
  saveSession();
}

// Read/Create link file and load session
function initBotRunner() {
  // 1. Read or Create LINK_FILE
  let fileLinks = [];
  try {
    if (!fs.existsSync(LINK_FILE)) {
      fs.writeFileSync(LINK_FILE, DEFAULT_LINK, 'utf8');
      console.log(`[BOT] Created default link file: ${LINK_FILE}`);
    }
    const fileContent = fs.readFileSync(LINK_FILE, 'utf8').trim();
    fileLinks = fileContent.split('\n').map(l => l.trim()).filter(Boolean);
    console.log(`[BOT] Target TikTok Links loaded from file: ${fileLinks.length} urls`);
  } catch (err) {
    console.error('[BOT] Error reading link file:', err.message);
    fileLinks = [DEFAULT_LINK];
  }

  // 2. Load Session from bot-session.json
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const content = fs.readFileSync(SESSION_FILE, 'utf8');
      const saved = JSON.parse(content);
      
      botState.cookieString = saved.cookieString || '';
      botState.apiKey = saved.apiKey || '';
      botState.autoTimeWindow = saved.autoTimeWindow || '6h';
      botState.autoPhase = saved.autoPhase || 'checking';
      botState.countdown = typeof saved.countdown === 'number' ? saved.countdown : 0;
      botState.creationCountdown = typeof saved.creationCountdown === 'number' ? saved.creationCountdown : 0;
      botState.logs = Array.isArray(saved.logs) ? saved.logs : [];
      botState.scanCount = typeof saved.scanCount === 'number' ? saved.scanCount : 0;
      botState.likeOrderCount = typeof saved.likeOrderCount === 'number' ? saved.likeOrderCount : 0;
      botState.viewOrderCount = typeof saved.viewOrderCount === 'number' ? saved.viewOrderCount : 0;
      botState.nextType = saved.nextType || 'view';
      botState.typesToCreate = Array.isArray(saved.typesToCreate) ? saved.typesToCreate : [];
      botState.isAutoRunning = saved.isAutoRunning || false;
      botState.startTime = saved.startTime || null;
      botState.autoCheckInterval = typeof saved.autoCheckInterval === 'number' ? saved.autoCheckInterval : AUTO_CHECK_INTERVAL_SECONDS;
      
      botState.links = Array.isArray(saved.links) ? saved.links : [];
      botState.currentLinkIndex = typeof saved.currentLinkIndex === 'number' ? saved.currentLinkIndex : 0;

      // Migrate from old autoTiktokLink session if links array is empty
      if (botState.links.length === 0) {
        if (saved.autoTiktokLink) {
          botState.links = [
            {
              id: 'migrated',
              url: saved.autoTiktokLink,
              targetOrders: 4,
              currentOrders: 0,
              mode: saved.botMode || 'all',
              status: 'pending'
            }
          ];
        } else if (fileLinks.length > 0) {
          botState.links = fileLinks.map((url, i) => ({
            id: `loaded_${i}_${Date.now()}`,
            url: url,
            targetOrders: 4,
            currentOrders: 0,
            mode: 'all',
            status: 'pending'
          }));
        }
        botState.currentLinkIndex = 0;
      }

      console.log(`[BOT] Loaded session. isAutoRunning: ${botState.isAutoRunning}, links queue: ${botState.links.length}`);
    }
  } catch (err) {
    console.error('[BOT] Error loading session file:', err.message);
  }

  // 3. Do not auto-start or resume bot runner on server startup
  botState.isAutoRunning = false;
  console.log(`[BOT] Background bot runner initialized in stopped state (waiting for manual start).`);
}

// Custom Vite server plugin to handle the scraped history
const historyProxyPlugin = () => ({
  name: 'history-proxy',
  configureServer(server) {
    initBotRunner();

    // --- Endpoint: Bot Save Link to File ---
    server.middlewares.use('/api/bot/save-link', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { links } = parsed;
            const incomingLinks = Array.isArray(links) ? links : [];
            
            const urlsText = incomingLinks.map(l => l.url).filter(Boolean).join('\n') || DEFAULT_LINK;
            fs.writeFileSync(LINK_FILE, urlsText, 'utf8');
            
            botState.links = incomingLinks.map((link, idx) => ({
              id: link.id || `link_${idx}_${Date.now()}`,
              url: link.url,
              targetOrders: typeof link.targetOrders === 'number' ? link.targetOrders : 4,
              currentOrders: link.currentOrders || 0,
              mode: link.mode || 'all',
              status: link.status || (idx === 0 ? 'running' : 'pending')
            }));
            saveSession();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, links: botState.links }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });

    // --- Endpoint: Bot Save Cookie ---
    server.middlewares.use('/api/bot/save-cookie', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { cookie } = parsed;
            botState.cookieString = (cookie || '').trim();
            saveSession();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, cookieString: botState.cookieString }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });

    // --- Endpoint: Bot Start ---
    server.middlewares.use('/api/bot/start', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            startBot(parsed);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });

    // --- Endpoint: Bot Stop ---
    server.middlewares.use('/api/bot/stop', (req, res, next) => {
      if (req.method === 'POST') {
        stopBot();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        next();
      }
    });

    // --- Endpoint: Bot Status ---
    server.middlewares.use('/api/bot/status', (req, res, next) => {
      if (req.method === 'GET' || req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isAutoRunning: botState.isAutoRunning,
          links: botState.links,
          currentLinkIndex: botState.currentLinkIndex,
          cookieString: botState.cookieString,
          autoTimeWindow: botState.autoTimeWindow,
          apiKey: botState.apiKey,
          autoPhase: botState.autoPhase,
          countdown: botState.countdown,
          creationCountdown: botState.creationCountdown,
          logs: botState.logs,
          scanCount: botState.scanCount,
          likeOrderCount: botState.likeOrderCount,
          viewOrderCount: botState.viewOrderCount,
          nextType: botState.nextType,
          typesToCreate: botState.typesToCreate || [],
          startTime: botState.startTime,
          autoCheckInterval: botState.autoCheckInterval,
        }));
      } else {
        next();
      }
    });

    // --- Endpoint: Bot Clear Logs ---
    server.middlewares.use('/api/bot/clear-logs', (req, res, next) => {
      if (req.method === 'POST') {
        botState.logs = [];
        saveSession();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        next();
      }
    });

    // --- Endpoint: API v2 Proxy ---
    server.middlewares.use('/api/v2', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const forwardBody = { ...parsed };

            const response = await makeRequest('https://like.vn/api/v2', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json',
              },
              body: JSON.stringify(forwardBody)
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
                errorMsg += ' (Cloudflare Blocked. IP của bạn bị Like.vn chặn)';
              }
              res.writeHead(response.status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: errorMsg, details: data }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Lỗi kết nối máy chủ: ${err.message}` }));
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
            const { cookie, serviceId, link, quantity, apiToken } = parsed;
            if (!cookie || !serviceId || !link || !quantity) {
               res.writeHead(400, { 'Content-Type': 'application/json' });
               res.end(JSON.stringify({ error: 'Missing required fields: cookie, serviceId, link, quantity' }));
               return;
            }
            console.log(`[custom-order] Placing order: service=${serviceId}, qty=${quantity}, link=${link.slice(0,60)}`);
            const result = await placeOrderViaCookie(cookie, serviceId, link, quantity, apiToken);
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

    server.middlewares.use('/api/config', (req, res, next) => {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          isVercel: false,
          hasServerProxy: false,
          proxySource: 'none',
          needsProxy: false
        }));
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
            console.log('--- CUSTOM HISTORY REQUEST ---');
            console.log('Parsed body keys:', Object.keys(parsed));
            
            const userCookies = parsed.cookie || parsed.cookies;
            console.log('User cookies length:', userCookies ? userCookies.length : 0);
            console.log('User Agent header:', req.headers['user-agent']);
            
            if (!userCookies) {
              console.log('Error: Cookie string is empty or undefined!');
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cookie string is required' }));
              return;
            }

            const response = await makeRequest('https://like.vn/history/orders', {
              headers: {
                'Cookie': userCookies,
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Referer': 'https://like.vn/'
              }
            });

            console.log('Like.vn Response Status:', response.status);
            
            if (response.status === 302 || response.status === 301) {
              console.log('Unauthorized: Redirect status code detected!');
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Cookie không hợp lệ hoặc đã hết hạn. Vui lòng cập nhật Cookie trong mục Cấu hình!' }));
              return;
            }

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

            const username = parseUsername(html);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ username, orders }));
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
    historyApiFallback: true,
  }
});

