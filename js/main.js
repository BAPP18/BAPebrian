import { CONFIG } from './config.js';
import { initAllTools } from './tools.js';


const THEME = {
  accent: '#e879f9',
  accentRgb: '232, 121, 249',
  bg: '#0c0612',
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
    heroImg.src = photoSrc;
    heroImg.style.display = '';
    heroPlaceholder.style.display = 'none';
    aboutImg.src = photoSrc;
    aboutImg.style.display = '';
    aboutPlaceholder.style.display = 'none';
  } else {
    heroImg.style.display = 'none';
    heroPlaceholder.style.display = '';
    aboutImg.style.display = 'none';
    aboutPlaceholder.style.display = '';
  }
}

function renderAbout() {
  const { about } = CONFIG;
  document.getElementById('about-intro').textContent = about.intro;
  const interestEl = document.getElementById('about-interest');
  if (interestEl && about.interest) {
    interestEl.innerHTML = `<div class="interest-badge">🛡️ Cybersecurity Interest</div><p>${escapeHtml(about.interest)}</p>`;
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

function renderSkills() {
  const grid = document.getElementById('skills-grid');
  grid.innerHTML = CONFIG.skills
    .map(
      (s) => `
    <div class="skill-card glass-card" data-animate data-skill="${escapeAttr(s.level)}">
      <div class="skill-icon">${s.icon}</div>
      <h3>${escapeHtml(s.name)}</h3>
      <div class="skill-bar"><div class="skill-fill"></div></div>
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
      ${p.link ? '<span class="project-link">Lihat project →</span>' : ''}
    ${linkEnd}`;
    })
    .join('');
}

function renderContact() {
  const { contact } = CONFIG;
  document.getElementById('contact-grid').innerHTML = `
    <a href="${escapeAttr(contact.github.url)}" target="_blank" rel="noopener" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><img src="img/github-logo.png" alt="GitHub" class="contact-logo"></span>
      <h3>GitHub</h3>
      <p>${escapeHtml(contact.github.label)}</p>
    </a>
    <a href="${escapeAttr(contact.linkedin.url)}" target="_blank" rel="noopener" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><img src="img/linkedin-logo.jpg" alt="LinkedIn" class="contact-logo"></span>
      <h3>LinkedIn</h3>
      <p>${escapeHtml(contact.linkedin.label)}</p>
    </a>
    <a href="${escapeAttr(contact.email.url)}" class="contact-card glass-card" data-animate>
      <span class="contact-icon"><img src="img/gmail-logo.jpg" alt="Email" class="contact-logo"></span>
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
let lastTime = performance.now();
let frameCount = 0;

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
    const alpha = Math.min(1, glowIntensity * 0.4);
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, size * 100), 0, Math.PI * 2);
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

function animateParticles(now) {
  frameCount++;
  if (now - lastTime >= 1000) {
    const fps = frameCount;
    frameCount = 0;
    lastTime = now;
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) fpsEl.textContent = fps;
  }
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

document.querySelectorAll('#particle-mode .toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#particle-mode .toggle').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    particleMode = btn.dataset.mode;
  });
});

document.getElementById('speed-slider')?.addEventListener('input', (e) => {
  speedMultiplier = parseFloat(e.target.value);
  document.getElementById('speed-value').textContent = `${speedMultiplier.toFixed(1)}x`;
});

document.getElementById('glow-slider')?.addEventListener('input', (e) => {
  glowIntensity = parseFloat(e.target.value);
  document.getElementById('glow-value').textContent = `${glowIntensity.toFixed(1)}x`;
});

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
    '  clear    — Clear terminal',
    '  whoami   — Display identity',
    '  date     — Current date/time',
  ],
  about: () => [CONFIG.about.intro],
  skills: () => CONFIG.terminalSkills,
  projects: () =>
    CONFIG.projects.map((p, i) => `${i + 1}. ${p.title} — ${p.description.slice(0, 50)}...`),
  contact: () => [
    `GitHub: ${CONFIG.contact.github.url}`,
    `LinkedIn: ${CONFIG.contact.linkedin.url}`,
    `Email: ${CONFIG.contact.email.label}`,
  ],
  tools: () => [
    'Cyber Security Lab: Password Analyzer, Text Encryptor, Port Reference',
    'Scroll ke section "Cyber Lab" untuk mencoba.',
  ],
  whoami: () => [`guest → ${CONFIG.profile.name.toLowerCase().replace(/\s/g, '-')}`],
  date: () => [new Date().toLocaleString('id-ID')],
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


const today = new Date().toISOString().split('T')[0];
fetch('https://api.countapi.xyz/hit/BAPP18/BAPebrian')
  .then(r => r.json())
  .then(d => { document.getElementById('visitor-count').textContent = d.value; })
  .catch(() => { document.getElementById('visitor-count').textContent = '—'; });
fetch(`https://api.countapi.xyz/hit/BAPP18/${today}`)
  .then(r => r.json())
  .then(d => { document.getElementById('visitor-daily').textContent = d.value; })
  .catch(() => { document.getElementById('visitor-daily').textContent = '—'; });


initAllTools();


document.getElementById('contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = document.getElementById('form-status');
  status.hidden = false;
  status.textContent = '✓ Message transmitted successfully! (Demo — connect to backend later)';
  e.target.reset();
  setTimeout(() => { status.hidden = true; }, 4000);
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


const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') ?? 'dark';
document.documentElement.dataset.theme = savedTheme;
themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';

themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
});


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
