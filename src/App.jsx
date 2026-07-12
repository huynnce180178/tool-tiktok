import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// CẤU HÌNH THỜI GIAN BOT AUTO QUÉT TẠI ĐÂY
// - Mặc định hiện tại: 20 giây để test nhanh.
// - Để đổi lại thành 7 phút, hãy sửa số 20 thành 420.
// ==========================================
const AUTO_CHECK_INTERVAL_SECONDS = 420;

// Free services configuration on Like.vn
const INITIAL_SERVICES = {
  like: [
    { id: '1385', name: 'SV4 - Buff Tim Free (Miễn phí)', rate: 0, min: 10, max: 10, isFree: true }
  ],
  view: [
    { id: '8559', name: 'SV5 - View Tiktok miễn phí (Free)', rate: 0, min: 100, max: 100, isFree: true }
  ]
};

// Default session cookies for scraping
const DEFAULT_COOKIE = `remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6InZFdG1nRUhkMG5KZkRML1g3SnpSNXc9PSIsInZhbHVlIjoiUW5kRDBWTC9id2Fkd3Q0b2NyamRYTmlKMlZQSGQ4UmF5Y09NUWY3YnFJTjFZb05Db1VaeittbTc4eUw0WFU5Zmp0TDQ1NFBkcFpBejNodWtFdjE2b1QwMHBCeDZxQVpNaCs4ZFNSVWxvNjRoZGVmcGZPTVB6a2I2aGs3ZlZNVVFva0JPOW9Kdjh5endVcmlreHJtTEQ5Sk5FcDMzTkpVclZ1cS9ZRGlPWk83eVU0YkVHOCt6SUZXRjdkNVZKbEZiMklHRkZodjg1L00rejlVd29hL1JFZUlEQ0RMaXhyVUFOT1V1MklDaFN2bz0iLCJtYWMiOiI2NDk3NTI1N2VmYTI2M2Y1ZmRlYjliOGIzMzBiMDllNTgwZjhiOTI1NGRhOWVmZmUwMzg0ZGVjNDIzZGZjODVmIiwidGFnIjoiIn0%3D; XSRF-TOKEN=eyJpdiI6Im9hOXF4d1M5Z29HY2YvakZnelhxdWc9PSIsInZhbHVlIjoiVDhJUkNkT0dxbkJiWTJWV0ZOamtsdFovQllKdHp4bmh3bGdyN0tRdzVseTRhWjJWbFg2Ti96UUM1RnA0VTdXcXZwSForRnQwTUVKdlI5a2JnMEhGQ1p2dStldVNVWFdVK1kxNXB2aktMMkczbnpIbHJKSy9Rc2Jza09xaVNKMEkiLCJtYWMiOiJlYWYzNTk3MGFjODk3NjliOGFhMGZmMDM3NjI5NDFjOWFmNGM5YjhlYTk2YzI4NmQ0ZjEwMGI0ZDg5ZjAyNDY2IiwidGFnIjoiIn0%3D; likevn_session=eyJpdiI6IjJXbWxHMUFKeTRTQURkWDdDdDg1akE9PSIsInZhbHVlIjoiUkNPajdHMXNqRmw4c29pRlI0TUpWWWpXaUdvbjFmTnFycytJM0FmUzFjN1ZZTk5wRmdxUFk1NHQvL0s4bkF4VjVoY1B4M2hSaVNJcjBEMlEreE1lcytxanEyQis4UHE2YUVvQ0xyaFg1UGlTZlZBZ2o2Z25hK21oQ0g5Wk5MME4iLCJtYWMiOiJjOGViZWJlMzJhMDgwM2YzNTQ5MDI0OGFlMzllYmFkZWUwYWMwYTBjNTI3ZDljYTFiMGM0NDZiM2FmOWJkODBkIiwidGFnIjoiIn0%3D; cf_clearance=kxE4BTVqhAyMKbtS3PJVPOJpTknYlLJrwifSdpGSEyQ-1783871828-1.2.1.1-13h02wVll4NIkkh820eO0Ajufj1T0p3XAf2DmzeJjcR6wEKq.D71rXUIO4Ahzwy3464Ktbn82L1YwXvvVjZdTBJWj6KMD1v1WyOFjKIb6VlSuXt49hq5.3_Q5IvkE.vHXIhLcwMn1Xgmx0IlvLL49OcJPcKSUeOKLB8T7c_LP75.FRTD.4spAp4PgiPldH6Y8n20p1IwSle7f8oSJQ4QtQ9Sh_c6OSDm3B7HvbFMQzZriFNnPUlCtY.Yq8wQEXr4R5vAJi7u.Wun.ddjEvHcGKxFBYIwwUya0XqrMM1i6mikC5PgYamzXirVGqQayJSRxkwPENCyaT96CGLTJipstg`;

// Custom date parser for Like.vn format: "YYYY-MM-DD HH:mm:ss"
const parseOrderDate = (str) => {
  if (!str) return new Date(0);
  const parts = str.split(' ');
  if (parts.length !== 2) return new Date(0);
  const dateParts = parts[0].split('-');
  const timeParts = parts[1].split(':');
  if (dateParts.length !== 3 || timeParts.length !== 3) return new Date(0);
  return new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10),
    parseInt(timeParts[0], 10),
    parseInt(timeParts[1], 10),
    parseInt(timeParts[2], 10)
  );
};

export default function App() {
  // Navigation State: 'dashboard' or 'history'
  const [mainNav, setMainNav] = useState('dashboard');

  // Config States
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('like_vn_token') || 'e8f605443ed9f494fedc98ab7b8b75d3';
  });
  const [cookieString, setCookieString] = useState(() => {
    return localStorage.getItem('like_vn_cookie') || DEFAULT_COOKIE;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [apiConnectionOk, setApiConnectionOk] = useState(null);

  // Tab & Form States (Dashboard)
  const [activeTab, setActiveTab] = useState('order'); // 'order', 'auto', or 'status'
  const [serviceType, setServiceType] = useState('like'); // 'like' or 'view'
  const [selectedServer, setSelectedServer] = useState(INITIAL_SERVICES.like[0]);
  const [tiktokLink, setTiktokLink] = useState('');

  // Status Checker States
  const [orderIdToCheck, setOrderIdToCheck] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  // Auto Mode States
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoTiktokLink, setAutoTiktokLink] = useState('');
  const [autoTimeWindow, setAutoTimeWindow] = useState('2h'); // '1h', '2h', '4h', '6h', '12h', '24h', 'all'
  const [countdown, setCountdown] = useState(0); // seconds left until next check
  const [logs, setLogs] = useState([]);

  // Refs for scrolling logs and countdown interval
  const logEndRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Scraped Account History States
  const [scrapedOrders, setScrapedOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('tất cả'); // 'tất cả', 'đang xử lý', 'hoàn thành', 'đã hủy'
  const [historyScope, setHistoryScope] = useState('today'); // 'today' or 'all'
  const [historySearch, setHistorySearch] = useState('');

  // Alert State
  const [alert, setAlert] = useState(null);

  // Recent Session Orders State (saved locally)
  const [recentOrders, setRecentOrders] = useState(() => {
    const saved = localStorage.getItem('like_vn_recent_orders');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync selected service config
  useEffect(() => {
    const defaultServer = INITIAL_SERVICES[serviceType][0];
    setSelectedServer(defaultServer);
  }, [serviceType]);

  // Sync token & cookies to localstorage
  useEffect(() => {
    localStorage.setItem('like_vn_token', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('like_vn_cookie', cookieString);
  }, [cookieString]);

  // Sync recent orders to localstorage
  useEffect(() => {
    localStorage.setItem('like_vn_recent_orders', JSON.stringify(recentOrders));
  }, [recentOrders]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  // Load balance and scraped history on startup
  useEffect(() => {
    if (apiKey) fetchBalance();
    fetchScrapedHistory();
  }, []);

  // Alert helper
  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 8000);
  };

  // Log helper
  const addLog = (text) => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [...prev, { time, text }]);
  };

  // Fetch Balance from API
  const fetchBalance = async () => {
    if (!apiKey) return;
    setBalanceLoading(true);
    setApiConnectionOk(null);
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey, action: 'balance' })
      });
      const data = await response.json();
      if (data && data.balance !== undefined) {
        setBalance(data.balance);
        setApiConnectionOk(true);
      } else if (data && data.error) {
        setBalance(null);
        setApiConnectionOk(false);
      } else {
        testConnection();
      }
    } catch (err) {
      setBalance(null);
      setApiConnectionOk(false);
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey, action: 'services' })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setApiConnectionOk(true);
      } else {
        setApiConnectionOk(false);
      }
    } catch (e) {
      setApiConnectionOk(false);
    }
  };

  // Scrape Order History from Like.vn via cookies
  const fetchScrapedHistory = async (silent = false) => {
    if (!cookieString) return [];
    if (!silent) setHistoryLoading(true);
    try {
      const response = await fetch('/api/custom-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookieString })
      });

      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setScrapedOrders(data);
        return data;
      } else if (data && data.error) {
        if (!silent) showAlert('danger', data.error);
        setScrapedOrders([]);
      }
    } catch (err) {
      console.error(err);
      if (!silent) showAlert('danger', `Lỗi tải lịch sử: ${err.message}`);
    } finally {
      if (!silent) setHistoryLoading(false);
    }
    return [];
  };

  // Helper to place order via COOKIE (web form) - API doesn't support free servers SV4/SV5
  const placeOrderCookie = async (serviceId, link, qty) => {
    try {
      const response = await fetch('/api/custom-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookie: cookieString,
          apiToken: apiKey,
          serviceId: serviceId,
          link: link,
          quantity: qty
        })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { error: err.message };
    }
  };

  // Helper to place order via API (for manual orders with non-free services)
  const placeOrderApi = async (serviceId, link, qty) => {
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiKey,
          action: 'add',
          service: serviceId,
          link: link,
          quantity: qty
        })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      return { error: err.message };
    }
  };

  // Handle Order Submit (Manual)
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      showAlert('danger', 'Vui lòng điền API Token!');
      return;
    }
    if (!tiktokLink) {
      showAlert('danger', 'Vui lòng nhập link video Tiktok!');
      return;
    }

    if (!tiktokLink.includes('tiktok.com')) {
      showAlert('danger', 'Link không hợp lệ. Vui lòng nhập link video Tiktok chính xác.');
      return;
    }

    const orderQty = selectedServer.min;

    setTiktokLink('');
    showAlert('info', 'Đang gửi yêu cầu tạo đơn...');

    const data = await placeOrderCookie(selectedServer.id, tiktokLink, orderQty);

    // Cookie-based response: success if no error field or has order/message
    if (data && !data.error) {
      const orderId = data.order || data.id || data.order_id || 'N/A';
      showAlert('success', `Tạo đơn thành công! ID Đơn: ${orderId}`);

      const newOrder = {
        orderId: data.order || data.id || data.order_id || 'N/A',
        serviceId: selectedServer.id,
        serviceName: `${serviceType === 'like' ? 'Tăng Tim' : 'Tăng View'} (${selectedServer.name})`,
        quantity: orderQty,
        link: tiktokLink,
        date: new Date().toLocaleString('vi-VN'),
        status: 'Pending'
      };

      setRecentOrders(prev => [newOrder, ...prev]);
      fetchBalance();
      setTimeout(() => fetchScrapedHistory(true), 1500);
    } else if (data && data.error) {
      showAlert('danger', `Lỗi: ${data.error}`);
    } else {
      showAlert('danger', 'Không thể kết nối đến máy chủ.');
    }
  };

  // Check Order Status (Manual)
  const handleCheckStatus = async (idToQuery) => {
    const targetId = idToQuery || orderIdToCheck;
    if (!targetId) {
      showAlert('danger', 'Vui lòng nhập ID đơn hàng cần kiểm tra!');
      return;
    }

    setCheckingStatus(true);
    setStatusResult(null);
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey, action: 'status', order: targetId })
      });

      const data = await response.json();

      if (data && !data.error) {
        setStatusResult({ orderId: targetId, ...data });

        setRecentOrders(prev =>
          prev.map(ord => ord.orderId.toString() === targetId.toString() ? { ...ord, status: data.status || ord.status } : ord)
        );

        setScrapedOrders(prev =>
          prev.map(ord => ord.orderId.toString() === targetId.toString() ? { ...ord, status: data.status || ord.status } : ord)
        );
      } else if (data && data.error) {
        showAlert('danger', `Lỗi kiểm tra trạng thái: ${data.error}`);
      } else {
        showAlert('danger', 'Không lấy được thông tin trạng thái.');
      }
    } catch (err) {
      showAlert('danger', `Lỗi kết nối: ${err.message}`);
    } finally {
      setCheckingStatus(false);
    }
  };

  const checkRecentOrderStatus = (orderId) => {
    setMainNav('dashboard');
    setActiveTab('status');
    setOrderIdToCheck(orderId);
    handleCheckStatus(orderId);
  };

  // --- AUTO MODE BOT ENGINE ---
  // Refs to prevent double-run and track phases
  const isRunningCheckRef = useRef(false); // prevent concurrent check executions
  const autoPhaseRef = useRef('checking'); // 'checking' | 'creating'
  const [autoPhase, setAutoPhase] = useState('checking'); // for UI display
  const [creationCountdown, setCreationCountdown] = useState(0); // 120s creation countdown
  const creationIntervalRef = useRef(null);
  const nextTypeRef = useRef('like'); // alternates: 'like' -> 'view' -> 'like' ...

  const ORDER_CREATION_WAIT = 120; // seconds to wait before sending order (like.vn requirement)

  // Extract TikTok video ID from any URL format for comparison
  // Handles: /video/123, /analytics/123, ?item_id=123, etc.
  const extractVideoId = (url) => {
    if (!url) return '';
    const clean = url.split('?')[0].trim();
    // Match the long numeric ID at the end of any path
    const match = clean.match(/(\d{15,20})/);
    return match ? match[1] : clean.toLowerCase();
  };

  const cleanLinkForCompare = (url) => {
    if (!url) return '';
    return extractVideoId(url);
  };

  const getThresholdDate = (windowStr) => {
    const now = new Date();
    if (windowStr === 'all') return new Date(0);
    const hours = parseInt(windowStr, 10);
    if (isNaN(hours)) return new Date(0);
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  };

  // Send the actual order after 120s countdown
  // Uses nextTypeRef to alternate Like -> View -> Like...
  const executeOrderCreation = async (link) => {
    addLog('Het dem nguoc. Bat dau gui yeu cau tao don...');
    const type = nextTypeRef.current; // 'like' or 'view'
    addLog(`Loai don: ${type === 'like' ? 'Like (SV4)' : 'View (SV5)'}`);

    if (type === 'like') {
      addLog('Dang tao don Like mien phi (SV4)...');
      const res = await placeOrderCookie('1385', link, 10);
      if (res && res.status === 'success') {
        addLog(`TAO DON LIKE THANH CONG! ${res.message || ''}`);
        nextTypeRef.current = 'view'; // next time create View
        fetchBalance();
      } else {
        const errMsg = res?.message || res?.error || JSON.stringify(res).slice(0, 100);
        addLog(`That bai tao don Like: ${errMsg}`);
        // Don't flip on failure - retry same type next time
      }
    } else {
      addLog('Dang tao don View mien phi (SV5)...');
      const res = await placeOrderCookie('8559', link, 100);
      if (res && res.status === 'success') {
        addLog(`TAO DON VIEW THANH CONG! ${res.message || ''}`);
        nextTypeRef.current = 'like'; // next time create Like
        fetchBalance();
      } else {
        const errMsg = res?.message || res?.error || JSON.stringify(res).slice(0, 100);
        addLog(`That bai tao don View: ${errMsg}`);
        // Don't flip on failure - retry same type next time
      }
    }

    // Refresh history after order creation
    setTimeout(() => fetchScrapedHistory(true), 2000);
    addLog(`Hoan tat. Don tiep theo se la: ${nextTypeRef.current === 'like' ? 'Like' : 'View'}. Cho ${AUTO_CHECK_INTERVAL_SECONDS}s...`);

    // Switch back to checking phase
    autoPhaseRef.current = 'checking';
    setAutoPhase('checking');
    setCountdown(AUTO_CHECK_INTERVAL_SECONDS);
  };

  // Start the 120s creation countdown, then place the next order type
  const startCreationCountdown = (link) => {
    autoPhaseRef.current = 'creating';
    setAutoPhase('creating');
    setCreationCountdown(ORDER_CREATION_WAIT);
    const type = nextTypeRef.current === 'like' ? 'Like (SV4)' : 'View (SV5)';
    addLog(`Chuan bi tao don: ${type}. Dem nguoc ${ORDER_CREATION_WAIT}s (like.vn yeu cau doi)...`);

    if (creationIntervalRef.current) clearInterval(creationIntervalRef.current);

    let remaining = ORDER_CREATION_WAIT;
    creationIntervalRef.current = setInterval(async () => {
      remaining -= 1;
      setCreationCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(creationIntervalRef.current);
        creationIntervalRef.current = null;
        await executeOrderCreation(link);
      }
    }, 1000);
  };

  const runAutoCheck = async () => {
    // Prevent concurrent executions
    if (isRunningCheckRef.current) return;
    if (autoPhaseRef.current === 'creating') return;

    isRunningCheckRef.current = true;
    try {
      if (!autoTiktokLink) { addLog('Loi Auto: Link TikTok trong!'); stopAutoBot(); return; }
      if (!cookieString) { addLog('Loi Auto: Chua co Cookies!'); stopAutoBot(); return; }

      const cleanTargetLink = cleanLinkForCompare(autoTiktokLink);
      addLog(`Bat dau quet: ${autoTiktokLink}`);
      addLog('Dang dong bo hoa lich su don hang tu Like.vn...');

      const latestHistory = await fetchScrapedHistory(true);
      if (!Array.isArray(latestHistory)) {
        addLog('Loi: Khong the tai lich su don hang. Kiem tra lai Cookie!');
        return;
      }

      addLog('Dong bo thanh cong! Quet don TikTok dang chay...');

      const activeStatuses = ['đang chạy', 'đang xử lý', 'chờ duyệt', 'đang chạy...', 'pending', 'processing', 'in progress'];

      // Filter: any active TikTok order for this video link (regardless of Like/View)
      const activeTiktokOrders = latestHistory.filter(o => {
        const sameLink = cleanLinkForCompare(o.link) === cleanTargetLink;
        const isTiktok = o.serviceName.toLowerCase().includes('tiktok');
        const isActive = activeStatuses.includes(o.status.toLowerCase());
        return sameLink && isTiktok && isActive;
      });

      if (activeTiktokOrders.length > 0) {
        // Has active orders → wait and recheck
        activeTiktokOrders.forEach(o => {
          addLog(`  -> Don dang chay: #${o.orderId} | ${o.serviceName} | ${o.status}`);
        });
        addLog(`Co ${activeTiktokOrders.length} don TikTok dang chay. Doi ${AUTO_CHECK_INTERVAL_SECONDS}s kiem tra lai...`);
      } else {
        // No active TikTok orders → create both Like + View
        addLog('Khong co don TikTok nao dang chay. Bat dau tao don...');
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        startCreationCountdown(autoTiktokLink);
        return;
      }

      addLog(`Hoan tat dot kiem tra. Cho ${AUTO_CHECK_INTERVAL_SECONDS} giay...`);
    } finally {
      isRunningCheckRef.current = false;
    }
  };

  const startAutoBot = () => {
    if (!autoTiktokLink) {
      showAlert('danger', 'Vui lòng nhập link video TikTok cần chạy Auto!');
      return;
    }
    if (!autoTiktokLink.includes('tiktok.com')) {
      showAlert('danger', 'Link TikTok không hợp lệ!');
      return;
    }

    isRunningCheckRef.current = false;
    autoPhaseRef.current = 'checking';
    setAutoPhase('checking');
    nextTypeRef.current = 'like'; // always start with Like on fresh run
    setIsAutoRunning(true);
    setLogs([]);
    addLog(`Khoi chay che do tu dong cho link: ${autoTiktokLink}`);
    addLog(`Cau hinh moc kiem tra: ${autoTimeWindow === 'all' ? 'Toan thoi gian' : `Trong vong ${autoTimeWindow}`}`);
    addLog('Quet dot dau tien ngay bay gio...');
  };

  const stopAutoBot = () => {
    setIsAutoRunning(false);
    autoPhaseRef.current = 'checking';
    setAutoPhase('checking');
    isRunningCheckRef.current = false;
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (creationIntervalRef.current) { clearInterval(creationIntervalRef.current); creationIntervalRef.current = null; }
    addLog('Da dung che do tu dong.');
  };

  // Check interval: only runs in 'checking' phase
  useEffect(() => {
    if (isAutoRunning) {
      // Run immediately on start
      runAutoCheck();
      setCountdown(AUTO_CHECK_INTERVAL_SECONDS);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            runAutoCheck();
            return AUTO_CHECK_INTERVAL_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    }
    return () => {
      if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    };
  }, [isAutoRunning]);

  // Helper to format currency
  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'Đang tải...';
    const cleanVal = typeof val === 'string' ? val.replace(/[^\d]/g, '') : val;
    const num = Number(cleanVal);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Get status class for badge styling
  const getStatusBadgeClass = (status = '') => {
    const s = status.toLowerCase().replace(/\s+/g, '');
    if (s.includes('hoànthành')) return 'badge badge-completed';
    if (s.includes('đangchạy') || s.includes('đangxửlý') || s.includes('chờduyệt')) return 'badge badge-processing';
    if (s.includes('đãhủy') || s.includes('khônghoànthành')) return 'badge badge-canceled';
    return `badge badge-pending`;
  };

  // Filter scraped orders based on search, status and date scope
  const getFilteredOrders = () => {
    const todayStr = new Date().toLocaleDateString('en-CA');

    return scrapedOrders.filter(order => {
      const matchesSearch =
        order.orderId.toLowerCase().includes(historySearch.toLowerCase()) ||
        order.serviceName.toLowerCase().includes(historySearch.toLowerCase()) ||
        order.link.toLowerCase().includes(historySearch.toLowerCase());

      if (!matchesSearch) return false;

      if (historyScope === 'today') {
        const orderDate = order.createdAt ? order.createdAt.split(' ')[0] : '';
        if (orderDate !== todayStr) return false;
      }

      if (historyFilter === 'tất cả') return true;

      const s = order.status.toLowerCase();
      if (historyFilter === 'đang xử lý') {
        return s.includes('đang chạy') || s.includes('đang xử lý') || s.includes('chờ duyệt');
      }
      if (historyFilter === 'hoàn thành') {
        return s.includes('hoàn thành');
      }
      if (historyFilter === 'đã hủy') {
        return s.includes('đã hủy') || s.includes('không hoàn thành');
      }
      return true;
    });
  };

  return (
    <div className="container">
      {/* Header section */}
      <header className="header">
        <div className="brand">
          <h1 className="brand-logo">TikTok Booster</h1>
          <span className="brand-tagline">Like.vn Free Buff Client</span>
        </div>

        {/* Main Tabs */}
        <nav style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--panel-border)', margin: '0 1rem' }}>
          <button
            className={`tab-btn ${mainNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setMainNav('dashboard')}
            style={{ minWidth: '120px' }}
          >
            Bảng điều khiển
          </button>
          <button
            className={`tab-btn ${mainNav === 'history' ? 'active' : ''}`}
            onClick={() => {
              setMainNav('history');
              fetchScrapedHistory();
            }}
            style={{ minWidth: '150px' }}
          >
            Lịch sử Like.vn
          </button>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-outline"
            style={{ width: 'auto', padding: '0.5rem 0.85rem' }}
          >
            Cấu hình
          </button>
          <div className="balance-box" style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Số dư:</span>
            <strong style={{ color: '#00f2fe' }}>
              {balanceLoading ? 'Đang tải...' : formatCurrency(balance)}
            </strong>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid #ff007f', boxShadow: 'var(--glow-pink)' }}>
          <h2 className="card-title" style={{ color: '#ff007f' }}>Cài Đặt Hệ Thống</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Like.vn API Token</label>
              <input
                type="password"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập API Token..."
              />
              <button
                className="btn btn-outline"
                style={{ marginTop: '0.5rem', padding: '0.5rem' }}
                onClick={fetchBalance}
              >
                Cập nhật số dư
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Like.vn Session Cookies (Scraper)</label>
              <textarea
                className="form-input"
                rows="4"
                style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }}
                value={cookieString}
                onChange={(e) => setCookieString(e.target.value)}
                placeholder="Nhập chuỗi Cookie..."
              />
              <button
                className="btn btn-outline"
                style={{ marginTop: '0.5rem', padding: '0.5rem' }}
                onClick={fetchScrapedHistory}
              >
                Tải lịch sử
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert display */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Main Views */}
      {mainNav === 'dashboard' ? (
        /* View 1: Main Dashboard Grid */
        <div className="dashboard-grid">
          {/* Left Column: Forms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              {/* Form Tab selectors */}
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'order' ? 'active' : ''}`}
                  onClick={() => setActiveTab('order')}
                >
                  Tạo Đơn Hàng
                </button>
                <button
                  className={`tab-btn ${activeTab === 'auto' ? 'active' : ''}`}
                  onClick={() => setActiveTab('auto')}
                  style={{ position: 'relative' }}
                >
                  Bot Auto
                  {isAutoRunning && <span style={{ position: 'absolute', top: '-4px', right: '4px', width: '8px', height: '8px', background: '#ff0050', borderRadius: '50%', boxShadow: '0 0 8px #ff0050' }}></span>}
                </button>
                <button
                  className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
                  onClick={() => setActiveTab('status')}
                >
                  Tra Cứu Đơn
                </button>
              </div>

              {/* Form 1: Manual Single Order */}
              {activeTab === 'order' && (
                <form onSubmit={handlePlaceOrder}>
                  <div className="form-group">
                    <label className="form-label">Chọn Loại Dịch Vụ</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', background: serviceType === 'like' ? 'rgba(255,0,127,0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: serviceType === 'like' ? '1px solid #ff007f' : '1px solid var(--panel-border)', justifyContent: 'center' }}>
                        <input
                          type="radio"
                          name="service_cat"
                          checked={serviceType === 'like'}
                          onChange={() => setServiceType('like')}
                          style={{ accentColor: '#ff007f' }}
                        />
                        Tăng Tim (Likes)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1, padding: '0.75rem', background: serviceType === 'view' ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: serviceType === 'view' ? '1px solid #00f2fe' : '1px solid var(--panel-border)', justifyContent: 'center' }}>
                        <input
                          type="radio"
                          name="service_cat"
                          checked={serviceType === 'view'}
                          onChange={() => setServiceType('view')}
                          style={{ accentColor: '#00f2fe' }}
                        />
                        Tăng View (Lượt xem)
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nhập Link Video TikTok</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tiktokLink}
                      onChange={(e) => setTiktokLink(e.target.value)}
                      placeholder="https://www.tiktok.com/@username/video/..."
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số Lượng Tăng</label>
                    <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '600', color: '#ff007f' }}>
                      {selectedServer.min} {serviceType === 'like' ? 'Tim' : 'Lượt xem'} (Cố định cho máy chủ miễn phí)
                    </div>
                  </div>

                  <div className="price-display">
                    <div className="info-row">
                      <span className="info-label">Máy chủ dịch vụ:</span>
                      <span className="info-value" style={{ color: '#00f2fe', fontWeight: 'bold' }}>{selectedServer.name}</span>
                    </div>
                    <div className="info-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span className="info-label" style={{ fontWeight: '600' }}>Tổng Chi Phí:</span>
                      <span className="price-value free">MIỄN PHÍ (0 đ)</span>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary">
                    TẠO ĐƠN HÀNG
                  </button>
                </form>
              )}

              {/* Form 2: Auto Mode Bot */}
              {activeTab === 'auto' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Nhập Link Video TikTok Chạy Auto</label>
                    <input
                      type="text"
                      className="form-input"
                      value={autoTiktokLink}
                      onChange={(e) => setAutoTiktokLink(e.target.value)}
                      placeholder="https://www.tiktok.com/@username/video/..."
                      disabled={isAutoRunning}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mốc Thời Gian Kiểm Tra Đơn</label>
                    <select
                      className="form-select"
                      value={autoTimeWindow}
                      onChange={(e) => setAutoTimeWindow(e.target.value)}
                      disabled={isAutoRunning}
                    >
                      <option value="1h">1 Giờ</option>
                      <option value="2h">2 Giờ</option>
                      <option value="4h">4 Giờ</option>
                      <option value="6h">6 Giờ</option>
                      <option value="12h">12 Giờ</option>
                      <option value="24h">24 Giờ</option>
                      <option value="all">Toàn bộ lịch sử</option>
                    </select>
                  </div>

                  {isAutoRunning && autoPhase === 'checking' && (
                    <div style={{ background: 'rgba(255, 0, 127, 0.05)', border: '1px dashed #ff007f', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      <span className="pulse-dot" style={{ display: 'inline-block', width: '10px', height: '10px', background: '#ff007f', borderRadius: '50%', marginRight: '0.5rem' }}></span>
                      <strong style={{ color: '#ff007f', fontSize: '0.9rem' }}>BOT DANG QUET</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Quet lai sau: <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{countdown}s</span>
                      </div>
                    </div>
                  )}

                  {isAutoRunning && autoPhase === 'creating' && (
                    <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '2px solid #00f2fe', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: '#00f2fe', lineHeight: 1, fontFamily: 'monospace' }}>
                        {creationCountdown}s
                      </div>
                      <strong style={{ color: '#00f2fe', fontSize: '0.9rem', display: 'block', marginTop: '0.35rem' }}>
                        DANG TAO DON — CHO LIKE.VN
                      </strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Like.vn yeu cau doi {120}s truoc khi len don
                      </div>
                    </div>
                  )}

                  {isAutoRunning ? (
                    <button type="button" onClick={stopAutoBot} className="btn btn-outline" style={{ border: '1px solid #ef4444', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                      DỪNG AUTO
                    </button>
                  ) : (
                    <button type="button" onClick={startAutoBot} className="btn btn-secondary">
                      BẮT ĐẦU AUTO
                    </button>
                  )}
                </div>
              )}

              {/* Form 3: Status Checker */}
              {activeTab === 'status' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Mã Đơn Hàng (Order ID)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={orderIdToCheck}
                        onChange={(e) => setOrderIdToCheck(e.target.value)}
                        placeholder="Nhập mã đơn hàng..."
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '0 1.5rem' }}
                        onClick={() => handleCheckStatus()}
                        disabled={checkingStatus}
                      >
                        {checkingStatus ? 'Đang check...' : 'Kiểm tra'}
                      </button>
                    </div>
                  </div>

                  {statusResult && (
                    <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#00f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Thông Tin Đơn #{statusResult.orderId}</span>
                        <span className={getStatusBadgeClass(statusResult.status)}>
                          {statusResult.status}
                        </span>
                      </h3>
                      <div className="info-row">
                        <span className="info-label">Chi Phí:</span>
                        <span className="info-value">{formatCurrency(statusResult.charge)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Bắt Đầu Từ:</span>
                        <span className="info-value">{statusResult.start_count} lượt</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Còn Lại:</span>
                        <span className="info-value">{statusResult.remains} lượt</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tiền tệ:</span>
                        <span className="info-value">{statusResult.currency || 'VND'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Local Session History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>
                  Đơn Hàng Vừa Tạo (Phiên Này)
                </h2>
                {recentOrders.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Xóa lịch sử phiên này?')) setRecentOrders([]);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Xóa
                  </button>
                )}
              </div>

              {recentOrders.length === 0 ? (
                <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Chưa có đơn hàng nào được tạo trong phiên này.
                </div>
              ) : (
                <div className="history-list">
                  {recentOrders.map((order) => (
                    <div key={order.orderId} className="history-item">
                      <div className="history-info">
                        <span className="history-service">{order.serviceName}</span>
                        <a href={order.link} target="_blank" rel="noopener noreferrer" className="history-link">{order.link}</a>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                          <span className="history-date">{order.date}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>| SL: {order.quantity}</span>
                        </div>
                      </div>
                      <div className="history-actions">
                        <span className="history-orderid">ID: #{order.orderId}</span>
                        <span className={getStatusBadgeClass(order.status)}>
                          {order.status}
                        </span>
                        <button
                          onClick={() => checkRecentOrderStatus(order.orderId)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto', borderRadius: '4px', marginTop: '0.25rem' }}
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* View 2: Full-Width Scraped Account History */
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 className="card-title" style={{ margin: 0, color: '#00f2fe' }}>
              Danh Sách Đơn Hệ Thống (Like.vn)
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => fetchScrapedHistory()}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '0.5rem 1rem' }}
                disabled={historyLoading}
              >
                {historyLoading ? 'Đang tải...' : 'Làm mới danh sách'}
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--panel-border)' }}>

            {/* Scope selection: Today vs All */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.2)', padding: '0.2rem', borderRadius: '8px' }}>
              <button
                onClick={() => setHistoryScope('today')}
                className={`tab-btn ${historyScope === 'today' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', borderRadius: '6px', minWidth: '80px' }}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setHistoryScope('all')}
                className={`tab-btn ${historyScope === 'all' ? 'active' : ''}`}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', borderRadius: '6px', minWidth: '80px' }}
              >
                Tất cả đơn
              </button>
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['Tất cả', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setHistoryFilter(filter.toLowerCase())}
                  className={`tab-btn ${historyFilter === filter.toLowerCase() ? 'active' : ''}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', borderRadius: '6px' }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ flex: 1, maxWidth: '250px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm Mã đơn, link..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Main Table Grid */}
          {historyLoading ? (
            <div style={{ padding: '5rem 0', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Đang quét và đồng bộ đơn hàng từ tài khoản Like.vn...</p>
            </div>
          ) : getFilteredOrders().length === 0 ? (
            <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Mã đơn / Ngày tạo</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>Dịch vụ / Link tăng</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Số lượng / Chạy</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Thanh toán</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOrders().map((order) => (
                    <tr key={order.dbId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      {/* 1. Code / Date */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{order.orderId}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Tạo: {order.createdAt}</span>
                          {order.updatedAt && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sửa: {order.updatedAt}</span>}
                        </div>
                      </td>
                      {/* 2. Service / Link */}
                      <td style={{ padding: '1rem', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{order.serviceName}</span>
                          <a
                            href={order.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#00f2fe', fontSize: '0.78rem', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            title={order.link}
                          >
                            {order.link}
                          </a>
                        </div>
                      </td>
                      {/* 3. Qty / Run */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>SL: {order.quantity}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bắt đầu: {order.startCount}</span>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>Đã chạy: {order.runCount}</span>
                        </div>
                      </td>
                      {/* 4. Payment */}
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '500', color: 'var(--text-secondary)' }}>
                        {formatCurrency(order.charge)}
                      </td>
                      {/* 5. Status */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span className={getStatusBadgeClass(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      {/* 6. Action */}
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => checkRecentOrderStatus(order.orderId)}
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', width: 'auto', borderRadius: '4px' }}
                          >
                            Check
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 3: Live scrolling Console Logs (Bot Activity) */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ margin: 0, color: '#ff007f' }}>
            Bảng Hoạt Động Bot Auto
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {logs.length > 0 && (
              <button
                onClick={() => {
                  const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
                  navigator.clipboard.writeText(text).then(() => showAlert('success', 'Đã copy log!'));
                }}
                className="btn btn-outline"
                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                Copy Log
              </button>
            )}
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="btn btn-outline"
                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                Clear Logs
              </button>
            )}
          </div>
        </div>
        <div
          className="log-panel"
          ref={logEndRef}
          style={{ height: '220px', overflowY: 'auto', background: '#0a0d14', border: '1px solid var(--panel-border)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '0.4rem', scrollBehavior: 'smooth' }}
        >
          {logs.map((log, index) => (
            <div key={index} style={{ lineBreak: 'anywhere' }}>
              <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span> {log.text}
            </div>
          ))}
          {logs.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3.5rem 0' }}>
              Chưa có hoạt động nào. Hãy bật chế độ Bot Auto để quét đơn tự động.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 TikTok Booster Tool • Powered by <a href="https://like.vn" target="_blank" rel="noopener noreferrer">Like.vn</a></p>
      </footer>
    </div>
  );
}
