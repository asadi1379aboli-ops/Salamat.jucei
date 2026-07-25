۷/*====================================
     Juice Salamat Premium Menu
====================================*/

const CSV_FILE = "menu.csv";

let menuData = [];
let currentSize = "لیوانی";

/*==========================
      Loading Screen
==========================*/

window.addEventListener("load",()=>{

setTimeout(()=>{

const loading=document.querySelector(".loading-screen");

if(loading){

loading.style.opacity="0";
loading.style.pointerEvents="none";

setTimeout(()=>{
loading.remove();
},700);

}

},1200);

});

/*==========================
      Read CSV
==========================*/

Papa.parse(CSV_FILE,{

download:true,

header:true,

skipEmptyLines:true,

complete:function(result){

menuData=result.data;

renderMenu(menuData);

}

});

/*==========================
      Render Menu
==========================*/

function renderMenu(data){

const container=document.getElementById("menu-list");

if(!container)return;

container.innerHTML="";

data.forEach(item=>{

if(!item["نام محصول"])return;

if(

item["نام محصول"]==="منو ویژه فصلی"||

item["نام محصول"]==="ترش‌های سلامت"||

item["نام محصول"]==="طبیعی‌های سلامت"||

item["نام محصول"]==="ترکیبی‌های سلامت"||

item["نام محصول"]==="میلک شیک‌ها"

){

container.innerHTML+=`

<div class="menu-section">

<h2>${item["نام محصول"]}</h2>

</div>

`;

return;

}

let price=parseInt(item[currentSize]);

if(isNaN(price)||price===0)return;

container.innerHTML+=`

<div class="menu-card fade-up" onclick="openProduct(${JSON.stringify(item).replace(/"/g,'&quot;')})">

<div class="menu-image">

<img src="assets/images/${item["نام محصول"]}.jpeg">

</div>

<div class="menu-info">

<h3>${item["نام محصول"]}</h3>

<p>${item["توضیحات"]||""}</p>

</div>

<div class="menu-price">

${price}

</div>

</div>

`;

});

}

/*==========================
      Live Search
==========================*/

const searchInput=document.getElementById("search");

if(searchInput){

searchInput.addEventListener("input",function(){

const value=this.value.trim();

if(value===""){

renderMenu(menuData);

return;

}

const filtered=menuData.filter(item=>{

return(

item["نام محصول"]&&

item["نام محصول"].includes(value)

);

});

renderMenu(filtered);

});

}

/*==========================
      Size Buttons
==========================*/

document.querySelectorAll(".size").forEach(btn=>{

btn.addEventListener("click",()=>{

document.querySelectorAll(".size").forEach(b=>{

b.classList.remove("active");

});

btn.classList.add("active");

currentSize=btn.dataset.size;

renderMenu(menuData);

});

});

/*==========================
      Scroll To Top
==========================*/

const scrollBtn=document.getElementById("scrollTop");

window.addEventListener("scroll",()=>{

if(window.scrollY>500){

scrollBtn.classList.add("show");

}else{

scrollBtn.classList.remove("show");

}

});

scrollBtn.addEventListener("click",()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

});

/*==========================
     Hero Button
==========================*/

const heroBtn=document.querySelector(".hero-btn");

if(heroBtn){

heroBtn.addEventListener("click",e=>{

e.preventDefault();

document.querySelector("#menu").scrollIntoView({

behavior:"smooth"

});

});

}

/*==========================
      Scroll Animation
==========================*/

const observer=new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("fade-up");

}

});

});

setInterval(()=>{

document.querySelectorAll(".menu-card").forEach(card=>{

observer.observe(card);

});

},500);

/*==========================
      Premium Badge
==========================*/

setTimeout(()=>{

document.querySelectorAll(".menu-card").forEach((card,index)=>{

if(index<5){

const badge=document.createElement("div");

badge.className="badge";

badge.innerHTML="🔥 پرفروش";

card.querySelector(".menu-info").appendChild(badge);

}

});

},1200);

/*==========================
      Category Filter
==========================*/

const categoryButtons=document.querySelectorAll(".category");

categoryButtons.forEach(button=>{

button.addEventListener("click",()=>{

categoryButtons.forEach(btn=>btn.classList.remove("active"));

button.classList.add("active");

const category=button.innerText.trim();

if(category==="🍹 همه"){

renderMenu(menuData);

return;

}

const filtered=menuData.filter(item=>{

const name=item["نام محصول"]||"";

switch(category){

case "🥤 آبمیوه":
return name.includes("آب");

case "🍓 ترکیبی":
return name.includes("+");

case "🥛 میلک شیک":
return name.includes("شیک") || name.includes("میلک");

case "🥑 ویژه":
return name.includes("پسته") ||
name.includes("آووکادو") ||
name.includes("انبه") ||
name.includes("معجون");

default:
return true;

}

});

renderMenu(filtered);

});

});

/*==========================
      WhatsApp Button
==========================*/

const whatsapp=document.querySelector(".whatsapp");

if(whatsapp){

whatsapp.addEventListener("click",()=>{

window.open(

"https://wa.me/989120230285",

"_blank"

);

});

}

/*==========================
      Call Button
==========================*/

const callButton=document.querySelector(".call-button");

if(callButton){

callButton.addEventListener("click",()=>{

window.location.href="tel:09120230285";

});

}

/*==========================
      Fade Hero
==========================*/

window.addEventListener("scroll",()=>{

const hero=document.querySelector(".hero");

if(hero){

hero.style.opacity=1-window.scrollY/900;

}

});

/*==========================
      Header Shadow
==========================*/

const header=document.querySelector(".header-fixed");

window.addEventListener("scroll",()=>{

if(window.scrollY>80){

header.style.background="rgba(255,255,255,.92)";
header.style.boxShadow="0 15px 35px rgba(0,0,0,.15)";

}else{

header.style.background="rgba(255,255,255,.65)";
header.style.boxShadow="0 15px 35px rgba(0,0,0,.08)";

}

});

/*==========================
      Product Modal
==========================*/

function openProduct(item){

const modal=document.getElementById("productModal");

const image=document.getElementById("modalImage");

const title=document.getElementById("modalTitle");

const description=document.getElementById("modalDescription");

const prices=document.getElementById("modalPrices");


modal.classList.add("active");


title.innerHTML=item["نام محصول"];


description.innerHTML=
item["توضیحات"] || 
"تهیه شده با مواد اولیه تازه و طبیعی";


image.src=
"assets/images/"+item["نام محصول"]+".jpeg";


prices.innerHTML="";


const sizes=[

"لیوانی",
"نیم‌لیتری",
"یک‌لیتری",
"یک‌ونیم‌لیتری"

];


sizes.forEach(size=>{

if(item[size] && item[size]!="0"){

prices.innerHTML+=`

<div>

${size}

<br>

${item[size]} تومان

</div>

`;

}

});


}


/* بستن پنجره */

const closeModal=document.getElementById("closeModal");


if(closeModal){

closeModal.onclick=()=>{

document
.getElementById("productModal")
.classList.remove("active");

};

}


/* بستن با کلیک بیرون */

document
.getElementById("productModal")
.addEventListener("click",e=>{

if(e.target.id==="productModal"){

e.target.classList.remove("active");

}

});
/*==========================
      Product Modal
==========================*/

function openProduct(name, desc, price) {

    const modal = document.getElementById("productModal");

    document.getElementById("modalTitle").innerHTML = name;

    document.getElementById("modalDesc").innerHTML = desc || "آبمیوه طبیعی و تازه";

    document.getElementById("modalPrice").innerHTML =
        Number(price).toLocaleString("fa-IR") + " تومان";

    document.getElementById("modalImage").src =
        "assets/images/" + name + ".jpeg";

    modal.classList.add("show");

}

const closeModal = document.querySelector(".close-modal");

if (closeModal) {

    closeModal.addEventListener("click", () => {

        document.getElementById("productModal").classList.remove("show");

    });

}

window.addEventListener("click", function (e) {

    const modal = document.getElementById("productModal");

    if (e.target === modal) {

        modal.classList.remove("show");

    }

});
