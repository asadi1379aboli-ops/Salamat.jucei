// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ========== PWA INSTALL ==========
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

// ========== FRUIT PARTICLES ==========
(function() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const fruitColors = ['#ff6b35', '#ffd23f', '#ff2d55', '#7b2d8e', '#7bc67e', '#ff8c5a'];
    
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();
    
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1.5,
            speedX: (Math.random() - 0.5) * 0.4, speedY: (Math.random() - 0.5) * 0.4,
            color: fruitColors[Math.floor(Math.random() * fruitColors.length)],
            opacity: Math.random() * 0.3 + 0.08
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            const hex = p.color;
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`; ctx.fill();
            p.x += p.speedX; p.y += p.speedY;
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 100) {
                    ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 107, 53, ${0.06 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5; ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

// ========== DATA ==========
let menuData = [];
let currentSize = 'لیوانی';
let currentCategory = 'all';
let currentGoal = 'all';
let currentPrice = 'all';
let recentlyViewed = JSON.parse(localStorage.getItem('juice_recently_viewed') || '[]');
let favorites = JSON.parse(localStorage.getItem('juice_favorites') || '[]');
let modalImages = [];
let modalImageIndex = 0;

const goalLabels = { energy: '⚡ انرژی', diet: '🥗 کاهش وزن', immunity: '🛡️ تقویت ایمنی', thirst: '💧 رفع تشنگی' };
const statusLabels = { available: '✅ موجود', low: '⏳ رو به اتمام', unavailable: '❌ ناموجود' };

// ========== HELPER: تبدیل هر فرمت قیمت به عدد ==========
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    // حذف همه چیز غیر از اعداد
    const num = String(priceStr).replace(/[^0-9]/g, '');
    return parseInt(num) || 0;
}

// ========== HELPER: فرمت نمایش قیمت ==========
function formatPrice(priceStr) {
    const num = parsePrice(priceStr);
    return num.toLocaleString('fa-IR');
}

// ========== LOAD DATA ==========
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data');
        menuData = await response.json();
        menuData.sort((a, b) => (a.order || 99) - (b.order || 99));
        loadRealViews();
    } catch (error) {
        console.warn('⚠️ Could not load data.json');
        menuData = [];
    }
    displayMenu();
    renderRecentlyViewed();
    checkDailyOffer();
}

// ========== REAL VIEWS ==========
async function loadRealViews() {
    for (let item of menuData) {
        const countKey = 'salamat_juice_' + item.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
        try {
            const res = await fetch('https://api.countapi.xyz/get/salamat-juice/' + encodeURIComponent(countKey));
            if (res.ok) { const data = await res.json(); if (data.value) item.views = data.value; }
        } catch (e) {}
    }
    displayMenu();
}

async function incrementRealView(item) {
    const countKey = 'salamat_juice_' + item.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
    try {
        const res = await fetch('https://api.countapi.xyz/hit/salamat-juice/' + encodeURIComponent(countKey));
        if (res.ok) { const data = await res.json(); item.views = data.value || (item.views || 0) + 1; }
    } catch (e) { item.views = (item.views || 0) + 1; }
}

// ========== FILTERS ==========
function getFilteredData() {
    let filtered = [...menuData];
    if (currentCategory !== 'all') filtered = filtered.filter(item => item.cat === currentCategory);
    if (currentGoal !== 'all') filtered = filtered.filter(item => item.goals && item.goals.includes(currentGoal));
    if (currentPrice !== 'all') {
        filtered = filtered.filter(item => {
            const price = parsePrice(item.prices[currentSize]);
            if (currentPrice === 'low') return price < 150000;
            if (currentPrice === 'mid') return price >= 150000 && price <= 250000;
            if (currentPrice === 'high') return price > 250000;
            return true;
        });
    }
    return filtered;
}

// ========== DISPLAY MENU ==========
function displayMenu() {
    const menuList = document.getElementById('menu-list');
    const items = getFilteredData();
    
    if (items.length === 0) {
        menuList.innerHTML = '<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:50px;">😔 محصولی یافت نشد</p>';
        return;
    }
    
    menuList.innerHTML = items.map((item, index) => {
        const isFavorite = favorites.some(f => f.name === item.name);
        const price = parsePrice(item.prices[currentSize]);
        const discountPrice = item.discount > 0 ? Math.round(price * (1 - item.discount / 100)) : null;
        const priceDisplay = (discountPrice || price).toLocaleString('fa-IR');
        const mainImage = (item.images && item.images[0]) || item.image || 'logo.png.jpg';
        const imageCount = (item.images && item.images.length > 1) ? item.images.length : 0;
        
        let badgeHTML = '';
        if (item.badge === 'special') badgeHTML = '<div class="ribbon special">⭐ پرفروش</div>';
        else if (item.badge === 'new') badgeHTML = '<div class="ribbon new">🆕 جدید</div>';
        
        let discountHTML = '';
        if (item.discount > 0) discountHTML = `<div class="discount-badge">${item.discount}٪</div>`;
        
        let statusHTML = '';
        if (item.status && item.status !== 'available') statusHTML = `<div class="status-badge ${item.status}">${statusLabels[item.status]}</div>`;
        
        let goalsHTML = '';
        if (item.goals) item.goals.forEach(goal => { goalsHTML += `<span class="goal-badge ${goal}">${goalLabels[goal]}</span>`; });
        
        return `
            <div class="menu-item" style="transition-delay:${index * 0.03}s" onclick="openModal('${item.name.replace(/'/g, "\\'")}')">
                ${badgeHTML} ${discountHTML} ${statusHTML}
                <button class="fav-btn ${isFavorite ? 'liked' : ''}" onclick="event.stopPropagation();toggleFavorite('${item.name.replace(/'/g, "\\'")}')" aria-label="${isFavorite ? 'حذف' : 'افزودن'}"><i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i></button>
                <button class="share-btn" onclick="event.stopPropagation();openShare('${item.name.replace(/'/g, "\\'")}')" aria-label="اشتراک"><i class="fas fa-share-alt"></i></button>
                ${imageCount > 1 ? `<span class="image-counter">${imageCount} عکس</span>` : ''}
                <img src="${mainImage}" alt="${item.name}" loading="lazy" onerror="this.src='logo.png.jpg';this.onerror=null;">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="stars">${'⭐'.repeat(item.stars || 4)}</div>
                    <span class="tag">${item.cat}</span>
                    <div>${goalsHTML}</div>
                    <p class="views-count"><i class="fas fa-eye"></i> ${(item.views || 0).toLocaleString('fa-IR')} بازدید</p>
                    <div class="price-row">
                        <span class="price">${priceDisplay} تومان</span>
                        ${discountPrice ? `<span class="old-price">${price.toLocaleString('fa-IR')}</span>` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
    
    requestAnimationFrame(() => {
        document.querySelectorAll('.menu-item').forEach((item, i) => {
            setTimeout(() => item.classList.add('visible'), i * 40);
        });
    });
}

// ========== RECENTLY VIEWED ==========
function addToRecentlyViewed(item) {
    recentlyViewed = recentlyViewed.filter(r => r.name !== item.name);
    recentlyViewed.unshift({ name: item.name, image: (item.images && item.images[0]) || item.image || 'logo.png.jpg' });
    if (recentlyViewed.length > 8) recentlyViewed.pop();
    localStorage.setItem('juice_recently_viewed', JSON.stringify(recentlyViewed));
    renderRecentlyViewed();
}

function renderRecentlyViewed() {
    const section = document.getElementById('recentlyViewed'), slider = document.getElementById('recentSlider');
    if (!section || !slider) return;
    if (recentlyViewed.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    slider.innerHTML = recentlyViewed.map(item => `<div class="recent-item" onclick="openModal('${item.name.replace(/'/g, "\\'")}')"><img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='logo.png.jpg'"><div style="font-size:0.8rem;">${item.name}</div></div>`).join('');
}

// ========== FAVORITES ==========
function toggleFavorite(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    const index = favorites.findIndex(f => f.name === name);
    if (index >= 0) { favorites.splice(index, 1); toast('💔 حذف شد'); }
    else { favorites.push({ name: item.name, image: (item.images&&item.images[0])||item.image||'logo.png.jpg', prices: item.prices, cat: item.cat }); toast('❤️ اضافه شد'); }
    localStorage.setItem('juice_favorites', JSON.stringify(favorites));
    displayMenu();
}

function showFavorites() {
    if (favorites.length === 0) { toast('😔 چیزی ذخیره نکردی!', 'error'); return; }
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.cat-btn[data-cat="all"]'); if (allBtn) allBtn.classList.add('active');
    currentCategory = 'all';
    const temp = [...menuData];
    menuData = favorites.map(f => menuData.find(m => m.name === f.name)).filter(Boolean);
    displayMenu();
    setTimeout(() => { menuData = temp; displayMenu(); }, 4000);
    toast('❤️ علاقه‌مندی‌ها (۴ ثانیه)');
}

// ========== SUGGESTIONS ==========
function showSuggestions(item) {
    const section = document.getElementById('suggestedSection'), grid = document.getElementById('suggestedGrid');
    if (!section || !grid) return;
    const suggestions = menuData.filter(i => i.name !== item.name && (i.cat === item.cat || (i.goals && item.goals && i.goals.some(g => (item.goals||[]).includes(g))))).slice(0, 4);
    if (!suggestions.length) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    grid.innerHTML = suggestions.map(s => `<div class="suggested-item" onclick="openModal('${s.name.replace(/'/g,"\\'")}');document.getElementById('suggestedSection').style.display='none';"><img src="${(s.images&&s.images[0])||s.image||'logo.png.jpg'}" loading="lazy" onerror="this.src='logo.png.jpg'"><div style="font-size:0.85rem;color:var(--orange);">${s.name}</div><div style="font-size:0.8rem;color:var(--lime);">${formatPrice(s.prices[currentSize])} تومان</div></div>`).join('');
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========== MODAL ==========
function openModal(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    incrementRealView(item);
    addToRecentlyViewed(item);
    modalImages = item.images || [item.image || 'logo.png.jpg'];
    modalImageIndex = 0;
    updateModalImage();
    document.getElementById('modalTitle').textContent = item.name;
    document.getElementById('modalStars').textContent = '⭐'.repeat(item.stars || 4);
    document.getElementById('modalDesc').textContent = item.desc || '';
    document.getElementById('modalCalories').innerHTML = `<i class="fas fa-fire"></i> ${item.cal||'---'} کالری | <i class="fas fa-eye"></i> ${(item.views||0).toLocaleString('fa-IR')} بازدید`;
    const st = document.getElementById('modalStatus'); if (st) { st.textContent = statusLabels[item.status]||statusLabels.available; st.className = 'status-text '+(item.status||'available'); }
    const il = document.getElementById('ingredientsList'); if (il && item.ingredients) il.innerHTML = item.ingredients.map(i => `<span class="ingredient-tag">${i}</span>`).join('');
    let ph = ''; for (const [s, p] of Object.entries(item.prices||{})) ph += `<p><strong>${s}:</strong> ${formatPrice(p)} تومان</p>`;
    document.getElementById('modalPrices').innerHTML = ph;
    const cs = document.getElementById('comboSection'); if (cs && item.combo && item.combo.length) { cs.style.display = 'block'; document.getElementById('comboItems').innerHTML = item.combo.map(c => `<span class="combo-item" onclick="openModal('${c.replace(/'/g,"\\'")}')">${c}</span>`).join(''); } else if (cs) cs.style.display = 'none';
    document.getElementById('modal').classList.add('active');
    showSuggestions(item);
}

function updateModalImage() {
    const img = document.getElementById('modalImg'), dots = document.getElementById('modalDots'), nav = document.querySelectorAll('.slider-nav');
    if (!img) return;
    img.src = modalImages[modalImageIndex] || 'logo.png.jpg';
    img.onerror = function() { this.src = 'logo.png.jpg'; };
    if (dots && modalImages.length > 1) { dots.innerHTML = modalImages.map((_, i) => `<span class="slider-dot ${i===modalImageIndex?'active':''}" onclick="modalImageIndex=${i};updateModalImage();"></span>`).join(''); nav.forEach(b => b.style.display = 'flex'); }
    else { if (dots) dots.innerHTML = ''; nav.forEach(b => b.style.display = 'none'); }
}
function nextImage() { if (modalImages.length > 1) { modalImageIndex = (modalImageIndex + 1) % modalImages.length; updateModalImage(); } }
function prevImage() { if (modalImages.length > 1) { modalImageIndex = (modalImageIndex - 1 + modalImages.length) % modalImages.length; updateModalImage(); } }
function closeModal() { document.getElementById('modal').classList.remove('active'); const s = document.getElementById('suggestedSection'); if (s) s.style.display = 'none'; }

// ========== SHARE ==========
function openShare(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    const url = window.location.href.split('?')[0] + '?item=' + encodeURIComponent(name);
    const text = `🍹 ${item.name} - ${formatPrice(item.prices[currentSize])} تومان\n${item.desc}\n\nآبمیوه سلامت:\n`;
    document.getElementById('shareText').textContent = `🍹 ${item.name}`;
    document.getElementById('shareWhatsApp').href = `https://wa.me/?text=${encodeURIComponent(text+url)}`;
    document.getElementById('shareTelegram').href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    document.getElementById('shareModal').classList.add('active');
}
function closeShare() { document.getElementById('shareModal').classList.remove('active'); }
function copyLink() { navigator.clipboard.writeText(window.location.href.split('?')[0]).then(() => toast('🔗 لینک کپی شد!')).catch(() => toast('❌ خطا', 'error')); }

// ========== VOICE ==========
function startVoiceSearch() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('🎤 پشتیبانی نمیشه', 'error'); return; }
    const rec = new SR(); rec.lang = 'fa-IR';
    const btn = document.getElementById('voiceBtn'); btn.classList.add('listening');
    rec.start();
    rec.onresult = e => { document.getElementById('search').value = e.results[0][0].transcript; document.getElementById('search').dispatchEvent(new Event('input')); btn.classList.remove('listening'); };
    rec.onerror = () => btn.classList.remove('listening');
    rec.onend = () => btn.classList.remove('listening');
}

// ========== THEME ==========
function toggleTheme() {
    const h = document.documentElement, icon = document.querySelector('.header-actions .icon-btn i');
    if (h.getAttribute('data-theme') === 'dark') { h.setAttribute('data-theme', 'light'); if (icon) icon.className = 'fas fa-moon'; }
    else { h.setAttribute('data-theme', 'dark'); if (icon) icon.className = 'fas fa-sun'; }
}

// ========== REVIEWS ==========
function submitReview() {
    const name = document.getElementById('reviewName').value.trim(), text = document.getElementById('reviewText').value.trim(), stars = parseInt(document.getElementById('reviewStars').value);
    if (!name || !text) { toast('❌ نام و نظر الزامی', 'error'); return; }
    const saved = JSON.parse(localStorage.getItem('juice_reviews') || '[]');
    saved.unshift({ name, text, stars, date: new Date().toLocaleDateString('fa-IR') });
    localStorage.setItem('juice_reviews', JSON.stringify(saved.slice(0, 20)));
    document.getElementById('reviewName').value = ''; document.getElementById('reviewText').value = '';
    loadReviews(); toast('✅ ثبت شد! 🙏');
}
function loadReviews() {
    const saved = JSON.parse(localStorage.getItem('juice_reviews') || '[]'), grid = document.getElementById('reviewsGrid');
    if (!grid) return;
    if (!saved.length) { grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:20px;">💬 هنوز نظری ثبت نشده.</p>'; return; }
    grid.innerHTML = saved.map(r => `<div class="review-card"><div class="review-header"><div class="review-avatar">${r.name[0]}</div><div><div class="review-name">${r.name}</div><div class="review-stars">${'⭐'.repeat(r.stars)}</div></div></div><p class="review-text">${r.text}</p><div style="color:var(--text-muted);font-size:0.7rem;margin-top:8px;">${r.date}</div></div>`).join('');
}

// ========== OFFER ==========
function checkDailyOffer() { if (menuData.some(i => i.discount > 0)) { const b = document.getElementById('dailyBanner'); if (b) { b.classList.add('show'); updateOfferTimer(); setInterval(updateOfferTimer, 1000); } } }
function updateOfferTimer() {
    const n = new Date(), e = new Date(); e.setHours(23, 59, 59, 999); const d = e - n;
    if (d <= 0) return;
    document.getElementById('offerH').textContent = String(Math.floor(d/3600000)).padStart(2,'۰');
    document.getElementById('offerM').textContent = String(Math.floor((d%3600000)/60000)).padStart(2,'۰');
    document.getElementById('offerS').textContent = String(Math.floor((d%60000)/1000)).padStart(2,'۰');
}

// ========== EVENTS ==========
document.querySelectorAll('.cat-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active')); this.classList.add('active'); currentCategory = this.dataset.cat; displayMenu(); }));
document.querySelectorAll('.goal-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.goal-btn').forEach(x => x.classList.remove('active')); this.classList.add('active'); currentGoal = this.dataset.goal; displayMenu(); }));
document.querySelectorAll('.price-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.price-btn').forEach(x => x.classList.remove('active')); this.classList.add('active'); currentPrice = this.dataset.price; displayMenu(); }));
document.querySelectorAll('.size-btn').forEach(b => b.addEventListener('click', function() { document.querySelectorAll('.size-btn').forEach(x => x.classList.remove('active')); this.classList.add('active'); currentSize = this.dataset.size; displayMenu(); }));
document.getElementById('search').addEventListener('input', function(e) {
    const t = e.target.value.toLowerCase();
    if (!t) { displayMenu(); return; }
    const filtered = getFilteredData().filter(i => i.name.toLowerCase().includes(t) || i.cat.toLowerCase().includes(t) || (i.desc||'').toLowerCase().includes(t));
    const temp = [...menuData]; menuData = filtered; displayMenu(); menuData = temp;
});
document.getElementById('modal').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
document.getElementById('shareModal').addEventListener('click', function(e) { if (e.target === this) closeShare(); });
const sb = document.getElementById('scrollTop'); window.addEventListener('scroll', () => { sb.style.display = window.scrollY > 400 ? 'block' : 'none'; });

// ========== TOAST ==========
function toast(msg, type = 'success') {
    const existing = document.querySelector('.toast'); if (existing) existing.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    if (type === 'error') t.style.background = 'var(--danger)';
    document.body.appendChild(t); setTimeout(() => t.remove(), 2500);
}

// ========== INIT ==========
window.addEventListener('load', () => {
    loadData(); loadReviews();
    const qr = document.getElementById('qrCode'); if (qr && typeof QRCode !== 'undefined') new QRCode(qr, { text: window.location.href, width: 140, height: 140 });
    const params = new URLSearchParams(window.location.search); const item = params.get('item');
    if (item) setTimeout(() => openModal(decodeURIComponent(item)), 600);
});
