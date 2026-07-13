import React from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Settings() {
  const {
    cookieString,
    handleCookieChange,
    connectionStatus,
    fetchScrapedHistory,
    historyLoading,
    handleSaveCookie,
    handleClearCookie
  } = useOutletContext();

  return (
    <div className="card glass-card max-width-lg border-glow-green" style={{ margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title text-green">⚙️ Cấu Hình Hệ Thống</h2>
        
        {/* Dynamic connection status badge */}
        <div className={`status-badge-header ${connectionStatus}`}>
          Trạng thái Like.vn:{' '}
          <strong>
            {connectionStatus === 'success' && 'KẾT NỐI THÀNH CÔNG (OK)'}
            {connectionStatus === 'failed' && 'LỖI KẾT NỐI / COOKIE HẾT HẠN'}
            {connectionStatus === 'checking' && 'ĐANG KẾT NỐI...'}
            {connectionStatus === 'none' && 'CHƯA CẤU HÌNH'}
          </strong>
        </div>
      </div>

      <div className="card-body flex-col gap-md">
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Like.vn Session Cookies (Scraper)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Dán Cookie định dạng Netscape hoặc Cookie thô
            </span>
          </label>
          <textarea
            className="form-textarea"
            rows="8"
            style={{ fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
            value={cookieString}
            onChange={(e) => handleCookieChange(e.target.value)}
            placeholder={"# Netscape HTTP Cookie File\nlike.vn\tFALSE\t/\tFALSE\t...\n\nHoặc dán chuỗi cookie thông thường..."}
          />
        </div>

        <div className="flex-row gap-sm" style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.6rem 1.5rem',
              width: 'auto',
              background: '#10b981',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
            }}
            onClick={handleSaveCookie}
          >
            Lưu Cookie
          </button>
          
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.6rem 1.5rem', width: 'auto' }}
            onClick={() => fetchScrapedHistory()}
            disabled={historyLoading}
          >
            {historyLoading ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>

          {cookieString && (
            <button
              type="button"
              className="btn btn-outline border-red text-red"
              style={{ padding: '0.6rem 1.5rem', width: 'auto' }}
              onClick={handleClearCookie}
            >
              Xóa Cookie
            </button>
          )}
        </div>

        <div className="info-box-cyan">
          <h4>💡 Hướng dẫn lấy Cookie từ Like.vn:</h4>
          <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0 0 0', fontSize: '0.82rem', lineHeight: '1.4rem' }}>
            <li>Đăng nhập tài khoản của bạn tại trang web <a href="https://like.vn" target="_blank" rel="noopener noreferrer" style={{ color: '#00f2fe' }}>like.vn</a>.</li>
            <li>Cài đặt một Extension xuất Cookie (ví dụ: <em>Get Cookie.txt</em> hoặc <em>EditThisCookie</em>) trên trình duyệt Chrome/Edge của bạn.</li>
            <li>Sao chép toàn bộ nội dung Cookie dạng Netscape của trang Like.vn từ extension đó và dán trực tiếp vào ô văn bản phía trên.</li>
            <li>Nhấn <strong>Lưu Cookie</strong> để ghi nhận — trang sẽ tự động tải lại.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
