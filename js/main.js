import { CONFIG } from './config.js';


const THEME = {
  accent: '#22d3ee',
  accentRgb: '34, 211, 238',
  bg: '#060b14',
};


function renderProfile() {
  const { profile } = CONFIG;
  document.getElementById('hero-name').textContent = profile.name;
  document.getElementById('hero-badge').textContent = profile.badge;
  document.getElementById('hero-desc').textContent = profile.tagline;

  const photoSrc = profile.photo || '';
  const heroImg = document.getElementById('profile-photo');
  const heroPlaceholder = document.getElementById('profile-photo-placeholder');
  const aboutImg = document.getElementById('about-photo');
  const aboutPlaceholder = document.getElementById('about-photo-placeholder');
  const aboutName = document.getElementById('about-photo-name');
  const aboutRole = document.getElementById('about-photo-role');

  if (aboutName) aboutName.textContent = profile.name;
  if (aboutRole) aboutRole.textContent = profile.roles[0] || '';

  if (photoSrc) {
    if (heroImg) { heroImg.src = photoSrc; heroImg.style.display = ''; }
    if (heroPlaceholder) heroPlaceholder.style.display = 'none';
    if (aboutImg) { aboutImg.src = photoSrc; aboutImg.style.display = ''; }
    if (aboutPlaceholder) aboutPlaceholder.style.display = 'none';
  } else {
    if (heroImg) heroImg.style.display = 'none';
    if (heroPlaceholder) heroPlaceholder.style.display = '';
    if (aboutImg) aboutImg.style.display = 'none';
    if (aboutPlaceholder) aboutPlaceholder.style.display = '';
  }
}

function renderAbout() {
  const { about } = CONFIG;
  document.getElementById('about-intro').textContent = about.intro;
  const interestEl = document.getElementById('about-interest');
  if (interestEl && about.interest) {
    interestEl.innerHTML = `<div class="interest-badge">Security Focus</div><p>${escapeHtml(about.interest)}</p>`;
  }
  const expEl = document.getElementById('about-experience');
  if (expEl && about.experience) {
    expEl.innerHTML = about.experience
      .map(
        (item) =>
          `<div class="exp-item"><div class="exp-role">${escapeHtml(item.role)}</div><div class="exp-company">${escapeHtml(item.company)}</div><div class="exp-period">${escapeHtml(item.period)}</div><p class="exp-desc">${escapeHtml(item.desc)}</p></div>`
      )
      .join('');
  }
}

const ICONS = {
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h2.026c2.598 0 4.73-2.154 4.73-4.75C21.218 6.139 17.51 2 12 2z"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  git: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  github: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>',
};

function strokeIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function fillIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`;
}

function skillBadge(badge) {
  return `<span class="skill-3d">${strokeIcon(badge)}</span>`;
}

function renderSkills() {
  const grid = document.getElementById('skills-grid');
  grid.innerHTML = CONFIG.skills
    .map(
      (s) => `
    <div class="skill-card glass-card" data-animate>
      <div class="skill-icon">${skillBadge(s.badge)}</div>
      <h3>${escapeHtml(s.name)}</h3>
      <div class="skill-level">${escapeHtml(s.level)}</div>
    </div>`
    )
    .join('');
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = CONFIG.projects
    .map((p) => {
      const safeLink = escapeAttr(p.link || '');
      const linkStart = p.link ? `<a href="${safeLink}" target="_blank" rel="noopener" class="project-card glass-card" data-animate>` : `<article class="project-card glass-card" data-animate>`;
      const linkEnd = p.link ? '</a>' : '</article>';
      return `
    ${linkStart}
      <div class="project-tag">${escapeHtml(p.tag)}</div>
      <h3>${escapeHtml(p.title)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <div class="project-tech">
        ${p.tech.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}
      </div>
      ${p.link ? '<span class="project-link">View project →</span>' : ''}
    ${linkEnd}`;
    })
    .join('');
}

function renderContact() {
  const { contact } = CONFIG;
  document.getElementById('contact-grid').innerHTML = `
    <a href="${escapeAttr(contact.github.url)}" target="_blank" rel="noopener" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><span class="contact-svg">${fillIcon('github')}</span></span>
      <h3>GitHub</h3>
      <p>${escapeHtml(contact.github.label)}</p>
    </a>
    <a href="${escapeAttr(contact.linkedin.url)}" target="_blank" rel="noopener" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><span class="contact-svg">${strokeIcon('linkedin')}</span></span>
      <h3>LinkedIn</h3>
      <p>${escapeHtml(contact.linkedin.label)}</p>
    </a>
    <a href="${escapeAttr(contact.email.url)}" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><span class="contact-svg">${strokeIcon('mail')}</span></span>
      <h3>Email</h3>
      <p>${escapeHtml(contact.email.label)}</p>
    </a>`;
}

renderProfile();
renderAbout();
renderSkills();
renderProjects();
renderContact();


const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.dataset.skill) {
          entry.target.style.setProperty('--skill-level', `${entry.target.dataset.skill}%`);
        }
      }
    });
  },
  { threshold: 0.15 }
);

function observeAnimated() {
  document.querySelectorAll('[data-animate], .skill-card').forEach((el) => observer.observe(el));
}

observeAnimated();


const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let particleMode = 'sphere';
let speedMultiplier = 1;
let glowIntensity = 1.5;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
}

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.z = Math.random() * canvas.width;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.baseSize = Math.random() * 2 + 0.5;
  }

  update() {
    const speed = speedMultiplier;
    if (particleMode === 'sphere') {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const angle = Math.atan2(this.y - cy, this.x - cx) + 0.002 * speed;
      const dist = Math.hypot(this.x - cx, this.y - cy);
      this.x = cx + Math.cos(angle) * dist;
      this.y = cy + Math.sin(angle) * dist;
    } else if (particleMode === 'network') {
      this.x += this.vx * speed;
      this.y += this.vy * speed;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    } else {
      this.x += this.vx * speed * 2;
      this.y += this.vy * speed * 2;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
  }

  draw() {
    const scale = canvas.width / (this.z || 1);
    const size = this.baseSize * scale * 0.001 * glowIntensity;
    const alpha = Math.min(0.55, glowIntensity * 0.35);
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.min(3, Math.max(0.5, size * 100)), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${THEME.accentRgb}, ${alpha})`;
    ctx.fill();
  }
}

function initParticles() {
  const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 8000));
  particles = Array.from({ length: count }, () => new Particle());
}

function drawConnections() {
  const maxDist = particleMode === 'network' ? 120 : 80;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.hypot(dx, dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.15 * glowIntensity;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(${THEME.accentRgb}, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p) => {
    p.update();
    p.draw();
  });
  drawConnections();
  requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateParticles(performance.now());

// ===== Typing Effect =====
const typingEl = document.getElementById('typing-text');
let roleIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
  const current = CONFIG.profile.roles[roleIndex];
  if (!isDeleting) {
    typingEl.textContent = current.slice(0, charIndex + 1);
    charIndex++;
    if (charIndex === current.length) {
      isDeleting = true;
      setTimeout(typeEffect, 2000);
      return;
    }
  } else {
    typingEl.textContent = current.slice(0, charIndex - 1);
    charIndex--;
    if (charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % CONFIG.profile.roles.length;
    }
  }
  setTimeout(typeEffect, isDeleting ? 50 : 100);
}

typeEffect();


const terminalOutput = document.getElementById('terminal-output');
const terminalForm = document.getElementById('terminal-form');
const terminalInput = document.getElementById('terminal-input');

const commands = {
  help: () => [
    'Available commands:',
    '  help     — Show this list',
    '  about    — About me',
    '  skills   — List my skills',
    '  projects — Show projects',
    '  contact  — Contact info',
    '  tools    — List available tools',
    '  pmlab    — Open Project Management Lab',
    '  clear    — Clear terminal',
    '  whoami   — Display identity',
    '  date     — Current date/time',
  ],
  about: () => [CONFIG.about.intro],
  skills: () => CONFIG.terminalSkills,
  projects: () =>
    CONFIG.projects.map((p, i) => `${i + 1}. ${p.title} — ${p.description.slice(0, 60)}...`),
  contact: () => [
    `GitHub: ${CONFIG.contact.github.url}`,
    `LinkedIn: ${CONFIG.contact.linkedin.url}`,
    `Email: ${CONFIG.contact.email.label}`,
  ],
  tools: () => [
    'Cyber Security Lab tools:',
    '  Network Recon — DNS Lookup',
    '  Web App Security — Security Headers Analyzer',
    '  JWT & Hash Inspector',
    '  Subdomain & Directory Enumeration',
    '  HTTP Request Builder / Repeater',
    'Open the "Cyber Lab" page to try them.',
  ],
  pmlab: () => [
    'IT Project Management Lab:',
    '  Document Analyzer — upload XLSX/PDF/DOCX/TXT',
    '  Project Planner — WBS & task generation',
    '  Health Analyzer — project health score (0-100)',
    '  Risk Simulator — probability x impact',
    '  Scenario Lab — PM decision simulator',
    '  Reports — executive report & export',
    'Open the "PM Lab" page to try them.',
  ],
  whoami: () => [`guest → ${CONFIG.profile.name.toLowerCase().replace(/\s/g, '-')}`],
  date: () => [new Date().toLocaleString('en-US')],
  clear: () => {
    terminalOutput.innerHTML = '';
    return [];
  },
};

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addTerminalLine(text, className = '') {
  const p = document.createElement('p');
  p.className = `terminal-line ${className}`.trim();
  if (text.startsWith('$')) {
    p.innerHTML = `<span class="prompt">$</span> ${escapeHtml(text.slice(2))}`;
  } else {
    p.textContent = text;
  }
  terminalOutput.appendChild(p);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

terminalForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = terminalInput.value.trim().toLowerCase();
  if (!cmd) return;
  addTerminalLine(`$ ${cmd}`);
  const handler = commands[cmd];
  if (handler) {
    handler().forEach((line) => addTerminalLine(line, 'muted'));
  } else {
    addTerminalLine(`Command not found: "${cmd}". Type "help" for available commands.`, 'muted');
  }
  terminalInput.value = '';
});


document.getElementById('contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = document.getElementById('form-status');
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const message = document.getElementById('message').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    status.hidden = false;
    status.textContent = 'Please enter a valid email address.';
    status.style.color = 'var(--danger)';
    return;
  }
  const to = CONFIG.contact.email.label;
  const subject = encodeURIComponent(`Portfolio contact from ${name || 'a visitor'}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
  status.hidden = false;
  status.style.color = '';
  status.textContent = 'Opening your email app to send the message…';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  setTimeout(() => { status.hidden = true; }, 5000);
});


const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');

menuToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', open);
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});


// Dark-only site: force dark theme, ignore any stored light preference.
document.documentElement.dataset.theme = 'dark';
try { localStorage.removeItem('theme'); } catch {}


const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY + 100;
  sections.forEach((section) => {
    const link = document.querySelector(`.nav-links a[href="#${section.id}"]`);
    if (link && scrollY >= section.offsetTop && scrollY < section.offsetTop + section.offsetHeight) {
      document.querySelectorAll('.nav-links a').forEach((a) => (a.style.color = ''));
      link.style.color = 'var(--accent)';
    }
  });
});
