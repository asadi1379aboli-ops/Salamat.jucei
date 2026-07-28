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
        if (outcome === 'accepted') {
            installBanner.classList.remove('show');
        }
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
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1.5,
            speedX: (Math.random() - 0.5) * 0.4,
            speedY: (Math.random() - 0.5) * 0.4,
            color: fruitColors[Math.floor(Math.random() * fruitColors.length)],
            opacity: Math.random() * 0.3 + 0.08
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            const hex = p.color;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`;
            ctx.fill();
            
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        });
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 107, 53, ${0.06 * (1 - distance / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
})();

// ========== DATA MANAGEMENT ==========
let menuData = [];
let currentSize = 'لیوانی';
let currentCategory = 'all';
let currentGoal = 'all';
let currentPrice = 'all';
let recentlyViewed = JSON.parse(localStorage.getItem('juice_recently_viewed') || '[]');
let favorites = JSON.parse(localStorage.getItem('juice_favorites') || '[]');
let modalImages = [];
let modalImageIndex = 0;

const goalLabels = {
    energy: '⚡ انرژی',
    diet: '🥗 کاهش وزن',
    immunity: '🛡️ تقویت ایمنی',
    thirst: '💧 رفع تشنگی'
};

const statusLabels = {
    available: '✅ موجود',
    low: '⏳ رو به اتمام',
    unavailable: '❌ ناموجود'
};

// ========== LOAD DATA ==========
async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data');
        menuData = await response.json();
        menuData.sort((a, b) => (a.order || 99) - (b.order || 99));
        
        // بارگذاری بازدیدهای واقعی از CountAPI
        loadRealViews();
    } catch (error) {
        console.warn('⚠️ Could not load data.json, using empty menu');
        menuData = [];
    }
    
    displayMenu();
    renderRecentlyViewed();
    checkDailyOffer();
}

// ========== بارگذاری بازدید واقعی از CountAPI ==========
async function loadRealViews() {
    for (let item of menuData) {
        const countKey = 'salamat_juice_' + item.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
        try {
            const res = await fetch('https://api.countapi.xyz/get/salamat-juice/' + encodeURIComponent(countKey));
            if (res.ok) {
                const data = await res.json();
                if (data.value) {
                    item.views = data.value;
                }
            }
        } catch (e) {
            // بی‌خیال - از مقدار قبلی استفاده کن
        }
    }
    displayMenu();
}

// ========== افزایش بازدید واقعی ==========
async function incrementRealView(item) {
    const countKey = 'salamat_juice_' + item.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
    try {
        const res = await fetch('https://api.countapi.xyz/hit/salamat-juice/' + encodeURIComponent(countKey));
        if (res.ok) {
            const data = await res.json();
            item.views = data.value || (item.views || 0) + 1;
        }
    } catch (e) {
        // اگه اینترنت نبود، بازم بازدید رو افزایش بده
        item.views = (item.views || 0) + 1;
    }
}

// ========== FILTERS ==========
function getFilteredData() {
    let filtered = [...menuData];
    
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.cat === currentCategory);
    }
    
    if (currentGoal !== 'all') {
        filtered = filtered.filter(item => item.goals && item.goals.includes(currentGoal));
    }
    
    if (currentPrice !== 'all') {
        filtered = filtered.filter(item => {
            const price = parseInt((item.prices[currentSize] || '0').replace(/[^0-9]/g, ''));
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
        const price = parseInt((item.prices[currentSize] || '0').replace(/[^0-9]/g, ''));
        const discountPrice = item.discount > 0 ? Math.round(price * (1 - item.discount / 100)) : null;
        const priceDisplay = discountPrice ? discountPrice.toLocaleString('fa-IR') : price.toLocaleString('fa-IR');
        const mainImage = (item.images && item.images[0]) || item.image || 'logo.png.jpg';
        const imageCount = (item.images && item.images.length > 1) ? item.images.length : 0;
        
        let badgeHTML = '';
        if (item.badge === 'special') {
            badgeHTML = '<div class="ribbon special">⭐ پرفروش</div>';
        } else if (item.badge === 'new') {
            badgeHTML = '<div class="ribbon new">🆕 جدید</div>';
        }
        
        let discountHTML = '';
        if (item.discount > 0) {
            discountHTML = `<div class="discount-badge">${item.discount}٪</div>`;
        }
        
        let statusHTML = '';
        if (item.status && item.status !== 'available') {
            statusHTML = `<div class="status-badge ${item.status}">${statusLabels[item.status]}</div>`;
        }
        
        let goalsHTML = '';
        if (item.goals) {
            item.goals.forEach(goal => {
                goalsHTML += `<span class="goal-badge ${goal}">${goalLabels[goal]}</span>`;
            });
        }
        
        return `
            <div class="menu-item" style="transition-delay:${index * 0.03}s" 
                 onclick="openModal('${item.name.replace(/'/g, "\\'")}')">
                ${badgeHTML}
                ${discountHTML}
                ${statusHTML}
                <button class="fav-btn ${isFavorite ? 'liked' : ''}" 
                        onclick="event.stopPropagation();toggleFavorite('${item.name.replace(/'/g, "\\'")}')" 
                        aria-label="${isFavorite ? 'حذف از علاقه‌مندی' : 'افزودن به علاقه‌مندی'}">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <button class="share-btn" 
                        onclick="event.stopPropagation();openShare('${item.name.replace(/'/g, "\\'")}')" 
                        aria-label="اشتراک‌گذاری">
                    <i class="fas fa-share-alt"></i>
                </button>
                ${imageCount > 1 ? `<span class="image-counter">${imageCount} عکس</span>` : ''}
                <img src="${mainImage}" alt="${item.name}" loading="lazy" 
                     onerror="this.src='logo.png.jpg';this.onerror=null;">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="stars">${'⭐'.repeat(item.stars || 4)}</div>
                    <span class="tag">${item.cat}</span>
                    <div>${goalsHTML}</div>
                    <p class="views-count">
                        <i class="fas fa-eye"></i> ${(item.views || 0).toLocaleString('fa-IR')} بازدید
                    </p>
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

// ========== RECENTLY VIEWED ==========
function addToRecentlyViewed(item) {
    recentlyViewed = recentlyViewed.filter(r => r.name !== item.name);
    recentlyViewed.unshift({
        name: item.name,
        image: (item.images && item.images[0]) || item.image || 'logo.png.jpg'
    });
    if (recentlyViewed.length > 8) recentlyViewed.pop();
    localStorage.setItem('juice_recently_viewed', JSON.stringify(recentlyViewed));
    renderRecentlyViewed();
}

function renderRecentlyViewed() {
    const section = document.getElementById('recentlyViewed');
    const slider = document.getElementById('recentSlider');
    
    if (!section || !slider) return;
    
    if (recentlyViewed.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    slider.innerHTML = recentlyViewed.map(item => `
        <div class="recent-item" onclick="openModal('${item.name.replace(/'/g, "\\'")}')">
            <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='logo.png.jpg'">
            <div style="font-size:0.8rem;color:var(--text-light);">${item.name}</div>
        </div>
    `).join('');
}

// ========== FAVORITES ==========
function toggleFavorite(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    
    const index = favorites.findIndex(f => f.name === name);
    
    if (index >= 0) {
        favorites.splice(index, 1);
        toast('💔 از علاقه‌مندی‌ها حذف شد');
    } else {
        favorites.push({
            name: item.name,
            image: (item.images && item.images[0]) || item.image || 'logo.png.jpg',
            prices: item.prices,
            cat: item.cat
        });
        toast('❤️ به علاقه‌مندی‌ها اضافه شد');
    }
    
    localStorage.setItem('juice_favorites', JSON.stringify(favorites));
    displayMenu();
}

function showFavorites() {
    if (favorites.length === 0) {
        toast('😔 هنوز چیزی ذخیره نکردی!', 'error');
        return;
    }
    
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.cat-btn[data-cat="all"]');
    if (allBtn) allBtn.classList.add('active');
    
    currentCategory = 'all';
    const tempMenuData = [...menuData];
    const favoriteItems = favorites
        .map(f => menuData.find(m => m.name === f.name))
        .filter(Boolean);
    
    menuData = favoriteItems;
    displayMenu();
    
    setTimeout(() => {
        menuData = tempMenuData;
        displayMenu();
    }, 4000);
    
    toast('❤️ نمایش علاقه‌مندی‌ها (۴ ثانیه)');
}

// ========== SUGGESTIONS ==========
function showSuggestions(item) {
    const section = document.getElementById('suggestedSection');
    const grid = document.getElementById('suggestedGrid');
    
    if (!section || !grid) return;
    
    const suggestions = menuData.filter(i => 
        i.name !== item.name && 
        (i.cat === item.cat || 
         (i.goals && item.goals && i.goals.some(g => (item.goals || []).includes(g))))
    ).slice(0, 4);
    
    if (suggestions.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    grid.innerHTML = suggestions.map(s => `
        <div class="suggested-item" 
             onclick="openModal('${s.name.replace(/'/g, "\\'")}');document.getElementById('suggestedSection').style.display='none';">
            <img src="${(s.images && s.images[0]) || s.image || 'logo.png.jpg'}" 
                 alt="${s.name}" loading="lazy" onerror="this.src='logo.png.jpg'">
            <div style="font-size:0.85rem;color:var(--orange);">${s.name}</div>
            <div style="font-size:0.8rem;color:var(--lime);">${s.prices[currentSize]} تومان</div>
        </div>
    `).join('');
    
    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ========== MODAL با بازدید واقعی ==========
function openModal(name) {
    const item = menuData.find(i => i.name === name);
    if (!item) return;
    
    // افزایش بازدید واقعی از طریق CountAPI
    incrementRealView(item);
    
    addToRecentlyViewed(item);
    modalImages = item.images || [item.image || 'logo.png.jpg'];
    modalImageIndex = 0;
    
    updateModalImage();
    
    document.getElementById('modalTitle').textContent = item.name;
    document.getElementById('modalStars').textContent = '⭐'.repeat(item.stars || 4);
    document.getElementById('modalDesc').textContent = item.desc || '';
    document.getElementById('modalCalories').innerHTML = `
        <i class="fas fa-fire"></i> ${item.cal || '---'} کالری | 
        <i class="fas fa-eye"></i> ${(item.views || 0).toLocaleString('fa-IR')} بازدید
    `;
    
    const statusEl = document.getElementById('modalStatus');
    if (statusEl) {
        statusEl.textContent = statusLabels[item.status] || statusLabels.available;
        statusEl.className = 'status-text ' + (item.status || 'available');
    }
    
    const ingredientsList = document.getElementById('ingredientsList');
    if (ingredientsList && item.ingredients) {
        ingredientsList.innerHTML = item.ingredients.map(i => 
            `<span class="ingredient-tag">${i}</span>`
        ).join('');
    }
    
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
    } else if (comboSection) {
        comboSection.style.display = 'none';
    }
    
    document.getElementById('modal').classList.add('active');
    showSuggestions(item);
}

function updateModalImage() {
    const img = document.getElementById('modalImg');
    const dots = document.getElementById('modalDots');
    const navButtons = document.querySelectorAll('.slider-nav');
    
    if (!img) return;
    
    img.src = modalImages[modalImageIndex] || 'logo.png.jpg';
    img.onerror = function() {
        this.src = 'logo.png.jpg';
    };
    
    if (dots && modalImages.length > 1) {
        dots.innerHTML = modalImages.map((_, i) => 
            `<span class="slider-dot ${i === modalImageIndex ? 'active' : ''}" 
                  onclick="modalImageIndex=${i};updateModalImage();"></span>`
        ).join('');
        navButtons.forEach(btn => btn.style.display = 'flex');
    } else {
        if (dots) dots.innerHTML = '';
        navButtons.forEach(btn => btn.style.display = 'none');
    }
}

function nextImage() {
    if (modalImages.length > 1) {
        modalImageIndex = (modalImageIndex + 1) % modalImages.length;
        updateModalImage();
    }
}

function prevImage() {
    if (modalImages.length > 1) {
        modalImageIndex = (modalImageIndex - 1 + modalImages.length) % modalImages.length;
        updateModalImage();
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    const suggestedSection = document.getElementById('suggestedSection');
    if (suggestedSection) suggestedSection.style.display = 'none';
}

// ========== SHARE ==========
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

function closeShare() {
    document.getElementById('shareModal').classList.remove('active');
}

function copyLink() {
    const url = window.location.href.split('?')[0];
    navigator.clipboard.writeText(url).then(() => {
        toast('🔗 لینک کپی شد!');
    }).catch(() => {
        toast('❌ خطا در کپی لینک', 'error');
    });
}

// ========== VOICE SEARCH ==========
function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        toast('🎤 مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند', 'error');
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    
    const voiceBtn = document.getElementById('voiceBtn');
    voiceBtn.classList.add('listening');
    
    recognition.start();
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('search').value = transcript;
        document.getElementById('search').dispatchEvent(new Event('input'));
        voiceBtn.classList.remove('listening');
        toast('🎤 گفتی: ' + transcript);
    };
    
    recognition.onerror = () => {
        voiceBtn.classList.remove('listening');
    };
    
    recognition.onend = () => {
        voiceBtn.classList.remove('listening');
    };
}

// ========== THEME ==========
function toggleTheme() {
    const html = document.documentElement;
    const icon = document.querySelector('.header-actions .icon-btn i');
    
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        if (icon) icon.className = 'fas fa-moon';
        toast('☀️ حالت روشن');
    } else {
        html.setAttribute('data-theme', 'dark');
        if (icon) icon.className = 'fas fa-sun';
        toast('🌙 حالت تاریک');
    }
}

// ========== REVIEWS ==========
function submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const text = document.getElementById('reviewText').value.trim();
    const stars = parseInt(document.getElementById('reviewStars').value);
    
    if (!name || !text) {
        toast('❌ لطفاً نام و نظر خود را وارد کنید', 'error');
        return;
    }
    
    const review = {
        name: name,
        text: text,
        stars: stars,
        date: new Date().toLocaleDateString('fa-IR')
    };
    
    const saved = JSON.parse(localStorage.getItem('juice_reviews') || '[]');
    saved.unshift(review);
    localStorage.setItem('juice_reviews', JSON.stringify(saved.slice(0, 20)));
    
    document.getElementById('reviewName').value = '';
    document.getElementById('reviewText').value = '';
    document.getElementById('reviewStars').value = '5';
    
    loadReviews();
    toast('✅ نظر شما با موفقیت ثبت شد! 🙏');
}

function loadReviews() {
    const saved = JSON.parse(localStorage.getItem('juice_reviews') || '[]');
    const grid = document.getElementById('reviewsGrid');
    
    if (!grid) return;
    
    if (saved.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:20px;">💬 هنوز نظری ثبت نشده. اولین نفر باش!</p>';
        return;
    }
    
    grid.innerHTML = saved.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-avatar">${review.name[0]}</div>
                <div>
                    <div class="review-name">${review.name}</div>
                    <div class="review-stars">${'⭐'.repeat(review.stars)}</div>
                </div>
            </div>
            <p class="review-text">${review.text}</p>
            <div style="color:var(--text-muted);font-size:0.7rem;margin-top:8px;">${review.date}</div>
        </div>
    `).join('');
}

// ========== DAILY OFFER ==========
function checkDailyOffer() {
    const hasOffer = menuData.some(item => item.discount > 0);
    const banner = document.getElementById('dailyBanner');
    
    if (banner && hasOffer) {
        banner.classList.add('show');
        updateOfferTimer();
        setInterval(updateOfferTimer, 1000);
    }
}

function updateOfferTimer() {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const diff = end - now;
    if (diff <= 0) return;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    document.getElementById('offerH').textContent = String(hours).padStart(2, '۰');
    document.getElementById('offerM').textContent = String(minutes).padStart(2, '۰');
    document.getElementById('offerS').textContent = String(seconds).padStart(2, '۰');
}

// ========== EVENT LISTENERS ==========
document.querySelectorAll('.cat-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentCategory = this.dataset.cat;
        displayMenu();
    });
});

document.querySelectorAll('.goal-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentGoal = this.dataset.goal;
        displayMenu();
    });
});

document.querySelectorAll('.price-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentPrice = this.dataset.price;
        displayMenu();
    });
});

document.querySelectorAll('.size-btn').forEach(button => {
    button.addEventListener('click', function() {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentSize = this.dataset.size;
        displayMenu();
    });
});

document.getElementById('search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm.length === 0) {
        displayMenu();
        return;
    }
    
    const filtered = getFilteredData().filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.cat.toLowerCase().includes(searchTerm) ||
        (item.desc || '').toLowerCase().includes(searchTerm)
    );
    
    const tempMenuData = [...menuData];
    menuData = filtered;
    displayMenu();
    menuData = tempMenuData;
});

document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('shareModal').addEventListener('click', function(e) {
    if (e.target === this) closeShare();
});

const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
    scrollTopBtn.style.display = window.scrollY > 400 ? 'block' : 'none';
});

// ========== TOAST ==========
function toast(message, type = 'success') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.textContent = message;
    
    if (type === 'error') {
        toastElement.style.background = 'var(--danger)';
    }
    
    document.body.appendChild(toastElement);
    setTimeout(() => toastElement.remove(), 2500);
}

// ========== INITIALIZATION ==========
window.addEventListener('load', () => {
    loadData();
    loadReviews();
    
    const qrElement = document.getElementById('qrCode');
    if (qrElement && typeof QRCode !== 'undefined') {
        new QRCode(qrElement, {
            text: window.location.href,
            width: 140,
            height: 140
        });
    }
    
    const params = new URLSearchParams(window.location.search);
    const sharedItem = params.get('item');
    if (sharedItem) {
        setTimeout(() => openModal(decodeURIComponent(sharedItem)), 600);
    }
});
