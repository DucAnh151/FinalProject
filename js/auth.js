/**
 * auth.js — Auth guard & session management
 * Include trên mọi trang cần bảo vệ (trước db.js)
 */

const Auth = {
  SESSION_KEY: 'pam_user',

  // Lưu user vào sessionStorage sau khi login
  save(user) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  },

  // Lấy user hiện tại
  get() {
    try {
      return JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
    } catch {
      return null;
    }
  },

  // Kiểm tra đã đăng nhập chưa
  isLoggedIn() {
    return !!this.get();
  },

  // Đăng xuất
  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = this._loginPath();
  },

  // Tính đường dẫn đến login.html tương đối với trang hiện tại
  _loginPath() {
    const depth = window.location.pathname.split('/').filter(Boolean).length;
    // Nếu đang ở /pages/xyz.html → cần ../login.html
    // Nếu ở root index.html → login.html
    const inPages = window.location.pathname.includes('/pages/');
    return inPages ? '../login.html' : 'login.html';
  },

  // Gọi ở đầu mỗi trang cần auth — redirect nếu chưa login
  require() {
    if (!this.isLoggedIn()) {
      window.location.href = this._loginPath();
      return false;
    }
    this._renderUserBar();
    return true;
  },

  // Render tên + role + nút logout trên nav
  _renderUserBar() {
    const user = this.get();
    if (!user) return;

    // Chờ DOM sẵn sàng
    const inject = () => {
      const nav = document.querySelector('nav');
      if (!nav) return;

      // Tránh inject 2 lần
      if (document.getElementById('user-bar')) return;

      const roleColor = { ADMIN: '#e85d2f', DRIVER: '#f0a500', CUSTOMER: '#2d7a4f' };
      const bar = document.createElement('div');
      bar.id = 'user-bar';
      bar.style.cssText = `
        display:flex; align-items:center; gap:0.75rem;
        font-size:0.82rem; color:#ccc;
      `;
      bar.innerHTML = `
        <span style="color:${roleColor[user.role] || '#aaa'}; font-weight:600; font-size:0.72rem;
              background:rgba(255,255,255,0.08); padding:0.2rem 0.6rem; border-radius:20px;">
          ${user.role}
        </span>
        <span>${user.fullName || user.phone || user.email}</span>
        <button onclick="Auth.logout()" style="
          background:none; border:1px solid #444; color:#888;
          padding:0.25rem 0.7rem; border-radius:4px; cursor:pointer;
          font-size:0.78rem; font-family:inherit; transition:all 0.15s;
        " onmouseover="this.style.borderColor='#e85d2f';this.style.color='#e85d2f'"
           onmouseout="this.style.borderColor='#444';this.style.color='#888'">
          Đăng xuất
        </button>
      `;
      nav.appendChild(bar);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inject);
    } else {
      inject();
    }
  }
};

// Auto-guard: nếu script được load trên trang không phải login.html
// thì kiểm tra session ngay
(function() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  if (!isLoginPage) {
    // Đợi DOM parse xong rồi mới redirect (tránh flash)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => Auth.require());
    } else {
      Auth.require();
    }
  }
})();

