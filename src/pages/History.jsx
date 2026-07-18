import React from 'react';
import { useOutletContext } from 'react-router-dom';

export default function History() {
  const {
    scrapedOrders,
    historyLoading,
    historyFilter,
    setHistoryFilter,
    historyScope,
    setHistoryScope,
    historySearch,
    setHistorySearch,
    fetchScrapedHistory,
    checkRecentOrderStatus,
    getStatusBadgeClass,
    formatCurrency,
    getFilteredOrders
  } = useOutletContext();

  // Auto-refresh the order history list every 10 seconds silently
  const fetchRef = React.useRef(fetchScrapedHistory);
  React.useEffect(() => {
    fetchRef.current = fetchScrapedHistory;
  });

  React.useEffect(() => {
    // Initial fetch on mount to make sure it's fresh (shows loading spinner)
    fetchRef.current();

    const interval = setInterval(() => {
      fetchRef.current(true);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  const filtered = getFilteredOrders();

  return (
    <div className="card glass-card border-glow-pink">
      <div className="card-header flex-wrap">
        <h2 className="card-title text-pink">📦 Danh Sách Đơn Hệ Thống (Like.vn)</h2>
        <button
          onClick={() => fetchScrapedHistory()}
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
          disabled={historyLoading}
        >
          {historyLoading ? 'Đang tải đơn...' : '🔄 Làm mới danh sách'}
        </button>
      </div>

      <div className="card-body">
        {/* Search & Filter Bar */}
        <div className="filter-bar">
          {/* Scope selection: Today vs All */}
          <div className="btn-group">
            <button
              onClick={() => setHistoryScope('today')}
              className={`btn-toggle ${historyScope === 'today' ? 'active' : ''}`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setHistoryScope('all')}
              className={`btn-toggle ${historyScope === 'all' ? 'active' : ''}`}
            >
              Tất cả đơn
            </button>
          </div>

          {/* Status Pills */}
          <div className="pills-container">
            {['Tất cả', 'Đang xử lý', 'Hoàn thành', 'Đã hủy'].map((filter) => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter.toLowerCase())}
                className={`pill-btn ${historyFilter === filter.toLowerCase() ? 'active' : ''}`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="search-box">
            <input
              type="text"
              className="form-input text-sm"
              placeholder="Tìm mã đơn, link video..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {historyLoading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p className="spinner-text">Đang đồng bộ lịch sử đơn hàng từ Like.vn...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            Không tìm thấy đơn hàng nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '50px' }}>STT</th>
                  <th>Mã đơn / Ngày tạo</th>
                  <th>Dịch vụ / Link TikTok</th>
                  <th className="text-center">Số lượng / Chạy</th>
                  <th className="text-center">Thanh toán</th>
                  <th className="text-center">Trạng thái</th>
                  <th className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, index) => (
                  <tr key={order.dbId} className="table-row-hover">
                    {/* STT */}
                    <td className="text-center text-muted" style={{ fontWeight: 'bold' }}>
                      {index + 1}
                    </td>
                    {/* 1. Code & Date */}
                    <td>
                      <div className="flex-col gap-xs">
                        <span className="order-code">{order.orderId}</span>
                        <span className="order-date">Tạo: {order.createdAt}</span>
                        {order.updatedAt && (
                          <span className="order-date text-muted">Sửa: {order.updatedAt}</span>
                        )}
                      </div>
                    </td>
                    {/* 2. Service & Link */}
                    <td style={{ maxWidth: '320px' }}>
                      <div className="flex-col gap-xs">
                        <span className="order-service-name">{order.serviceName}</span>
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="order-link-anchor"
                          title={order.link}
                        >
                          {order.link}
                        </a>
                      </div>
                    </td>
                    {/* 3. Quantity / Running */}
                    <td className="text-center">
                      <div className="qty-meta">
                        <span className="text-bold">SL: {order.quantity}</span>
                        <span className="text-xs text-muted">Bắt đầu: {order.startCount}</span>
                        <span className="text-xs text-green">Đã chạy: {order.runCount}</span>
                      </div>
                    </td>
                    {/* 4. Payment */}
                    <td className="text-center text-secondary text-medium">
                      {formatCurrency(order.charge)}
                    </td>
                    {/* 5. Status */}
                    <td className="text-center">
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    {/* 6. Check Action */}
                    <td className="text-center">
                      <button
                        onClick={() => checkRecentOrderStatus(order.orderId)}
                        className="btn btn-xs btn-outline border-cyan text-cyan"
                      >
                        Check
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
