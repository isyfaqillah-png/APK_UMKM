// DesaBiz AI - Modul Authentication & Profil UMKM
import { Icons } from '../../icons.js';
import { appState } from '../../state.js';

export const AuthModule = {
  id: 'auth',
  title: 'Autentikasi & Profil UMKM',
  subtitle: 'Manajemen akun, data legalitas usaha desa, dan verifikasi',

  // Render method dispatches based on subroute or state
  render: (container, route = 'profile') => {
    if (route === 'login') {
      AuthModule.renderLogin(container);
    } else if (route === 'register') {
      AuthModule.renderRegister(container);
    } else if (route === 'profile-edit') {
      AuthModule.renderEditProfile(container);
    } else if (route === 'logout') {
      AuthModule.handleLogout();
    } else {
      AuthModule.renderProfile(container);
    }
  },

  // ==========================================
  // 1. HALAMAN LOGIN
  // ==========================================
  renderLogin: (container) => {
    container.innerHTML = `
      <div class="auth-container fade-in">
        <div class="auth-card">
          <div class="auth-header">
            <div class="auth-logo-badge">
              ${Icons.logo}
            </div>
            <h1 class="auth-title">Masuk ke DesaBiz AI</h1>
            <p class="auth-subtitle">Platform B2B terpadu untuk pelaku UMKM dan supplier pedesaan</p>
          </div>

          <div class="auth-body">
            <!-- Demo Account Quick Fill Button -->
            <div class="demo-account-box">
              <div class="demo-account-info">
                <strong>Akun Demo Siap Pakai:</strong>
                <span>budi.tanimakmur@desabiz.id • pass: password123</span>
                <span>admin@desabiz.id • pass: admin123 (role ADMIN)</span>
              </div>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-fill-demo">
                  Akun UMKM
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-fill-admin">
                  Akun Admin
                </button>
              </div>
            </div>

            <!-- Login Form -->
            <form id="login-form" novalidate>
              <div id="login-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: #fef2f2; color: #b91c1c; font-size: 0.825rem; font-weight: 600; margin-bottom: 1.25rem; border: 1px solid #fecaca;"></div>

              <div class="form-group">
                <label class="form-label" for="login-email">
                  <span>Alamat Email</span>
                  <span class="required-star">*</span>
                </label>
                <div class="form-input-wrapper">
                  <input 
                    type="email" 
                    id="login-email" 
                    class="form-input" 
                    placeholder="nama@email.com" 
                    required 
                    autocomplete="email"
                  />
                </div>
                <div class="form-error" id="err-login-email" style="display: none;"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="login-password">
                  <span>Kata Sandi</span>
                  <span class="required-star">*</span>
                </label>
                <div class="form-input-wrapper">
                  <input 
                    type="password" 
                    id="login-password" 
                    class="form-input" 
                    placeholder="Masukkan kata sandi" 
                    required 
                    autocomplete="current-password"
                  />
                  <button type="button" class="toggle-password-btn" id="btn-toggle-pwd" title="Lihat/Sembunyikan Sandi">
                    👁️
                  </button>
                </div>
                <div class="form-error" id="err-login-password" style="display: none;"></div>
              </div>

              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; font-size: 0.8rem;">
                <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: var(--text-muted);">
                  <input type="checkbox" id="remember-me" checked />
                  <span>Ingat sesi saya</span>
                </label>
                <a href="javascript:void(0)" id="link-forgot-pwd" style="color: var(--color-primary); font-weight: 600;">Lupa Sandi?</a>
              </div>

              <button type="submit" class="btn btn-primary w-full btn-lg" id="btn-submit-login">
                Masuk ke DesaBiz AI
              </button>
            </form>
          </div>

          <div class="auth-footer">
            Belum memiliki akun UMKM? <a href="#/register">Daftar Akun Baru</a>
          </div>
        </div>
      </div>
    `;

    // Events
    const form = container.querySelector('#login-form');
    const emailInput = container.querySelector('#login-email');
    const pwdInput = container.querySelector('#login-password');
    const togglePwdBtn = container.querySelector('#btn-toggle-pwd');
    const demoBtn = container.querySelector('#btn-fill-demo');
    const alertBox = container.querySelector('#login-alert');

    // Quick Fill Demo
    demoBtn.onclick = () => {
      emailInput.value = 'budi.tanimakmur@desabiz.id';
      pwdInput.value = 'password123';
      alertBox.style.display = 'none';
      emailInput.classList.remove('is-invalid');
      pwdInput.classList.remove('is-invalid');
    };

    // Quick Fill Akun Administrator (role ADMIN)
    const adminBtn = container.querySelector('#btn-fill-admin');
    if (adminBtn) {
      adminBtn.onclick = () => {
        emailInput.value = 'admin@desabiz.id';
        pwdInput.value = 'admin123';
        alertBox.style.display = 'none';
        emailInput.classList.remove('is-invalid');
        pwdInput.classList.remove('is-invalid');
      };
    }

    // Toggle Password Visibility
    togglePwdBtn.onclick = () => {
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      togglePwdBtn.textContent = isPwd ? '🙈' : '👁️';
    };

    // Forgot password hint
    container.querySelector('#link-forgot-pwd').onclick = () => {
      alert('Untuk akun demo ini, silakan gunakan kata sandi: password123');
    };

    // Submit Validation & Handler
    form.onsubmit = (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      let valid = true;
      const email = emailInput.value.trim();
      const pwd = pwdInput.value;

      // Validate email
      const errEmail = container.querySelector('#err-login-email');
      if (!email) {
        emailInput.classList.add('is-invalid');
        errEmail.textContent = 'Alamat email wajib diisi.';
        errEmail.style.display = 'flex';
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailInput.classList.add('is-invalid');
        errEmail.textContent = 'Format alamat email tidak valid.';
        errEmail.style.display = 'flex';
        valid = false;
      } else {
        emailInput.classList.remove('is-invalid');
        errEmail.style.display = 'none';
      }

      // Validate password
      const errPwd = container.querySelector('#err-login-password');
      if (!pwd) {
        pwdInput.classList.add('is-invalid');
        errPwd.textContent = 'Kata sandi wajib diisi.';
        errPwd.style.display = 'flex';
        valid = false;
      } else {
        pwdInput.classList.remove('is-invalid');
        errPwd.style.display = 'none';
      }

      if (!valid) return;

      const res = appState.login(email, pwd);
      if (res.success) {
        AuthModule.showToast(`Selamat datang kembali, ${res.user.name || res.user.ownerName}!`);
        // Administrator masuk langsung ke Panel Admin; UMKM ke dashboard usaha
        window.location.hash = res.user.accountRole === 'ADMIN' ? '#/admin' : '#/dashboard';
      } else {
        alertBox.textContent = res.message;
        alertBox.style.display = 'block';
      }
    };
  },

  // ==========================================
  // 2. HALAMAN REGISTER
  // ==========================================
  renderRegister: (container) => {
    container.innerHTML = `
      <div class="auth-container fade-in">
        <div class="auth-card auth-card-wide">
          <div class="auth-header">
            <div class="auth-logo-badge">
              ${Icons.logo}
            </div>
            <h1 class="auth-title">Pendaftaran Akun UMKM Desa</h1>
            <p class="auth-subtitle">
              Daftarkan usaha Anda di platform DesaBiz AI. 
              <strong>Satu akun otomatis dapat bertindak sebagai Pembeli Pasokan maupun Penjual Komoditas.</strong>
            </p>
          </div>

          <div class="auth-body">
            <form id="register-form" novalidate>
              <div id="register-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: #fef2f2; color: #b91c1c; font-size: 0.825rem; font-weight: 600; margin-bottom: 1.25rem; border: 1px solid #fecaca;"></div>

              <!-- BAGIAN 1: KREDENSIAL AKUN & PEMILIK -->
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 1rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 0.4rem;">
                  <span>👤</span> Bagian 1: Data Pemilik & Akun
                </h3>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="reg-owner">
                      <span>Nama Pemilik Usaha</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="text" id="reg-owner" class="form-input" placeholder="Contoh: Siti Rahmawati" required />
                    <div class="form-error" id="err-reg-owner" style="display: none;"></div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reg-email">
                      <span>Alamat Email</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="email" id="reg-email" class="form-input" placeholder="nama@email.com" required />
                    <div class="form-error" id="err-reg-email" style="display: none;"></div>
                  </div>
                </div>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="reg-phone">
                      <span>Nomor Telepon / WhatsApp</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="tel" id="reg-phone" class="form-input" placeholder="Contoh: 081234567890" required />
                    <div class="form-hint">Digunakan untuk konfirmasi pesanan & komunikasi chat B2B.</div>
                    <div class="form-error" id="err-reg-phone" style="display: none;"></div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reg-password">
                      <span>Kata Sandi</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="password" id="reg-password" class="form-input" placeholder="Minimal 6 karakter" required />
                    <div class="form-error" id="err-reg-password" style="display: none;"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reg-confirm-password">
                    <span>Konfirmasi Kata Sandi</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="password" id="reg-confirm-password" class="form-input" placeholder="Ulangi kata sandi" required />
                  <div class="form-error" id="err-reg-confirm-password" style="display: none;"></div>
                </div>
              </div>

              <!-- BAGIAN 2: PROFIL UMKM & LOKASI SENTRA DESA -->
              <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 1rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 0.4rem;">
                  <span>🌾</span> Bagian 2: Profil Usaha & Lokasi Pedesaan
                </h3>

                <div class="form-grid-2">
                  <div class="form-group">
                    <label class="form-label" for="reg-business">
                      <span>Nama Usaha / UMKM</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="text" id="reg-business" class="form-input" placeholder="Contoh: Kopi Puntang Sejahtera" required />
                    <div class="form-error" id="err-reg-business" style="display: none;"></div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reg-type">
                      <span>Jenis Komoditas / Bidang Usaha</span>
                      <span class="required-star">*</span>
                    </label>
                    <select id="reg-type" class="form-select" required>
                      <option value="">-- Pilih Jenis Usaha --</option>
                      <option value="Pertanian & Komoditas Pangan">Pertanian & Komoditas Pangan</option>
                      <option value="Perkebunan (Kopi, Teh, Rempah)">Perkebunan (Kopi, Teh, Rempah)</option>
                      <option value="Peternakan & Pakan Lokal">Peternakan & Pakan Lokal</option>
                      <option value="Perikanan Air Tawar & Tambak">Perikanan Air Tawar & Tambak</option>
                      <option value="Makanan & Minuman Olahan Lokal">Makanan & Minuman Olahan Lokal</option>
                      <option value="Kerajinan & Produk Khas Desa">Kerajinan & Produk Khas Desa</option>
                    </select>
                    <div class="form-error" id="err-reg-type" style="display: none;"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reg-address">
                    <span>Alamat Lengkap Usaha / Gudang</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="reg-address" class="form-input" placeholder="Jl. Raya Sentra Tani No. 12, RT/RW..." required />
                  <div class="form-error" id="err-reg-address" style="display: none;"></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label" for="reg-village">
                      <span>Desa / Kelurahan</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="text" id="reg-village" class="form-input" placeholder="Nama Desa" required />
                    <div class="form-error" id="err-reg-village" style="display: none;"></div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reg-district">
                      <span>Kecamatan</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="text" id="reg-district" class="form-input" placeholder="Nama Kecamatan" required />
                    <div class="form-error" id="err-reg-district" style="display: none;"></div>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="reg-regency">
                      <span>Kabupaten / Kota</span>
                      <span class="required-star">*</span>
                    </label>
                    <input type="text" id="reg-regency" class="form-input" placeholder="Contoh: Kab. Bandung" required />
                    <div class="form-error" id="err-reg-regency" style="display: none;"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="reg-desc">
                    <span>Deskripsi Profil Usaha & Produk Unggulan</span>
                    <span class="required-star">*</span>
                  </label>
                  <textarea id="reg-desc" class="form-textarea" placeholder="Jelaskan jenis pasokan atau produk yang dihasilkan, kapasitas produksi, dan pengalaman usaha desa Anda..."></textarea>
                  <div class="form-hint">Membantu calon supplier atau pembeli B2B lain mengenal kapasitas usaha Anda.</div>
                  <div class="form-error" id="err-reg-desc" style="display: none;"></div>
                </div>
              </div>

              <!-- PEMBERITAHUAN DUAL-ROLE -->
              <div class="dual-role-card" style="margin-bottom: 1.5rem; padding: 1rem 1.25rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                  <span style="font-size: 1.25rem;">🔄</span>
                  <div>
                    <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary-dark);">
                      Satu Akun, Dua Peran Fleksibel
                    </h4>
                    <p style="font-size: 0.775rem; color: var(--text-muted); margin: 0;">
                      Setelah mendaftar, Anda dapat bebas bertindak sebagai <strong>Pembeli</strong> (mencari pasokan dari supplier lain) maupun sebagai <strong>Penjual</strong> (memasarkan produk sendiri) cukup dengan 1 tombol di pojok kanan atas.
                    </p>
                  </div>
                </div>
              </div>

              <button type="submit" class="btn btn-primary w-full btn-lg" id="btn-submit-register">
                Daftarkan UMKM & Mulai Transaksi
              </button>
            </form>
          </div>

          <div class="auth-footer">
            Sudah memiliki akun? <a href="#/login">Masuk ke Sesi Anda</a>
          </div>
        </div>
      </div>
    `;

    // Events & Form Validation
    const form = container.querySelector('#register-form');
    const alertBox = container.querySelector('#register-alert');

    form.onsubmit = (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      let isValid = true;
      const getVal = (id) => container.querySelector(`#${id}`).value.trim();
      const setErr = (id, msg) => {
        const input = container.querySelector(`#${id}`);
        const errEl = container.querySelector(`#err-${id}`);
        if (msg) {
          input.classList.add('is-invalid');
          errEl.textContent = msg;
          errEl.style.display = 'flex';
          isValid = false;
        } else {
          input.classList.remove('is-invalid');
          errEl.style.display = 'none';
        }
      };

      const ownerName = getVal('reg-owner');
      const email = getVal('reg-email');
      const phone = getVal('reg-phone');
      const password = container.querySelector('#reg-password').value;
      const confirmPassword = container.querySelector('#reg-confirm-password').value;
      const businessName = getVal('reg-business');
      const businessType = container.querySelector('#reg-type').value;
      const address = getVal('reg-address');
      const village = getVal('reg-village');
      const district = getVal('reg-district');
      const regency = getVal('reg-regency');
      const description = getVal('reg-desc');

      // Validations
      setErr('reg-owner', ownerName.length < 3 ? 'Nama pemilik minimal 3 karakter.' : '');
      setErr('reg-email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email tidak valid.' : '');
      setErr('reg-phone', !/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(phone.replace(/[\s-]/g, '')) ? 'Nomor telepon harus nomor ponsel Indonesia yang valid (contoh: 081234567890).' : '');
      setErr('reg-password', password.length < 6 ? 'Kata sandi minimal 6 karakter.' : '');
      setErr('reg-confirm-password', password !== confirmPassword ? 'Konfirmasi kata sandi tidak cocok.' : '');
      setErr('reg-business', businessName.length < 3 ? 'Nama usaha minimal 3 karakter.' : '');
      setErr('reg-type', !businessType ? 'Silakan pilih jenis usaha Anda.' : '');
      setErr('reg-address', address.length < 5 ? 'Alamat operasional wajib diisi lengkap.' : '');
      setErr('reg-village', !village ? 'Nama desa wajib diisi.' : '');
      setErr('reg-district', !district ? 'Nama kecamatan wajib diisi.' : '');
      setErr('reg-regency', !regency ? 'Nama kabupaten wajib diisi.' : '');
      setErr('reg-desc', description.length < 10 ? 'Deskripsi usaha minimal 10 karakter.' : '');

      if (!isValid) {
        alertBox.textContent = 'Harap lengkapi semua kolom yang bertanda bintang (*) dengan format yang benar.';
        alertBox.style.display = 'block';
        window.scrollTo({ top: 100, behavior: 'smooth' });
        return;
      }

      const res = appState.register({
        ownerName,
        email,
        phone,
        password,
        businessName,
        businessType,
        address,
        village,
        district,
        regency,
        description
      });

      if (res.success) {
        AuthModule.showToast('Pendaftaran berhasil! Selamat datang di DesaBiz AI.');
        window.location.hash = '#/dashboard';
      } else {
        alertBox.textContent = res.message;
        alertBox.style.display = 'block';
      }
    };
  },

  // ==========================================
  // 3. HALAMAN PROFIL UMKM
  // ==========================================
  renderProfile: (container) => {
    const user = appState.getState().user;
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    const isBuyer = user.role === 'buyer';

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Profil UMKM</span>
            </div>
            <h1 class="page-title">Profil Usaha Desa</h1>
            <p class="page-subtitle">Informasi legalitas, kontak, dan kapasitas kemitraan B2B</p>
          </div>

          <div class="flex gap-2">
            <a href="#/profile-edit" class="btn btn-primary btn-sm">
              ✏️ Edit Profil
            </a>
            <a href="#/logout" class="btn btn-secondary btn-sm" style="color: var(--color-danger); border-color: rgba(239,68,68,0.3);">
              🚪 Keluar Akun
            </a>
          </div>
        </div>

        <!-- HERO PROFIL CARD -->
        <div class="profile-hero-card">
          <div class="profile-identity">
            <div class="profile-avatar-large">
              ${user.avatarInitial || 'UM'}
            </div>
            <div>
              <div class="flex items-center gap-2" style="margin-bottom: 0.35rem; flex-wrap: wrap;">
                <h2 class="profile-heading-title" style="margin: 0;">${user.businessName}</h2>
                <span class="badge badge-success">
                  ✓ ${user.verificationBadge || 'UMKM Terverifikasi'}
                </span>
                <span class="badge ${isBuyer ? 'badge-primary' : 'badge-accent'}">
                  ${isBuyer ? 'Peran Aktif: Pembeli Pasokan' : 'Peran Aktif: Penjual / Supplier'}
                </span>
              </div>
              <div class="profile-heading-meta">
                <span>👤 Pemilik: <strong>${user.ownerName || user.name}</strong></span>
                <span>•</span>
                <span>🏷️ ${user.businessType || 'Pertanian & Pangan'}</span>
                <span>•</span>
                <span>📍 ${user.village || user.district || 'Desa'}, ${user.regency || user.regencyName || 'Wilayah Anda'}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            <button id="btn-toggle-profile-role" class="btn btn-secondary btn-sm">
              Ganti ke Mode ${isBuyer ? 'Penjual' : 'Pembeli'}
            </button>
          </div>
        </div>

        <!-- PROFIL DETAIL GRID -->
        <div class="profile-grid-layout">
          <!-- Kolom Kiri: Informasi Rinci -->
          <div>
            <!-- Seksi 1: Data Pemilik & Usaha -->
            <div class="profile-info-section">
              <h3 class="profile-section-title">
                <span>🏢</span> Data Identitas & Komoditas Usaha
              </h3>
              <div class="profile-data-grid">
                <div class="profile-data-item">
                  <span class="profile-data-label">Nama Pemilik</span>
                  <span class="profile-data-value">${user.ownerName || user.name}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Nama UMKM / Usaha</span>
                  <span class="profile-data-value">${user.businessName}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Jenis Usaha / Komoditas</span>
                  <span class="profile-data-value">${user.businessType || 'Pertanian & Pangan'}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Keanggotaan</span>
                  <span class="profile-data-value">${user.membership || 'Mitra DesaBiz AI'}</span>
                </div>
              </div>

              <div style="margin-top: 1.25rem;">
                <span class="profile-data-label">Deskripsi Usaha & Kapasitas Produk</span>
                <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.5; margin-top: 0.35rem; background: var(--bg-app); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                  ${user.description || 'Belum ada deskripsi usaha.'}
                </p>
              </div>
            </div>

            <!-- Seksi 2: Lokasi & Kontak Operasional -->
            <div class="profile-info-section">
              <h3 class="profile-section-title">
                <span>📍</span> Lokasi Sentra Desa & Kontak
              </h3>
              <div class="profile-data-grid">
                <div class="profile-data-item">
                  <span class="profile-data-label">Alamat Lengkap</span>
                  <span class="profile-data-value">${user.address || '-'}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Desa / Kelurahan</span>
                  <span class="profile-data-value">${user.village || '-'}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Kecamatan</span>
                  <span class="profile-data-value">${user.district || '-'}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Kabupaten / Kota</span>
                  <span class="profile-data-value">${user.regency || '-'}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Alamat Email</span>
                  <span class="profile-data-value">${user.email}</span>
                </div>
                <div class="profile-data-item">
                  <span class="profile-data-label">Nomor Telepon / WhatsApp</span>
                  <span class="profile-data-value">${user.phone || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Peran Ganda & Legalitas -->
          <div style="display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Kartu Peran Ganda -->
            <div class="dual-role-card">
              <div class="dual-role-tag">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-dark); margin: 0;">
                  🔄 Peran Ganda Akun
                </h4>
                <span class="badge badge-primary">1 Akun Terpadu</span>
              </div>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45; margin: 0;">
                Akun ini memiliki hak ganda penuh pada ekosistem B2B DesaBiz:
              </p>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #ffffff; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                  <span>🛒</span>
                  <div>
                    <strong>Sebagai Pembeli:</strong> Cari pasokan, tawar harga grosir, dan terbitkan Purchase Order.
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: #ffffff; border-radius: var(--radius-sm); border: 1px solid var(--border-light);">
                  <span>🏪</span>
                  <div>
                    <strong>Sebagai Penjual:</strong> Unggah katalog komoditas, kelola stok panen, dan terima pesanan masuk.
                  </div>
                </div>
              </div>
              <button id="btn-side-role-switch" class="btn btn-primary btn-sm w-full">
                Beralih ke ${isBuyer ? 'Mode Penjual (Supplier)' : 'Mode Pembeli (Sourcing)'}
              </button>
            </div>

            <!-- Ringkasan Statistik Usaha -->
            <div class="card">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.4rem;">
                <span>📊</span> Performa Akun
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.825rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Status Legalitas:</span>
                  <strong style="color: var(--color-success);">Terverifikasi NIB</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Total Produk Aktif:</span>
                  <strong>18 Komoditas</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Transaksi Berhasil:</span>
                  <strong>Rp 48.500.000</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: var(--text-muted);">Rating Kemitraan:</span>
                  <strong style="color: #d97706;">★ 4.9 / 5.0</strong>
                </div>
              </div>
            </div>

            <!-- SETTING NOMOR WHATSAPP NOTIFIKASI -->
            <div class="card">
              <div class="card-header" style="margin-bottom: 0.75rem;">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem; margin: 0;">
                  <span>📱</span> Nomor WhatsApp Notifikasi
                </h4>
              </div>
              <div class="card-body">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                  Tentukan nomor WhatsApp yang akan menerima notifikasi transaksi & pesanan Anda di DesaBiz AI.
                </p>

                <div style="margin-bottom: 0.75rem;">
                  <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-input); margin-bottom: 0.35rem;">
                    Nomor WhatsApp Penerima <span style="color: red;">*</span>
                  </label>
                  <input type="tel" id="wa-number-input" class="form-input" placeholder="Contoh: 081234567890 atau 6281234567890" style="width: 100%;">
                </div>

                <div style="margin-bottom: 0.75rem;">
                  <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;">
                    <input type="checkbox" id="wa-notif-toggle" checked style="margin: 0; transform: scale(1.2);">
                    Aktifkan notifikasi WhatsApp
                  </label>
                </div>

                <div id="wa-settings-status" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                  Memuat pengaturan…
                </div>
              </div>

              <div class="card-footer" style="padding: 0.75rem; border-top: 1px solid var(--border-light); display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button id="wa-settings-save-btn" class="btn btn-primary" style="flex: 1; min-width: 160px;">
                  💾 Simpan Perubahan
                </button>
                <button id="wa-test-btn" class="btn btn-secondary" style="flex: 1; min-width: 160px;">
                  🧪 Uji Kirim Notifikasi
                </button>
                <small style="color: var(--text-muted); font-size: 0.75rem; width: 100%; margin-top: 0.25rem;">
                  Pengirim menggunakan nomor WhatsApp resmi DesaBiz AI yang terhubung ke Fonnte.
                  <a href="#/notif-wa" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Kelola jenis notifikasi lengkap di menu Pengaturan Notifikasi WhatsApp →</a>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Role switcher events
    const roleBtn1 = container.querySelector('#btn-toggle-profile-role');
    const roleBtn2 = container.querySelector('#btn-side-role-switch');
    const toggleHandler = () => {
      appState.toggleRole();
      AuthModule.showToast(`Peran akun berhasil diubah ke Mode ${appState.getState().user.role === 'buyer' ? 'Pembeli' : 'Penjual'}.`);
    };

    // ===== PENGATURAN NOMOR WHATSAPP (Backend MySQL) =====
    const waNumberInput = container.querySelector('#wa-number-input');
    const waNotifToggle = container.querySelector('#wa-notif-toggle');
    const waStatus      = container.querySelector('#wa-settings-status');
    const waSaveBtn     = container.querySelector('#wa-settings-save-btn');
    const waTestBtn     = container.querySelector('#wa-test-btn');

    // Validasi nomor Indonesia di sisi klien (08xxxxxxxxxx / 628xxxxxxxxxx)
    const waIsValid = (v) => /^(08|628)\d{8,11}$/.test(String(v || '').replace(/\D/g, ''));

    // Muat pengaturan tersimpan dari database
    (async () => {
      const s = await appState.waGetSettings(user.id);
      if (waNumberInput) waNumberInput.value = s.wa_number || '';
      if (waNotifToggle) waNotifToggle.checked = s.wa_notif_enabled !== false;
      if (waStatus) {
        if (s.found) {
          waStatus.innerHTML = `Nomor aktif: <strong style="color: var(--color-primary);">${s.wa_number || '—'}</strong> • ${s.wa_notif_enabled ? 'notifikasi aktif' : 'notifikasi nonaktif'}`;
        } else {
          waStatus.textContent = 'Belum ada nomor tersimpan. Masukkan nomor lalu klik Simpan Perubahan.';
        }
      }
    })();

    // Tombol Simpan Perubahan
    if (waSaveBtn) {
      waSaveBtn.onclick = async () => {
        const raw = (waNumberInput.value || '').trim();
        if (!waIsValid(raw)) {
          AuthModule.showToast('Nomor WhatsApp tidak valid. Gunakan format 08xxxxxxxxxx atau 628xxxxxxxxxx.');
          return;
        }
        waSaveBtn.disabled = true;
        waSaveBtn.textContent = 'Menyimpan…';
        const res = await appState.waSaveSettings(user.id, {
          wa_number: raw,
          wa_notif_enabled: waNotifToggle ? waNotifToggle.checked : true
        });
        waSaveBtn.disabled = false;
        waSaveBtn.textContent = '💾 Simpan Perubahan';
        if (res.status === 'success') {
          AuthModule.showToast('Nomor WhatsApp berhasil disimpan.');
          if (waNumberInput) waNumberInput.value = res.wa_number || raw;
          if (waStatus) {
            waStatus.innerHTML = `Nomor aktif: <strong style="color: var(--color-primary);">${res.wa_number || raw}</strong> • ${res.wa_notif_enabled ? 'notifikasi aktif' : 'notifikasi nonaktif'}`;
          }
        } else {
          AuthModule.showToast(res.message || 'Gagal menyimpan pengaturan.');
        }
      };
    }

    // Tombol Uji Kirim Notifikasi
    if (waTestBtn) {
      waTestBtn.onclick = async () => {
        waTestBtn.disabled = true;
        waTestBtn.textContent = 'Mengirim…';
        const res = await appState.waTestNotification(user.id);
        waTestBtn.disabled = false;
        waTestBtn.textContent = '🧪 Uji Kirim Notifikasi';
        if (res.status === 'success') {
          AuthModule.showToast(`Pesan uji terkirim ke ${(res.result && res.result.target) || 'nomor Anda'}. Cek WhatsApp Anda!`);
        } else {
          AuthModule.showToast((res.result && res.result.message) || res.message || 'Gagal mengirim pesan uji.');
        }
      };
    }

    if (roleBtn1) roleBtn1.onclick = toggleHandler;
    if (roleBtn2) roleBtn2.onclick = toggleHandler;
  },

  // ==========================================
  // 4. HALAMAN EDIT PROFIL
  // ==========================================
  renderEditProfile: (container) => {
    const user = appState.getState().user;
    if (!user) {
      window.location.hash = '#/login';
      return;
    }

    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header">
          <div class="page-header-info">
            <div class="breadcrumbs">
              <a href="#/dashboard">Beranda</a>
              <span class="breadcrumb-separator">/</span>
              <a href="#/profile">Profil UMKM</a>
              <span class="breadcrumb-separator">/</span>
              <span class="breadcrumb-item active">Edit Profil</span>
            </div>
            <h1 class="page-title">Perbarui Profil UMKM</h1>
            <p class="page-subtitle">Pastikan data usaha dan kontak Anda selalu akurat bagi mitra B2B</p>
          </div>

          <a href="#/profile" class="btn btn-secondary btn-sm">
            ← Kembali ke Profil
          </a>
        </div>

        <div class="card" style="max-width: 860px; margin: 0 auto;">
          <form id="edit-profile-form" novalidate>
            <div id="edit-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: #fef2f2; color: #b91c1c; font-size: 0.825rem; font-weight: 600; margin-bottom: 1.25rem; border: 1px solid #fecaca;"></div>

            <!-- Seksi 1 -->
            <div style="margin-bottom: 1.5rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 1rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-light);">
                👤 Informasi Pemilik & Usaha
              </h3>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-owner">
                    <span>Nama Pemilik Usaha</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="edit-owner" class="form-input" value="${user.ownerName || user.name || ''}" required />
                  <div class="form-error" id="err-edit-owner" style="display: none;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="edit-business">
                    <span>Nama UMKM / Usaha</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="edit-business" class="form-input" value="${user.businessName || ''}" required />
                  <div class="form-error" id="err-edit-business" style="display: none;"></div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="edit-email">
                    <span>Alamat Email</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="email" id="edit-email" class="form-input" value="${user.email || ''}" required />
                  <div class="form-error" id="err-edit-email" style="display: none;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="edit-phone">
                    <span>Nomor Telepon / WhatsApp</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="tel" id="edit-phone" class="form-input" value="${user.phone || ''}" required />
                  <div class="form-error" id="err-edit-phone" style="display: none;"></div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-type">
                  <span>Jenis Komoditas / Bidang Usaha</span>
                  <span class="required-star">*</span>
                </label>
                <select id="edit-type" class="form-select" required>
                  <option value="Pertanian & Komoditas Pangan" ${user.businessType === 'Pertanian & Komoditas Pangan' ? 'selected' : ''}>Pertanian & Komoditas Pangan</option>
                  <option value="Perkebunan (Kopi, Teh, Rempah)" ${user.businessType === 'Perkebunan (Kopi, Teh, Rempah)' ? 'selected' : ''}>Perkebunan (Kopi, Teh, Rempah)</option>
                  <option value="Peternakan & Pakan Lokal" ${user.businessType === 'Peternakan & Pakan Lokal' ? 'selected' : ''}>Peternakan & Pakan Lokal</option>
                  <option value="Perikanan Air Tawar & Tambak" ${user.businessType === 'Perikanan Air Tawar & Tambak' ? 'selected' : ''}>Perikanan Air Tawar & Tambak</option>
                  <option value="Makanan & Minuman Olahan Lokal" ${user.businessType === 'Makanan & Minuman Olahan Lokal' ? 'selected' : ''}>Makanan & Minuman Olahan Lokal</option>
                  <option value="Kerajinan & Produk Khas Desa" ${user.businessType === 'Kerajinan & Produk Khas Desa' ? 'selected' : ''}>Kerajinan & Produk Khas Desa</option>
                </select>
                <div class="form-error" id="err-edit-type" style="display: none;"></div>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-desc">
                  <span>Deskripsi Usaha & Kapasitas Produk</span>
                  <span class="required-star">*</span>
                </label>
                <textarea id="edit-desc" class="form-textarea">${user.description || ''}</textarea>
                <div class="form-error" id="err-edit-desc" style="display: none;"></div>
              </div>
            </div>

            <!-- Seksi 2 -->
            <div style="margin-bottom: 1.75rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--color-primary-dark); margin-bottom: 1rem; padding-bottom: 0.4rem; border-bottom: 1px solid var(--border-light);">
                📍 Lokasi Sentra Produksi Pedesaan
              </h3>

              <div class="form-group">
                <label class="form-label" for="edit-address">
                  <span>Alamat Lengkap Usaha / Gudang</span>
                  <span class="required-star">*</span>
                </label>
                <input type="text" id="edit-address" class="form-input" value="${user.address || ''}" required />
                <div class="form-error" id="err-edit-address" style="display: none;"></div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="edit-village">
                    <span>Desa / Kelurahan</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="edit-village" class="form-input" value="${user.village || ''}" required />
                  <div class="form-error" id="err-edit-village" style="display: none;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="edit-district">
                    <span>Kecamatan</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="edit-district" class="form-input" value="${user.district || ''}" required />
                  <div class="form-error" id="err-edit-district" style="display: none;"></div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="edit-regency">
                    <span>Kabupaten / Kota</span>
                    <span class="required-star">*</span>
                  </label>
                  <input type="text" id="edit-regency" class="form-input" value="${user.regency || ''}" required />
                  <div class="form-error" id="err-edit-regency" style="display: none;"></div>
                </div>
              </div>
            </div>

            <div class="flex gap-2" style="justify-content: flex-end;">
              <a href="#/profile" class="btn btn-secondary">Batal</a>
              <button type="submit" class="btn btn-primary" id="btn-save-profile">
                💾 Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Edit Form Validation & Save
    const form = container.querySelector('#edit-profile-form');
    const alertBox = container.querySelector('#edit-alert');

    form.onsubmit = (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      let isValid = true;
      const getVal = (id) => container.querySelector(`#${id}`).value.trim();
      const setErr = (id, msg) => {
        const input = container.querySelector(`#${id}`);
        const errEl = container.querySelector(`#err-${id}`);
        if (msg) {
          input.classList.add('is-invalid');
          errEl.textContent = msg;
          errEl.style.display = 'flex';
          isValid = false;
        } else {
          input.classList.remove('is-invalid');
          errEl.style.display = 'none';
        }
      };

      const ownerName = getVal('edit-owner');
      const businessName = getVal('edit-business');
      const email = getVal('edit-email');
      const phone = getVal('edit-phone');
      const businessType = container.querySelector('#edit-type').value;
      const description = getVal('edit-desc');
      const address = getVal('edit-address');
      const village = getVal('edit-village');
      const district = getVal('edit-district');
      const regency = getVal('edit-regency');

      setErr('edit-owner', ownerName.length < 3 ? 'Nama pemilik minimal 3 karakter.' : '');
      setErr('edit-business', businessName.length < 3 ? 'Nama usaha minimal 3 karakter.' : '');
      setErr('edit-email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Format email tidak valid.' : '');
      setErr('edit-phone', !phone ? 'Nomor telepon wajib diisi.' : '');
      setErr('edit-desc', description.length < 10 ? 'Deskripsi usaha minimal 10 karakter.' : '');
      setErr('edit-address', address.length < 5 ? 'Alamat operasional wajib diisi.' : '');
      setErr('edit-village', !village ? 'Nama desa wajib diisi.' : '');
      setErr('edit-district', !district ? 'Nama kecamatan wajib diisi.' : '');
      setErr('edit-regency', !regency ? 'Nama kabupaten wajib diisi.' : '');

      if (!isValid) {
        alertBox.textContent = 'Harap periksa kembali kolom isian yang belum sesuai.';
        alertBox.style.display = 'block';
        window.scrollTo({ top: 100, behavior: 'smooth' });
        return;
      }

      const res = appState.updateProfile({
        ownerName,
        name: ownerName,
        businessName,
        email,
        phone,
        businessType,
        description,
        address,
        village,
        district,
        regency
      });

      if (res.success) {
        AuthModule.showToast('Profil UMKM berhasil diperbarui!');
        window.location.hash = '#/profile';
      } else {
        alertBox.textContent = res.message;
        alertBox.style.display = 'block';
      }
    };
  },

  // ==========================================
  // 5. LOGOUT HANDLER
  // ==========================================
  handleLogout: () => {
    appState.logout();
    AuthModule.showToast('Sesi Anda telah berakhir. Silakan masuk kembali.');
    window.location.hash = '#/login';
  },

  // Helper Toast
  showToast: (message) => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="color: var(--color-primary);">${Icons.check}</div>
      <div style="flex: 1;">${message}</div>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};
