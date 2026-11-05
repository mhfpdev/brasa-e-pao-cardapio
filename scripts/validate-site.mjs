import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeProducts,parseIntervals,slugify,whatsappUrl} from '../menu-core.mjs';
const root=resolve(process.argv[2] && !process.argv[2].startsWith('--')?process.argv[2]:fileURLToPath(new URL('..',import.meta.url)));
const errors=[], referenced=new Set(['assets/favicon.svg','assets/hero-burger.svg']);
const fail=msg=>errors.push(msg);
const json=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const business=json('data/estabelecimento.json'),products=json('data/produtos.json'),hours=json('data/horarios.json');
if(!business.nome?.trim()) fail('Informe o nome do estabelecimento.');
if(!whatsappUrl(business.whatsapp,'teste')) fail('WhatsApp inválido. Use país, DDD e número.');
for(const key of ['taxaEntrega','pedidoMinimo','entregaGratisAcima']) if(!Number.isFinite(Number(business[key])) || Number(business[key])<0) fail(`${key}: valor inválido.`);
if(!business.entregaAtiva && !business.retiradaAtiva && business.pedidosAtivos) fail('Ative entrega ou retirada, ou pause os pedidos.');
try{new Intl.DateTimeFormat('pt-BR',{timeZone:business.fusoHorario});}catch{fail('Fuso horário inválido.');}
if(!Array.isArray(products) || normalizeProducts(products).length!==products.length) fail('Há produtos sem nome ou com preço inválido.');
const names=new Set();
for(const p of products) {
 const id=slugify(p.nome);if(!id || names.has(id)) fail(`Nome repetido ou inválido: ${p.nome}.`); names.add(id);
 if(!p.categoria?.trim()) fail(`${p.nome}: informe a categoria.`);
 if(p.precoPromocional!=null && p.precoPromocional!=='' && (!Number.isFinite(Number(p.precoPromocional)) || Number(p.precoPromocional)<0 || Number(p.precoPromocional)>=Number(p.preco))) fail(`${p.nome}: o preço promocional deve ser menor que o normal.`);
 for(const kind of ['variacoes','adicionais']){const used=new Set();for(const option of p[kind] || []){if(!option.nome?.trim() || used.has(option.nome) || !Number.isFinite(Number(option.preco)) || Number(option.preco)<0) fail(`${p.nome}: ${kind} inválidos ou repetidos.`);used.add(option.nome);}}
}
const validSchedule=(schedule,label)=>{
 if(!schedule || typeof schedule!=='object' || !Array.isArray(schedule.intervalos)) {fail(`${label}: horário inválido.`);return;}
 if(!schedule.fechado && (!schedule.intervalos.length || parseIntervals(schedule).length!==schedule.intervalos.length)) fail(`${label}: preencha períodos válidos ou marque como fechado.`);
 const ranges=parseIntervals(schedule).map(r=>[r.startMin,r.endMin>r.startMin?r.endMin:r.endMin+1440]).sort((a,b)=>a[0]-b[0]);
 if(ranges.some((r,i)=>i && r[0]<ranges[i-1][1])) fail(`${label}: há períodos sobrepostos.`);
};
for(const key of ['segunda','terca','quarta','quinta','sexta','sabado','domingo']) validSchedule(hours[key],key);
const dates=new Set();for(const ex of hours.excecoes || []){if(!/^\d{4}-\d{2}-\d{2}$/.test(ex.data)||Number.isNaN(Date.parse(ex.data))||new Date(ex.data).toISOString().slice(0,10)!==ex.data||dates.has(ex.data))fail(`Data especial inválida ou repetida: ${ex.data}.`);dates.add(ex.data);validSchedule(ex,ex.data);}
const areaNames=new Set();for(const area of business.areasEntrega || []){if(!area.nome?.trim()||areaNames.has(area.nome)||!Number.isFinite(Number(area.taxa))||Number(area.taxa)<0)fail('Bairro ou taxa de entrega inválidos ou repetidos.');areaNames.add(area.nome);}
function image(value) {
 if(!value) return;
 if(/^https:\/\//i.test(value)) return;
 const path=String(value).replace(/^\.\//,'').replace(/^\//,'');
 if(!path.startsWith('assets/') || path.split('/').includes('..') || path.includes('\\')) {fail(`Caminho de imagem inválido: ${value}.`);return;}
 referenced.add(path);
}
for(const p of products) image(p.imagem);image(business.logo);image(business.imagemDestaque);
for(const path of referenced) {
 if(!existsSync(resolve(root,path))) fail(`Imagem em uso não encontrada: ${path}. Restaure o arquivo ou substitua a foto no cadastro.`);
}
function scan(dir) {
 if(!existsSync(dir)) return;
 for(const name of readdirSync(dir)){
  const path=resolve(dir,name),stat=statSync(path);if(stat.isDirectory()){scan(path);continue;}if(name==='.gitkeep')continue;
  const data=readFileSync(path),extension=name.toLowerCase().split('.').pop();
  const valid=(extension==='jpg'||extension==='jpeg')?data[0]===255&&data[1]===216&&data[2]===255:extension==='png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):extension==='webp'?data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP':extension==='gif'?['GIF87a','GIF89a'].includes(data.toString('ascii',0,6)):false;
  if(!valid)fail(`Foto inválida ou formato não permitido: ${name}. Use JPG, PNG, WebP ou GIF.`);
  if(stat.size>8*1024*1024)fail(`Foto maior que 8 MB: ${name}. Reduza o arquivo antes de enviar.`);
 }
}
scan(resolve(root,'assets/uploads'));
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Validação concluída: ${products.length} produtos, horários, WhatsApp, taxas e imagens.`);
