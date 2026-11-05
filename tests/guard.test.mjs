import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('..',import.meta.url)),script=resolve(source,'scripts/validate-site.mjs');
test('barra exclusão de foto em uso e upload inválido; permite excluir foto sem referência',()=>{
 const root=mkdtempSync(join(tmpdir(),'brasa-guard-'));const run=()=>execFileSync(process.execPath,[script,root],{stdio:'pipe'});
 try{
  cpSync(join(source,'data'),join(root,'data'),{recursive:true});cpSync(join(source,'assets'),join(root,'assets'),{recursive:true});mkdirSync(join(root,'assets/uploads'),{recursive:true});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
  for(const name of ['em-uso.png','livre.png'])writeFileSync(join(root,'assets/uploads',name),png);
  const products=JSON.parse(readFileSync(join(root,'data/produtos.json'),'utf8'));products[0].imagem='/assets/uploads/em-uso.png';writeFileSync(join(root,'data/produtos.json'),JSON.stringify(products));
  run();rmSync(join(root,'assets/uploads/livre.png'));run();rmSync(join(root,'assets/uploads/em-uso.png'));
  assert.throws(run,error=>error.stderr.toString().includes('Imagem em uso não encontrada'));
  writeFileSync(join(root,'assets/uploads/em-uso.png'),png);run();
  writeFileSync(join(root,'assets/uploads/falso.jpg'),'<script>conteudo invalido</script>');assert.throws(run,error=>error.stderr.toString().includes('Foto inválida'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
