// script.js — main app logic (ES module style)
const AUTO_PLAY_TIME = 30000; // 30s

let quotes = [];
let authors = [];
let currentIndex = null;
let historyStack = [];
let autoPlayTimer = null;
let infiniteShuffle = false;

// DOM helpers (index page)
const elements = {
  quoteText: () => document.getElementById('quoteText'),
  authorName: () => document.getElementById('authorName'),
  authorImg: () => document.getElementById('authorImg'),
  authorProfession: () => document.getElementById('authorProfession'),
  authorAbout: () => document.getElementById('authorAbout'),
  category: () => document.getElementById('quoteCategory'),
  progressFill: () => document.getElementById('progressFill'),
  bgOverlay: () => document.getElementById('bgOverlay'),
  favBtn: () => document.getElementById('favBtn'),
  themeToggle: () => document.getElementById('themeToggle'),
  nextBtn: () => document.getElementById('nextBtn'),
  prevBtn: () => document.getElementById('prevBtn'),
  shuffleBtn: () => document.getElementById('shuffleBtn'),
  copyBtn: () => document.getElementById('copyBtn'),
  shareBtn: () => document.getElementById('shareBtn'),
  downloadBtn: () => document.getElementById('downloadBtn'),
  globalSearch: () => document.getElementById('globalSearch'),
  infiniteShuffleBtn: () => document.getElementById('infiniteShuffle'),
  dailyBtn: () => document.getElementById('dailyBtn')
};

// Utility: fetch JSON
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// Initialize app for index page
async function initIndex() {
  try {
    [quotes, authors] = await Promise.all([fetchJSON('quotes.json'), fetchJSON('authors.json')]);
    applyThemeFromStorage();
    loadFavoritesStorage();
    // show a random quote on load
    showRandomQuote();
    startAutoPlay();
    wireIndexEvents();
  } catch (err) {
    console.error(err);
    if (elements.quoteText()) elements.quoteText().innerText = 'Failed to load quotes.';
  }
}

// Display a quote by index
function displayQuoteByIndex(idx) {
  if (!quotes.length) return;
  currentIndex = idx;
  const q = quotes[idx];
  const author = authors.find(a => a.id === q.authorId) || { name: 'Unknown', photo: '', profession: '', about: '' };

  if (elements.quoteText()) elements.quoteText().innerText = q.quote;
  if (elements.category()) elements.category().innerText = q.category || 'General';
  if (elements.authorName()) elements.authorName().innerText = author.name || 'Unknown';
  if (elements.authorProfession()) elements.authorProfession().innerText = author.profession || '';
  if (elements.authorAbout()) {
    const aboutEl = elements.authorAbout();
    if (author.about) {
      aboutEl.innerText = truncateWords(author.about, 40, 80);
      aboutEl.classList.remove('hidden');
    } else {
      aboutEl.classList.add('hidden');
    }
  }
  if (elements.authorImg()) {
    const img = elements.authorImg();
    if (author.photo) {
      img.src = author.photo;
      img.classList.remove('hidden');
    } else {
      img.classList.add('hidden');
    }
  }

  checkFavorite(q.id);
  animateCard();
  updateBackground();
  pushHistory(idx);
  resetProgress();
}

// Random index
function randomIndex() {
  return Math.floor(Math.random() * quotes.length);
}

// Show random quote
function showRandomQuote() {
  if (!quotes.length) return;
  let idx = randomIndex();
  if (currentIndex !== null && !infiniteShuffle) {
    // avoid immediate repeat
    let attempts = 0;
    while (idx === currentIndex && attempts < 6) { idx = randomIndex(); attempts++; }
  }
  displayQuoteByIndex(idx);
}

// Previous quote
function showPrevious() {
  if (historyStack.length > 1) {
    historyStack.pop(); // remove current
    const prev = historyStack[historyStack.length - 1];
    displayQuoteByIndex(prev);
  }
}

// Push to history
function pushHistory(idx) {
  if (historyStack[historyStack.length - 1] !== idx) historyStack.push(idx);
}

// Animate card
function animateCard() {
  const card = document.getElementById('quote-section');
  if (!card) return;
  card.style.animation = 'none';
  void card.offsetHeight;
  card.style.animation = 'fadeIn 0.45s ease';
}

// Background update
function updateBackground() {
  const overlay = elements.bgOverlay();
  if (!overlay) return;
  overlay.style.backgroundImage = `url('https://source.unsplash.com/1600x900/?inspiration,nature&sig=${Math.floor(Math.random()*10000)}')`;
}

// Progress & autoplay
function startAutoPlay() {
  stopAutoPlay();
  autoPlayTimer = setInterval(() => {
    if (infiniteShuffle) showRandomQuote();
    else showRandomQuote();
  }, AUTO_PLAY_TIME);
  resetProgress();
}

function stopAutoPlay() {
  if (autoPlayTimer) clearInterval(autoPlayTimer);
}

function resetProgress() {
  const fill = elements.progressFill();
  if (!fill) return;
  fill.style.transition = 'none';
  fill.style.width = '0%';
  setTimeout(() => {
    fill.style.transition = `width ${AUTO_PLAY_TIME}ms linear`;
    fill.style.width = '100%';
  }, 50);
}

// Theme
function applyThemeFromStorage() {
  const theme = localStorage.getItem('theme') || 'dark';
  document.body.classList.toggle('light-mode', theme === 'light');
  document.body.classList.toggle('dark-mode', theme !== 'light');
}

// Favorites
function loadFavoritesStorage() {
  if (!localStorage.getItem('favorites')) localStorage.setItem('favorites', JSON.stringify([]));
}

function toggleFavorite() {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const qid = quotes[currentIndex].id;
  const idx = favs.indexOf(qid);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(qid); }
  localStorage.setItem('favorites', JSON.stringify(favs));
  checkFavorite(qid);
}

function checkFavorite(qid) {
  const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
  const btn = elements.favBtn();
  if (!btn) return;
  if (favs.includes(qid)) {
    btn.classList.add('active');
    btn.innerHTML = '<i class="fas fa-heart"></i>';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i class="far fa-heart"></i>';
  }
}

// Copy & share
function copyQuote() {
  const text = `"${elements.quoteText().innerText}" — ${elements.authorName().innerText}`;
  navigator.clipboard?.writeText(text).then(() => alert('Quote copied to clipboard'));
}

function shareQuote() {
  if (!navigator.share) return alert('Share not supported on this browser');
  navigator.share({
    title: 'Inspiring Quote',
    text: `"${elements.quoteText().innerText}" — ${elements.authorName().innerText}`
  });
}

// Download as image (uses html2canvas if available)
async function downloadQuoteImage() {
  const card = document.getElementById('quote-section');
  if (!card) return;
  if (typeof html2canvas === 'undefined') {
    alert('Download requires html2canvas. Add it to the page or use the built-in screenshot tool.');
    return;
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

// Wire events on index
function wireIndexEvents() {
  elements.nextBtn()?.addEventListener('click', () => { showRandomQuote(); });
  elements.prevBtn()?.addEventListener('click', () => { showPrevious(); });
  elements.shuffleBtn()?.addEventListener('click', () => { infiniteShuffle = !infiniteShuffle; elements.shuffleBtn().classList.toggle('active', infiniteShuffle); });
  elements.copyBtn()?.addEventListener('click', copyQuote);
  elements.shareBtn()?.addEventListener('click', shareQuote);
  elements.downloadBtn()?.addEventListener('click', downloadQuoteImage);
  elements.favBtn()?.addEventListener('click', toggleFavorite);
  elements.themeToggle()?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode', !isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
  elements.globalSearch()?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) return;
    // quick search: find first matching quote
    const found = quotes.findIndex(item => item.quote.toLowerCase().includes(q) || (item.tags || []).some(t => t.includes(q)));
    if (found >= 0) displayQuoteByIndex(found);
  });
  elements.infiniteShuffleBtn()?.addEventListener('click', () => {
    infiniteShuffle = !infiniteShuffle;
    elements.infiniteShuffleBtn().classList.toggle('active', infiniteShuffle);
    if (infiniteShuffle) startAutoPlay(); else stopAutoPlay();
  });
  elements.dailyBtn()?.addEventListener('click', showDailyQuote);
}

// Daily quote (deterministic per day)
function showDailyQuote() {
  if (!quotes.length) return;
  const daySeed = new Date().toISOString().slice(0,10).split('-').join('');
  const seed = parseInt(daySeed.slice(-6)) || Date.now();
  const idx = seed % quotes.length;
  displayQuoteByIndex(idx);
}

// Authors page loader (exported)
export async function loadAuthorsPage() {
  try {
    authors = await fetchJSON('authors.json');
    const grid = document.getElementById('authorsGrid');
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
      card.addEventListener('click', () => {
        location.href = `author-profile.html?id=${a.id}`;
      });
      grid.appendChild(card);
    });

    // search
    const search = document.getElementById('authorSearch');
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
    console.error('Failed to load authors', err);
  }
}

// Author profile loader (exported)
export async function loadAuthorProfile() {
  try {
    const params = new URLSearchParams(location.search);
    const id = parseInt(params.get('id'), 10);
    if (!id) return;
    [authors, quotes] = await Promise.all([fetchJSON('authors.json'), fetchJSON('quotes.json')]);
    const author = authors.find(a => a.id === id);
    if (!author) return;
    document.getElementById('profileImg').src = author.photo;
    document.getElementById('profileName').innerText = author.name;
    document.getElementById('profileMeta').innerText = `${author.profession} • ${author.country} • ${author.born || '?'}–${author.died || '?'}`;
    document.getElementById('profileAbout').innerText = author.about;
    document.getElementById('profileShortName').innerText = author.name.split(' ')[0];

    const booksEl = document.getElementById('profileBooks');
    booksEl.innerHTML = '';
    (author.books || []).forEach(b => {
      const li = document.createElement('li'); li.innerText = b; booksEl.appendChild(li);
    });

    const careerEl = document.getElementById('profileCareer');
    careerEl.innerHTML = '';
    (author.facts || []).forEach(f => {
      const li = document.createElement('li'); li.innerText = f; careerEl.appendChild(li);
    });

    const quotesEl = document.getElementById('profileQuotes');
    quotesEl.innerHTML = '';
    const authorQuotes = quotes.filter(q => q.authorId === id);
    authorQuotes.forEach(q => {
      const p = document.createElement('p');
      p.innerText = q.quote;
      quotesEl.appendChild(p);
    });

    // related authors (simple heuristic: same country or profession)
    const relatedEl = document.getElementById('relatedAuthors');
    relatedEl.innerHTML = '';
    const related = authors.filter(a => a.id !== id && (a.country === author.country || a.profession === author.profession)).slice(0,6);
    related.forEach(a => {
      const card = document.createElement('div');
      card.className = 'author-card';
      card.innerHTML = `<img src="${a.photo}" alt="${a.name}" /><h4>${a.name}</h4><div class="meta-text">${a.profession}</div>`;
      card.addEventListener('click', () => location.href = `author-profile.html?id=${a.id}`);
      relatedEl.appendChild(card);
    });

  } catch (err) {
    console.error('Failed to load author profile', err);
  }
}

// Auto-run index init when on index page
if (location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/')) {
  initIndex();
}

// Exported for authors pages
export { initIndex as default };
