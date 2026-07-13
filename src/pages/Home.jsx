import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Home() {
  const {
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
    runningTimeStr,
    autoCheckInterval,
    setAutoCheckInterval
  } = useOutletContext();

  const [activeTab, setActiveTab] = useState('auto'); // 'auto' | 'order' | 'status'
  const logEndRef = useRef(null);

  // Auto scroll terminal logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showPopup('Đã copy toàn bộ log vào clipboard!', 'success');
    });
  };

  return (
    <div className="dashboard-grid">
      {/* LEFT COLUMN: Auto Bot Controls & Live Terminal */}
      <div className="dashboard-col flex-col">
        {/* Card 1: Bot Auto Settings */}
        <div className="card glass-card border-glow-blue">
          <div className="card-header">
            <h2 className="card-title">🤖 Bot Tự Động Quét Đơn</h2>
            <div className="pulse-indicator">
              <span className={`pulse-dot ${isAutoRunning ? 'active-glow' : ''}`}></span>
              <span className="pulse-text">{isAutoRunning ? 'Đang chạy' : 'Đã dừng'}</span>
            </div>
          </div>

          <div className="card-body">
            <div className="form-group">
              <label className="form-label">
                Link Video TikTok Auto
              </label>
              <div className="flex-row">
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={autoTiktokLink}
                    onChange={(e) => setAutoTiktokLink(e.target.value)}
                    placeholder="Dán link video TikTok để tự động chạy..."
                    disabled={isAutoRunning}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  {autoTiktokLink && !isAutoRunning && (
                    <button
                      type="button"
                      onClick={() => setAutoTiktokLink('')}
                      className="input-clear-btn"
                      title="Xóa link"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-outline border-cyan text-cyan"
                  onClick={handleSaveLinkToFile}
                  disabled={isAutoRunning || !autoTiktokLink}
                >
                  Lưu File
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Khoảng thời gian quét lịch sử</label>
              <select
                className="form-select"
                value={autoTimeWindow}
                onChange={(e) => setAutoTimeWindow(e.target.value)}
                disabled={isAutoRunning}
              >
                <option value="1h">1 Giờ gần nhất</option>
                <option value="2h">2 Giờ gần nhất</option>
                <option value="4h">4 Giờ gần nhất</option>
                <option value="6h">6 Giờ gần nhất</option>
                <option value="12h">12 Giờ gần nhất</option>
                <option value="24h">24 Giờ gần nhất</option>
                <option value="all">Toàn bộ lịch sử</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Thời gian bot kiểm tra đơn</label>
              <select
                className="form-select"
                value={autoCheckInterval}
                onChange={(e) => setAutoCheckInterval(Number(e.target.value))}
                disabled={isAutoRunning}
              >
                <option value={30}>30 Giây</option>
                <option value={60}>1 Phút</option>
                <option value={120}>2 Phút</option>
                <option value={300}>5 Phút</option>
                <option value={420}>7 Phút (Mặc định)</option>
                <option value={600}>10 Phút</option>
                <option value={900}>15 Phút</option>
                <option value={1800}>30 Phút</option>
              </select>
            </div>

            {/* Countdown Panels */}
            {isAutoRunning && autoPhase === 'checking' && (
              <div className="countdown-panel checking">
                <span className="pulse-dot-pink"></span>
                <span>Đang quét trạng thái đơn hàng Like.vn...</span>
                <div className="countdown-time">
                  Quét lại sau: <strong>{countdown}s</strong>
                </div>
              </div>
            )}

            {isAutoRunning && autoPhase === 'creating' && (
              <div className="countdown-panel creating">
                <span className="pulse-dot-cyan"></span>
                <span>Đang tạo đơn miễn phí Like.vn...</span>
                <div className="countdown-time highlighted">
                  Đợi xử lý: <strong>{creationCountdown}s</strong>
                </div>
              </div>
            )}

            {/* Bot statistics */}
            {(isAutoRunning || scanCount > 0) && (
              <div className="stats-box">
                <div className="stats-header">Thống Kê Chạy Auto</div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Thời gian chạy</span>
                    <strong className="stat-value text-cyan">{runningTimeStr}</strong>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Số lần quét</span>
                    <strong className="stat-value text-blue">{scanCount}</strong>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Đơn Like (SV4)</span>
                    <strong className="stat-value text-pink">{likeOrderCount}</strong>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Đơn View (SV5)</span>
                    <strong className="stat-value text-green">{viewOrderCount}</strong>
                  </div>
                </div>
              </div>
            )}

            {isAutoRunning ? (
              <button type="button" onClick={stopAutoBot} className="btn btn-danger btn-block">
                🔴 DỪNG BOT AUTO
              </button>
            ) : (
              <button type="button" onClick={startAutoBot} className="btn btn-secondary btn-block">
                ⚡ BẮT ĐẦU BOT AUTO
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Live logs terminal */}
        <div className="card glass-card terminal-card">
          <div className="card-header">
            <h2 className="card-title">🖥️ Console Logs hoạt động</h2>
            <div className="flex-row gap-xs">
              {logs.length > 0 && (
                <>
                  <button onClick={handleCopyLogs} className="btn btn-xs btn-outline">
                    Copy Log
                  </button>
                  <button onClick={clearServerLogs} className="btn btn-xs btn-outline border-red text-red">
                    Xóa Log
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="terminal-body" ref={logEndRef}>
            {logs.map((log, index) => (
              <div key={index} className="terminal-line">
                <span className="terminal-time">[{log.time}]</span>{' '}
                <span className="terminal-text">{log.text}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="terminal-empty">
                Chưa có hoạt động nào. Vui lòng bấm "BẮT ĐẦU BOT AUTO" hoặc dán Cookies để chạy bot.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Tab Forms & Recent Orders */}
      <div className="dashboard-col flex-col">
        {/* Card 3: Interactive Action Forms */}
        <div className="card glass-card">
          <div className="tabs-header">
            <button
              className={`tab-link ${activeTab === 'order' ? 'active' : ''}`}
              onClick={() => setActiveTab('order')}
            >
              🚀 Tạo đơn nhanh
            </button>
            <button
              className={`tab-link ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              🔍 Tra cứu đơn
            </button>
          </div>

          <div className="card-body">
            {/* Tab: Place Order */}
            {activeTab === 'order' && (
              <form onSubmit={handlePlaceOrder} className="flex-col gap-md">
                <div className="form-group">
                  <label className="form-label">Chọn Loại Dịch Vụ</label>
                  <div className="flex-row">
                    <label className={`radio-label ${serviceType === 'like' ? 'selected-pink' : ''}`}>
                      <input
                        type="radio"
                        checked={serviceType === 'like'}
                        onChange={() => setServiceType('like')}
                      />
                      Tăng Tim (Likes)
                    </label>
                    <label className={`radio-label ${serviceType === 'view' ? 'selected-cyan' : ''}`}>
                      <input
                        type="radio"
                        checked={serviceType === 'view'}
                        onChange={() => setServiceType('view')}
                      />
                      Tăng View
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
                  <div className="static-qty-badge">
                    {selectedServer.min} {serviceType === 'like' ? 'Tim' : 'Lượt xem'} (Cố định cho máy chủ miễn phí)
                  </div>
                </div>

                <div className="price-display-box">
                  <div className="price-row">
                    <span>Máy chủ:</span>
                    <strong className="text-cyan">{selectedServer.name}</strong>
                  </div>
                  <div className="price-row highlight-border">
                    <span>Tổng Chi Phí:</span>
                    <strong className="text-free">MIỄN PHÍ (0 đ)</strong>
                  </div>
                </div>

                <button type="submit" className="btn btn-secondary btn-block">
                  TẠO ĐƠN NGAY
                </button>
              </form>
            )}

            {/* Tab: Check Order Status */}
            {activeTab === 'status' && (
              <div className="flex-col gap-md">
                <div className="form-group">
                  <label className="form-label">Mã Đơn Hàng (Order ID)</label>
                  <div className="flex-row">
                    <input
                      type="text"
                      className="form-input"
                      value={orderIdToCheck}
                      onChange={(e) => setOrderIdToCheck(e.target.value)}
                      placeholder="Nhập mã đơn hàng Like.vn..."
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleCheckStatus()}
                      disabled={checkingStatus}
                      style={{ width: 'auto', padding: '0 1.5rem' }}
                    >
                      {checkingStatus ? 'Đang check...' : 'Kiểm tra'}
                    </button>
                  </div>
                </div>

                {statusResult && (
                  <div className="status-result-card">
                    <div className="status-result-header">
                      <span>Đơn hàng #{statusResult.orderId}</span>
                      <span className={`badge ${getStatusBadgeClass(statusResult.status)}`}>
                        {statusResult.status}
                      </span>
                    </div>
                    <div className="status-row">
                      <span>Chi Phí:</span>
                      <strong>{formatCurrency(statusResult.charge)}</strong>
                    </div>
                    <div className="status-row">
                      <span>Bắt Đầu Từ:</span>
                      <span>{statusResult.start_count} lượt</span>
                    </div>
                    <div className="status-row">
                      <span>Còn Lại:</span>
                      <span>{statusResult.remains} lượt</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Recent Session History */}
        <div className="card glass-card">
          <div className="card-header">
            <h2 className="card-title">📦 Đơn hàng vừa tạo (Phiên này)</h2>
            {recentOrders.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Xóa lịch sử phiên này?')) setRecentOrders([]);
                }}
                className="text-clear-btn"
              >
                Clear
              </button>
            )}
          </div>

          <div className="card-body" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {recentOrders.length === 0 ? (
              <div className="empty-text">
                Chưa có đơn hàng nào được tạo trong phiên làm việc này.
              </div>
            ) : (
              <div className="recent-orders-list">
                {recentOrders.map((order) => (
                  <div key={order.orderId} className="recent-order-item">
                    <div className="order-details">
                      <strong className="order-service">{order.serviceName}</strong>
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="order-link"
                      >
                        {order.link}
                      </a>
                      <div className="order-meta">
                        <span>{order.date}</span>
                        <span>• SL: {order.quantity}</span>
                      </div>
                    </div>
                    <div className="order-actions">
                      <span className="order-id">ID: #{order.orderId}</span>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => checkRecentOrderStatus(order.orderId)}
                        className="btn btn-xs btn-outline"
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
    </div>
  );
}
