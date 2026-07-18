import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout({ isAutoRunning, connectionStatus, likeOrderCount, viewOrderCount, likeVnUsername, context }) {
  return (
    <div className="app-container">
      {/* Background Glows */}
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      {/* Top Navbar */}
      <header className="navbar">
        <div className="navbar-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">
            TikTok <span className="highlight">Booster</span>
          </span>
        </div>

        <nav className="navbar-links">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end
          >
            Trang chủ
          </NavLink>
          <NavLink 
            to="/history" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Lịch sử Like.vn
          </NavLink>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            Cấu hình
          </NavLink>
        </nav>

        {/* Live Status Indicators */}
        <div className="navbar-status">
          {isAutoRunning && (
            <div className="live-badge pulsing">
              <span className="dot"></span>
              BOT ĐANG CHẠY ({likeOrderCount + viewOrderCount} đơn)
            </div>
          )}
          
          <div className={`status-badge-mini ${connectionStatus}`}>
            {connectionStatus === 'success' && '🟢 Kết nối Like.vn OK'}
            {connectionStatus === 'failed' && '🔴 Mất kết nối'}
            {connectionStatus === 'checking' && '🟡 Đang kiểm tra...'}
            {connectionStatus === 'none' && '⚪ Chưa cấu hình'}
          </div>

          {connectionStatus === 'success' && likeVnUsername && (
            <div className="status-badge-mini success" style={{ color: 'var(--text-primary)' }}>
              👤 {likeVnUsername}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content-main">
        <Outlet context={context} />
      </main>

      {/* Modern Footer */}
      <footer className="footer">
        <p>© 2026 TikTok Booster • Hoạt động dưới Local • Không cần Deploy</p>
      </footer>
    </div>
  );
}
