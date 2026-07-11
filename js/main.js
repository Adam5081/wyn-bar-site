/* ============ WYN Social Bar — общая логика ============ */

// ---------- навигация ----------
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--scrolled", window.scrollY > 40);
});

const burger = document.getElementById("burger");
const navLinks = document.getElementById("navLinks");
burger.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

// ---------- статус «открыто/закрыто» ----------
// Часы работы: [день недели 0=Вс] -> [открытие, закрытие] в часах (закрытие после полуночи)
const HOURS = {
  1: [13, 26], 2: [13, 26], 3: [13, 26], 4: [13, 26], // Пн–Чт 13:00–02:00
  5: [13, 28],                                          // Пт 13:00–04:00
  6: [15, 28],                                          // Сб 15:00–04:00
  0: [15, 26]                                           // Вс 15:00–02:00
};
(function renderStatus() {
  const el = document.getElementById("openStatus");
  const now = new Date();
  let day = now.getDay();
  let hour = now.getHours() + now.getMinutes() / 60;
  // если сейчас «после полуночи», смотрим часы вчерашнего дня
  let [o, c] = HOURS[day];
  const prev = HOURS[(day + 6) % 7];
  let open = (hour >= o && hour < Math.min(c, 24)) || (hour + 24 < prev[1]);
  if (open) {
    el.innerHTML = "● <strong>Сейчас открыто</strong> — ждём вас";
  } else {
    el.classList.add("closed");
    el.innerHTML = "● <strong>Сейчас закрыто</strong> — откроемся в " + (day === 6 || day === 0 ? "15:00" : "13:00");
  }
})();

// ---------- новости ----------
const newsTrack = document.getElementById("newsTrack");
NEWS.forEach(n => {
  const card = document.createElement("article");
  card.className = "news-card reveal";
  card.innerHTML = `
    <span class="news-card__badge news-card__badge--${n.badge}">${n.badgeText}</span>
    <h3>${n.title}</h3>
    <p>${n.text}</p>
    <span class="news-card__suit">${n.suit}</span>`;
  newsTrack.appendChild(card);
});

// ---------- меню ----------
const menuTabs = document.getElementById("menuTabs");
const menuList = document.getElementById("menuList");
Object.keys(MENU).forEach((cat, i) => {
  const btn = document.createElement("button");
  btn.className = "menu__tab" + (i === 0 ? " menu__tab--active" : "");
  btn.textContent = cat;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu__tab").forEach(b => b.classList.remove("menu__tab--active"));
    btn.classList.add("menu__tab--active");
    renderMenu(cat);
  });
  menuTabs.appendChild(btn);
});
function renderMenu(cat) {
  menuList.innerHTML = "";
  MENU[cat].forEach(item => {
    const div = document.createElement("div");
    div.className = "menu-item";
    div.innerHTML = `
      <span class="menu-item__name">${item.name}
        ${item.desc ? `<span class="menu-item__desc">${item.desc}</span>` : ""}
      </span>
      <span class="menu-item__dots"></span>
      <span class="menu-item__price">${item.price}</span>`;
    menuList.appendChild(div);
  });
}
renderMenu(Object.keys(MENU)[0]);

// ---------- бронь через WhatsApp ----------
// нельзя выбрать прошедшую дату (локальное время, не UTC)
(function setMinDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  document.querySelector('#bookingForm input[name="date"]').min = d.toISOString().slice(0, 10);
})();

document.getElementById("bookingForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg =
    `Здравствуйте! Хочу забронировать стол в WYN Social Bar.%0A` +
    `Имя: ${encodeURIComponent(f.get("name"))}%0A` +
    `Дата: ${encodeURIComponent(f.get("date"))}, время: ${encodeURIComponent(f.get("time"))}%0A` +
    `Гостей: ${encodeURIComponent(f.get("guests"))}` +
    (f.get("comment") ? `%0AКомментарий: ${encodeURIComponent(f.get("comment"))}` : "");
  window.open(`https://wa.me/77712569135?text=${msg}`, "_blank");
});

// ---------- появление при скролле ----------
document.querySelectorAll(".section__title, .section__sub, .about__text, .about__photo, .gallery__item, .booking__form, .info__item, .contacts__info, .contacts__map")
  .forEach(el => el.classList.add("reveal"));
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); } });
}, { threshold: .12 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// ---------- пасхалка: ♠ ♥ ♦ ♣ по порядку в футере ----------
const SECRET = ["s", "h", "d", "c"];
let progress = [];
document.querySelectorAll("#footerSuits button").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.remove("suit-hit");
    void btn.offsetWidth;
    btn.classList.add("suit-hit");
    progress.push(btn.dataset.suit);
    if (progress.length > 4) progress.shift();
    if (SECRET.every((s, i) => progress[i] === s)) {
      progress = [];
      openPoker();
    }
  });
});
// прямой вход по ссылке #poker
if (location.hash === "#poker") setTimeout(openPoker, 600);
