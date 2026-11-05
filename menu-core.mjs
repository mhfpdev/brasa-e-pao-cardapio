export const money = value => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(Number(value) || 0);
export const cents = value => Math.max(0, Math.round((Number(value) || 0) * 100));
export const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function normalizeProducts(raw) {
  const used = new Set();
  return (Array.isArray(raw) ? raw : []).filter(p => p && String(p.nome || '').trim() && p.preco !== '' && Number.isFinite(Number(p.preco)) && Number(p.preco) >= 0).map(p => {
    const base = slugify(p.nome) || 'produto';
    let id = base, suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    const options = list => (Array.isArray(list) ? list : []).filter(o => o && String(o.nome || '').trim() && o.disponivel !== false && Number.isFinite(Number(o.preco)) && Number(o.preco) >= 0);
    return {...p, id, disponivel:p.disponivel !== false, categoria:String(p.categoria || 'Outros'), variacoes:options(p.variacoes), adicionais:options(p.adicionais)};
  });
}
export function productPrice(product) {
  const promo = product.precoPromocional;
  return promo !== '' && promo != null && Number.isFinite(Number(promo)) && Number(promo) >= 0 && Number(promo) < Number(product.preco) ? cents(promo) : cents(product.preco);
}
export function imagePath(value) {
  const path = String(value || '').trim();
  if (/^https:\/\//i.test(path)) return path;
  // CMS uploads stay relative to this project, including GitHub Pages subpaths.
  const local = path.replace(/^\.\//,'').replace(/^\//,'');
  return local.startsWith('assets/') && !local.split('/').includes('..') ? './' + local : '';
}
export function parseIntervals(raw) {
  if (raw && typeof raw === 'object' && raw.fechado) return [];
  const source = typeof raw === 'string' ? raw.split(';').filter(Boolean).map(r => {const [abertura,fechamento] = r.trim().split('-'); return {abertura,fechamento};}) : raw?.intervalos || [];
  return source.flatMap(r => {
    const start = String(r.abertura || '').trim(), end = String(r.fechamento || '').trim();
    const valid = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    if (!valid(start) || !valid(end) || start === end) return [];
    const minutes = v => Number(v.slice(0,2))*60+Number(v.slice(3));
    return [{start,end,startMin:minutes(start),endMin:minutes(end)}];
  });
}
const days = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
export function localClock(date, timeZone = 'America/Sao_Paulo') {
  let formatter;
  try { formatter = new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}); }
  catch { return localClock(date,'America/Sao_Paulo'); }
  const p = Object.fromEntries(formatter.formatToParts(date).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,day:days[['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.weekday)],minute:Number(p.hour)*60+Number(p.minute)};
}
export function scheduleFor(hours, date, day) {
  return hours.excecoes?.find(e => e.data === date) || hours[day];
}
export function openAt(hours, date = new Date(), timeZone) {
  const now = localClock(date,timeZone);
  const yesterdayDate = new Date(`${now.date}T12:00:00Z`); yesterdayDate.setUTCDate(yesterdayDate.getUTCDate()-1);
  const yesterday = yesterdayDate.toISOString().slice(0,10);
  const previous = days[(days.indexOf(now.day)+6)%7];
  // An explicitly closed special date also blocks overnight service from yesterday.
  if (hours.excecoes?.some(e => e.data === now.date && e.fechado)) return false;
  return parseIntervals(scheduleFor(hours,now.date,now.day)).some(r => r.endMin > r.startMin ? now.minute>=r.startMin && now.minute<r.endMin : now.minute>=r.startMin)
    || parseIntervals(scheduleFor(hours,yesterday,previous)).some(r => r.endMin<r.startMin && now.minute<r.endMin);
}
export function totals(lines, config, method, areaName) {
  const subtotal = lines.reduce((sum,l)=>sum+l.unit*l.qty,0);
  const area = config.areasEntrega?.find(a=>a.nome===areaName);
  const free = cents(config.entregaGratisAcima);
  const delivery = method==='entrega' && lines.length && !(free>0 && subtotal>=free) ? cents(area ? area.taxa : config.taxaEntrega) : 0;
  return {subtotal,delivery,total:subtotal+delivery};
}
export function whatsappUrl(phone, message) {
  const number = String(phone || '').replace(/\D/g,'');
  if (!/^[1-9]\d{10,14}$/.test(number)) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function orderMessage(config, lines, total, customer) {
  const text = [`*Pedido — ${config.nome}*`, '', ...lines.map(l=>`${l.qty}× ${l.product.nome}${l.details ? ` (${l.details})` : ''} — ${money(l.unit*l.qty/100)}`), '', `Subtotal: ${money(total.subtotal/100)}`];
  if (customer.method==='entrega') text.push(`Entrega: ${money(total.delivery/100)}`);
  text.push(`*Total: ${money(total.total/100)}*`, '', `Modalidade: ${customer.method==='entrega'?'Entrega':'Retirada no local'}`, `Nome: ${customer.name}`);
  if (customer.method==='entrega') text.push(`Endereço: ${customer.address}`, ...(customer.area ? [`Região: ${customer.area}`] : []));
  if (customer.payment) text.push(`Pagamento: ${customer.payment}`);
  if (customer.change) text.push(`Troco para: ${money(customer.change)}`);
  if (customer.note) text.push(`Observações: ${customer.note}`);
  text.push('', 'Aguardo a confirmação do pedido e do prazo de preparo.');
  return text.join('\n');
}
