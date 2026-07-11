/* ============================================================
   WYN POKER — пасхалка: техасский холдем против хозяйки стола.
   Выигрыш = скидка (5% / 10% / 15% в зависимости от силы руки).
   Игра без ставок и денег — только на скидку.
   ============================================================ */

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const HAND_NAMES = [
  "Старшая карта", "Пара", "Две пары", "Сет", "Стрит",
  "Флеш", "Фулл-хаус", "Каре", "Стрит-флеш"
];

const SPEECH = {
  intro: "Бубновая королева приветствует вас за своим столом. Сыграем в холдем? Выиграете — скидка до 15%. Без ставок: вы рискуете только самолюбием.",
  deal: "Раздаю. Посмотрим, что приготовила колода…",
  flop: "Флоп на столе. Интересно…",
  turn: "Тёрн. Держите лицо, я всё вижу.",
  river: "Ривер. Момент истины.",
  win5: "Сегодня удача на вашей стороне. Ваши 5% — заслуженно.",
  win10: "Неплохо сыграно! 10% ваши.",
  win15: "Вот это рука! Снимаю шляпу — 15%, максимум стола.",
  lose: "Дом сегодня в форме. Но у нас проигравших не бывает — следующая партия за вами. Сыграем ещё?",
  tie: "Ничья! Такое бывает раз в сто раздач. Переиграем.",
  fold: "Сбросили? Осторожность — тоже стратегия. Возвращайтесь, когда почувствуете масть."
};

let deck, playerHand, dealerHand, board, stage;

const $ = id => document.getElementById(id);
const WINK_SRC = "img/dealer-wink.jpg";
new Image().src = WINK_SRC; // прогреваем кэш, чтобы подмигивание не мигало загрузкой

function dealerWink() {
  const img = document.querySelector("#dealerAvatar img");
  if (!img) return;
  const base = img.src;
  img.src = WINK_SRC;
  setTimeout(() => { img.src = base; }, 1400);
}
const pokerEl = $("poker");
const speechEl = $("dealerSpeech");
const actionBtn = $("pokerAction");
const foldBtn = $("pokerFold");
const resultEl = $("pokerResult");

function openPoker() {
  pokerEl.classList.add("open");
  pokerEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  resetGame();
}
function closePoker() {
  pokerEl.classList.remove("open");
  pokerEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
$("pokerClose").addEventListener("click", closePoker);
$("pokerBackdrop").addEventListener("click", closePoker);
document.addEventListener("keydown", e => { if (e.key === "Escape") closePoker(); });

function say(text) {
  speechEl.textContent = "";
  let i = 0;
  clearInterval(say._t);
  say._t = setInterval(() => {
    speechEl.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(say._t);
  }, 18);
}

// ---------- колода ----------
function newDeck() {
  const d = [];
  for (let s = 0; s < 4; s++)
    for (let r = 2; r <= 14; r++) d.push({ r, s });
  // Fisher–Yates
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function cardHTML(card, hidden) {
  if (hidden) return `<div class="pcard pcard--back"></div>`;
  const suit = SUITS[card.s];
  const red = card.s === 1 || card.s === 2;
  const rank = RANKS[card.r - 2];
  return `<div class="pcard ${red ? "pcard--red" : "pcard--black"}">
    <span>${rank}${suit}</span><span class="pcard__bottom">${rank}${suit}</span>
  </div>`;
}

function render(revealDealer) {
  $("playerCards").innerHTML = playerHand.map(c => cardHTML(c)).join("");
  $("dealerCards").innerHTML = dealerHand.map(c => cardHTML(c, !revealDealer)).join("");
  $("boardCards").innerHTML = board.map(c => cardHTML(c)).join("");
  updateCombos(revealDealer);
}

// ---------- оценка руки: лучшие 5 из 7 ----------
function score5(cards) {
  const rs = cards.map(c => c.r).sort((a, b) => b - a);
  const flush = cards.every(c => c.s === cards[0].s);
  // стрит (с учётом «колеса» A-5)
  let straightHigh = 0;
  const uniq = [...new Set(rs)];
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[1] - uniq[4] === 3) straightHigh = 5;
  }
  const counts = {};
  rs.forEach(r => counts[r] = (counts[r] || 0) + 1);
  // сортируем ранги: сначала по количеству, потом по величине
  const groups = Object.entries(counts)
    .map(([r, n]) => ({ r: +r, n }))
    .sort((a, b) => b.n - a.n || b.r - a.r);
  const kick = groups.flatMap(g => Array(g.n).fill(g.r));

  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0].n === 4) return [7, ...kick];
  if (groups[0].n === 3 && groups[1].n === 2) return [6, ...kick];
  if (flush) return [5, ...rs];
  if (straightHigh) return [4, straightHigh];
  if (groups[0].n === 3) return [3, ...kick];
  if (groups[0].n === 2 && groups[1].n === 2) return [2, ...kick];
  if (groups[0].n === 2) return [1, ...kick];
  return [0, ...rs];
}

// лучшая комбинация из любого числа карт (2–7)
function bestAny(cards) {
  if (cards.length === 2) {
    const [a, b] = cards;
    if (a.r === b.r) return [1, a.r, a.r];
    return [0, Math.max(a.r, b.r), Math.min(a.r, b.r)];
  }
  if (cards.length === 5) return score5(cards);
  const n = cards.length;
  let best = null;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++) {
            const s = score5([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || cmp(s, best) > 0) best = s;
          }
  return best;
}
const best7 = bestAny;

// человекочитаемое описание комбинации
function describe(s) {
  const r = x => RANKS[x - 2];
  switch (s[0]) {
    case 8: return s[1] === 14 ? "Роял-флеш!" : "Стрит-флеш до " + r(s[1]);
    case 7: return "Каре · " + r(s[1]);
    case 6: return "Фулл-хаус · " + r(s[1]);
    case 5: return "Флеш";
    case 4: return "Стрит до " + r(s[1]);
    case 3: return "Сет · " + r(s[1]);
    case 2: return "Две пары · " + r(s[1]) + " и " + r(s[3]);
    case 1: return "Пара · " + r(s[1]);
    default: return "Старшая карта · " + r(s[1]);
  }
}

function updateCombos(revealDealer) {
  $("playerCombo").textContent = playerHand.length
    ? "У вас: " + describe(bestAny([...playerHand, ...board])) : "";
  $("dealerCombo").textContent = revealDealer && dealerHand.length
    ? "У дилера: " + describe(bestAny([...dealerHand, ...board])) : "";
}
function cmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}

// ---------- ход игры ----------
function resetGame() {
  stage = 0;
  deck = newDeck();
  playerHand = []; dealerHand = []; board = [];
  render(false);
  resultEl.hidden = true;
  resultEl.innerHTML = "";
  actionBtn.hidden = false;
  actionBtn.textContent = "Раздать карты";
  foldBtn.hidden = true;
  say(SPEECH.intro);
}

actionBtn.addEventListener("click", () => {
  switch (stage) {
    case 0: // раздача
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      render(false);
      say(SPEECH.deal);
      actionBtn.textContent = "Флоп";
      foldBtn.hidden = false;
      stage = 1;
      break;
    case 1: // флоп
      board = [deck.pop(), deck.pop(), deck.pop()];
      render(false);
      say(SPEECH.flop);
      actionBtn.textContent = "Тёрн";
      stage = 2;
      break;
    case 2: // тёрн
      board.push(deck.pop());
      render(false);
      say(SPEECH.turn);
      actionBtn.textContent = "Ривер";
      stage = 3;
      break;
    case 3: // ривер
      board.push(deck.pop());
      render(false);
      say(SPEECH.river);
      actionBtn.textContent = "Вскрываемся!";
      stage = 4;
      break;
    case 4: // шоудаун
      showdown();
      break;
    case 5: // новая партия
      resetGame();
      break;
  }
});

foldBtn.addEventListener("click", () => {
  say(SPEECH.fold);
  foldBtn.hidden = true;
  actionBtn.textContent = "Сыграть ещё раз";
  stage = 5;
  render(true);
});

function showdown() {
  render(true);
  foldBtn.hidden = true;
  const ps = best7([...playerHand, ...board]);
  const ds = best7([...dealerHand, ...board]);
  const diff = cmp(ps, ds);
  const handName = describe(ps);

  if (diff > 0) {
    // скидка по силе руки: до пары — 5%, две пары/сет — 10%, стрит и выше — 15%
    const pct = ps[0] >= 4 ? 15 : ps[0] >= 2 ? 10 : 5;
    say(SPEECH["win" + pct]);
    const code = "WYN-" + ["S", "H", "D", "C"][Math.floor(Math.random() * 4)] +
      "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    resultEl.innerHTML = `
      <h3>Вы выиграли! Скидка ${pct}%</h3>
      <p>Ваша рука: <strong>${handName}</strong></p>
      <div class="promo">${code}</div>
      <p>Покажите этот экран официанту. Скидка действует на текущий счёт, один раз за визит.</p>`;
    document.querySelectorAll("#playerCards .pcard").forEach(c => c.classList.add("pcard--win"));
  } else if (diff < 0) {
    say(SPEECH.lose);
    dealerWink();
    resultEl.innerHTML = `
      <h3>Дилер берёт банк</h3>
      <p>Рука дилера: <strong>${describe(ds)}</strong> против вашей: <strong>${handName}</strong></p>
      <p>Реванш? Колода уже перетасована.</p>`;
  } else {
    say(SPEECH.tie);
    resultEl.innerHTML = `
      <h3>Ничья</h3>
      <p>Обе руки: <strong>${handName}</strong>. Так не расходятся — играем ещё.</p>`;
  }
  resultEl.hidden = false;
  actionBtn.textContent = "Сыграть ещё раз";
  stage = 5;
}
