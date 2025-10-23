/* script.js — client-side budget pokedex */
"use strict";

const DATA_PATH = 'data/pokemon.json';

let allPokemon = [];
let filtered = [];
let currentPage = 1;

const el = {
  search: null, typeFilter: null, sortSelect: null, cards: null,
  perPage: null, pagination: null, count: null, resetBtn: null,
  modal: null, modalBody: null, modalClose: null
};

document.addEventListener('DOMContentLoaded', async () => {
  el.search = document.getElementById('search');
  el.typeFilter = document.getElementById('typeFilter');
  el.sortSelect = document.getElementById('sortSelect');
  el.cards = document.getElementById('cards');
  el.perPage = document.getElementById('perPage');
  el.pagination = document.getElementById('pagination');
  el.count = document.getElementById('count');
  el.resetBtn = document.getElementById('resetBtn');
  el.modal = document.getElementById('modal');
  el.modalBody = document.getElementById('modalBody');
  el.modalClose = document.getElementById('modalClose');

  // event listeners
  el.search.addEventListener('input', applyFilters);
  el.typeFilter.addEventListener('change', applyFilters);
  el.sortSelect.addEventListener('change', applyFilters);
  el.perPage.addEventListener('change', () => { currentPage = 1; render(); });
  el.resetBtn.addEventListener('click', resetFilters);
  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

  try {
    const resp = await fetch(DATA_PATH);
    if (!resp.ok) throw new Error('Failed to load data');
    allPokemon = await resp.json();
    // normalize id as number
    allPokemon.forEach(p => p.id = Number(p.id));
    populateTypeFilter(allPokemon);
    applyFilters();
  } catch (err) {
    el.cards.innerHTML = `<div class="error">Error loading data: ${err.message}</div>`;
    console.error(err);
  }
});

function populateTypeFilter(list) {
  const types = new Set();
  list.forEach(p => (p.types||[]).forEach(t => types.add(t)));
  const arr = [...types].sort();
  arr.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = capitalize(t);
    el.typeFilter.appendChild(opt);
  });
}

function applyFilters() {
  const q = el.search.value.trim().toLowerCase();
  const selType = el.typeFilter.value;
  const sortVal = el.sortSelect.value;

  filtered = allPokemon.filter(p => {
    if (q) {
      const qnum = Number(q);
      const matchId = !Number.isNaN(qnum) && p.id === qnum;
      const matchName = p.name.toLowerCase().includes(q);
      if (!(matchId || matchName)) return false;
    }
    if (selType) {
      return (p.types || []).includes(selType);
    }
    return true;
  });

  // sort
  const [field, dir] = sortVal.split('-');
  filtered.sort((a,b)=>{
    if (field === 'id') return dir === 'asc' ? a.id - b.id : b.id - a.id;
    const an = a.name.toLowerCase(), bn = b.name.toLowerCase();
    if (an === bn) return 0;
    return dir === 'asc' ? (an > bn ? 1 : -1) : (an < bn ? 1 : -1);
  });

  currentPage = 1;
  render();
}

function render() {
  const perPage = Number(el.perPage.value || 12);
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > pages) currentPage = pages;

  const start = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  el.cards.innerHTML = '';
  if (pageItems.length === 0) {
    el.cards.innerHTML = `<div class="empty">No Pokémon found.</div>`;
  } else {
    pageItems.forEach(p => el.cards.appendChild(cardFor(p)));
  }

  renderPagination(pages);
  el.count.textContent = `${total} result${total !== 1 ? 's' : ''}`;
}

function cardFor(p) {
  const div = document.createElement('article');
  div.className = 'card';
  div.tabIndex = 0;
  div.setAttribute('role','button');
  div.addEventListener('click', ()=> openModal(p));
  div.addEventListener('keypress', (e)=> { if (e.key === 'Enter') openModal(p); });

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = `${p.name} sprite`;
  img.src = p.sprite_url || fallbackSpriteFor(p.id);
  thumb.appendChild(img);

  const info = document.createElement('div');
  info.className = 'info';
  const h3 = document.createElement('h3');
  h3.textContent = `#${p.id} ${capitalize(p.name)}`;
  const pdesc = document.createElement('p');
  pdesc.textContent = p.gen || p.species || '';

  const badges = document.createElement('div');
  badges.className = 'type-badges';
  (p.types||[]).forEach(t=>{
    const sp = document.createElement('span');
    sp.className = 'type';
    sp.textContent = capitalize(t);
    badges.appendChild(sp);
  });

  info.appendChild(h3);
  info.appendChild(pdesc);
  info.appendChild(badges);

  div.appendChild(thumb);
  div.appendChild(info);
  return div;
}

function renderPagination(pages) {
  el.pagination.innerHTML = '';
  const createBtn = (label, page, ariaCurrent=false) => {
    const b = document.createElement('button');
    b.className = 'page-btn';
    b.textContent = label;
    if (ariaCurrent) b.setAttribute('aria-current','true');
    b.addEventListener('click', ()=> { currentPage = page; render(); });
    return b;
  };

  if (pages <= 1) return;

  // previous
  const prev = document.createElement('button');
  prev.className = 'page-btn';
  prev.textContent = 'Prev';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', ()=> { if (currentPage>1) { currentPage--; render(); }});
  el.pagination.appendChild(prev);

  // page numbers (show condensed window)
  const windowSize = 7;
  let start = Math.max(1, currentPage - Math.floor(windowSize/2));
  let end = Math.min(pages, start + windowSize -1);
  if (end - start < windowSize-1) start = Math.max(1, end - windowSize + 1);

  if (start > 1) {
    el.pagination.appendChild(createBtn('1',1, currentPage===1));
    if (start > 2) {
      const dot = document.createElement('span'); dot.textContent = '…'; dot.style.padding = '6px';
      el.pagination.appendChild(dot);
    }
  }

  for (let i=start;i<=end;i++){
    el.pagination.appendChild(createBtn(String(i), i, i===currentPage));
  }

  if (end < pages) {
    if (end < pages -1) {
      const dot = document.createElement('span'); dot.textContent = '…'; dot.style.padding = '6px';
      el.pagination.appendChild(dot);
    }
    el.pagination.appendChild(createBtn(String(pages), pages, currentPage===pages));
  }

  // next
  const next = document.createElement('button');
  next.className = 'page-btn';
  next.textContent = 'Next';
  next.disabled = currentPage === pages;
  next.addEventListener('click', ()=> { if (currentPage<pages) { currentPage++; render(); }});
  el.pagination.appendChild(next);
}

function openModal(p) {
  el.modal.setAttribute('aria-hidden','false');
  el.modalBody.innerHTML = `
    <div class="modal-body">
      <img src="${p.sprite_url || fallbackSpriteFor(p.id)}" alt="${p.name} official art"/>
      <div>
        <h2 id="modalTitle">#${p.id} ${capitalize(p.name)}</h2>
        <p class="muted">${p.gen || p.species || ''}</p>
        <div class="type-badges">
          ${(p.types || []).map(t => `<span class="type">${capitalize(t)}</span>`).join('')}
        </div>
        <p style="margin-top:10px">${p.description || ''}</p>
        <dl class="specs" style="margin-top:10px">
          <dt>Height</dt><dd>${p.height || '-'} m</dd>
          <dt>Weight</dt><dd>${p.weight || '-'} kg</dd>
          <dt>Abilities</dt><dd>${(p.abilities || []).map(capitalize).join(', ') || '-'}</dd>
          <dt>Base experience</dt><dd>${p.base_experience ?? '-'}</dd>
        </dl>
      </div>
    </div>
  `;
  // focus for accessibility
  el.modal.querySelector('.close').focus();
}

function closeModal(){
  el.modal.setAttribute('aria-hidden','true');
  el.modalBody.innerHTML = '';
}

function resetFilters(){
  el.search.value = '';
  el.typeFilter.value = '';
  el.sortSelect.value = 'id-asc';
  el.perPage.value = '12';
  currentPage = 1;
  applyFilters();
}

function capitalize(s){ if(!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }

function fallbackSpriteFor(id){
  // official-artwork path used by many public sprite mirrors
  // It's OK if image 404s for custom ids in your dataset
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}
