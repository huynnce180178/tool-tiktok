import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import History from './pages/History';
import Settings from './pages/Settings';

// Default session cookies for scraping
const DEFAULT_COOKIE = `remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6InZFdG1nRUhkMG5KZkRML1g3SnpSNXc9PSIsInZhbHVlIjoiUW5kRDBWTC9id2Fkd3Q0b2NyamRYTmlKMlZQSGQ4UmF5Y09NUWY3YnFJTjFZb05Db1VaeittbTc4eUw0WFU5Zmp0TDQ1NFBkcFpBejNodWtFdjE2b1QwMHBCeDZxQVpNaCs4ZFNSVWxvNjRoZGVmcGZPTVB6a2I2aGs3ZlZNVVFva0JPOW9Kdjh5endVcmlreHJtTEQ5Sk5FcDMzTkpVclZ1cS9ZRGlPWk83eVU0YkVHOCt6SUZXRjdkNVZKbEZiMklHRkZodjg1L00rejlVd29hL1JFZUlEQ0RMaXhyVUFOT1V1MklDaFN2bz0iLCJtYWMiOiI2NDk3NTI1N2VmYTI2M2Y1ZmRlYjliOGIzMzBiMDllNTgwZjhiOTI1NGRhOWVmZmUwMzg0ZGVjNDIzZGZjODVmIiwidGFnIjoiIn0%3D; XSRF-TOKEN=eyJpdiI6Im9hOXF4d1M5Z29HY2YvakZnelhxdWc9PSIsInZhbHVlIjoiVDhJUkNkT0dxbkJiWTJWV0ZOamtsdFovQllKdHp4bmh3bGdyN0tRdzVseTRhWjJWbFg2Ti96UUM1RnA0VTdXcXZwSForRnQwTUVKdlI5a2JnMEhGQ1p2dStldVNVWFdVK1kxNXB2aktMMkczbnpIbHJKSy9Rc2Jza09xaVNKMEkiLCJtYWMiOiJlYWYzNTk3MGFjODk3NjliOGFhMGZmMDM3NjI5NDFjOWFmNGM5YjhlYTk2YzI4NmQ0ZjEwMGI0ZDg5ZjAyNDY2IiwidGFnIjoiIn0%3D; likevn_session=eyJpdiI6IjJXbWxHMUFKeTRTQURkWDdDdDg1akE9PSIsInZhbHVlIjoiUkNPajdHMXNqRmw4c29pRlI0TUpWWWpXaUdvbjFmTnFycytJM0FmUzFjN1ZZTk5wRmdxUFk1NHQvL0s0bkF4VjVoY1B4M2hSaVNJcjBEMlEreE1lcytxanEyQis0UHE2YUVvQ0xyaFg1UGlTZlZBZ2o2Z25hK21oQ0g5Wk5MME4iLCJtYWMiOiJjOGViZWJlMzJhMDgwM2YzNTQ5MDI0OGFlMzllYmFkZWUwYWMwYTBjNTI3ZDljYTFiMGM0NDZiM2FmOWJkODBkIiwidGFnIjoiIn0%3D; cf_clearance=kxE4BTVqhAyMKbtS3PJVPOJpTknYlLJrwifSdpGSEyQ-1783871828-1.2.1.1-13h02wVll4NIkkh820eO0Ajufj1T0p3XAf2DmzeJjcR6wEKq.D71rXUIO4Ahzwy3464Ktbn82L1YwXvvVjZdTBJWj6KMD1v1WyOFjKIb6VlSuXt49hq5.3_Q5IvkE.vHXIhLcwMn1Xgmx0IlvLL49OcJPcKSUeOKLB8T7c_LP75.FRTD.4spAp4PgiPldH6Y8n20p1IwSle7f8oSJQ4QtQ9Sh_c6OSDm3B7HvbFMQzZriFNnPUlCtY.Yq8wQEXr4R5vAJi7u.Wun.ddjEvHcGKxFBYIwwUya0XqrMM1i6mikC5PgYamzXirVGqQayJSRxkwPENCyaT96CGLTJipstg`;

// Free services configuration on Like.vn
const INITIAL_SERVICES = {
  like: [
    { id: '1385', name: 'SV4 - Buff Tim Free (Miễn phí)', rate: 0, min: 10, max: 10, isFree: true }
  ],
  view: [
    { id: '8559', name: 'SV5 - View Tiktok miễn phí (Free)', rate: 0, min: 100, max: 100, isFree: true }
  ]
};

const parseNetscapeCookies = (text) => {
  if (!text) return '';
  if (text.includes('=') && !text.includes('\t') && !text.includes('FALSE') && !text.includes('TRUE')) {
    return text.trim();
  }
  const lines = text.split('\n');
  const cookies = [];
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 7) {
      const name = parts[5];
      const value = parts[6];
      cookies.push(`${name}=${value}`);
    }
  }
  return cookies.join('; ');
};

function AppContent() {
  const navigate = useNavigate();

  // --- Popup notification system ---
  const [popups, setPopups] = useState([]);
  let popupIdCounter = 0;

  const showPopup = (message, type = 'info', duration = 3500) => {
    const id = Date.now() + (popupIdCounter++);
    setPopups(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, duration);
  };

  // Config States
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('like_vn_token');
    if (!saved || saved === 'e8f605443ed9f494fedc98ab7b8b75d3') {
      return 'db6cfc2375c30fc48cab714cf33bfd08';
    }
    return saved;
  });
  const [cookieString, setCookieString] = useState(() => {
    // Chỉ dùng DEFAULT_COOKIE nếu chưa từng lưu gì vào localStorage
    const saved = localStorage.getItem('like_vn_cookie');
    return saved !== null ? saved : DEFAULT_COOKIE;
  });

  // Tab & Form States (Dashboard)
  const [serviceType, setServiceType] = useState('like');
  const [selectedServer, setSelectedServer] = useState(INITIAL_SERVICES.like[0]);
  const [tiktokLink, setTiktokLink] = useState('');

  // Status Checker States
  const [orderIdToCheck, setOrderIdToCheck] = useState('');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  // Auto Mode States
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [autoTiktokLink, setAutoTiktokLink] = useState('');
  const [autoTimeWindow, setAutoTimeWindow] = useState('6h');
  const [countdown, setCountdown] = useState(0);
  const [logs, setLogs] = useState([]);
  const [scanCount, setScanCount] = useState(0);
  const [likeOrderCount, setLikeOrderCount] = useState(0);
  const [viewOrderCount, setViewOrderCount] = useState(0);
  const [botStartTime, setBotStartTime] = useState(null);
  const [runningTimeStr, setRunningTimeStr] = useState('00:00:00');
  const [autoCheckInterval, setAutoCheckInterval] = useState(420);

  // Scraped Account History States
  const [scrapedOrders, setScrapedOrders] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('tất cả');
  const [historyScope, setHistoryScope] = useState('today');
  const [historySearch, setHistorySearch] = useState('');

  const [connectionStatus, setConnectionStatus] = useState('none');

  const checkConnection = async (cookieVal) => {
    if (!cookieVal) {
      setConnectionStatus('none');
      return;
    }
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/custom-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookieVal })
      });
      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('failed');
      }
    } catch (e) {
      setConnectionStatus('failed');
    }
  };

  const syncCookieToServer = async (cookieVal) => {
    try {
      await fetch('/api/bot/save-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookieVal })
      });
    } catch (e) {
      console.error('Failed to sync cookie to server:', e);
    }
  };

  const handleCookieChange = (val) => {
    const parsed = parseNetscapeCookies(val);
    setCookieString(parsed);
    if (parsed) {
      checkConnection(parsed);
      syncCookieToServer(parsed);
    } else {
      setConnectionStatus('none');
      syncCookieToServer('');
    }
  };

  // Save cookie then reload the entire page
  const handleSaveCookie = async () => {
    localStorage.setItem('like_vn_cookie', cookieString);
    await syncCookieToServer(cookieString);
    window.location.reload();
  };

  // Clear cookie then reload
  const handleClearCookie = async () => {
    setCookieString('');
    localStorage.setItem('like_vn_cookie', '');
    await syncCookieToServer('');
    window.location.reload();
  };

  useEffect(() => {
    if (cookieString) {
      checkConnection(cookieString);
    }
  }, []);

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

  // Load scraped history on startup
  useEffect(() => {
    fetchScrapedHistory();
  }, []);

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
        setConnectionStatus('success');
        return data;
      } else if (data && data.error) {
        setConnectionStatus('failed');
        if (!silent) showPopup(data.error, 'error');
        setScrapedOrders([]);
      } else {
        setConnectionStatus('failed');
      }
    } catch (err) {
      setConnectionStatus('failed');
      console.error(err);
      if (!silent) showPopup(`Lỗi tải lịch sử: ${err.message}`, 'error');
    } finally {
      if (!silent) setHistoryLoading(false);
    }
    return [];
  };

  // Helper to place order via COOKIE
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

  // Handle Order Submit (Manual)
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!cookieString) {
      showPopup('Vui lòng điền Cookies trong mục Cấu hình!', 'error');
      return;
    }
    if (!tiktokLink) {
      showPopup('Vui lòng nhập link video Tiktok!', 'error');
      return;
    }
    if (!tiktokLink.includes('tiktok.com')) {
      showPopup('Link không hợp lệ. Vui lòng nhập link video Tiktok chính xác.', 'error');
      return;
    }

    const orderQty = selectedServer.min;
    const linkToOrder = tiktokLink;
    setTiktokLink('');

    const data = await placeOrderCookie(selectedServer.id, linkToOrder, orderQty);

    if (data && !data.error) {
      const orderId = data.order || data.id || data.order_id || 'N/A';
      showPopup(`Tạo đơn thành công! ID Đơn: ${orderId}`, 'success');

      const newOrder = {
        orderId: orderId,
        serviceId: selectedServer.id,
        serviceName: `${serviceType === 'like' ? 'Tăng Tim' : 'Tăng View'} (${selectedServer.name})`,
        quantity: orderQty,
        link: linkToOrder,
        date: new Date().toLocaleString('vi-VN'),
        status: 'Pending'
      };

      setRecentOrders(prev => [newOrder, ...prev]);
      setTimeout(() => fetchScrapedHistory(true), 1500);
    } else if (data && data.error) {
      showPopup(`Lỗi: ${data.error}`, 'error');
    } else {
      showPopup('Không thể kết nối đến máy chủ.', 'error');
    }
  };

  // Check Order Status (Manual)
  const handleCheckStatus = async (idToQuery) => {
    const targetId = idToQuery || orderIdToCheck;
    if (!targetId) {
      showPopup('Vui lòng nhập ID đơn hàng cần kiểm tra!', 'error');
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
        showPopup(`Lỗi kiểm tra trạng thái: ${data.error}`, 'error');
      } else {
        showPopup('Không lấy được thông tin trạng thái.', 'error');
      }
    } catch (err) {
      showPopup(`Lỗi kết nối: ${err.message}`, 'error');
    } finally {
      setCheckingStatus(false);
    }
  };

  const checkRecentOrderStatus = (orderId) => {
    navigate('/');
    setOrderIdToCheck(orderId);
    handleCheckStatus(orderId);
  };

  // --- AUTO MODE BOT ENGINE ---
  const [autoPhase, setAutoPhase] = useState('checking');
  const [creationCountdown, setCreationCountdown] = useState(0);

  const startAutoBot = async () => {
    if (!autoTiktokLink) {
      showPopup('Vui lòng nhập link video TikTok cần chạy Auto!', 'error');
      return;
    }
    if (!autoTiktokLink.includes('tiktok.com')) {
      showPopup('Link TikTok không hợp lệ!', 'error');
      return;
    }

    try {
      const response = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoTiktokLink,
          cookieString,
          autoTimeWindow,
          apiKey,
          autoCheckInterval: Number(autoCheckInterval),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showPopup(`Không thể khởi chạy Bot: ${errorData.error || 'Lỗi không xác định'}`, 'error');
        return;
      }

      setIsAutoRunning(true);
      showPopup('Đã khởi chạy Auto Bot trên Server thành công!', 'success');
    } catch (err) {
      showPopup(`Lỗi kết nối máy chủ: ${err.message}`, 'error');
    }
  };

  const stopAutoBot = async () => {
    try {
      const response = await fetch('/api/bot/stop', { method: 'POST' });

      if (!response.ok) {
        const errorData = await response.json();
        showPopup(`Không thể dừng Bot: ${errorData.error || 'Lỗi không xác định'}`, 'error');
        return;
      }

      setIsAutoRunning(false);
      showPopup('Đã dừng Auto Bot trên Server!', 'success');
    } catch (err) {
      showPopup(`Lỗi kết nối máy chủ: ${err.message}`, 'error');
    }
  };

  const handleSaveLinkToFile = async () => {
    if (!autoTiktokLink) {
      showPopup('Vui lòng nhập link video TikTok cần lưu!', 'error');
      return;
    }
    if (!autoTiktokLink.includes('tiktok.com')) {
      showPopup('Link TikTok không hợp lệ!', 'error');
      return;
    }

    try {
      const response = await fetch('/api/bot/save-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: autoTiktokLink }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showPopup(`Không thể lưu link: ${errorData.error || 'Lỗi không xác định'}`, 'error');
        return;
      }

      showPopup('Đã lưu link video TikTok vào file thành công!', 'success');
    } catch (err) {
      showPopup(`Lỗi kết nối máy chủ: ${err.message}`, 'error');
    }
  };

  const clearServerLogs = async () => {
    try {
      const response = await fetch('/api/bot/clear-logs', { method: 'POST' });
      if (response.ok) {
        setLogs([]);
        showPopup('Đã xóa sạch log hoạt động!', 'success');
      }
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  };

  // Sync bot status from backend
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/bot/status');
        if (response.ok) {
          const data = await response.json();
          setIsAutoRunning(data.isAutoRunning);
          setAutoPhase(data.autoPhase);
          setCountdown(data.countdown);
          setCreationCountdown(data.creationCountdown);
          setLogs(data.logs || []);
          setScanCount(data.scanCount);
          setLikeOrderCount(data.likeOrderCount);
          setViewOrderCount(data.viewOrderCount);

          if (data.isAutoRunning) {
            if (data.autoTiktokLink) setAutoTiktokLink(data.autoTiktokLink);
            if (data.autoTimeWindow) setAutoTimeWindow(data.autoTimeWindow);
            if (data.cookieString && window.location.hash !== '#/settings') {
              setCookieString(data.cookieString);
            }
            if (data.apiKey) setApiKey(data.apiKey);
          }
          setBotStartTime(data.startTime);
          if (data.autoCheckInterval) setAutoCheckInterval(data.autoCheckInterval);
        }
      } catch (err) {
        console.error('Error fetching bot status:', err);
      }
    };

    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 1500);
    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (!isAutoRunning || !botStartTime) {
      setRunningTimeStr('00:00:00');
      return;
    }

    const updateTimer = () => {
      const diffMs = Date.now() - botStartTime;
      if (diffMs <= 0) {
        setRunningTimeStr('00:00:00');
        return;
      }
      const totalSecs = Math.floor(diffMs / 1000);
      const secs = totalSecs % 60;
      const mins = Math.floor(totalSecs / 60) % 60;
      const hours = Math.floor(totalSecs / 3600);
      const pad = (num) => String(num).padStart(2, '0');
      setRunningTimeStr(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isAutoRunning, botStartTime]);

  // Helper to format currency
  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '0 ₫';
    const cleanVal = typeof val === 'string' ? val.replace(/[^\d]/g, '') : val;
    const num = Number(cleanVal);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Get status class for badge styling
  const getStatusBadgeClass = (status = '') => {
    const s = status.toLowerCase().replace(/\s+/g, '');
    if (s.includes('hoànthành')) return 'badge-completed';
    if (s.includes('đangchạy') || s.includes('đangxửlý') || s.includes('chờduyệt')) return 'badge-processing';
    if (s.includes('đãhủy') || s.includes('khônghoànthành')) return 'badge-canceled';
    return 'badge-pending';
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
    <>
      {/* Popup Notification Container */}
      <div className="popup-container">
        {popups.map(p => (
          <div key={p.id} className={`popup-toast popup-${p.type}`}>
            <span className="popup-icon">
              {p.type === 'success' && '✅'}
              {p.type === 'error' && '❌'}
              {p.type === 'info' && 'ℹ️'}
            </span>
            <span className="popup-message">{p.message}</span>
            <button className="popup-close" onClick={() => setPopups(prev => prev.filter(x => x.id !== p.id))}>×</button>
          </div>
        ))}
      </div>

      <Routes>
        <Route element={<Layout
          isAutoRunning={isAutoRunning}
          connectionStatus={connectionStatus}
          likeOrderCount={likeOrderCount}
          viewOrderCount={viewOrderCount}
          context={{
            isAutoRunning,
            autoTiktokLink,
            setAutoTiktokLink,
            autoTimeWindow,
            setAutoTimeWindow,
            countdown,
            creationCountdown,
            logs,
            setLogs,
            scanCount,
            likeOrderCount,
            viewOrderCount,
            autoPhase,
            recentOrders,
            setRecentOrders,
            handleSaveLinkToFile,
            stopAutoBot,
            startAutoBot,
            handlePlaceOrder,
            serviceType,
            setServiceType,
            selectedServer,
            setSelectedServer,
            tiktokLink,
            setTiktokLink,
            orderIdToCheck,
            setOrderIdToCheck,
            handleCheckStatus,
            checkingStatus,
            statusResult,
            checkRecentOrderStatus,
            getStatusBadgeClass,
            formatCurrency,
            INITIAL_SERVICES,
            clearServerLogs,
            showPopup,
            cookieString,
            setCookieString,
            handleCookieChange,
            connectionStatus,
            setConnectionStatus,
            fetchScrapedHistory,
            historyLoading,
            handleSaveCookie,
            handleClearCookie,
            getFilteredOrders,
            historyFilter,
            setHistoryFilter,
            historyScope,
            setHistoryScope,
            historySearch,
            setHistorySearch,
            runningTimeStr,
            autoCheckInterval,
            setAutoCheckInterval
          }}
        />}>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
