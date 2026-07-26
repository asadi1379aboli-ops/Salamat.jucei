// ========== Service Worker ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ========== PWA Install ==========
let deferredPrompt;
const installBanner = document.getElementById('installBanner');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.add('show');
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBanner.classList.remove('show');
        deferredPrompt = null;
    }
});

document.getElementById('installClose').addEventListener('click', () => {
    installBanner.classList.remove('show');
});

// ========== Fruit Particles ==========
(function() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const fruitColors = ['#ff6b35', '#ffd23f', '#ff2d55', '#7b2d8e', '#7bc67e', '#ff8c5a'];
    
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    addEventListener('resize', resize); resize();
    
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1.5,
            vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
            color: fruitColors[Math.floor(Math.random() * fruitColors.length)],
            o: Math.random() * 0.3 + 0.08
        });
    }
    
    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            const hex = p.color;
            const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${p.o})`; ctx.fill();
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255,107,53,${0.06 * (1 - dist/100)})`; ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(anim);
    }
    anim();
})();

// ========== Parallax ==========
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrolled = window.scrollY;
            const logo = document.querySelector('.hero-logo');
            const bg = document.querySelector('.hero-bg');
            if (logo) logo.style.transform = `translateY(${scrolled * 0.05}px)`;
            if (bg) bg.style.transform = `translateY(${scrolled * 0.02}px)`;
            ticking = false;
        });
        ticking = true;
    }
    const header = document.querySelector('.header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 50);
    const sb = document.getElementById('scrollTop');
    if (sb) sb.style.display = window.scrollY > 400 ? 'block' : 'none';
});

// ========== DATA ==========
let menuData = [];
let currentSize = 'لیوانی';
let currentCat = 'all';
let currentGoal = 'all';
let currentPrice = 'all';
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let modalImageIndex = 0;
let modalImages = [];

const goalLabels = { energy: '⚡ انرژی', diet: '🥗 کاهش وزن', immunity: '🛡️ تقویت ایمنی', thirst: '💧 رفع تشنگی' };
const statusLabels = { available: '✅ موجود', low: '⏳ رو به اتمام', unavailable: '❌ ناموجود' };

async function loadData() {
    try {
        const res = await fetch('data.json');
        if (!res.ok) throw new Error('Failed');
        menuData = await res.json();
        menuData.sort((a, b) => (a.order || 99) - (b.order || 99));
    } catch (e) {
        menuData = [];
    }
    displayMenu();
    renderRecent();
    checkDailyOffer();
    checkSharedItem();
}

function getFilteredData() {
    let filtered = [...menuData];
    if (currentCat !== 'all') filtered = filtered.filter(i => i.cat === currentCat);
    if (currentGoal !== 'all') filtered = filtered.filter(i => i.goals && i.goals.includes(currentGoal));
    if (currentPrice !== 'all') {
        filtered = filtered.filter(i => {
            const price = parseInt((i.prices[currentSize] || '0').replace(/[^0-9]/g, ''));
            if (currentPrice === 'low') return price < 150000;
            if (currentPrice === 'mid') return price >= 150000 && price <= 250000;
            if (currentPrice === 'high') return price > 250000;
            return true;
        });
    }
    return filtered;
}

function displayMenu() {
    const list = document.getElementById('menu-list');
    const items = getFilteredData();
    
    if (items.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:50px;">😔 محصولی یافت نشد</p>';
        return;
    }
    
    list.innerHTML = items.map((item, index) => {
        const isFav = favorites.some(f => f.name === item.name);
        const price = parseInt((item.prices[currentSize] || '0').replace(/[^0-9]/g, ''));
        const discountPrice = item.discount > 0 ? Math.round(price * (1 - item.discount / 100)) : null;
        const priceDisplay = discountPrice ? discountPrice.toLocaleString('fa-IR') : price.toLocaleString('fa-IR');
        const mainImage = (item.images && item.images[0]) || item.image || 'logo.png.jpg';
        const imageCount = (item.images && item.images.length > 1) ? item.images.length : 0;
        
        let badgeHTML = '';
        if (item.badge === 'special') badgeHTML = '<div class="ribbon special">⭐ پرفروش</div>';
        if (item.badge === 'new') badgeHTML = '<div class="ribbon new">🆕 جدید</div>';
        
        let discountHTML = '';
        if (item.discount > 0) discountHTML = `<div class="discount-badge">${item.discount}٪</div>`;
        
        let statusHTML = '';
        if (item.status && item.status !== 'available') {
            statusHTML = `<div class="status-badge ${item.status}">${statusLabels[item.status]}</div>`;
        }
        
        let goalsHTML = '';
        if (item.goals) item.goals.forEach(g => {
            goalsHTML += `<span class="goal-badge ${g}">${goalLabels[g]}</span>`;
        });
        
        const escapedName = item.name.replace(/'/g, "\\'");
        
        return `
            <div class="menu-item" style="transition-delay:${index * 0.03}s" onclick="openModal('${escapedName}')">
                ${badgeHTML} ${discountHTML} ${statusHTML}
                <button class="fav-btn ${isFav ? 'liked' : ''}" onclick="event.stopPropagation();toggleFav('${escapedName}')" aria-label="${isFav ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                <button class="share-btn" onclick="event.stopPropagation();openShare('${escapedName}')" aria-label="اشتراک‌گذاری"><i class="fas fa-share-alt"></i></button>
                ${imageCount > 1 ? `<span class="image-counter">${imageCount} عکس</span>` : ''}
                <img src="${mainImage}" alt="${item.name}" loading="lazy" onerror="this.src='logo.png.jpg';this.onerror=null;">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="stars">${'⭐'.repeat(item.stars)}</div>
                    <span class="tag">${item.cat}</span>
                    <div>${goalsHTML}</div>
                    <p class="views-count"><i class="fas fa-eye"></i> ${(item.views || 0).toLocaleString('fa-IR')} بازدید</p>
                    <div class="price-row">
                        <span class="price">${priceDisplay} تومان</span>
                        ${discountPrice ? `<span class="old-price">${price.toLocaleString('fa-IR')}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    requestAnimationFrame(() => {
        document.querySelectorAll('.menu-item').forEach((item, i) => {
            setTimeout(() => item.classList.add('visible'), i * 40);
        });
    });
}

function addToRecent(item) {
    recentlyViewed = recentlyViewed.filter(r => r.name !== item.name);
    recentlyViewed.unshift({ name: item.name, images: item.images || [item.image], image: item.images?.[0] || item.image });
    if (recentlyViewed.length > 8) recentlyViewed.pop();
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    renderRecent();
}

function renderRecent() {
    const section = document.getElementById('recentlyViewed');
    const slider = document.getElementById('recentSlider');
    if (!section || !slider) return;
    if (recentlyViewed.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    slider.innerHTML = recentlyViewed.map(r => `
        <div class="recent-item" onclick="openModal('${r.name.replace(/'/g, "\\'")}')">
            <img src="${r.image}" alt="${r.name}" loading="lazy" onerror="this.src='logo.png.jpg'">
            <div style="font-size:0.8rem;color:var(--text-light);">${r.name}</div>
        </div>
    `).join('');
}

function toggleFav(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    const index = favorites.findIndex(f => f.name === name);
    if (index >= 0) {
        favorites.splice(index, 1);
        toast('💔 از علاقه‌مندی‌ها حذف شد');
    } else {
        favorites.push({ name: item.name, images: item.images || [item.image], image: item.images?.[0] || item.image, prices: item.prices, cat: item.cat });
        toast('❤️ به علاقه‌مندی‌ها اضافه شد');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    displayMenu();
}

function showFavorites() {
    if (favorites.length === 0) { toast('😔 هنوز چیزی ذخیره نکردی!', 'error'); return; }
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.cat-btn[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');
    currentCat = 'all';
    const temp = [...menuData];
    const favItems = favorites.map(f => menuData.find(m => m.name === f.name)).filter(Boolean);
    menuData = favItems;
    displayMenu();
    setTimeout(() => { menuData = temp; displayMenu(); }, 4000);
    toast('❤️ علاقه‌مندی‌ها (۴ ثانیه)');
}

function showSuggestions(item) {
    const section = document.getElementById('suggestedSection');
    const grid = document.getElementById('suggestedGrid');
    if (!section || !grid) return;
    const suggestions = menuData.filter(i => i.name !== item.name && (i.cat === item.cat || (i.goals && item.goals && i.goals.some(g => (item.goals || []).includes(g))))).slice(0, 4);
    if (suggestions.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    grid.innerHTML = suggestions.map(s => `
        <div class="suggested-item" onclick="openModal('${s.name.replace(/'/g, "\\'")}');document.getElementById('suggestedSection').style.display='none';">
            <img src="${(s.images && s.images[0]) || s.image || 'logo.png.jpg'}" alt="${s.name}" loading="lazy" onerror="this.src='logo.png.jpg'">
            <div style="font-size:0.85rem;color:var(--orange);">${s.name}</div>
            <div style="font-size:0.8rem;color:var(--lime);">${s.prices[currentSize]} تومان</div>
        </div>
    `).join('');
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openModal(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    item.views = (item.views || 0) + 1;
    addToRecent(item);
    modalImages = item.images || [item.image || 'logo.png.jpg'];
    modalImageIndex = 0;
    updateModalImage();
    
    document.getElementById('modalTitle').textContent = item.name;
    document.getElementById('modalStars').textContent = '⭐'.repeat(item.stars);
    document.getElementById('modalDesc').textContent = item.desc;
    document.getElementById('modalCalories').innerHTML = `<i class="fas fa-fire"></i> ${item.cal || '---'} کالری | <i class="fas fa-eye"></i> ${(item.views || 0).toLocaleString('fa-IR')} بازدید`;
    
    const statusText = document.getElementById('modalStatus');
    if (statusText) {
        statusText.textContent = statusLabels[item.status] || statusLabels.available;
        statusText.className = 'status-text ' + (item.status || 'available');
    }
    
    const ingList = document.getElementById('ingredientsList');
    if (ingList && item.ingredients) {
        ingList.innerHTML = item.ingredients.map(i => `<span class="ingredient-tag">${i}</span>`).join('');
    } else if (ingList) ingList.innerHTML = '';
    
    let pricesHTML = '';
    for (const [size, price] of Object.entries(item.prices || {})) {
        pricesHTML += `<p><strong>${size}:</strong> ${price} تومان</p>`;
    }
    document.getElementById('modalPrices').innerHTML = pricesHTML;
    
    const comboSection = document.getElementById('comboSection');
    if (comboSection && item.combo && item.combo.length > 0) {
        comboSection.style.display = 'block';
        document.getElementById('comboItems').innerHTML = item.combo.map(c => 
            `<span class="combo-item" onclick="openModal('${c.replace(/'/g, "\\'")}')">${c}</span>`
        ).join('');
    } else if (comboSection) comboSection.style.display = 'none';
    
    document.getElementById('modal').classList.add('active');
    showSuggestions(item);
}

function updateModalImage() {
    const img = document.getElementById('modalImg');
    const dots = document.getElementById('modalDots');
    if (!img) return;
    img.src = modalImages[modalImageIndex] || 'logo.png.jpg';
    img.onerror = function() { this.src = 'logo.png.jpg'; };
    
    if (dots && modalImages.length > 1) {
        dots.innerHTML = modalImages.map((_, i) => 
            `<span class="slider-dot ${i === modalImageIndex ? 'active' : ''}" onclick="modalImageIndex=${i};updateModalImage();"></span>`
        ).join('');
    }
}

function nextImage() { if (modalImages.length > 1) { modalImageIndex = (modalImageIndex + 1) % modalImages.length; updateModalImage(); } }
function prevImage() { if (modalImages.length > 1) { modalImageIndex = (modalImageIndex - 1 + modalImages.length) % modalImages.length; updateModalImage(); } }
function closeModal() { document.getElementById('modal').classList.remove('active'); const sug = document.getElementById('suggestedSection'); if (sug) sug.style.display = 'none'; }

function openShare(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    const url = window.location.href.split('?')[0] + '?item=' + encodeURIComponent(name);
    const text = `🍹 ${item.name} - ${item.prices[currentSize]} تومان\n${item.desc}\n\nسفارش از آبمیوه سلامت:\n`;
    document.getElementById('shareText').textContent = `🍹 ${item.name}`;
    document.getElementById('shareWhatsApp').href = `https://wa.me/?text=${encodeURIComponent(text + url)}`;
    document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    document.getElementById('shareModal').classList.add('active');
}
function closeShare() { document.getElementById('shareModal').classList.remove('active'); }
function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => toast('🔗 لینک کپی شد!'));
}

document.querySelectorAll('.cat-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    currentCat = this.dataset.cat;
    displayMenu();
}));

document.querySelectorAll('.goal-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.goal-btn').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    currentGoal = this.dataset.goal;
    displayMenu();
}));

document.querySelectorAll('.price-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.price-btn').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    currentPrice = this.dataset.price;
    displayMenu();
}));

document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', function() {
    document.querySelectorAll('.size-btn').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    currentSize = this.dataset.size;
    displayMenu();
}));

document.getElementById('search').addEventListener('input', e => {
    const t = e.target.value.toLowerCase();
    if (t.length === 0) { displayMenu(); return; }
    const filtered = getFilteredData().filter(i => i.name.toLowerCase().includes(t) || i.cat.toLowerCase().includes(t) || i.desc.toLowerCase().includes(t));
    const temp = [...menuData];
    menuData = filtered;
    displayMenu();
    menuData = temp;
});

function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast('🎤 مرورگر شما پشتیبانی نمی‌کند', 'error'); return; }
    const rec = new SpeechRecognition(); rec.lang = 'fa-IR';
    const btn = document.getElementById('voiceBtn'); btn.classList.add('listening'); rec.start();
    rec.onresult = e => { document.getElementById('search').value = e.results[0][0].transcript; document.getElementById('search').dispatchEvent(new Event('input')); btn.classList.remove('listening'); };
    rec.onerror = () => btn.classList.remove('listening');
    rec.onend = () => btn.classList.remove('listening');
}

document.getElementById('modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
document.getElementById('shareModal').addEventListener('click', function(e) { if (e.target === this) closeShare(); });

function toggleTheme() {
    const html = document.documentElement;
    const icon = document.querySelector('.header-actions .icon-btn i');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        if (icon) icon.className = 'fas fa-moon';
    } else {
        html.setAttribute('data-theme', 'dark');
        if (icon) icon.className = 'fas fa-sun';
    }
}

function toast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    if (type === 'error') t.style.background = 'var(--strawberry)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function updateOfferTimer() {
    const now = new Date(), end = new Date(); end.setHours(23, 59, 59, 999);
    const diff = end - now;
    if (diff <= 0) return;
    document.getElementById('offerH').textContent = String(Math.floor(diff / 3600000)).padStart(2, '۰');
    document.getElementById('offerM').textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '۰');
    document.getElementById('offerS').textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '۰');
}

function checkDailyOffer() {
    const hasOffer = menuData.some(i => i.discount > 0);
    const banner = document.getElementById('dailyBanner');
    if (banner && hasOffer) { banner.classList.add('show'); updateOfferTimer(); setInterval(updateOfferTimer, 1000); }
}

function checkSharedItem() {
    const params = new URLSearchParams(window.location.search);
    const itemName = params.get('item');
    if (itemName) setTimeout(() => openModal(decodeURIComponent(itemName)), 500);
}

loadData();
