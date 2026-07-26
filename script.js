// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

// PWA Install
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBanner.classList.add('show'); });
document.getElementById('installBtn').addEventListener('click', async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') installBanner.classList.remove('show'); deferredPrompt = null; } });
document.getElementById('installClose').addEventListener('click', () => { installBanner.classList.remove('show'); });

// Particles
(function() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const colors = ['#ff6b35','#ffd23f','#ff2d55','#7b2d8e','#7bc67e','#ff8c5a'];
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    addEventListener('resize', resize); resize();
    for (let i = 0; i < 30; i++) { particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: Math.random()*3+1.5, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, c: colors[Math.floor(Math.random()*colors.length)], o: Math.random()*0.3+0.08 }); }
    function anim() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach(p => {
            const h=p.c; const rr=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=`rgba(${rr},${g},${b},${p.o})`; ctx.fill();
            p.x+=p.vx; p.y+=p.vy; if(p.x<0||p.x>canvas.width)p.vx*=-1; if(p.y<0||p.y>canvas.height)p.vy*=-1;
        });
        for(let i=0;i<particles.length;i++){for(let j=i+1;j<particles.length;j++){const dx=particles[i].x-particles[j].x,dy=particles[i].y-particles[j].y,dist=Math.sqrt(dx*dx+dy*dy);if(dist<100){ctx.beginPath();ctx.moveTo(particles[i].x,particles[i].y);ctx.lineTo(particles[j].x,particles[j].y);ctx.strokeStyle=`rgba(255,107,53,${0.06*(1-dist/100)})`;ctx.lineWidth=0.5;ctx.stroke()}}}
        requestAnimationFrame(anim);
    }
    anim();
})();

// Data
let menuData=[], currentSize='لیوانی', currentCat='all', currentGoal='all', currentPrice='all';
let recentlyViewed=JSON.parse(localStorage.getItem('rv')||'[]'), favorites=JSON.parse(localStorage.getItem('fav')||'[]');
let modalImages=[], modalImageIndex=0;
const goalLabels={energy:'⚡ انرژی',diet:'🥗 کاهش وزن',immunity:'🛡️ تقویت ایمنی',thirst:'💧 رفع تشنگی'};
const statusLabels={available:'✅ موجود',low:'⏳ رو به اتمام',unavailable:'❌ ناموجود'};

async function loadData(){
    try{const r=await fetch('data.json'); menuData=await r.json(); menuData.sort((a,b)=>(a.order||99)-(b.order||99));}catch(e){menuData=[];}
    displayMenu(); renderRecent(); checkOffer();
}

function getFiltered(){
    let f=[...menuData];
    if(currentCat!=='all')f=f.filter(i=>i.cat===currentCat);
    if(currentGoal!=='all')f=f.filter(i=>i.goals&&i.goals.includes(currentGoal));
    if(currentPrice!=='all'){f=f.filter(i=>{const p=parseInt((i.prices[currentSize]||'0').replace(/[^0-9]/g,''));if(currentPrice==='low')return p<150000;if(currentPrice==='mid')return p>=150000&&p<=250000;if(currentPrice==='high')return p>250000;return true;});}
    return f;
}

function displayMenu(){
    const list=document.getElementById('menu-list'), items=getFiltered();
    if(!items.length){list.innerHTML='<p style="text-align:center;color:var(--text-muted);grid-column:1/-1;padding:50px;">😔 محصولی یافت نشد</p>';return;}
    list.innerHTML=items.map((item,i)=>{
        const isFav=favorites.some(f=>f.name===item.name);
        const price=parseInt((item.prices[currentSize]||'0').replace(/[^0-9]/g,''));
        const dp=item.discount>0?Math.round(price*(1-item.discount/100)):null;
        const pd=dp?dp.toLocaleString('fa-IR'):price.toLocaleString('fa-IR');
        const img=(item.images&&item.images[0])||item.image||'logo.png.jpg';
        const imgCount=(item.images&&item.images.length>1)?item.images.length:0;
        let badge=''; if(item.badge==='special')badge='<div class="ribbon special">⭐ پرفروش</div>'; if(item.badge==='new')badge='<div class="ribbon new">🆕 جدید</div>';
        let disc=''; if(item.discount>0)disc=`<div class="discount-badge">${item.discount}٪</div>`;
        let stat=''; if(item.status&&item.status!=='available')stat=`<div class="status-badge ${item.status}">${statusLabels[item.status]}</div>`;
        let goals=''; if(item.goals)item.goals.forEach(g=>{goals+=`<span class="goal-badge ${g}">${goalLabels[g]}</span>`;});
        return `<div class="menu-item" style="transition-delay:${i*0.03}s" onclick="openModal('${item.name.replace(/'/g,"\\'")}')">
            ${badge}${disc}${stat}
            <button class="fav-btn ${isFav?'liked':''}" onclick="event.stopPropagation();toggleFav('${item.name.replace(/'/g,"\\'")}')" aria-label="${isFav?'حذف':'افزودن'}"><i class="${isFav?'fas':'far'} fa-heart"></i></button>
            <button class="share-btn" onclick="event.stopPropagation();openShare('${item.name.replace(/'/g,"\\'")}')" aria-label="اشتراک"><i class="fas fa-share-alt"></i></button>
            ${imgCount>1?`<span class="image-counter">${imgCount} عکس</span>`:''}
            <img src="${img}" alt="${item.name}" loading="lazy" onerror="this.src='logo.png.jpg';this.onerror=null;">
            <div class="item-info"><h3>${item.name}</h3><div class="stars">${'⭐'.repeat(item.stars)}</div><span class="tag">${item.cat}</span><div>${goals}</div><p class="views-count"><i class="fas fa-eye"></i> ${(item.views||0).toLocaleString('fa-IR')} بازدید</p><div class="price-row"><span class="price">${pd} تومان</span>${dp?`<span class="old-price">${price.toLocaleString('fa-IR')}</span>`:''}</div></div>
        </div>`;
    }).join('');
    requestAnimationFrame(()=>{document.querySelectorAll('.menu-item').forEach((el,i)=>{setTimeout(()=>el.classList.add('visible'),i*40);});});
}

function addToRecent(item){recentlyViewed=recentlyViewed.filter(r=>r.name!==item.name);recentlyViewed.unshift({name:item.name,image:(item.images&&item.images[0])||item.image});if(recentlyViewed.length>8)recentlyViewed.pop();localStorage.setItem('rv',JSON.stringify(recentlyViewed));renderRecent();}
function renderRecent(){const s=document.getElementById('recentlyViewed'),sl=document.getElementById('recentSlider');if(!recentlyViewed.length){s.style.display='none';return;}s.style.display='block';sl.innerHTML=recentlyViewed.map(r=>`<div class="recent-item" onclick="openModal('${r.name.replace(/'/g,"\\'")}')"><img src="${r.image}" loading="lazy" onerror="this.src='logo.png.jpg'"><div style="font-size:0.8rem;">${r.name}</div></div>`).join('');}

function toggleFav(name){const item=menuData.find(i=>i.name===name);if(!item)return;const idx=favorites.findIndex(f=>f.name===name);if(idx>=0){favorites.splice(idx,1);toast('💔 حذف شد');}else{favorites.push({name:item.name,image:(item.images&&item.images[0])||item.image,prices:item.prices});toast('❤️ اضافه شد');}localStorage.setItem('fav',JSON.stringify(favorites));displayMenu();}
function showFavorites(){if(!favorites.length){toast('😔 چیزی ذخیره نکردی!','error');return;}document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));const ab=document.querySelector('.cat-btn[data-cat="all"]');if(ab)ab.classList.add('active');currentCat='all';const temp=[...menuData];const fi=favorites.map(f=>menuData.find(m=>m.name===f.name)).filter(Boolean);menuData=fi;displayMenu();setTimeout(()=>{menuData=temp;displayMenu();},4000);toast('❤️ علاقه‌مندی‌ها (۴ ثانیه)');}

function showSuggestions(item){const s=document.getElementById('suggestedSection'),g=document.getElementById('suggestedGrid');const su=menuData.filter(i=>i.name!==item.name&&(i.cat===item.cat||(i.goals&&item.goals&&i.goals.some(gg=>(item.goals||[]).includes(gg))))).slice(0,4);if(!su.length){s.style.display='none';return;}s.style.display='block';g.innerHTML=su.map(su=>`<div class="suggested-item" onclick="openModal('${su.name.replace(/'/g,"\\'")}');document.getElementById('suggestedSection').style.display='none';"><img src="${(su.images&&su.images[0])||su.image||'logo.png.jpg'}" loading="lazy" onerror="this.src='logo.png.jpg'"><div style="font-size:0.85rem;color:var(--orange);">${su.name}</div><div style="font-size:0.8rem;color:var(--lime);">${su.prices[currentSize]} تومان</div></div>`).join('');s.scrollIntoView({behavior:'smooth',block:'nearest'});}

function openModal(name){const item=menuData.find(i=>i.name===name);if(!item)return;item.views=(item.views||0)+1;addToRecent(item);modalImages=item.images||[item.image||'logo.png.jpg'];modalImageIndex=0;updateModalImage();document.getElementById('modalTitle').textContent=item.name;document.getElementById('modalStars').textContent='⭐'.repeat(item.stars);document.getElementById('modalDesc').textContent=item.desc;document.getElementById('modalCalories').innerHTML=`<i class="fas fa-fire"></i> ${item.cal||'---'} کالری | <i class="fas fa-eye"></i> ${(item.views||0).toLocaleString('fa-IR')} بازدید`;const st=document.getElementById('modalStatus');st.textContent=statusLabels[item.status]||statusLabels.available;st.className='status-text '+(item.status||'available');const il=document.getElementById('ingredientsList');il.innerHTML=(item.ingredients||[]).map(i=>`<span class="ingredient-tag">${i}</span>`).join('');let ph='';for(const[s,p]of Object.entries(item.prices||{}))ph+=`<p><strong>${s}:</strong> ${p} تومان</p>`;document.getElementById('modalPrices').innerHTML=ph;const cs=document.getElementById('comboSection');if(item.combo&&item.combo.length){cs.style.display='block';document.getElementById('comboItems').innerHTML=item.combo.map(c=>`<span class="combo-item" onclick="openModal('${c.replace(/'/g,"\\'")}')">${c}</span>`).join('');}else cs.style.display='none';document.getElementById('modal').classList.add('active');showSuggestions(item);}
function updateModalImage(){const img=document.getElementById('modalImg');img.src=modalImages[modalImageIndex]||'logo.png.jpg';img.onerror=function(){this.src='logo.png.jpg';};const dots=document.getElementById('modalDots');if(modalImages.length>1){dots.innerHTML=modalImages.map((_,i)=>`<span class="slider-dot ${i===modalImageIndex?'active':''}" onclick="modalImageIndex=${i};updateModalImage();"></span>`).join('');document.querySelectorAll('.slider-nav').forEach(n=>n.style.display='flex');}else{document.querySelectorAll('.slider-nav').forEach(n=>n.style.display='none');dots.innerHTML='';}}
function nextImage(){if(modalImages.length>1){modalImageIndex=(modalImageIndex+1)%modalImages.length;updateModalImage();}}
function prevImage(){if(modalImages.length>1){modalImageIndex=(modalImageIndex-1+modalImages.length)%modalImages.length;updateModalImage();}}
function closeModal(){document.getElementById('modal').classList.remove('active');const s=document.getElementById('suggestedSection');if(s)s.style.display='none';}

function openShare(name){const item=menuData.find(i=>i.name===name);if(!item)return;const url=window.location.href.split('?')[0]+'?item='+encodeURIComponent(name);const text=`🍹 ${item.name} - ${item.prices[currentSize]} تومان\n${item.desc}\n\nآبمیوه سلامت:\n`;document.getElementById('shareText').textContent=`🍹 ${item.name}`;document.getElementById('shareWhatsApp').href=`https://wa.me/?text=${encodeURIComponent(text+url)}`;document.getElementById('shareTelegram').href=`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;document.getElementById('shareModal').classList.add('active');}
function closeShare(){document.getElementById('shareModal').classList.remove('active');}
function copyLink(){navigator.clipboard.writeText(window.location.href.split('?')[0]).then(()=>toast('🔗 لینک کپی شد!'));}

document.querySelectorAll('.cat-btn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active'));this.classList.add('active');currentCat=this.dataset.cat;displayMenu();}));
document.querySelectorAll('.goal-btn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('.goal-btn').forEach(x=>x.classList.remove('active'));this.classList.add('active');currentGoal=this.dataset.goal;displayMenu();}));
document.querySelectorAll('.price-btn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('.price-btn').forEach(x=>x.classList.remove('active'));this.classList.add('active');currentPrice=this.dataset.price;displayMenu();}));
document.querySelectorAll('.size-btn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('.size-btn').forEach(x=>x.classList.remove('active'));this.classList.add('active');currentSize=this.dataset.size;displayMenu();}));
document.getElementById('search').addEventListener('input',e=>{const t=e.target.value.toLowerCase();if(!t){displayMenu();return;}const filtered=getFiltered().filter(i=>i.name.toLowerCase().includes(t)||i.cat.toLowerCase().includes(t)||i.desc.toLowerCase().includes(t));const temp=[...menuData];menuData=filtered;displayMenu();menuData=temp;});

function startVoiceSearch(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('🎤 پشتیبانی نمیشه','error');return;}const rec=new SR();rec.lang='fa-IR';const btn=document.getElementById('voiceBtn');btn.classList.add('listening');rec.start();rec.onresult=e=>{document.getElementById('search').value=e.results[0][0].transcript;document.getElementById('search').dispatchEvent(new Event('input'));btn.classList.remove('listening');};rec.onerror=()=>btn.classList.remove('listening');rec.onend=()=>btn.classList.remove('listening');}

document.getElementById('modal').addEventListener('click',function(e){if(e.target===this)closeModal();});
document.getElementById('shareModal').addEventListener('click',function(e){if(e.target===this)closeShare();});

function toggleTheme(){const h=document.documentElement,icon=document.querySelector('.header-actions .icon-btn i');if(h.getAttribute('data-theme')==='dark'){h.setAttribute('data-theme','light');icon.className='fas fa-moon';}else{h.setAttribute('data-theme','dark');icon.className='fas fa-sun';}}

function submitReview(){const name=document.getElementById('reviewName').value.trim(),text=document.getElementById('reviewText').value.trim(),stars=parseInt(document.getElementById('reviewStars').value);if(!name||!text){toast('❌ نام و نظر الزامی','error');return;}const review={name,text,stars,date:new Date().toLocaleDateString('fa-IR')};const saved=JSON.parse(localStorage.getItem('juice_reviews')||'[]');saved.unshift(review);localStorage.setItem('juice_reviews',JSON.stringify(saved.slice(0,20)));document.getElementById('reviewName').value='';document.getElementById('reviewText').value='';loadReviews();toast('✅ ثبت شد!');}
function loadReviews(){const saved=JSON.parse(localStorage.getItem('juice_reviews')||'[]');const grid=document.getElementById('reviewsGrid');if(!saved.length){grid.innerHTML='<p style="color:var(--text-muted);text-align:center;grid-column:1/-1;padding:20px;">💬 هنوز نظری ثبت نشده. اولین نفر باش!</p>';return;}grid.innerHTML=saved.map(r=>`<div class="review-card"><div class="review-header"><div class="review-avatar">${r.name[0]}</div><div><div class="review-name">${r.name}</div><div class="review-stars">${'⭐'.repeat(r.stars)}</div></div></div><p class="review-text">${r.text}</p><div style="color:var(--text-muted);font-size:0.7rem;margin-top:8px;">${r.date}</div></div>`).join('');}

function checkOffer(){const has=menuData.some(i=>i.discount>0);const b=document.getElementById('dailyBanner');if(b&&has){b.classList.add('show');updateOfferTimer();setInterval(updateOfferTimer,1000);}}
function updateOfferTimer(){const n=new Date(),e=new Date();e.setHours(23,59,59,999);const d=e-n;if(d<=0)return;document.getElementById('offerH').textContent=String(Math.floor(d/3600000)).padStart(2,'۰');document.getElementById('offerM').textContent=String(Math.floor((d%3600000)/60000)).padStart(2,'۰');document.getElementById('offerS').textContent=String(Math.floor((d%60000)/1000)).padStart(2,'۰');}

function toast(msg,type='success'){const t=document.createElement('div');t.className='toast';t.textContent=msg;if(type==='error')t.style.background='var(--danger)';document.body.appendChild(t);setTimeout(()=>t.remove(),2500);}

const sb=document.getElementById('scrollTop');window.addEventListener('scroll',()=>{sb.style.display=window.scrollY>400?'block':'none';});

window.addEventListener('load',()=>{loadData();loadReviews();if(typeof QRCode!=='undefined')new QRCode(document.getElementById('qrCode'),{text:window.location.href,width:140,height:140});const params=new URLSearchParams(window.location.search);const item=params.get('item');if(item)setTimeout(()=>openModal(decodeURIComponent(item)),600);});
