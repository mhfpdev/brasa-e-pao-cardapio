import {money, cents, slugify, normalizeProducts, productPrice, imagePath, parseIntervals, localClock, openAt, totals, whatsappUrl, orderMessage} from './menu-core.mjs';
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plusIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const days = {segunda:'Segunda-feira',terca:'Terça-feira',quarta:'Quarta-feira',quinta:'Quinta-feira',sexta:'Sexta-feira',sabado:'Sábado',domingo:'Domingo'};
const state = {data:null, products:[], hours:{}, filter:'Todos', search:'', cart:{}, method:'retirada'};
try {const saved=JSON.parse(localStorage.getItem('brasa-cart-v2') || '{}'); if(saved && typeof saved==='object' && !Array.isArray(saved)) state.cart=saved;} catch {}
let toastTimer, returnFocus, selectedProduct;
function notify(text) {$('#toast').textContent=text; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function setText(selector,value) {if($(selector)) $(selector).textContent=value ?? '';}
function richHeading(selector,value) {const lines=String(value || '').split('\n'); $(selector).innerHTML=lines.map((line,i)=>i===lines.length-1?`<em>${esc(line)}</em>`:esc(line)).join('<br>');}
function safeLink(value) {try {const url=new URL(value); return url.protocol==='https:'?url.href:'';} catch {return '';}}
function setIdentity() {
 const d=state.data; document.title=`${d.nome} — Cardápio`;
 const brand=esc(d.nome).replace(/&amp;/g,'<em>&amp;</em>')+'<span class="brand-period">.</span>';
 $('.brand-name').innerHTML=brand; $('.footer-brand').innerHTML=brand; $('.brand').setAttribute('aria-label',`${d.nome}, voltar ao início`);
 const logo=imagePath(d.logo); if(logo) $('.brand-mark').innerHTML=`<img src="${esc(logo)}" alt="" width="36" height="36">`;
 setText('#top-message',d.fraseTopo); setText('#hero-subtitle',d.descricaoDestaque); setText('#year',new Date().getFullYear()); setText('#copyright-name',d.nome);
 richHeading('.hero h1',d.tituloDestaque); richHeading('.banner-copy h2',d.tituloSobre); setText('.banner-copy p',d.textoSobre); setText('#footer-tagline',d.fraseRodape);
 const hero=imagePath(d.imagemDestaque); if(hero) $('.hero-external').src=hero;
 setText('.hours-foot',d.avisoHorarios); setText('#business-notice',d.aviso); $('#business-notice').hidden=!d.aviso;
 setText('#order-info',[d.tempoPreparo && `Preparo: ${d.tempoPreparo}`,d.areaEntrega && `Entrega: ${d.areaEntrega}`].filter(Boolean).join(' · '));
 const address=[d.endereco?.logradouro,d.endereco?.numero,d.endereco?.complemento,d.endereco?.bairro,d.endereco?.cidade,d.endereco?.estado,d.endereco?.cep].filter(Boolean).join(', ');
 const contact=[];
 if(address) contact.push(`<p>${esc(address)}</p>`);
 if(d.telefone) contact.push(`<a href="tel:${esc(String(d.telefone).replace(/[^+\d]/g,''))}">${esc(d.telefone)}</a>`);
 if(d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) contact.push(`<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`);
 if(safeLink(d.instagram)) contact.push(`<a href="${esc(safeLink(d.instagram))}" target="_blank" rel="noopener noreferrer">Instagram</a>`);
 if(safeLink(d.mapa)) contact.push(`<a href="${esc(safeLink(d.mapa))}" target="_blank" rel="noopener noreferrer">Como chegar</a>`);
 $('#business-contact').innerHTML=contact.join('');
 $('#area-wrap').hidden=!d.areasEntrega?.length;
 $('#delivery-area').innerHTML='<option value="">Selecione seu bairro</option>'+(d.areasEntrega || []).map(a=>`<option value="${esc(a.nome)}">${esc(a.nome)} — ${money(a.taxa)}</option>`).join('');
 $('#payment-wrap').hidden=!d.pagamentos?.length;
 $('#payment').innerHTML='<option value="">Selecione a forma de pagamento</option>'+(d.pagamentos || []).map(p=>`<option>${esc(p)}</option>`).join('');
 document.querySelector('[data-method="retirada"]').hidden=!d.retiradaAtiva;
 document.querySelector('[data-method="entrega"]').hidden=!d.entregaAtiva;
 state.method=d.retiradaAtiva?'retirada':d.entregaAtiva?'entrega':''; updateMethod();
}
function buildFilters() {
 const cats=['Todos',...new Set(state.products.filter(p=>p.disponivel).map(p=>p.categoria))];
 $('#filters').innerHTML=cats.map(cat=>`<button type="button" class="filter-btn ${cat===state.filter?'active':''}" aria-pressed="${cat===state.filter}" data-filter="${esc(cat)}">${esc(cat)}</button>`).join('');
}
function renderProducts() {
 const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const products=state.products.filter(p=>p.disponivel && (state.filter==='Todos'||p.categoria===state.filter) && normalize(`${p.nome} ${p.descricao || ''}`).includes(normalize(state.search)));
 setText('#result-label',`${products.length} ${products.length===1?'opção encontrada':'opções encontradas'}`);
 if(!products.length) {$('#menu-grid').innerHTML='<div class="empty-results">Nenhum produto encontrado. Tente outra busca.</div>'; return;}
 $('#menu-grid').innerHTML=products.map(p=>{
  const image=imagePath(p.imagem), price=productPrice(p), hasOptions=p.variacoes.length||p.adicionais.length;
  const tag=p.etiqueta || (p.destaque?'DESTAQUE':'');
  return `<article class="product-card" id="${esc(p.id)}"><div class="product-photo"><span class="photo-fallback" aria-hidden="true">${esc(p.emoji || '🍔')}</span>${image?`<img src="${esc(image)}" alt="${esc(p.nome)}" loading="lazy" width="600" height="400">`:''}${tag?`<span class="product-tag">${esc(tag)}</span>`:''}</div><div class="product-info"><h3 class="product-title">${esc(p.nome)}</h3><p class="product-description">${esc(p.descricao)}</p><div class="product-bottom"><div>${price<cents(p.preco)?`<del class="old-price">${money(p.preco)}</del>`:''}<strong class="product-price">${p.variacoes.length?'A partir de ':''}${money((p.variacoes.length?Math.min(...p.variacoes.map(v=>cents(v.preco))):price)/100)}</strong></div><button type="button" class="add-btn" data-add="${esc(p.id)}" aria-label="${hasOptions?'Escolher opções de':'Adicionar'} ${esc(p.nome)}${hasOptions?'':' à sacola'}">${plusIcon} ${hasOptions?'Escolher':'Adicionar'}</button></div></div></article>`;
 }).join('');
}
function cartLines() {
 return Object.entries(state.cart).flatMap(([key,entry])=>{
  if(!entry || typeof entry!=='object') return [];
  const product=state.products.find(p=>p.id===entry.id && p.disponivel), qty=Number(entry.qty);
  if(!product || !Number.isInteger(qty) || qty<1 || qty>99) return [];
  const variant=product.variacoes.find(v=>v.nome===entry.variation);
  if(product.variacoes.length && !variant) return [];
  const extras=(Array.isArray(entry.extras)?entry.extras:[]).map(name=>product.adicionais.find(a=>a.nome===name));
  if(extras.some(e=>!e)) return [];
  return [{key,product,qty,unit:(variant?cents(variant.preco):productPrice(product))+extras.reduce((s,a)=>s+cents(a.preco),0),details:[variant?.nome,...extras.map(a=>a.nome)].filter(Boolean).join(', ')}];
 });
}
function saveCart() {try{localStorage.setItem('brasa-cart-v2',JSON.stringify(state.cart));}catch{}}
function total() {return totals(cartLines(),state.data,state.method,$('#delivery-area').value);}
function orderBlock() {
 const d=state.data;
 if(!d) return 'Carregando o cardápio…';
 if(!d.pedidosAtivos) return d.mensagemPausa || 'Pedidos temporariamente pausados.';
 if(!state.method) return 'Pedidos indisponíveis no momento.';
 if(!whatsappUrl(d.whatsapp,'teste')) return 'Pedidos pelo WhatsApp indisponíveis no momento.';
 if(!d.aceitarForaHorario && !openAt(state.hours,new Date(),d.fusoHorario)) return 'Estamos fechados. Consulte os horários de atendimento.';
 return '';
}
function updateCart() {
 const lines=cartLines(), count=lines.reduce((s,l)=>s+l.qty,0), t=total();
 for(const selector of ['#header-cart-count','#mobile-count']) setText(selector,count);
 setText('#drawer-count',`(${count})`); setText('#mobile-cart-total',money(t.total/100)); setText('#cart-subtotal',money(t.subtotal/100)); setText('#cart-total',money(t.total/100)); setText('#cart-delivery',money(t.delivery/100));
 $('#delivery-row').hidden=state.method!=='entrega'; $('#cart-checkout').hidden=!count;
 const message=orderBlock(); $('#checkout-btn').disabled=Boolean(message); setText('#checkout-status',message);
 $('#cart-items').innerHTML=lines.length?lines.map(l=>`<div class="cart-item">${imagePath(l.product.imagem)?`<img class="cart-thumb" src="${esc(imagePath(l.product.imagem))}" alt="" width="76" height="72">`:''}<div class="cart-info"><h3>${esc(l.product.nome)}</h3>${l.details?`<p class="line-details">${esc(l.details)}</p>`:''}<div class="line-price">${money(l.unit/100)} cada</div><div class="item-controls"><button type="button" data-decrease="${esc(l.key)}" aria-label="Remover uma unidade de ${esc(l.product.nome)}">−</button><b>${l.qty}</b><button type="button" data-increase="${esc(l.key)}" aria-label="Adicionar uma unidade de ${esc(l.product.nome)}">+</button></div></div><strong class="item-total">${money(l.unit*l.qty/100)}</strong></div>`).join(''):'<div class="empty-cart"><strong>Sua sacola está vazia</strong><span>Adicione os itens do seu pedido pelo cardápio.</span></div>';
}
function addProduct(p,variation='',extras=[]) {
 const key=JSON.stringify([p.id,variation,[...extras].sort()]);
 state.cart[key]={id:p.id,variation,extras,qty:Math.min(99,(state.cart[key]?.qty || 0)+1)};
 saveCart(); updateCart(); notify(`${p.nome} adicionado à sacola`);
}
function chooseProduct(id) {
 const p=state.products.find(p=>p.id===id && p.disponivel); if(!p) return;
 if(!p.variacoes.length && !p.adicionais.length) return addProduct(p);
 selectedProduct=p; setText('#options-title',p.nome);
 $('#variation-wrap').hidden=!p.variacoes.length;
 $('#variation').innerHTML=p.variacoes.map(v=>`<option value="${esc(v.nome)}">${esc(v.nome)} — ${money(v.preco)}</option>`).join('');
 $('#extras').innerHTML=p.adicionais.length?'<legend>Adicionais (opcionais)</legend>'+p.adicionais.map((a,i)=>`<label class="extra-option"><input type="checkbox" name="extra" value="${i}"><span>${esc(a.nome)}</span><b>+ ${money(a.preco)}</b></label>`).join(''):'';
 $('#options-dialog').showModal();
}
function showCart() {
 returnFocus=document.activeElement; $('#cart-drawer').inert=false; $('#cart-drawer').classList.add('open'); $('#cart-drawer').setAttribute('aria-hidden','false'); $('#drawer-backdrop').hidden=false; $('#drawer-backdrop').classList.add('visible'); document.body.style.overflow='hidden';
 for(const el of document.querySelectorAll('main,header,footer,.top-note,#mobile-cart,.skip-link')) el.inert=true;
 $('#close-cart').focus();
}
function hideCart() {
 if(!$('#cart-drawer').classList.contains('open')) return;
 $('#cart-drawer').classList.remove('open'); $('#cart-drawer').setAttribute('aria-hidden','true'); $('#cart-drawer').inert=true; $('#drawer-backdrop').hidden=true; document.body.style.overflow='';
 for(const el of document.querySelectorAll('main,header,footer,.top-note,#mobile-cart,.skip-link')) el.inert=false;
 returnFocus?.focus();
}
function updateMethod() {
 document.querySelectorAll('[data-method]').forEach(b=>{b.classList.toggle('selected',b.dataset.method===state.method); b.setAttribute('aria-pressed',String(b.dataset.method===state.method));});
 $('#address-wrap').hidden=state.method!=='entrega'; $('#area-wrap').hidden=state.method!=='entrega'||!state.data.areasEntrega?.length; updateCart();
}
function checkout() {
 const lines=cartLines(), t=total(), blocked=orderBlock(); if(blocked) return notify(blocked); if(!lines.length) return;
 const name=$('#customer-name'), address=$('#customer-address'), area=$('#delivery-area'), payment=$('#payment'), change=$('#change');
 for(const [field,required] of [[name,true],[address,state.method==='entrega'],[area,state.method==='entrega' && state.data.areasEntrega?.length>0],[payment,state.data.pagamentos?.length>0]]) {
  field.setCustomValidity(required && !field.value.trim()?'Preencha este campo para continuar.':'');
  if(!field.reportValidity()) return;
 }
 if($('#change-wrap').hidden) change.value='';
 if(t.subtotal<cents(state.data.pedidoMinimo)) return notify(`O pedido mínimo é ${money(state.data.pedidoMinimo)}, sem a entrega.`);
 change.setCustomValidity(change.value && cents(change.value)<t.total?'O valor para troco deve ser maior ou igual ao total.':''); if(!change.reportValidity()) return;
 const message=orderMessage(state.data,lines,t,{name:name.value.trim(),address:address.value.trim(),area:area.value,payment:payment.value,change:$('#change-wrap').hidden?'':change.value,note:$('#order-note').value.trim(),method:state.method});
 window.location.assign(whatsappUrl(state.data.whatsapp,message));
}
function renderHours() {
 const now=localClock(new Date(),state.data.fusoHorario);
 const pretty=raw=>parseIntervals(raw).map(r=>`${r.start} às ${r.end}${r.endMin<r.startMin?' (dia seguinte)':''}`).join(' · ') || 'Fechado';
 $('#hours-list').innerHTML=Object.entries(days).map(([key,label])=>`<div class="hours-row ${key===now.day?'today':''}"><span>${label}${key===now.day?' · Hoje':''}</span><span>${esc(pretty(state.hours[key]))}</span></div>`).join('');
 const exceptions=(state.hours.excecoes || []).filter(e=>e.data>=now.date).sort((a,b)=>a.data.localeCompare(b.data));
 $('#special-hours').innerHTML=exceptions.length?'<h3>Datas especiais</h3>'+exceptions.map(e=>`<div class="hours-row"><span>${esc(e.data.split('-').reverse().join('/'))}${e.observacao?` · ${esc(e.observacao)}`:''}</span><span>${esc(pretty(e))}</span></div>`).join(''):'';
 const open=openAt(state.hours,new Date(),state.data.fusoHorario);
 $('#open-status').classList.toggle('open',open); $('#open-status').classList.toggle('closed',!open); $('#open-status').innerHTML=`<span class="status-dot"></span>${open?'Aberto agora':'Fechado no momento'}`;
 if(!state.data.pedidosAtivos) {setText('#business-notice',state.data.mensagemPausa); $('#business-notice').hidden=false;}
 updateCart();
}
function listeners() {
 $('#filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]'); if(!b) return; state.filter=b.dataset.filter; document.querySelectorAll('[data-filter]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.filter===state.filter);btn.setAttribute('aria-pressed',String(btn.dataset.filter===state.filter));}); renderProducts();});
 $('#search').addEventListener('input',e=>{state.search=e.target.value.trim();renderProducts();});
 $('#menu-grid').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b) chooseProduct(b.dataset.add);});
 document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement) e.target.style.opacity='0';},true);
 $('#cart-items').addEventListener('click',e=>{const b=e.target.closest('[data-increase],[data-decrease]');if(!b) return; const key=b.dataset.increase||b.dataset.decrease,entry=state.cart[key];if(!entry) return;entry.qty=Math.min(99,entry.qty+(b.dataset.increase?1:-1));if(entry.qty<=0) delete state.cart[key];saveCart();updateCart();const replacement=[...document.querySelectorAll(b.dataset.increase?'[data-increase]':'[data-decrease]')].find(el=>(el.dataset.increase||el.dataset.decrease)===key);(replacement||$('#close-cart')).focus();});
 $('#header-cart').addEventListener('click',showCart); $('#mobile-cart').addEventListener('click',showCart); $('#close-cart').addEventListener('click',hideCart); $('#drawer-backdrop').addEventListener('click',hideCart);
 document.addEventListener('keydown',e=>{if(!$('#cart-drawer').classList.contains('open')) return;if(e.key==='Escape') hideCart();if(e.key==='Tab'){const all=[...$('#cart-drawer').querySelectorAll('button,input,textarea,select,a[href]')].filter(el=>!el.disabled && el.getClientRects().length);const first=all[0],last=all.at(-1);if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}}});
 document.querySelectorAll('[data-method]').forEach(b=>b.addEventListener('click',()=>{state.method=b.dataset.method;updateMethod();}));
 $('#delivery-area').addEventListener('change',updateCart);
 $('#payment').addEventListener('change',()=>{$('#change-wrap').hidden=$('#payment').value!=='Dinheiro'; if($('#change-wrap').hidden) $('#change').value='';});
 $('#cart-checkout').addEventListener('input',e=>e.target.setCustomValidity?.(''));
 $('#checkout-btn').addEventListener('click',checkout);
 $('#close-options').addEventListener('click',()=>$('#options-dialog').close());
 $('#confirm-options').addEventListener('click',()=>{addProduct(selectedProduct,$('#variation-wrap').hidden?'':$('#variation').value,[...document.querySelectorAll('#extras input:checked')].map(el=>selectedProduct.adicionais[Number(el.value)].nome));$('#options-dialog').close();});
}
async function init() {
 listeners();
 try {
  const load=async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok) throw Error(path);return response.json();};
  const [data,products,hours]=await Promise.all(['estabelecimento','produtos','horarios'].map(n=>load(`./data/${n}.json`)));
  state.data=data; state.products=normalizeProducts(products);state.hours=hours;
  setIdentity(); buildFilters();renderProducts();renderHours();
  const validKeys=new Set(cartLines().map(l=>l.key));state.cart=Object.fromEntries(Object.entries(state.cart).filter(([key])=>validKeys.has(key)));saveCart();
  setInterval(renderHours,60000);
 } catch(error) {console.error(error);setText('#menu-grid','Não foi possível carregar o cardápio. Recarregue a página para tentar novamente.');setText('#result-label','Cardápio indisponível');setText('#open-status','Horários indisponíveis');$('#header-cart').disabled=true;$('#mobile-cart').disabled=true;}
}
init();
