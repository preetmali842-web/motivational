// script.js — corrected for GitHub Pages
const AUTO_PLAY_TIME = 30000;

let quotes = [];
let authors = [];
let currentIndex = null;
let historyStack = [];
let autoPlayTimer = null;
let infiniteShuffle = false;

// DOM getters (safe)
const $ = id => document.getElementById(id);

// Utility: fetch JSON with clear error
async function fetchJSON(path) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path} returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`fetchJSON error for ${path}:`, err);
    throw err;
  }
}

// Init for index page
async function initIndex() {
  try {
    // Use relative paths
    [quotes, authors] = await Promise.all([fetchJSON('./quotes.json'), fetchJSON('./authors.json')]);
    applyThemeFromStorage();
    ensureFavorites();
    showRandomQuote();
    startAutoPlay();
    wireIndexEvents();
    console.info('Index initialized: quotes', quotes.length, 'authors', authors.length);
  } catch (err) {
    console.error('initIndex failed:', err);
    const qt = $('quoteText');
    if (qt) qt.innerText = 'Failed to load quotes. Check console for details.';
  }
}

// Display helpers
function displayQuoteByIndex(idx) {
  if (!quotes || quotes.length === 0) return;
  if (idx < 0 || idx >= quotes.length) idx = 0;
  currentIndex = idx;
  const q = quotes[idx];
  const author = authors.find(a => a.id === q.authorId) || { name: 'Unknown', photo: '', profession: '', about: '' };

  if ($('quoteText')) $('quoteText').innerText = q.quote;
  if ($('quoteCategory')) $('quoteCategory').innerText = q.category || 'General';
  if ($('authorName')) $('authorName').innerText = author.name || 'Unknown';
  if ($('authorProfession')) $('authorProfession').innerText = author.profession || '';
  if ($('authorAbout')) {
    const aboutEl = $('authorAbout');
    if (author.about) {
      aboutEl.innerText = truncateWords(author.about, 40, 80);
      aboutEl.classList.remove('hidden');
    } else {
      aboutEl.classList.add('hidden');
    }
  }
  if ($('authorImg')) {
    const img = $('authorImg');
    if (author.photo) { img.src = author.photo; img.classList.remove('hidden'); }
    else { img.classList.add('hidden'); }
  }

  checkFavorite(q.id);
  animateCard();
  updateBackground();
  pushHistory(idx);
  resetProgress();
}

function randomIndex() {
  return Math.floor(Math.random() * quotes.length);
}

function showRandomQuote() {
  if (!quotes.length) return;
  let idx = randomIndex();
  if (currentIndex !== null && !infiniteShuffle) {
    let attempts = 0;
    while (idx === currentIndex && attempts < 6) { idx = randomIndex(); attempts++; }
  }
  displayQuoteByIndex(idx);
}

function showPrevious() {
  if (historyStack.length > 1) {
    historyStack.pop();
    const prev = historyStack[historyStack.length - 1];
    displayQuoteByIndex(prev);
  }
}

function pushHistory(idx) {
  if (historyStack[historyStack.length - 1] !== idx) historyStack.push(idx);
}

function animateCard() {
  const card = $('quote-section');
  if (!card) return;
  card.style.animation = 'none';
  void card.offsetHeight;
  card.style.animation = 'fadeIn 0.45s ease';
}

function updateBackground() {
  const overlay = $('bgOverlay');
  if (!overlay) return;
  overlay.style.backgroundImage = `url('https://source.unsplash.com/1600x900/?inspiration,nature&sig=${Math.floor(Math.random()*100000)}')`;
}

// Auto-play & progress
function startAutoPlay() {
  stopAutoPlay();
  autoPlayTimer = setInterval(() => showRandomQuote(), AUTO_PLAY_TIME);
  resetProgress();
}
function stopAutoPlay() { if (autoPlayTimer) clearInterval(autoPlayTimer); }

function resetProgress() {
  const fill = $('progressFill');
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '0%';
  setTimeout(() => {
    fill.style.transition = `width ${AUTO_PLAY_TIME}ms linear`;
    fill.style.width = '100%';
  }, 60);
}

// Theme
function applyThemeFromStorage() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme !== 'light');
}

// Favorites
function ensureFavorites() {
  if (!localStorage.getItem('favorites')) localStorage.setItem('favorites', JSON.stringify([]));
}
function toggleFavorite() {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const qid = quotes[currentIndex].id;
  const idx = favs.indexOf(qid);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(qid);
  localStorage.setItem('favorites', JSON.stringify(favs));
  checkFavorite(qid);
}
function checkFavorite(qid) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const btn = $('favBtn');
  if (!btn) return;
  if (favs.includes(qid)) { btn.classList.add('active'); btn.innerHTML = '<i class="fas fa-heart"></i>'; }
  else { btn.classList.remove('active'); btn.innerHTML = '<i class="far fa-heart"></i>'; }
}

// Copy / Share / Download
function copyQuote() {
  const text = `"${$('quoteText').innerText}" — ${$('authorName').innerText}`;
  navigator.clipboard?.writeText(text).then(() => alert('Quote copied to clipboard')).catch(() => alert('Copy failed'));
}
function shareQuote() {
  if (!navigator.share) return alert('Share not supported');
  navigator.share({ title: 'Inspiring Quote', text: `"${$('quoteText').innerText}" — ${$('authorName').innerText}` });
}
async function downloadQuoteImage() {
  const card = $('quote-section');
  if (!card) return;
  if (typeof html2canvas === 'undefined') {
    return alert('Download requires html2canvas. Add it to index.html or disable download.');
  }
  document.querySelector('.card-actions')?.classList.add('hidden-temp');
  const canvas = await html2canvas(card, { backgroundColor: null });
  const link = document.createElement('a');
  link.download = `quote-${quotes[currentIndex].id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  document.querySelector('.card-actions')?.classList.remove('hidden-temp');
}

// Helpers
function truncateWords(text = '', minWords = 40, maxWords = 80) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
}

// Wire events
function wireIndexEvents() {
  $('nextBtn')?.addEventListener('click', showRandomQuote);
  $('prevBtn')?.addEventListener('click', showPrevious);
  $('shuffleBtn')?.addEventListener('click', () => {
    infiniteShuffle = !infiniteShuffle;
    $('shuffleBtn').classList.toggle('active', infiniteShuffle);
  });
  $('copyBtn')?.addEventListener('click', copyQuote);
  $('shareBtn')?.addEventListener('click', shareQuote);
  $('downloadBtn')?.addEventListener('click', downloadQuoteImage);
  $('favBtn')?.addEventListener('click', toggleFavorite);
  $('themeToggle')?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode', !isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
  $('globalSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    const found = quotes.findIndex(item => item.quote.toLowerCase().includes(q) || (item.tags || []).some(t => t.includes(q)));
    if (found >= 0) displayQuoteByIndex(found);
  });
  $('infiniteShuffle')?.addEventListener('click', () => {
    infiniteShuffle = !infiniteShuffle;
    $('infiniteShuffle').classList.toggle('active', infiniteShuffle);
    if (infiniteShuffle) startAutoPlay(); else stopAutoPlay();
  });
  $('dailyBtn')?.addEventListener('click', showDailyQuote);
}

// Daily quote
function showDailyQuote() {
  if (!quotes.length) return;
  const day = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const seed = parseInt(day.slice(-6)) || Date.now();
  const idx = seed % quotes.length;
  displayQuoteByIndex(idx);
}

/* Authors page loader (for authors.html) */
export async function loadAuthorsPage() {
  try {
    authors = await fetchJSON('./authors.json');
    const grid = $('authorsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    authors.forEach(a => {
      const card = document.createElement('div');
      card.className = 'author-card';
      card.innerHTML = `
        <img src="${a.photo}" alt="${a.name}" />
        <h4>${a.name}</h4>
        <div class="meta-text">${a.profession} • ${a.country}</div>
        <div class="meta-text">${a.born || '?'} — ${a.died || '?'}</div>
      `;
      card.addEventListener('click', () => location.href = `author-profile.html?id=${a.id}`);
      grid.appendChild(card);
    });

    const search = $('authorSearch');
    if (search) {
      search.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        grid.innerHTML = '';
        const filtered = authors.filter(a => {
          return a.name.toLowerCase().includes(q) || (a.profession || '').toLowerCase().includes(q) || (a.country || '').toLowerCase().includes(q);
        });
        filtered.forEach(a => {
          const card = document.createElement('div');
          card.className = 'author-card';
          card.innerHTML = `
            <img src="${a.photo}" alt="${a.name}" />
            <h4>${a.name}</h4>
            <div class="meta-text">${a.profession} • ${a.country}</div>
            <div class="meta-text">${a.born || '?'} — ${a.died || '?'}</div>
          `;
          card.addEventListener('click', () => location.href = `author-profile.html?id=${a.id}`);
          grid.appendChild(card);
        });
      });
    }
  } catch (err) {
    console.error('loadAuthorsPage failed:', err);
  }
}

/* Author profile loader */
export async function loadAuthorProfile() {
  try {
    const params = new URLSearchParams(location.search);
    const id = parseInt(params.get('id'), 10);
    if (!id) return;
    [authors, quotes] = await Promise.all([fetchJSON('./authors.json'), fetchJSON('./quotes.json')]);
    const author = authors.find(a => a.id === id);
    if (!author) return;
    $('profileImg').src = author.photo;
    $('profileName').innerText = author.name;
    $('profileMeta').innerText = `${author.profession} • ${author.country} • ${author.born || '?'}–${author.died || '?'}`;
    $('profileAbout').innerText = author.about || '';
    $('profileShortName').innerText = author.name.split(' ')[0] || author.name;

    const booksEl = $('profileBooks'); booksEl.innerHTML = '';
    (author.books || []).forEach(b => { const li = document.createElement('li'); li.innerText = b; booksEl.appendChild(li); });

    const careerEl = $('profileCareer'); careerEl.innerHTML = '';
    (author.facts || []).forEach(f => { const li = document.createElement('li'); li.innerText = f; careerEl.appendChild(li); });

    const quotesEl = $('profileQuotes'); quotesEl.innerHTML = '';
    const authorQuotes = quotes.filter(q => q.authorId === id);
    authorQuotes.forEach(q => { const p = document.createElement('p'); p.innerText = q.quote; quotesEl.appendChild(p); });

    const relatedEl = $('relatedAuthors'); relatedEl.innerHTML = '';
    const related = authors.filter(a => a.id !== id && (a.country === author.country || a.profession === author.profession)).slice(0,6);
    related.forEach(a => {
      const card = document.createElement('div');
      card.className = 'author-card';
      card.innerHTML = `<img src="${a.photo}" alt="${a.name}" /><h4>${a.name}</h4><div class="meta-text">${a.profession}</div>`;
      card.addEventListener('click', () => location.href = `author-profile.html?id=${a.id}`);
      relatedEl.appendChild(card);
    });

  } catch (err) {
    console.error('loadAuthorProfile failed:', err);
  }
}

// Auto-run index init when appropriate
const path = location.pathname.split('/').pop();
if (!path || path === '' || path === 'index.html') {
  initIndex();
}
