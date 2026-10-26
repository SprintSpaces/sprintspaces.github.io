import { createTranslator } from './i18n.mjs?v=20261026-i18n1';
const t = createTranslator(document.documentElement.lang);

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  if (!menu || !navigation) return;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', t('Otwórz menu'));
  delete navigation.dataset.open;
}
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? t('Zamknij menu') : t('Otwórz menu'));
  navigation.dataset.open = String(expanded);
});
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const views = {
  board: [t('TABLICA ZESPOŁU'), t('Kto pracuje nad czym i na jakim jest etapie?'), t('Na tablicy zobaczysz zadania, przypisane osoby, priorytety i terminy. Filtruj widok według potrzeb i zmieniaj status zadań, przesuwając karty.'), t('Tablica Kanban z zadaniami, statusami, osobami i terminami.')],
  projects: [t('PROJEKTY I ETAPY'), t('Od planu projektu do zadań poszczególnych osób.'), t('Podziel pracę na etapy, przypisz zadania i sprawdzaj postęp. Przy danych przeniesionych z Excela możesz zachować odnośnik do arkusza i komórki źródłowej.'), t('Projekt z etapami, zadaniami, statusami, osobami i odnośnikami do źródła Excel.')],
  ticket: [t('SZCZEGÓŁY ZADANIA'), t('Ustalenia, pliki i historia przy jednej sprawie.'), t('Przeczytaj opis i rozmowę, sprawdź załączniki oraz wcześniejsze decyzje. Z tego samego widoku zmienisz dostępne pola, dodasz komentarz i zapiszesz czas pracy.'), t('Karta zadania SprintSpaces z opisem, komentarzami, szczegółami i panelem czasu pracy.')],
  timeline: [t('PLAN I TERMINY'), t('Zobacz, kiedy zaczynają się i kończą zadania.'), t('Oś czasu pokazuje zapisane daty rozpoczęcia, wysyłki i zakończenia. Zmień skalę z tygodniowej na miesięczną lub zawęź widok do wybranej osoby, typu zadania czy sprintu.'), t('Oś czasu projektu z terminami etapów i zadań.')],
  time: [t('EWIDENCJA CZASU'), t('Sprawdź, na co poświęcasz czas w ciągu tygodnia.'), t('Dodawaj i poprawiaj wpisy w kalendarzu lub korzystaj z pomiaru czasu przy zadaniu. Gotową kartę tygodnia możesz wysłać do zatwierdzenia, a dane wyeksportować do CSV.'), t('Kalendarz ewidencji czasu pracy z wpisami przypisanymi do zadań.')],
  reports: [t('POSTĘP I OBCIĄŻENIE'), t('Sprawdź, co jest gotowe i co wymaga uwagi.'), t('Zobacz statusy zadań, zaległe terminy, obciążenie osób i zapisany czas pracy. W osobnym module raportów ustawisz też cykliczną wysyłkę e-mailem i opcjonalne podsumowanie AI.'), t('Raport projektu ze statusami, obciążeniem osób, zaległościami i czasem pracy.')]
};
const tabs = [...document.querySelectorAll('[data-view]')];
function selectView(tab) {
  const view = tab.dataset.view;
  const [kicker, title, copy, alt] = views[view];
  tabs.forEach(item => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
  });
  document.querySelector('#gallery-panel').setAttribute('aria-labelledby', tab.id);
  document.querySelector('#gallery-kicker').textContent = kicker;
  document.querySelector('#gallery-title').textContent = title;
  document.querySelector('#gallery-copy').textContent = copy;
  const image = document.querySelector('#gallery-image');
  image.src = `/assets/screenshots/${view}.webp`;
  image.alt = alt;
  const link = document.querySelector('#gallery-link');
  link.href = image.src;
  link.dataset.zoom = tab.textContent;
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectView(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectView(tabs[next]);
    tabs[next].focus();
  });
});

const dialog = document.querySelector('#image-dialog');
let zoomTrigger;
document.querySelectorAll('[data-zoom]').forEach(link => link.addEventListener('click', event => {
  if (!dialog?.showModal) return;
  event.preventDefault();
  zoomTrigger = link;
  const image = document.querySelector('#dialog-image');
  image.src = link.href;
  image.alt = link.querySelector('img')?.alt || link.dataset.zoom;
  document.querySelector('#image-dialog-title').textContent = link.dataset.zoom;
  dialog.showModal();
}));
document.querySelector('#close-dialog')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', event => { if (event.target === dialog) {
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}});
dialog?.addEventListener('close', () => zoomTrigger?.focus());

const form = document.querySelector('#contact-form');
const dateInput = document.querySelector('#date');
if (dateInput) dateInput.min = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Warsaw', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (form.elements._gotcha.value) return;
  const button = form.querySelector('[type=submit]');
  if (button.disabled) return;
  const feedback = document.querySelector('#form-feedback');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = t('Wysyłanie wiadomości…');
  feedback.hidden = false;
  feedback.dataset.state = 'pending';
  feedback.textContent = t('Wysyłanie wiadomości…');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: {'Accept': 'application/json'}, signal: controller.signal });
    if (!response.ok) throw new Error(t('Nie udało się wysłać wiadomości'));
    feedback.dataset.state = 'success';
    feedback.textContent = t('Dziękuję za wiadomość! Odezwę się, żeby omówić wdrożenie testowe i ustalić termin rozmowy.');
    form.reset();
  } catch {
    feedback.dataset.state = 'error';
    feedback.textContent = t('Nie udało się potwierdzić wysłania. Twoja treść została w formularzu. Spróbuj ponownie lub napisz na do@mleczki.pl.');
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = originalText;
    feedback.focus();
  }
});

// Keep the current section when switching language; plain links also work without JS.
document.querySelectorAll('[data-language-link]').forEach(link => {
  const update = () => { link.hash = window.location.hash; };
  update();
  window.addEventListener('hashchange', update);
});
