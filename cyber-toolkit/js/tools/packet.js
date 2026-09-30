export function initPacketGuide() {
  document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', () => {
    const target = document.querySelector(btn.dataset.copy);
    if (!target) return;
    navigator.clipboard?.writeText(target.innerText).then(() => {
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = old; }, 1500);
    }).catch(() => {});
  }));
}
