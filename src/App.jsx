import { useEffect, useMemo, useState } from 'react'
import {
  GraduationCap, BookOpen, Users, ShieldCheck, UserRound,
  CalendarDays, Clock3, LogOut, Bell, Search, QrCode,
  CheckCircle2, CircleAlert, ClipboardList, Download, Settings,
  HelpCircle, Home, History, ArrowRight, RefreshCw, Menu, X
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabaseClient'

const roles = [
  { id: 'siswa', label: 'Siswa', icon: UserRound },
  { id: 'guru', label: 'Guru', icon: BookOpen },
  { id: 'admin', label: 'Admin Sekolah', icon: ShieldCheck },
  { id: 'orang_tua', label: 'Orang Tua', icon: Users },
]

const sampleHistory = [
  { date: '17 Okt 2026', day: 'Sabtu', masuk: '07:02', pulang: '—', status: 'Hadir' },
  { date: '16 Okt 2026', day: 'Jumat', masuk: '06:56', pulang: '14:01', status: 'Hadir' },
  { date: '15 Okt 2026', day: 'Kamis', masuk: '07:12', pulang: '14:04', status: 'Hadir' },
  { date: '14 Okt 2026', day: 'Rabu', masuk: '—', pulang: '—', status: 'Izin' },
]

function todayDate() {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date())
}

export default function App() {
  const [role, setRole] = useState('siswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [waliKelas, setWaliKelas] = useState('')
  const [kelas, setKelas] = useState('')
  const [profileName, setProfileName] = useState('')
  const [user, setUser] = useState(null)
  const [active, setActive] = useState('dashboard')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [onlineMode, setOnlineMode] = useState(false)
  const [attendance, setAttendance] = useState({
    checkIn: '',
    checkOut: '',
    status: 'Belum absen'
  })
  const [history, setHistory] = useState(() => {
  try {
    const savedHistory = localStorage.getItem('sekolahAbsenkuHistory')
    return savedHistory ? JSON.parse(savedHistory) : sampleHistory
  } catch {
    return sampleHistory
  }
})
  const [mobileMenu, setMobileMenu] = useState(false)
useEffect(() => {
  localStorage.setItem(
    'sekolahAbsenkuHistory',
    JSON.stringify(history)
  )
}, [history])
  useEffect(() => {
    if (!supabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user)
        setOnlineMode(true)
        loadProfile(data.session.user)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setOnlineMode(Boolean(session?.user))
        if (session?.user) loadProfile(session.user)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadProfile(authUser) {
    if (!supabase) return

    const { data } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', authUser.id)
      .maybeSingle()

    if (data) {
      setProfileName(data.full_name)
      setRole(data.role)
    }
  }

  async function handleLogin(event) {
    event.preventDefault()
    setNotice('')

    if (!email.trim() || !password) {
      setNotice('Masukkan email dan kata sandi terlebih dahulu.')
      return
    }

    if (role === 'siswa' && (!waliKelas || !kelas)) {
      setNotice('Pilih wali kelas dan kelas terlebih dahulu.')
      return
    }

    if (!supabaseConfigured) {
      setNotice(
        'Supabase belum diatur. Untuk demo tampilan, gunakan tombol “Coba Demo”.'
      )
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    setLoading(false)

    if (error) {
      setNotice(error.message)
    } else {
      setUser(data.user)
      setOnlineMode(true)
      await loadProfile(data.user)
      setNotice('Login berhasil.')
    }
  }

  async function handleDemo() {
    setUser({
      id: 'demo-user',
      email: 'demo@sekolahabsenku.local'
    })

    setProfileName(
      role === 'siswa'
        ? 'Nadia Putri'
        : role === 'guru'
          ? 'Pak Budi Santoso'
          : role === 'admin'
            ? 'Admin Sekolah'
            : 'Ibu Nadia'
    )

    setOnlineMode(false)
    setActive('dashboard')
    setNotice('Mode demo aktif. Data belum disimpan ke Supabase.')
  }

  async function handleLogout() {
    if (supabase && onlineMode) await supabase.auth.signOut()

    setUser(null)
    setProfileName('')
    setOnlineMode(false)
    setPassword('')
    setActive('dashboard')
    setNotice('')
  }

  async function markAttendance(kind) {
    const now = new Date()
    const time = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })

    if (kind === 'checkIn') {
      if (attendance.checkIn) {
        return setNotice('Absen masuk hari ini sudah tercatat.')
      }

      setAttendance({
        checkIn: time,
        checkOut: '',
        status: 'Hadir'
      })

      setHistory(prev => [
        {
          date: todayDate(),
          day: 'Hari ini',
          masuk: time,
          pulang: '—',
          status: 'Hadir'
        },
        ...prev.filter(row => row.day !== 'Hari ini')
      ])

      setNotice(
        onlineMode
          ? 'Tombol siap digunakan. Untuk menyimpan absensi online, profil siswa dan kebijakan database harus sudah disiapkan.'
          : 'Absen masuk tercatat pada mode demo.'
      )
    } else {
      if (!attendance.checkIn) {
        return setNotice('Lakukan absen masuk terlebih dahulu.')
      }

      if (attendance.checkOut) {
        return setNotice('Absen pulang hari ini sudah tercatat.')
      }

      setAttendance(prev => ({
        ...prev,
        checkOut: time
      }))

      setHistory(prev =>
        prev.map((row, index) =>
          index === 0 ? { ...row, pulang: time } : row
        )
      )

      setNotice(
        'Absen pulang tercatat pada tampilan ini. Simpan online memerlukan konfigurasi database lanjutan.'
      )
    }
  }

  const nav = useMemo(() => {
    if (role === 'guru') {
      return [
        ['dashboard', 'Ringkasan', Home],
        ['students', 'Daftar Siswa', Users],
        ['attendance', 'Rekap Absensi', ClipboardList],
        ['help', 'Bantuan', HelpCircle],
      ]
    }

    if (role === 'admin') {
      return [
        ['dashboard', 'Ringkasan', Home],
        ['students', 'Data Siswa', Users],
        ['attendance', 'Semua Absensi', ClipboardList],
        ['settings', 'Pengaturan', Settings],
      ]
    }

    if (role === 'orang_tua') {
      return [
        ['dashboard', 'Ringkasan Anak', Home],
        ['history', 'Riwayat Absensi', History],
        ['notifications', 'Notifikasi', Bell],
        ['help', 'Bantuan', HelpCircle],
      ]
    }

    return [
      ['dashboard', 'Beranda', Home],
      ['history', 'Riwayat Absensi', History],
      ['qr', 'Kartu QR', QrCode],
      ['help', 'Bantuan', HelpCircle],
    ]
  }, [role])

  const isDemo = user && !onlineMode

  if (!user) {
    return (
      <main className="login-shell">
       
        <section className="login-art reference-art">
          <div className="brand">
            <span className="brand-mark">
              <GraduationCap size={28} />
            </span>
            <span>Sekolah <b>Absenku</b></span>
          </div>

          <div className="reference-content">
            <div className="school-illustration">
              <div className="school-sun">☀️</div>
              <div className="school-picture">🏫</div>
              <div className="school-ground" />
            </div>

            <div className="reference-copy">
              <h1>
                Belajar Disiplin,
                <br />
                <span>Raih Masa Depan!</span>
              </h1>
              <p>
                Absensi sekolah yang mudah, menyenangkan, dan membantu
                siswa membangun disiplin untuk masa depan yang cerah.
              </p>
            </div>
          </div>

          <div className="reference-footer">
            ✦ Belajar disiplin, raih prestasi.
          </div>
        </section>


        <section className="login-area">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="mobile-brand">
              <GraduationCap /> Sekolah Absenku
            </div>

            <span className="eyebrow blue">SELAMAT DATANG KEMBALI</span>
            <h2>Masuk ke akun</h2>
            <p className="muted">
              Pilih jenis akun lalu masukkan email dan kata sandi.
            </p>

            <label className="field-label">Masuk sebagai</label>

            <div className="role-grid">
              {roles.map(item => {
                const Icon = item.icon

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`role-choice ${
                      role === item.id ? 'selected' : ''
                    }`}
                    onClick={() => setRole(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Pilihan tambahan untuk login siswa */}
            {role === 'siswa' && (
              <>
                <label className="field-label" htmlFor="waliKelas">
                  Wali Kelas
                </label>

                <select
                  id="waliKelas"
                  value={waliKelas}
                  onChange={e => setWaliKelas(e.target.value)}
                >
                  <option value="">Pilih wali kelas</option>
                  <option value="Pak Budi Santoso">Pak Budi Santoso</option>
                  <option value="Ibu Siti Aminah">Ibu Siti Aminah</option>
                  <option value="Ibu Rina Lestari">Ibu Rina Lestari</option>
                </select>

                <label className="field-label" htmlFor="kelas">
                  Kelas
                </label>

                <select
                  id="kelas"
                  value={kelas}
                  onChange={e => setKelas(e.target.value)}
                >
                  <option value="">Pilih kelas</option>
                  <option value="VII A">VII A</option>
                  <option value="VII B">VII B</option>
                  <option value="VIII A">VIII A</option>
                  <option value="VIII B">VIII B</option>
                  <option value="IX A">IX A</option>
                  <option value="IX B">IX B</option>
                </select>
              </>
            )}

            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
            />

            <label className="field-label" htmlFor="password">
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {notice && (
              <div className="notice">
                <CircleAlert size={17} />
                {notice}
              </div>
            )}

            <button className="primary-btn" type="submit" disabled={loading}>
              {loading ? 'Memeriksa akun...' : 'Masuk'}
              <ArrowRight size={18} />
            </button>

            <button className="demo-btn" type="button" onClick={handleDemo}>
              Coba Demo Tanpa Login
            </button>

            <div className="login-help">
              <ShieldCheck size={16} />
              Akun dan data dilindungi oleh sistem akses.
            </div>

            {!supabaseConfigured && (
              <div className="setup-note">
                Mode demo: Supabase belum dikonfigurasi di file{' '}
                <code>.env.local</code>.
              </div>
            )}
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="side-brand">
          <span className="brand-mark">
            <GraduationCap size={26} />
          </span>
          <span>
            <b>Sekolah Absenku</b>
            <small>Portal Kehadiran</small>
          </span>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="school-label">MENU UTAMA</div>

        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => {
                setActive(id)
                setMobileMenu(false)
                setNotice('')
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-box">
            <span className="support-icon">
              <HelpCircle size={19} />
            </span>
            <b>Butuh bantuan?</b>
            <small>Hubungi admin sekolah jika ada kendala.</small>
            <button onClick={() => setActive('help')}>
              Pusat Bantuan <ArrowRight size={14} />
            </button>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={17} /> Keluar akun
          </button>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Tutup menu"
        />
      )}

      <section className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenu(true)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            Sekolah / <b>{nav.find(item => item[0] === active)?.[1] || 'Beranda'}</b>
          </div>

          <div className="top-actions">
            <span className={`connection ${onlineMode ? 'online' : ''}`}>
              <i />
              {onlineMode ? 'Terhubung' : 'Mode demo'}
            </span>

            <button
              className="icon-btn"
              onClick={() => setActive('notifications')}
              aria-label="Notifikasi"
            >
              <Bell size={19} />
            </button>

            <div className="avatar">
              {(profileName || 'S').slice(0, 1).toUpperCase()}
            </div>

            <div className="user-info">
              <b>{profileName || user.email}</b>
              <small>{roles.find(r => r.id === role)?.label}</small>
            </div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="notice page-notice">
              <CircleAlert size={17} />
              {notice}
              <button onClick={() => setNotice('')}>Tutup</button>
            </div>
          )}

          <div className="welcome-row">
            <div>
              <span className="eyebrow blue">DASHBOARD</span>
              <h1>
                {role === 'guru'
                  ? 'Selamat datang, Guru!'
                  : role === 'admin'
                    ? 'Panel Admin Sekolah'
                    : role === 'orang_tua'
                      ? 'Pantau kehadiran anak'
                      : `Halo, ${profileName || 'Siswa'}!`}
              </h1>
              <p className="muted">
                {todayDate()} · Semoga hari ini menyenangkan.
              </p>
            </div>

            <div className="date-chip">
              <CalendarDays size={18} />
              <span>TAHUN AJARAN 2026/2027</span>
            </div>
          </div>

          {active === 'dashboard' && role === 'siswa' && (
            <StudentDashboard
              attendance={attendance}
              history={history}
              markAttendance={markAttendance}
              setActive={setActive}
            />
          )}

          {active === 'dashboard' && role === 'guru' && (
            <TeacherDashboard setActive={setActive} />
          )}

          {active === 'dashboard' && role === 'admin' && (
            <AdminDashboard setActive={setActive} />
          )}

          {active === 'dashboard' && role === 'orang_tua' && (
            <ParentDashboard history={history} setActive={setActive} />
          )}

          {active === 'history' && <HistoryPage history={history} />}
          {active === 'qr' && <QrPage profileName={profileName || 'Siswa Demo'} />}
          {active === 'students' && <StudentsPage role={role} />}
          {active === 'attendance' && <AttendancePage role={role} />}
          {active === 'notifications' && <NotificationsPage />}
          {active === 'settings' && <SettingsPage />}
          {active === 'help' && <HelpPage />}

          <footer className="page-footer">
            Sekolah Absenku <span>•</span> Sistem Absensi Digital <span>•</span>{' '}
            <span className={isDemo ? 'demo-text' : ''}>
              {isDemo
                ? 'Data demo tersimpan sementara di sesi ini'
                : 'Jaga data siswa dengan aman'}
            </span>
          </footer>
        </div>
      </section>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, caption, tint = 'blue' }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tint}`}>
        <Icon size={21} />
      </span>
      <div>
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  )
}

function StudentDashboard({ attendance, history, markAttendance, setActive }) {
  return (
    <>
      <div className="stats-grid">
        <StatCard
          icon={CheckCircle2}
          label="Status Hari Ini"
          value={attendance.status}
          caption="Kehadiran hari ini"
          tint="green"
        />
        <StatCard
          icon={Clock3}
          label="Jam Masuk"
          value={attendance.checkIn || '—:—'}
          caption="Waktu presensi masuk"
        />
        <StatCard
          icon={CalendarDays}
          label="Total Hadir"
          value="18 hari"
          caption="Bulan berjalan"
          tint="purple"
        />
        <StatCard
          icon={ClipboardList}
          label="Riwayat"
          value={history.length}
          caption="Catatan di tampilan demo"
          tint="orange"
        />
      </div>

      <div className="content-grid">
        <section className="panel attendance-panel">
          <div className="panel-heading">
            <div>
              <h3>Presensi hari ini</h3>
              <p>Jangan lupa catat kehadiranmu.</p>
            </div>
            <span className="live-dot">● Hari ini</span>
          </div>

          <div className="attendance-clock">
            <div className="clock-ring">
              <Clock3 size={30} />
            </div>
            <div>
              <strong>
                {new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </strong>
              <span>Waktu perangkat saat ini</span>
            </div>
          </div>

          <div className="attendance-actions">
            <button
              className="primary-btn"
              onClick={() => markAttendance('checkIn')}
            >
              <CheckCircle2 size={18} /> Absen Masuk
            </button>
            <button
              className="secondary-btn"
              onClick={() => markAttendance('checkOut')}
            >
              <LogOut size={18} /> Absen Pulang
            </button>
          </div>

          <div className="safe-note">
            <ShieldCheck size={16} />
            Pastikan kamu menggunakan akun sendiri.
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Riwayat terbaru</h3>
              <p>Ringkasan presensi terakhir.</p>
            </div>
            <button className="text-btn" onClick={() => setActive('history')}>
              Lihat semua <ArrowRight size={15} />
            </button>
          </div>

          <div className="mini-history">
            {history.slice(0, 4).map((row, i) => (
              <div className="mini-row" key={`${row.date}-${i}`}>
                <span className="history-date-icon">
                  <CalendarDays size={17} />
                </span>
                <div className="mini-date">
                  <b>{row.day}</b>
                  <small>{row.date}</small>
                </div>
                <span className={`status-pill ${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel quick-panel">
        <div className="panel-heading">
          <div>
            <h3>Akses cepat</h3>
            <p>Fitur yang sering kamu gunakan.</p>
          </div>
        </div>

        <div className="quick-grid">
          <button onClick={() => setActive('qr')}>
            <span className="quick-icon blue"><QrCode /></span>
            <b>Kartu QR</b>
            <small>Tampilkan kartu identitas</small>
          </button>
          <button onClick={() => setActive('history')}>
            <span className="quick-icon green"><History /></span>
            <b>Riwayat Absensi</b>
            <small>Periksa catatan kehadiran</small>
          </button>
          <button onClick={() => setActive('help')}>
            <span className="quick-icon purple"><HelpCircle /></span>
            <b>Pusat Bantuan</b>
            <small>Petunjuk penggunaan</small>
          </button>
        </div>
      </section>
    </>
  )
}

function TeacherDashboard({ setActive }) {
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={Users} label="Jumlah Siswa" value="32" caption="Contoh data kelas" />
        <StatCard icon={CheckCircle2} label="Hadir" value="28" caption="87,5% dari siswa" tint="green" />
        <StatCard icon={CircleAlert} label="Belum Hadir" value="4" caption="Perlu diperiksa" tint="orange" />
        <StatCard icon={ClipboardList} label="Kelas" value="VII A" caption="Contoh kelas wali" tint="purple" />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Kelola kehadiran kelas</h3>
            <p>Contoh tampilan rekap guru.</p>
          </div>
        </div>

        <div className="action-cards">
          <button onClick={() => setActive('students')}>
            <Users /><b>Daftar Siswa</b><small>Lihat data dan kelas</small>
          </button>
          <button onClick={() => setActive('attendance')}>
            <ClipboardList /><b>Rekap Absensi</b><small>Periksa status kehadiran</small>
          </button>
          <button onClick={() => window.print()}>
            <Download /><b>Cetak Rekap</b><small>Cetak halaman ini</small>
          </button>
        </div>
      </section>
    </>
  )
}

function AdminDashboard({ setActive }) {
  return (
    <>
      <div className="stats-grid">
        <StatCard icon={Users} label="Total Siswa" value="428" caption="Contoh data sekolah" />
        <StatCard icon={BookOpen} label="Total Guru" value="31" caption="Contoh data sekolah" tint="green" />
        <StatCard icon={CheckCircle2} label="Kehadiran Hari Ini" value="94,2%" caption="Data ilustrasi" tint="purple" />
        <StatCard icon={CircleAlert} label="Perlu Ditinjau" value="12" caption="Contoh catatan" tint="orange" />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Administrasi sekolah</h3>
            <p>Kelola data setelah database Supabase disiapkan.</p>
          </div>
        </div>

        <div className="action-cards">
          <button onClick={() => setActive('students')}>
            <Users /><b>Data Siswa</b><small>Daftar siswa dan kelas</small>
          </button>
          <button onClick={() => setActive('attendance')}>
            <ClipboardList /><b>Semua Absensi</b><small>Rekap sekolah</small>
          </button>
          <button onClick={() => window.print()}>
            <Download /><b>Cetak / PDF</b><small>Gunakan dialog cetak browser</small>
          </button>
        </div>
      </section>
    </>
  )
}

function ParentDashboard({ history, setActive }) {
  return (
    <>
      <div className="parent-banner">
        <span className="parent-avatar"><GraduationCap size={26} /></span>
        <div>
          <small>ANAK TERHUBUNG (CONTOH DEMO)</small>
          <h3>Nadia Putri · Kelas VII A</h3>
          <p>Data anak akan muncul setelah akun orang tua ditautkan oleh admin.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={CheckCircle2} label="Status Hari Ini" value={history[0]?.status || 'Belum ada'} caption="Contoh ringkasan" tint="green" />
        <StatCard icon={Clock3} label="Jam Masuk" value={history[0]?.masuk || '—:—'} caption="Waktu presensi" />
        <StatCard icon={History} label="Catatan" value={history.length} caption="Contoh riwayat" tint="purple" />
        <StatCard icon={Bell} label="Notifikasi" value="2" caption="Ilustrasi notifikasi" tint="orange" />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Riwayat kehadiran anak</h3>
            <p>Pantau catatan presensi terbaru.</p>
          </div>
          <button className="text-btn" onClick={() => setActive('history')}>
            Lihat riwayat <ArrowRight size={15} />
          </button>
        </div>
        <HistoryTable history={history.slice(0, 4)} />
      </section>
    </>
  )
}

function HistoryTable({ history }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Jam Masuk</th>
            <th>Jam Pulang</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {history.map((row, i) => (
            <tr key={`${row.date}-${i}`}>
              <td><b>{row.date}</b><small>{row.day}</small></td>
              <td>{row.masuk}</td>
              <td>{row.pulang}</td>
              <td>
                <span className={`status-pill ${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HistoryPage({ history }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Riwayat Absensi</h3>
          <p>Catatan contoh selama mode demo.</p>
        </div>
        <button className="secondary-btn compact" onClick={() => window.print()}>
          <Download size={16} /> Cetak
        </button>
      </div>
      <HistoryTable history={history} />
    </section>
  )
}

function QrPage({ profileName }) {
  const token = `SA-${profileName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-DEMO`

  return (
    <section className="panel qr-page">
      <div className="qr-card">
        <span className="brand-mark"><GraduationCap size={26} /></span>
        <h2>Sekolah Absenku</h2>
        <p>KARTU IDENTITAS SISWA</p>
        <div className="fake-qr"><QrCode size={100} strokeWidth={1.5} /></div>
        <h3>{profileName}</h3>
        <span className="student-number">{token}</span>
        <div className="qr-warning">
          <CircleAlert size={16} />
          QR ini hanya ilustrasi demo, belum dapat dipakai untuk presensi asli.
        </div>
      </div>

      <div className="qr-explainer">
        <h3>Tentang Kartu QR</h3>
        <p>
          Di sistem produksi, QR sebaiknya berisi token acak yang divalidasi
          server, bukan data pribadi siswa. Guru perlu masuk ke akun resmi
          untuk memindai dan mencatat presensi.
        </p>
      </div>
    </section>
  )
}

function StudentsPage({ role }) {
  const rows = [
    ['Nadia Putri', 'VII A', 'S-2026-001', 'Hadir'],
    ['Rafi Pratama', 'VII A', 'S-2026-002', 'Hadir'],
    ['Alya Safitri', 'VII A', 'S-2026-003', 'Izin'],
    ['Dimas Ramadhan', 'VII A', 'S-2026-004', 'Belum absen'],
  ]

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{role === 'admin' ? 'Data Siswa Sekolah' : 'Daftar Siswa Kelas'}</h3>
          <p>Baris di bawah ini adalah contoh tampilan, bukan data database.</p>
        </div>
        <button className="secondary-btn compact" onClick={() => window.print()}>
          <Download size={16} /> Cetak
        </button>
      </div>

      <div className="search-row">
        <Search size={17} />
        <input placeholder="Cari nama atau nomor siswa (contoh tampilan)" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>ID Siswa</th>
              <th>Status Hari Ini</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r[2]}>
                {r.map((c, i) => (
                  <td key={i}>
                    {i === 3 ? (
                      <span className={`status-pill ${c.toLowerCase().replace(' ', '-')}`}>
                        {c}
                      </span>
                    ) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AttendancePage({ role }) {
  const [filter, setFilter] = useState('Semua')
  const rows = [
    ['Nadia Putri', '07:02', '14:00', 'Hadir'],
    ['Rafi Pratama', '06:56', '14:01', 'Hadir'],
    ['Alya Safitri', '—', '—', 'Izin'],
    ['Dimas Ramadhan', '—', '—', 'Alpha']
  ]

  const filtered = filter === 'Semua'
    ? rows
    : rows.filter(r => r[3] === filter)

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{role === 'admin' ? 'Semua Absensi' : 'Rekap Absensi Kelas'}</h3>
          <p>Contoh data untuk pratinjau. Hubungkan database untuk data nyata.</p>
        </div>
        <button className="secondary-btn compact" onClick={() => window.print()}>
          <Download size={16} /> Cetak / PDF
        </button>
      </div>

      <div className="filter-row">
        {['Semua', 'Hadir', 'Izin', 'Sakit', 'Alpha'].map(f => (
          <button
            key={f}
            className={filter === f ? 'filter active' : 'filter'}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nama Siswa</th>
              <th>Jam Masuk</th>
              <th>Jam Pulang</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}>
                    {i === 3 ? (
                      <span className={`status-pill ${c.toLowerCase()}`}>
                        {c}
                      </span>
                    ) : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function NotificationsPage() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Notifikasi</h3>
          <p>
            Contoh notifikasi yang nantinya dikirim saat absensi anak tercatat.
          </p>
        </div>
      </div>

      <div className="notification-list">
        <div className="notification-item">
          <span className="notification-icon green"><CheckCircle2 /></span>
          <div>
            <b>Nadia Putri tercatat hadir</b>
            <p>Contoh notifikasi · 07:02</p>
          </div>
          <span className="unread-dot" />
        </div>

        <div className="notification-item">
          <span className="notification-icon blue"><LogOut /></span>
          <div>
            <b>Pengingat absen pulang</b>
            <p>Contoh notifikasi · Kemarin</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SettingsPage() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Pengaturan</h3>
          <p>
            Pengaturan akun dan sekolah akan diaktifkan setelah autentikasi
            serta peran dikonfigurasi.
          </p>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-icon"><UserRound /></span>
        <div>
          <b>Profil akun</b>
          <small>Nama dan informasi pengguna</small>
        </div>
        <span className="muted">Belum dihubungkan</span>
      </div>

      <div className="settings-row">
        <span className="settings-icon"><ShieldCheck /></span>
        <div>
          <b>Keamanan</b>
          <small>Hak akses berdasarkan peran</small>
        </div>
        <span className="muted">Perlu konfigurasi</span>
      </div>
    </section>
  )
}

function HelpPage() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>Pusat Bantuan</h3>
          <p>Panduan singkat menggunakan Sekolah Absenku.</p>
        </div>
      </div>

      <div className="help-list">
        <details open>
          <summary>Bagaimana cara absen masuk?</summary>
          <p>
            Masuk menggunakan akun siswa, buka Beranda, lalu tekan Absen Masuk.
            Pada sistem asli, waktu dan identitas perlu divalidasi oleh database.
          </p>
        </details>

        <details>
          <summary>Bagaimana cara menggunakan QR?</summary>
          <p>
            Guru perlu login lalu memindai QR siswa. QR pada halaman demo hanya
            ilustrasi dan belum mencatat absensi.
          </p>
        </details>

        <details>
          <summary>Bagaimana orang tua melihat kehadiran?</summary>
          <p>
            Akun orang tua harus dibuat dan ditautkan ke siswa oleh admin.
            Kebijakan RLS harus memastikan orang tua hanya melihat anak yang
            terhubung ke akunnya.
          </p>
        </details>
      </div>
    </section>
  )
}