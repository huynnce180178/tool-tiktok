import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Home() {
  const {
    isAutoRunning,
    autoLinks,
    setAutoLinks,
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

  const addLinkField = () => {
    setAutoLinks(prev => [
      ...prev,
      {
        id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: '',
        targetOrders: 4,
        currentOrders: 0,
        mode: 'all',
        status: 'pending'
      }
    ]);
  };

  const removeLinkField = (id) => {
    if (autoLinks.length <= 1) return;
    setAutoLinks(prev => prev.filter(l => l.id !== id));
  };

  const updateLinkField = (id, field, value) => {
    setAutoLinks(prev =>
      prev.map(l => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

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
              <label className="form-label">Danh sách Video TikTok chạy Auto</label>
              
              <div className="flex-col gap-sm" style={{ marginBottom: '1rem' }}>
                {autoLinks.map((link, idx) => (
                  <div key={link.id} className="queue-item-card" style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div className="flex-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge text-xs" style={{
                        background: 'rgba(0, 242, 254, 0.1)',
                        color: '#00f2fe',
                        padding: '0.2rem 0.5rem',
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={link.url}
                        onChange={(e) => updateLinkField(link.id, 'url', e.target.value)}
                        placeholder="Dán link video TikTok..."
                        disabled={isAutoRunning}
                        style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                      />
                      {link.url && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-xs btn-outline border-pink text-pink"
                          style={{
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 0.5rem',
                            height: '32px'
                          }}
                        >
                          Mở
                        </a>
                      )}
                      {autoLinks.length > 1 && !isAutoRunning && (
                        <button
                          type="button"
                          className="btn btn-xs btn-outline border-red text-red"
                          onClick={() => removeLinkField(link.id)}
                          style={{ padding: '0 0.5rem', height: '32px' }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-row" style={{ gap: '0.75rem' }}>
                      {/* Target Orders */}
                      <div style={{ flex: 1 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.6)' }}>
                          Chỉ tiêu (số đơn)
                        </label>
                        <input
                          type="number"
                          className="form-input text-xs"
                          value={link.targetOrders}
                          onChange={(e) => updateLinkField(link.id, 'targetOrders', Math.max(1, Number(e.target.value)))}
                          min={1}
                          disabled={isAutoRunning}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        />
                      </div>
                      
                      {/* Mode select */}
                      <div style={{ flex: 1.5 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: 'rgba(255,255,255,0.6)' }}>
                          Chế độ chạy
                        </label>
                        <select
                          className="form-select text-xs"
                          value={link.mode}
                          onChange={(e) => updateLinkField(link.id, 'mode', e.target.value)}
                          disabled={isAutoRunning}
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', height: '32px' }}
                        >
                          <option value="all">1 đơn View + 1 đơn Like</option>
                          <option value="all_like_first">1 đơn Like + 1 đơn View</option>
                          <option value="like">Chỉ chạy đơn Like</option>
                          <option value="view">Chỉ chạy đơn View</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Status progress bar and label */}
                    <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Đã chạy: <strong style={{ color: '#00f2fe' }}>{link.currentOrders || 0}</strong> / <strong style={{ color: '#fff' }}>{link.targetOrders}</strong> đơn
                      </span>
                      <span className={`badge ${
                        link.status === 'completed' ? 'badge-completed' :
                        link.status === 'running' ? 'badge-processing' : 'badge-pending'
                      }`} style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        background: link.status === 'completed' ? 'rgba(46, 204, 113, 0.15)' : link.status === 'running' ? 'rgba(241, 196, 15, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: link.status === 'completed' ? '#2ecc71' : link.status === 'running' ? '#f1c40f' : '#888'
                      }}>
                        {link.status === 'completed' ? 'Hoàn thành' :
                         link.status === 'running' ? 'Đang chạy' : 'Chờ chạy'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {!isAutoRunning && (
                <div className="flex-row gap-sm" style={{ marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline border-cyan text-cyan text-xs btn-block"
                    onClick={addLinkField}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      flex: 2,
                      height: '36px'
                    }}
                  >
                    ➕ Thêm Link Video
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline border-cyan text-cyan text-xs"
                    onClick={handleSaveLinkToFile}
                    disabled={isAutoRunning}
                    style={{ flex: 1, height: '36px' }}
                  >
                    Lưu File
                  </button>
                </div>
              )}
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
                  <div className="flex-row">
                    <input
                      type="text"
                      className="form-input"
                      value={tiktokLink}
                      onChange={(e) => setTiktokLink(e.target.value)}
                      placeholder="https://www.tiktok.com/@username/video/..."
                      required
                    />
                    {tiktokLink && (
                      <a
                        href={tiktokLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline border-pink text-pink"
                        style={{ textDecoration: 'none', width: 'auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Mở
                      </a>
                    )}
                  </div>
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

        {/* Card 2: Live logs terminal */}
        <div className="card glass-card terminal-card">
          <div className="card-header">
            <h2 className="card-title">🖥️ Console Logs hoạt động</h2>
            <div className="flex-row gap-xs">
              {logs.length > 0 && (
                <button onClick={handleCopyLogs} className="btn btn-xs btn-outline">
                  Copy Log
                </button>
              )}
              <button onClick={clearServerLogs} className="btn btn-xs btn-outline border-red text-red">
                Xóa Log
              </button>
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
    </div>
  );
}
