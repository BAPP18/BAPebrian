/**
 * ============================================================
 *  PANDUAN EDIT — HANYA EDIT FILE INI untuk data personal!
 *  Semua bagian website otomatis sinkron dari file ini.
 * ============================================================
 */

export const CONFIG = {
  // ── 1. PROFIL UTAMA (Hero + Footer) ──────────────────────
  profile: {
    name: 'BAYU AKBAR PEBRIAN',
    badge: '',
    photo: 'img/Foto-Bayu.png',
    tagline:
      '',
    roles: [
      'Cybersecurity Enthusiast',
      'Web Developer Enthusiast',
      'IT Project Coordinator',
    ],
  },

  // ── 2. ABOUT ME ───────────────────────────────────────────
  about: {
    intro:
      'Saya seorang IT Project Coordinator yang juga memiliki ketertarikan besar di dunia cybersecurity. Berpengalaman dalam mengelola project IT, dokumentasi sistem, dan koordinasi tim.',
    interest:
      'Saya tertarik pada cybersecurity sejak melihat dampak besar keamanan informasi dalam project yang saya kelola. Saat ini saya aktif belajar network security, password analysis, dan encryption basics untuk memperkuat skill di bidang ini.',
    experience: [
      {
        role: 'IT Project Coordinator',
        company: 'PT Mastersystem Infotama Tbk',
        period: 'Juni 2024 - Juni 2026',
        desc: 'Mengelola project IT, tracking asset, dokumentasi sistem, dan koordinasi antar tim.',
      },
      {
        role: 'Cybersecurity Enthusiast',
        company: 'Self-Learning',
        period: '2024 — Sekarang',
        desc: 'Belajar network security, password analysis, encryption, dan praktik keamanan sistem.',
      },
    ],
  },

  // ── 3. SKILLS (Tech Stack) ────────────────────────────────
  skills: [
    { icon: '👨🏻‍💼', name: 'IT Project Management', level: 100 },
    { icon: '🎨', name: 'CSS3', level: 85 },
    { icon: '⚙️', name: 'JavaScript', level: 75 },
    { icon: '🛡️', name: 'Cybersecurity', level: 70 },
    { icon: '📦', name: 'Git & GitHub', level: 65 },
  ],

  // ── 4. PROJECTS — tambah/hapus object di array ini ───────
  projects: [
    {
      tag: 'GitHub',
      title: 'IT Asset Tracker & Document Management System',
      description: 'Sistem untuk mengelola aset IT, dokumen proyek, dan aktivitas maintenance dalam satu platform terpusat.',
      tech: ['HTML', 'CSS', 'PYTHON', 'JAVA SCRIPT'],
      link: 'https://github.com/BAPP18/Automation-Hardware-Asset-Tracking-and-Maintenance-Management-System',
    },
    {
      tag: 'GitHub',
      title: 'Security Log & IOC Analyzer',
      description: 'Membantu analisis log keamanan serta deteksi IOC untuk mendukung monitoring dan investigasi keamanan siber.',
      tech: ['HTML', 'CSS', 'PYTHON', 'JAVA SCRIPT'],
      link: 'https://github.com/BAPP18/Security-Log-IOC-Analyzer',
    },
    {
      tag: 'GitHub',
      title: 'Cybersecurity Toolkit',
      description: 'Kumpulan tools keamanan siber sederhana dalam satu aplikasi untuk membantu analisis, monitoring, dan pengujian dasar keamanan sistem.',
      tech: ['Python'],
      link: 'https://github.com/BAPP18/CS--V1',
    },
  ],

  // ── 5. KONTAK ─────────────────────────────────────────────
  contact: {
    github: {
      url: 'https://github.com/BAPP18',
      label: 'github.com/BAPP18',
    },
    linkedin: {
      url: 'https://www.linkedin.com/in/bayu-akbar-pebrian-285853207/',
      label: 'linkedin.com/in/bayu-akbar-pebrian',
    },
    email: {
      url: 'mailto:bayuakbarpebrian@gmail.com',
      label: 'bayuakbarpebrian@gmail.com',
    },
  },

  // ── 6. TERMINAL — skills list (muncul saat ketik "skills") ─
  terminalSkills: [
    'HTML5',
    'CSS3',
    'JavaScript',
    'Network Security',
    'Password Analysis',
    'Encryption Basics',
    'Git & GitHub Pages',
    'IT Project Management',
  ],
};
