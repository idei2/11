/* ===== ДАННЫЕ КЛИНИКИ: для новой клиники меняется только этот блок ===== */
const CLINIC = {
  name: "Дентал Арт",
  title: "Дентал Арт / Стоматология в Протвино",
  headline: ["Лечение без боли", "и лишних визитов"],
  sub: "Современное оборудование, опытные врачи и спокойная атмосфера.",
  cta: "Записаться на приём",
  reassure: "Перезвоним в течение 15 минут",
  servicesTitle: "Услуги и цены",
  services: [
    { t: "Осмотр и консультация", d: "Диагностика и план лечения", p: "от 500 ₽" },
    { t: "Лечение кариеса", d: "Современные пломбировочные материалы", p: "от 3 500 ₽" },
    { t: "Профессиональная гигиена", d: "Чистка и полировка, Air Flow", p: "от 4 000 ₽" },
    { t: "Отбеливание", d: "Безопасно для эмали", p: "от 9 000 ₽" },
    { t: "Имплантация", d: "Восстановление зуба под ключ", p: "от 35 000 ₽" },
    { t: "Детская стоматология", d: "Бережный приём без страха", p: "от 2 500 ₽" }
  ],
  clinicTitle: ["Тихий кабинет,", "точная работа"],
  clinicText: "Принимаем по записи, без очередей в коридоре. Врач заранее объяснит план лечения и стоимость.",
  bookTitle: ["Оставьте телефон,", "мы подберём время"],
  address: "Протвино, ул. Ленина, 00",
  phone: "+7 (496) 000-00-00",
  phoneHref: "+74960000000",
  hours: "Ежедневно / 9:00–20:00",
  email: "info@example.ru"
};
/* ===== конец блока данных ===== */

const NB = "\u00A0";
const typo = s => {
  const r = x => x
    .replace(/(^|\s)(в|на|с|к|у|о|и|а|но|из|за|по|до|от|без|для|не)\s+/gi, (m, a, b) => a + b + NB)
    .replace(/(\d)\s+(?=[₽А-Яа-яA-Za-z%]|\d{3})/g, "$1" + NB);
  return r(r(s));
};
const $ = (s, c = document) => c.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.title = CLINIC.title;
document.querySelectorAll("[data-bind]").forEach(el => { el.textContent = typo(CLINIC[el.dataset.bind]); });
$("#tel").href = "tel:" + CLINIC.phoneHref;
$("#mail").href = "mailto:" + CLINIC.email;

const lines = (el, arr) => arr.forEach((t, i) => {
  if (i) el.append(document.createElement("br"));
  el.append(typo(t));
});
lines($("#clinicTitle"), CLINIC.clinicTitle);
lines($("#bookTitle"), CLINIC.bookTitle);
$(".hero__l1").textContent = typo(CLINIC.headline[0]);
$(".hero__l2").textContent = typo(CLINIC.headline[1]);

const list = $("#list"), sel = $("#f-service");
CLINIC.services.forEach((s, i) => {
  const li = document.createElement("li");
  li.className = "row rise";
  const n = document.createElement("span"); n.className = "row__n"; n.textContent = String(i + 1).padStart(2, "0");
  const box = document.createElement("div");
  const t = document.createElement("span"); t.className = "row__t"; t.textContent = typo(s.t);
  const d = document.createElement("span"); d.className = "row__d"; d.textContent = typo(s.d);
  box.append(t, d);
  const p = document.createElement("span"); p.className = "row__p"; p.textContent = typo(s.p);
  li.append(n, box, p);
  list.append(li);
  sel.add(new Option(s.t, s.t));
});

/* entrances */
const delay = (el, ms) => el && el.style.setProperty("--d", reduced ? "0ms" : ms + "ms");
const hero = $(".hero");
delay($(".logo"), 300); delay($(".nav"), 420); delay($(".top .btn"), 480);
delay($(".hero__object img"), 600);
delay($(".hero__l1"), 900); delay($(".hero__l2"), 950);
delay($(".hero__sub"), 1040); delay($(".hero__cta"), 1200);
Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))])
  .then(() => requestAnimationFrame(() => hero.classList.add("is-in")));

const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.querySelectorAll(".rise").forEach((el, i) => delay(el, i * (el.classList.contains("row") ? 50 : 100)));
  e.target.classList.add("is-in");
  io.unobserve(e.target);
}), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(s => io.observe(s));

/* signature interaction: the object follows the pointer */
const obj = $("[data-parallax]");
if (obj && !reduced && matchMedia("(hover:hover)").matches) {
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5) * -24; ty = (e.clientY / innerHeight - .5) * -16; });
  (function loop() {
    cx += (tx - cx) * .06; cy += (ty - cy) * .06;
    obj.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    requestAnimationFrame(loop);
  })();
}

/* запись: расписание приходит из /api/book, функция всегда главнее страницы */
const form = $("#form"), st = $("#status"), dEl = $("#dates"), tEl = $("#times");
let DAYS = [];
const dayLabel = d => new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
const chip = (name, value, text, off) => {
  const l = document.createElement("label"); l.className = "chip";
  const i = document.createElement("input"); i.type = "radio"; i.name = name; i.value = value; i.disabled = !!off; i.required = true;
  const s = document.createElement("span"); s.textContent = text;
  l.append(i, s); return l;
};
const renderTimes = date => {
  tEl.replaceChildren();
  const day = DAYS.find(d => d.date === date);
  if (day) day.times.forEach(t => tEl.append(chip("time", t, t, day.busy.includes(t))));
};
const loadSlots = async () => {
  try {
    const r = await fetch("/api/book");
    if (!r.ok) throw new Error();
    DAYS = (await r.json()).days;
    dEl.replaceChildren(); tEl.replaceChildren();
    DAYS.forEach(d => dEl.append(chip("date", d.date, typo(dayLabel(d.date)), d.closed || d.busy.length >= d.times.length)));
    document.querySelectorAll(".pick").forEach(p => { p.hidden = false; });
  } catch {
    /* нет бэкенда (например, просто открыт index.html): обычная форма без выбора времени */
    document.querySelectorAll(".pick").forEach(p => { p.hidden = true; });
  }
};
dEl.addEventListener("change", e => renderTimes(e.target.value));
loadSlots();

form.addEventListener("submit", async e => {
  e.preventDefault();
  const fd = new FormData(form), data = Object.fromEntries(fd);
  st.textContent = "";
  try {
    if (data.date && data.time) {
      const r = await fetch("/api/book", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      if (r.status === 409) { st.textContent = "Это время только что заняли. Выберите другое."; await loadSlots(); return; }
      if (!r.ok) throw new Error();
    }
    /* письмо клинике: Netlify Forms (получатель задаётся в панели Netlify) */
    try { await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fd).toString() }); } catch {}
    form.reset();
    st.textContent = data.date ? `Записали вас на ${dayLabel(data.date)}, ${data.time}. Мы позвоним для подтверждения.` : "Заявка отправлена. Мы вам перезвоним.";
    loadSlots();
  } catch {
    st.textContent = "Не удалось отправить. Позвоните нам: " + CLINIC.phone;
  }
});
