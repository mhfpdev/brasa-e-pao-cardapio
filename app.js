(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const validImage = (value) => /^(https:\/\/|\.\/|assets\/|\/assets\/)/.test(String(value || '')) ? value : '';
  const plusIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>';
  const dayNames = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
  const dayLabels = {segunda:'Segunda-feira',terca:'Terça-feira',quarta:'Quarta-feira',quinta:'Quinta-feira',sexta:'Sexta-feira',sabado:'Sábado',domingo:'Domingo'};
  const state = { data: null, products: [], hours: {}, filter: 'Todos', search: '', cart: {}, method: 'retirada' };
  try { state.cart = JSON.parse(localStorage.getItem('brasa-cart') || '{}') || {}; } catch { state.cart = {}; }
  let toastTimeout;

  function notify(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('show'), 3300);
  }

  function brandText() {
    const name = String(state.data.nome || 'Brasa & Pão');
    return escapeHtml(name).replace(/&amp;/g,'<em>&amp;</em>') + '<span class="brand-period">.</span>';
  }

  function setIdentity() {
    const data = state.data;
    document.title = `${data.nome || 'Brasa & Pão'} — Cardápio`;
    $('.brand-name').innerHTML = brandText();
    $('.footer-brand').innerHTML = brandText();
    $('.brand').setAttribute('aria-label', `${data.nome}, voltar ao início`);
    $('#top-message').textContent = data.fraseTopo || 'Sabor de verdade, feito na hora';
    $('#hero-subtitle').textContent = data.descricaoDestaque || '';
    $('#year').textContent = String(new Date().getFullYear());
    if (!data.entregaAtiva && !data.retiradaAtiva) data.retiradaAtiva = true;
    const buttons = [...document.querySelectorAll('.delivery-types button')];
    buttons.find(b => b.dataset.method === 'entrega').hidden = !data.entregaAtiva;
    buttons.find(b => b.dataset.method === 'retirada').hidden = !data.retiradaAtiva;
    state.method = data.retiradaAtiva ? 'retirada' : 'entrega';
    updateMethod();
    $('#checkout-btn').innerHTML = String(data.whatsapp || '').replace(/\D/g,'').length >= 11
      ? 'Enviar pedido pelo WhatsApp <span>→</span>' : 'Copiar resumo do pedido <span>→</span>';
  }

  function buildFilters() {
    const categories = ['Todos',...new Set(state.products.filter(p => p.disponivel).map(p => p.categoria))];
    $('#filters').innerHTML = categories.map(cat => `<button type="button" class="filter-btn ${cat === state.filter ? 'active':''}" data-filter="${escapeHtml(cat)}" aria-pressed="${cat === state.filter}">${escapeHtml(cat)}</button>`).join('');
  }

  function renderProducts() {
    const query = state.search.toLocaleLowerCase('pt-BR');
    const products = state.products.filter(p => p.disponivel && (state.filter === 'Todos' || p.categoria === state.filter) && `${p.nome} ${p.descricao}`.toLocaleLowerCase('pt-BR').includes(query));
    $('#result-label').textContent = `${products.length} ${products.length === 1 ? 'opção encontrada' : 'opções encontradas'}`;
    if (!products.length) { $('#menu-grid').innerHTML = '<div class="empty-results">Nenhum produto encontrado. Tente outra busca. <span>♡</span></div>'; return; }
    $('#menu-grid').innerHTML = products.map(p => {
      const image = validImage(p.imagem);
      return `<article class="product-card"><div class="product-photo"><span class="photo-fallback" aria-hidden="true">${escapeHtml(p.emoji || '🍔')}</span>${image ? `<img loading="lazy" src="${escapeHtml(image)}" alt="${escapeHtml(p.nome)}" onerror="this.style.opacity='0'">` : ''}${p.etiqueta ? `<span class="product-tag ${p.etiqueta === 'VEGGIE' ? 'veggie' : ''}">${escapeHtml(p.etiqueta)}</span>` : ''}</div><div class="product-info"><h3 class="product-title">${escapeHtml(p.nome)}</h3><p class="product-description">${escapeHtml(p.descricao)}</p><div class="product-bottom"><strong class="product-price">${money(p.preco)}</strong><button class="add-btn" type="button" data-add="${escapeHtml(p.id)}" aria-label="Adicionar ${escapeHtml(p.nome)} à sacola">${plusIcon} Adicionar</button></div></div></article>`;
    }).join('');
  }

  function saveCart() {
    try { localStorage.setItem('brasa-cart', JSON.stringify(state.cart)); } catch {}
  }

  function cartLines() {
    return Object.entries(state.cart).map(([id, qty]) => ({ product: state.products.find(p => p.id === id && p.disponivel), qty: Number(qty) })).filter(line => line.product && line.qty > 0);
  }

  function updateCart() {
    const lines = cartLines();
    const count = lines.reduce((a,l) => a + l.qty, 0);
    const subtotal = lines.reduce((a,l) => a + Number(l.product.preco) * l.qty, 0);
    const delivery = state.method === 'entrega' && count > 0 ? Math.max(0,Number(state.data.taxaEntrega || 0)) : 0;
    $('#header-cart-count').textContent = count;
    $('#mobile-count').textContent = count;
    $('#drawer-count').textContent = `(${count})`;
    $('#mobile-cart-total').textContent = money(subtotal + delivery);
    $('#cart-subtotal').textContent = money(subtotal);
    $('#cart-total').textContent = money(subtotal + delivery);
    $('#cart-delivery').textContent = money(delivery);
    $('#delivery-row').hidden = state.method !== 'entrega' || count === 0;
    $('#cart-checkout').hidden = count === 0;
    if (!lines.length) { $('#cart-items').innerHTML = '<div class="empty-cart"><span class="cart-emoji">🛍</span><strong>Sua sacola está vazia</strong><span>Escolha algo gostoso no cardápio.</span></div>'; return; }
    $('#cart-items').innerHTML = lines.map(({product:p,qty}) => `<div class="cart-item"><img class="cart-thumb" src="${escapeHtml(validImage(p.imagem) || '')}" alt="" onerror="this.style.opacity='0'"><div class="cart-info"><h3>${escapeHtml(p.nome)}</h3><div class="line-price">${money(p.preco)} cada</div><div class="item-controls"><button type="button" data-decrease="${escapeHtml(p.id)}" aria-label="Remover uma unidade de ${escapeHtml(p.nome)}">−</button><b>${qty}</b><button type="button" data-increase="${escapeHtml(p.id)}" aria-label="Adicionar uma unidade de ${escapeHtml(p.nome)}">+</button></div></div><strong class="item-total">${money(p.preco * qty)}</strong></div>`).join('');
  }

  function addToCart(id, amount=1) {
    const p = state.products.find(p => p.id === id && p.disponivel);
    if (!p) return;
    const next = Math.max(0,Math.min(99,(Number(state.cart[id]) || 0)+amount));
    if (!next) delete state.cart[id]; else state.cart[id] = next;
    saveCart(); updateCart();
    if (amount > 0) notify(`${p.nome} adicionado à sacola`);
  }

  function showCart() {
    $('#cart-drawer').classList.add('open');
    $('#cart-drawer').setAttribute('aria-hidden','false');
    $('#drawer-backdrop').hidden = false;
    requestAnimationFrame(() => $('#drawer-backdrop').classList.add('visible'));
    document.body.style.overflow = 'hidden';
    $('#close-cart').focus();
  }
  function hideCart() {
    $('#cart-drawer').classList.remove('open');
    $('#cart-drawer').setAttribute('aria-hidden','true');
    $('#drawer-backdrop').classList.remove('visible');
    document.body.style.overflow = '';
    setTimeout(() => { if (!$('#cart-drawer').classList.contains('open')) $('#drawer-backdrop').hidden = true; },220);
  }

  function updateMethod() {
    document.querySelectorAll('.delivery-types button').forEach(btn => {
      const selected = btn.dataset.method === state.method;
      btn.classList.toggle('selected',selected);
      btn.setAttribute('aria-pressed',String(selected));
    });
    $('#address-wrap').hidden = state.method !== 'entrega';
    if (state.data) updateCart();
  }

  async function checkout() {
    const lines = cartLines();
    if (!lines.length) return notify('Adicione algum produto à sacola.');
    const name = $('#customer-name').value.trim();
    const address = $('#customer-address').value.trim();
    const note = $('#order-note').value.trim();
    if (state.method === 'entrega' && !address) { $('#customer-address').focus(); return notify('Informe o endereço para entrega.'); }
    const subtotal = lines.reduce((a,l) => a + l.product.preco * l.qty,0);
    const delivery = state.method === 'entrega' ? Number(state.data.taxaEntrega || 0) : 0;
    let message = `🍔 *PEDIDO — ${state.data.nome}*\n\n`;
    message += lines.map(l => `${l.qty}× ${l.product.nome} — ${money(l.qty*l.product.preco)}`).join('\n');
    message += `\n\nSubtotal: ${money(subtotal)}`;
    if (state.method === 'entrega') message += `\nTaxa de entrega: ${money(delivery)}`;
    message += `\n*TOTAL: ${money(subtotal+delivery)}*\n\nTipo: ${state.method === 'entrega' ? 'Entrega' : 'Retirada no local'}`;
    if (name) message += `\nNome: ${name}`;
    if (address) message += `\nEndereço: ${address}`;
    if (note) message += `\nObservações: ${note}`;
    const phone = String(state.data.whatsapp || '').replace(/\D/g,'');
    if (phone.length >= 11) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');
      notify('WhatsApp aberto com o pedido pronto para enviar.');
      return;
    }
    try { await navigator.clipboard.writeText(message); notify('Resumo do pedido copiado!'); }
    catch {
      const field = document.createElement('textarea');
      field.value = message; field.style.position='fixed'; field.style.opacity='0'; document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      notify(copied ? 'Resumo do pedido copiado!' : 'Não foi possível copiar o pedido.');
    }
  }

  function toMinutes(str) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(str)) return null;
    const [h,m] = str.split(':').map(Number); return h*60+m;
  }
  function parseIntervals(raw) {
    return String(raw || '').split(';').map(v => v.trim()).filter(Boolean).map(str => {
      const [start,end,...rest] = str.split('-').map(v=>v.trim());
      if (rest.length || !start || !end) return null;
      const startMin=toMinutes(start),endMin=toMinutes(end);
      if (startMin === null || endMin === null || startMin === endMin) return null;
      return {start,end,startMin,endMin};
    }).filter(Boolean);
  }
  function currentLocalTime(tz) {
    const format = new Intl.DateTimeFormat('en-US',{timeZone:tz || 'America/Sao_Paulo',weekday:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    const parts = Object.fromEntries(format.formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const map = {Sunday:'domingo',Monday:'segunda',Tuesday:'terca',Wednesday:'quarta',Thursday:'quinta',Friday:'sexta',Saturday:'sabado'};
    return {day:map[parts.weekday] || 'segunda', minute:Number(parts.hour)*60+Number(parts.minute)};
  }
  function isOpenNow() {
    const {day,minute} = currentLocalTime(state.data.fusoHorario);
    const i = dayNames.indexOf(day);
    const previous=dayNames[(i+6)%7];
    const today=parseIntervals(state.hours[day]);
    const yesterday=parseIntervals(state.hours[previous]);
    return today.some(r=>r.startMin<=r.endMin ? minute>=r.startMin&&minute<r.endMin : minute>=r.startMin) || yesterday.some(r=>r.endMin<r.startMin&&minute<r.endMin);
  }
  function prettyTime(v) { const [h,m] = v.split(':'); return `${Number(h)}h${m === '00' ? '' : m}`; }
  function prettySchedule(raw) {
    const ranges=parseIntervals(raw);
    if (!ranges.length) return 'Fechado';
    return ranges.map(r=>`${prettyTime(r.start)} às ${prettyTime(r.end)}${r.endMin<r.startMin?' (+1 dia)':''}`).join(' · ');
  }
  function renderHours() {
    const day=currentLocalTime(state.data.fusoHorario).day;
    $('#hours-list').innerHTML = Object.entries(dayLabels).map(([key,label])=>`<div class="hours-row ${key===day?'today':''}"><span>${label}${key===day?' · Hoje':''}</span><span>${escapeHtml(prettySchedule(state.hours[key]))}</span></div>`).join('');
    const open=isOpenNow();
    const pill=$('#open-status');
    pill.classList.toggle('open',open);
    pill.classList.toggle('closed',!open);
    pill.innerHTML=`<span class="status-dot"></span>${open ? 'Aberto agora' : 'Fechado no momento'}`;
  }

  function addListeners() {
    $('#filters').addEventListener('click',event => {
      const btn=event.target.closest('[data-filter]'); if (!btn) return;
      state.filter=btn.dataset.filter; buildFilters(); renderProducts();
    });
    $('#search').addEventListener('input',event=>{ state.search=event.target.value.trim(); renderProducts(); });
    $('#menu-grid').addEventListener('click',event=>{
      const btn=event.target.closest('[data-add]'); if (btn) addToCart(btn.dataset.add);
    });
    $('#cart-items').addEventListener('click',event=>{
      const plus=event.target.closest('[data-increase]');
      const minus=event.target.closest('[data-decrease]');
      if(plus) addToCart(plus.dataset.increase);
      if(minus) addToCart(minus.dataset.decrease,-1);
    });
    $('#header-cart').addEventListener('click',showCart);
    $('#mobile-cart').addEventListener('click',showCart);
    $('#close-cart').addEventListener('click',hideCart);
    $('#drawer-backdrop').addEventListener('click',hideCart);
    document.addEventListener('keydown',event=>{if(event.key==='Escape') hideCart();});
    document.querySelectorAll('.delivery-types button').forEach(btn => btn.addEventListener('click',()=>{state.method=btn.dataset.method; updateMethod();}));
    $('#checkout-btn').addEventListener('click',checkout);
  }

  async function loadJSON(path) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw new Error(`Não foi possível carregar ${path}: ${response.status}`);
    return response.json();
  }
  async function init() {
    addListeners();
    try {
      const [data, products, hours] = await Promise.all([
        loadJSON('./data/estabelecimento.json'),loadJSON('./data/produtos.json'),loadJSON('./data/horarios.json')
      ]);
      state.data=data;
      state.products=products.filter(p=>typeof p.id==='string' && typeof p.nome==='string' && Number.isFinite(Number(p.preco)) && Number(p.preco)>=0);
      state.hours=hours;
      setIdentity();buildFilters();renderProducts();renderHours();updateCart();
      setInterval(renderHours,60000);
    } catch (error) {
      console.error('Erro no cardápio:', error);
      $('#menu-grid').innerHTML = '<div class="empty-results">Não foi possível carregar o cardápio. Tente novamente mais tarde.</div>';
      $('#result-label').textContent = 'Cardápio indisponível';
      $('#open-status').innerHTML = '<span class="status-dot"></span>Horários indisponíveis';
      $('#year').textContent = String(new Date().getFullYear());
    }
  }
  init();
})();
