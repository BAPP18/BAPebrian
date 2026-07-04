export function initAllTools() {
  initTabs('cyber-tabs');
  initPasswordAnalyzer();
  initTextEncryptor();
  initPortReference();
}

function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const tabs = container.querySelectorAll('.lab-tab');
  const contents = container.querySelectorAll('.lab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(tab.dataset.tab);
      if (content) content.classList.add('active');
    });
  });
}

function analyzePassword(password) {
  const len = password.length;
  let charSet = 0;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasLower) charSet += 26;
  if (hasUpper) charSet += 26;
  if (hasDigit) charSet += 10;
  if (hasSpecial) charSet += 32;
  const entropy = len > 0 ? len * Math.log2(charSet || 1) : 0;
  let strength, pct, color;
  if (entropy >= 80) { strength = 'Very Strong'; pct = 100; color = '#86efac'; }
  else if (entropy >= 60) { strength = 'Strong'; pct = 80; color = '#4ade80'; }
  else if (entropy >= 40) { strength = 'Medium'; pct = 55; color = '#fbbf24'; }
  else if (entropy >= 20) { strength = 'Weak'; pct = 30; color = '#fb923c'; }
  else { strength = 'Very Weak'; pct = 10; color = '#fb7185'; }
  const cracks = { 'Very Weak': 'instantly', 'Weak': 'seconds', 'Medium': 'hours', 'Strong': 'years', 'Very Strong': 'centuries' };
  return { strength, pct, color, entropy, len, crack: cracks[strength] };
}

function initPasswordAnalyzer() {
  const input = document.getElementById('pwd-input');
  const bar = document.getElementById('pwd-bar');
  const info = document.getElementById('pwd-info');
  const time = document.getElementById('pwd-time');
  const toggle = document.getElementById('pwd-toggle');
  if (!input) return;

  function update() {
    const r = analyzePassword(input.value);
    bar.style.width = r.pct + '%';
    bar.style.background = r.color;
    info.textContent = `Strength: ${r.strength} | Entropy: ${r.entropy.toFixed(1)} bits | Length: ${r.len}`;
    time.textContent = `Estimated crack time: ${r.crack}`;
  }

  input.addEventListener('input', update);
  toggle?.addEventListener('click', () => {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    toggle.textContent = type === 'password' ? '👁️' : '🙈';
  });
  update();
}

function caesar(text, shift, decode) {
  const s = decode ? -shift : shift;
  return text.split('').map(c => {
    if (c.match(/[a-z]/i)) {
      const code = c.charCodeAt(0);
      const base = code >= 97 ? 97 : 65;
      return String.fromCharCode(((code - base + (s % 26) + 26) % 26) + base);
    }
    return c;
  }).join('');
}

function xorCipher(text, key) {
  if (!key) return text;
  return text.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
}

function initTextEncryptor() {
  const input = document.getElementById('enc-input');
  const output = document.getElementById('enc-output');
  const algo = document.getElementById('enc-algo');
  const shift = document.getElementById('enc-shift');
  const key = document.getElementById('enc-key');
  const shiftGroup = document.getElementById('enc-shift-group');
  const keyGroup = document.getElementById('enc-key-group');
  if (!input) return;

  function toggleFields() {
    const v = algo.value;
    if (shiftGroup) shiftGroup.style.display = v === 'caesar' ? '' : 'none';
    if (keyGroup) keyGroup.style.display = v === 'xor' ? '' : 'none';
  }
  algo?.addEventListener('change', toggleFields);
  toggleFields();

  function process(decode) {
    const text = input.value;
    const a = algo.value;
    let result = '';
    if (a === 'base64') {
      try { result = decode ? atob(text) : btoa(text); } catch { result = '[Error: Invalid input]'; }
    } else if (a === 'caesar') {
      const s = parseInt(shift?.value || '3', 10);
      result = caesar(text, s, decode);
    } else if (a === 'xor') {
      const k = key?.value || 'key';
      result = xorCipher(text, k);
    }
    output.value = result;
  }

  document.getElementById('enc-encrypt')?.addEventListener('click', () => process(false));
  document.getElementById('enc-decrypt')?.addEventListener('click', () => process(true));
  document.getElementById('enc-copy')?.addEventListener('click', () => {
    output.select();
    navigator.clipboard?.writeText(output.value);
    const btn = document.getElementById('enc-copy');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy'; }, 1500);
  });
}

const COMMON_PORTS = [
  { port: 20, proto: 'TCP', service: 'FTP Data', desc: 'File Transfer Protocol (data transfer)' },
  { port: 21, proto: 'TCP', service: 'FTP Control', desc: 'File Transfer Protocol (control)' },
  { port: 22, proto: 'TCP', service: 'SSH', desc: 'Secure Shell — encrypted remote access' },
  { port: 23, proto: 'TCP', service: 'Telnet', desc: 'Unencrypted remote access (legacy — avoid)' },
  { port: 25, proto: 'TCP', service: 'SMTP', desc: 'Simple Mail Transfer Protocol' },
  { port: 53, proto: 'UDP/TCP', service: 'DNS', desc: 'Domain Name System' },
  { port: 80, proto: 'TCP', service: 'HTTP', desc: 'HyperText Transfer Protocol — web traffic' },
  { port: 110, proto: 'TCP', service: 'POP3', desc: 'Post Office Protocol v3 (email retrieval)' },
  { port: 143, proto: 'TCP', service: 'IMAP', desc: 'Internet Message Access Protocol' },
  { port: 443, proto: 'TCP', service: 'HTTPS', desc: 'HTTP Secure — encrypted web traffic' },
  { port: 445, proto: 'TCP', service: 'SMB', desc: 'Server Message Block — file sharing' },
  { port: 993, proto: 'TCP', service: 'IMAPS', desc: 'IMAP over SSL/TLS' },
  { port: 995, proto: 'TCP', service: 'POP3S', desc: 'POP3 over SSL/TLS' },
  { port: 1433, proto: 'TCP', service: 'MSSQL', desc: 'Microsoft SQL Server' },
  { port: 3306, proto: 'TCP', service: 'MySQL', desc: 'MySQL database' },
  { port: 3389, proto: 'TCP', service: 'RDP', desc: 'Remote Desktop Protocol' },
  { port: 5432, proto: 'TCP', service: 'PostgreSQL', desc: 'PostgreSQL database' },
  { port: 8080, proto: 'TCP', service: 'HTTP-Alt', desc: 'Alternative HTTP (proxy/dev server)' },
  { port: 8443, proto: 'TCP', service: 'HTTPS-Alt', desc: 'Alternative HTTPS' },
  { port: 27017, proto: 'TCP', service: 'MongoDB', desc: 'MongoDB database' },
];

function initPortReference() {
  const select = document.getElementById('port-select');
  const display = document.getElementById('port-display');
  if (!select) return;

  COMMON_PORTS.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.port;
    opt.textContent = `${p.port} — ${p.service}`;
    select.appendChild(opt);
  });

  function showPort(portNum) {
    const p = COMMON_PORTS.find(x => x.port === parseInt(portNum));
    if (!p) { display.innerHTML = '<p class="text-muted">Select a port to see details</p>'; return; }
    const secure = [22, 443, 993, 995, 8443].includes(p.port);
    const risky = [23, 25, 80, 110, 143, 445, 3389].includes(p.port);
    display.innerHTML = `
      <div class="port-detail">
        <div class="port-row"><span>Port</span><strong>${p.port}</strong></div>
        <div class="port-row"><span>Protocol</span><strong>${p.proto}</strong></div>
        <div class="port-row"><span>Service</span><strong>${p.service}</strong></div>
        <div class="port-row"><span>Description</span><span>${p.desc}</span></div>
        <div class="port-security ${secure ? 'safe' : risky ? 'warning' : 'info'}">
          ${secure ? '✅ Encrypted — secure' : risky ? '⚠️ Often targeted — limit exposure' : 'ℹ️ Standard service port'}
        </div>
      </div>`;
  }

  select.addEventListener('change', () => showPort(select.value));
  if (COMMON_PORTS.length > 0) { select.value = COMMON_PORTS[0].port; showPort(COMMON_PORTS[0].port); }
}


