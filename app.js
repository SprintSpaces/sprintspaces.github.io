'use strict';

const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  if (!menu || !navigation) return;
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Otwórz menu');
  delete navigation.dataset.open;
}
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? 'Zamknij menu' : 'Otwórz menu');
  navigation.dataset.open = String(expanded);
});
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

const views = {
  board: ['WSPÓLNY RYTM ZESPOŁU', 'Wiesz, co jest do zrobienia. I co już zrobione.', 'Zadania, osoby, priorytety i terminy na jednej tablicy. Filtruj widok i przesuwaj karty zgodnie z procesem swojej przestrzeni.', 'Tablica Kanban z zadaniami, statusami, osobami i terminami.'],
  projects: ['OD PROJEKTU DO KONKRETNEGO ZADANIA', 'Duży projekt. Czytelne etapy. Jasny podział pracy.', 'Zobacz etapy, postęp i odpowiedzialność. Zadania zaimportowane z Excela mogą zachować odnośnik do arkusza i komórki źródłowej.', 'Projekt z etapami, zadaniami, statusami, osobami i odnośnikami do źródła Excel.'],
  ticket: ['KONTEKST ZOSTAJE PRZY SPRAWIE', 'Jedno zadanie. Wszystkie ustalenia.', 'Opis, dyskusja, pliki, akceptacje i historia w jednym miejscu. Wróć do decyzji bez przekopywania skrzynki pocztowej.', 'Karta zadania SprintSpaces z opisem, komentarzami, szczegółami i panelem czasu pracy.'],
  timeline: ['TERMINY W PEŁNYM OBRAZIE', 'Zobacz, co przed Wami. I co wymaga uwagi.', 'Oś czasu łączy zapisane terminy i planowane początki. Filtruj po osobie lub typie zadania i sprawdzaj plan projektu.', 'Oś czasu projektu z terminami etapów i zadań.'],
  time: ['CZAS PRZYPISANY DO PRACY', 'Od wpisu w kalendarzu do rozliczonego tygodnia.', 'Rejestruj pracę przy konkretnym zadaniu. Edytuj wpisy w kalendarzu, korzystaj z timera i eksportuj dane do CSV.', 'Kalendarz ewidencji czasu pracy z wpisami przypisanymi do zadań.'],
  reports: ['ZAMIAST KOLEJNEGO PYTANIA O STATUS', 'Sprawdź postęp. Zauważ zaległości. Działaj.', 'Podgląd statusów, obciążenia i czasu pracy. Twórz też własne raporty z harmonogramem oraz opcjonalnym podsumowaniem AI.', 'Raport projektu ze statusami, obciążeniem osób, zaległościami i czasem pracy.']
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
  image.src = `assets/screenshots/${view}.webp`;
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
  button.textContent = 'Wysyłanie wiadomości…';
  feedback.hidden = false;
  feedback.dataset.state = 'pending';
  feedback.textContent = 'Wysyłanie wiadomości…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: {'Accept': 'application/json'}, signal: controller.signal });
    if (!response.ok) throw new Error('Nie udało się wysłać wiadomości');
    feedback.dataset.state = 'success';
    feedback.textContent = 'Dziękuję za wiadomość! Odezwę się, aby omówić pilotaż i potwierdzić termin rozmowy.';
    form.reset();
  } catch {
    feedback.dataset.state = 'error';
    feedback.textContent = 'Nie udało się potwierdzić wysłania. Twoja treść została w formularzu. Spróbuj ponownie lub napisz na do@mleczki.pl.';
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.textContent = originalText;
    feedback.focus();
  }
});
