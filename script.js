// ===============================
// Juice Salamat Premium Menu
// Part 1
// ===============================

const CSV_FILE = "menu.csv";

let menuData = [];
let currentSize = "لیوانی";

const menuContainer = document.getElementById("menu-list");
const searchInput = document.getElementById("search");
const sizeButtons = document.querySelectorAll(".size");
const loadingScreen = document.querySelector(".loading-screen");
const scrollTopBtn = document.getElementById("scrollTop");

window.addEventListener("load", () => {

    setTimeout(() => {

        loadingScreen.style.opacity = "0";

        setTimeout(() => {

            loadingScreen.style.display = "none";

        },600);

    },1800);

    loadMenu();

});

function loadMenu(){

    Papa.parse(CSV_FILE,{

        download:true,

        header:true,

        skipEmptyLines:true,

        complete:function(results){

            menuData = results.data;

            renderMenu();

        },

        error:function(){

            menuContainer.innerHTML =
            "<h2 style='text-align:center;color:red'>خطا در بارگذاری منو</h2>";

        }

    });

}

function renderMenu(){

    let keyword = searchInput.value.trim();

    menuContainer.innerHTML="";

    menuData.forEach(item=>{

        if(!item["نام محصول"]) return;

        let name=item["نام محصول"];

        if(keyword!=="" && !name.includes(keyword)) return;

        if(
            name.includes("منو") ||
            name.includes("سلامت") ||
            name.includes("میلک شیک‌ها") ||
            name.includes("ترکیبی‌های") ||
            name.includes("ترش‌های") ||
            name.includes("طبیعی‌های")
        ){

            createSection(name);

            return;

        }

        createCard(item);

    });

}// ===============================
// Part 2
// ===============================

function createSection(title){

    const section=document.createElement("div");

    section.className="menu-section";

    section.innerHTML=`<h2>${title}</h2>`;

    menuContainer.appendChild(section);

}

function createCard(item){

    let price=item[currentSize];

    if(price===undefined || price==="") return;

    price=parseInt(price);

    if(price===0 || isNaN(price)) return;

    const card=document.createElement("div");

    card.className="menu-card";

    card.innerHTML=`

        <div class="menu-image">

            <img src="logo.png.jpg" loading="lazy">

        </div>

        <div class="menu-info">

            <h3>${item["نام محصول"]}</h3>

            <p>${item["توضیحات"] || ""}</p>

        </div>

        <div class="menu-price">

            ${price.toLocaleString("fa-IR")}

            <span>هزار</span>

        </div>

    `;

    menuContainer.appendChild(card);

}

searchInput.addEventListener("input",()=>{

    renderMenu();

});

sizeButtons.forEach(btn=>{

    btn.addEventListener("click",()=>{

        sizeButtons.forEach(x=>x.classList.remove("active"));

        btn.classList.add("active");

        currentSize=btn.dataset.size;

        renderMenu();

    });

});// ===============================
// Part 3
// ===============================

// دکمه رفتن به بالای صفحه
window.addEventListener("scroll",()=>{

    if(window.scrollY>300){

        scrollTopBtn.style.display="flex";

    }else{

        scrollTopBtn.style.display="none";

    }

});

scrollTopBtn.addEventListener("click",()=>{

    window.scrollTo({

        top:0,

        behavior:"smooth"

    });

});

// انیمیشن ظاهر شدن کارت‌ها
const observer=new IntersectionObserver(entries=>{

    entries.forEach(entry=>{

        if(entry.isIntersecting){

            entry.target.classList.add("show");

        }

    });

});

function observeCards(){

    document.querySelectorAll(".menu-card").forEach(card=>{

        observer.observe(card);

    });

}

// بعد از رندر منو، کارت‌ها را هم انیمیت کن
const oldRenderMenu=renderMenu;

renderMenu=function(){

    oldRenderMenu();

    observeCards();

}// ===============================
// Part 4
// ===============================

// نمایش سال جاری در صورت نیاز
const yearElement = document.getElementById("year");
if(yearElement){
    yearElement.textContent = new Date().getFullYear();
}

// افکت کوچک روی دکمه‌ها
document.querySelectorAll("button,.hero-btn,.footer-btn").forEach(btn=>{

    btn.addEventListener("mousedown",()=>{

        btn.style.transform="scale(.96)";

    });

    btn.addEventListener("mouseup",()=>{

        btn.style.transform="scale(1)";

    });

    btn.addEventListener("mouseleave",()=>{

        btn.style.transform="scale(1)";

    });

});

// پیام خوش‌آمدگویی
console.log("%c🍹 آبمیوه سلامت","font-size:22px;color:#D4AF37;font-weight:bold;");
console.log("%cPremium Digital Menu","font-size:14px;color:#1F6F50;");

// اگر منویی بارگذاری نشد
setTimeout(()=>{

    if(menuData.length===0){

        menuContainer.innerHTML=`
        <div style="
        text-align:center;
        padding:40px;
        color:#666;
        font-size:18px;">
        ⚠️ منو هنوز بارگذاری نشده است.
        </div>
        `;

    }

},5000);
