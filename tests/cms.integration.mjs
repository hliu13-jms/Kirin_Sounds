import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const runtime=resolve(root,'.sites-runtime');
await mkdir(runtime,{recursive:true});
const testModule=resolve(runtime,'cms-test-adapter.mjs');
const source=await readFile(resolve(root,'server/cms.ts'),'utf8');
let compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
compiled=compiled.replace('"../data/seed-content.json"',JSON.stringify(pathToFileURL(resolve(root,'data/seed-content.json')).href)+' with { type: "json" }');
compiled=compiled.replace('"./validation.mjs"',JSON.stringify(pathToFileURL(resolve(root,'server/validation.mjs')).href));
await writeFile(testModule,compiled);

const sqlite=new DatabaseSync(':memory:');
const migration=await readFile(resolve(root,'drizzle/0000_woozy_jazinda.sql'),'utf8');
sqlite.exec(migration);
function statement(sql,args=[]){
  return {
    bind(...values){return statement(sql,values);},
    async first(column){const row=sqlite.prepare(sql).get(...args);return row?(column?row[column]:row):null;},
    async all(){return {results:sqlite.prepare(sql).all(...args),success:true};},
    async run(){const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};}
  };
}
const db={prepare:sql=>statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
const objects=new Map();
const bucket={
  async put(key,bytes,options){objects.set(key,{bytes:new Uint8Array(bytes),httpMetadata:options.httpMetadata,httpEtag:'"test-etag"'});},
  async head(key){const object=objects.get(key);return object?{...object,size:object.bytes.length}:null;},
  async get(key,options){const object=objects.get(key);if(!object)return null;const bytes=options?.range?object.bytes.slice(options.range.offset,options.range.offset+options.range.length):object.bytes;return {...object,body:bytes};}
};
const env={DB:db,BUCKET:bucket,ADMIN_EMAIL:'owner@example.test'};
const base='https://portfolio.example.test';
const owner={'oai-authenticated-user-id':'test-owner-id','oai-authenticated-user-email':env.ADMIN_EMAIL};
let cookie='',token='';
try{
  const {handleCmsRequest}=await import(pathToFileURL(testModule).href);
  const call=(path,{method='GET',body,headers={},admin=false,csrf=false}={})=>handleCmsRequest(new Request(base+path,{method,headers:{...(admin?owner:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf?{Origin:base,Cookie:cookie,'X-CSRF-Token':token}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}),env);
  let response=await call('/api/content');assert.equal(response.status,200);
  const initial=await response.json();assert.equal(initial.revision,1);assert.equal(initial.content.projects.length,3);
  response=await call('/api/admin/subscribers');assert.equal(response.status,401);
  response=await call('/api/auth/status');assert.equal((await response.json()).authenticated,false);
  response=await call('/api/auth/status',{admin:true});assert.equal(response.status,200);
  const status=await response.json();assert.equal(status.mode,'hosted');assert.equal(status.username,'root');assert.match(status.csrfToken,/^[a-f0-9]{64}$/);
  token=status.csrfToken;cookie=response.headers.get('Set-Cookie').split(';')[0];
  response=await call('/api/admin/content',{method:'PUT',body:{content:initial.content,expectedRevision:1},admin:true});assert.equal(response.status,403);
  const changed=structuredClone(initial.content);changed.profile.artistName='Updated test artist';
  response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:1},admin:true,csrf:true});assert.equal(response.status,200);assert.equal((await response.json()).revision,2);
  response=await call('/api/admin/content',{method:'PUT',body:{content:initial.content,expectedRevision:1},admin:true,csrf:true});assert.equal(response.status,409);
  response=await call('/api/content');const saved=await response.json();assert.equal(saved.revision,2);assert.equal(saved.content.profile.artistName,'Updated test artist');
  response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:2},admin:true,csrf:true,headers:{Origin:'https://other.example.test'}});assert.equal(response.status,403);
  response=await call('/api/subscribe',{method:'POST',body:{email:'Reader@Example.test',name:'=2+2',consent:true},headers:{Origin:base}});assert.equal(response.status,200);
  response=await call('/api/subscribe',{method:'POST',body:{email:'reader@example.test',consent:true},headers:{Origin:base}});assert.equal(response.status,200);
  response=await call('/api/admin/subscribers',{admin:true});const readers=(await response.json()).subscribers;assert.equal(readers.length,1);assert.equal(readers[0].email,'reader@example.test');
  response=await call('/api/admin/subscribers.csv',{admin:true});assert.match(await response.text(),/"'=2\+2"/);
  response=await call('/api/subscribe',{method:'POST',body:{email:'second@example.test',consent:false},headers:{Origin:base}});assert.equal(response.status,400);
  const wav=new Uint8Array(12);wav.set(new TextEncoder().encode('RIFF'),0);wav.set(new TextEncoder().encode('WAVE'),8);
  response=await handleCmsRequest(new Request(base+'/api/admin/upload',{method:'POST',headers:{...owner,Origin:base,Cookie:cookie,'X-CSRF-Token':token,'Content-Type':'audio/wav','X-Filename':'test.wav'},body:wav}),env);assert.equal(response.status,201);
  const uploaded=await response.json();assert.match(uploaded.url,/^\/uploads\/[a-f0-9-]+\.wav$/);
  response=await call(uploaded.url,{headers:{Range:'bytes=0-3'}});assert.equal(response.status,206);assert.equal(await response.text(),'RIFF');assert.equal(response.headers.get('Content-Range'),'bytes 0-3/12');
  response=await call(uploaded.url,{headers:{Range:'bytes=50-99'}});assert.equal(response.status,416);
  response=await handleCmsRequest(new Request(base+'/api/admin/upload',{method:'POST',headers:{...owner,Origin:base,Cookie:cookie,'X-CSRF-Token':token,'Content-Type':'image/svg+xml'},body:'<svg/>'}),env);assert.equal(response.status,415);
  response=await call('/api/admin/subscribers/'+readers[0].id,{method:'DELETE',admin:true,csrf:true});assert.equal(response.status,200);
  response=await call('/api/admin/subscribers',{admin:true});assert.equal((await response.json()).subscribers.length,0);
  response=await call('/api/auth/logout',{method:'POST',admin:true,csrf:true});assert.equal(response.status,200);
  response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:2},admin:true,csrf:true});assert.equal(response.status,403);
  const allowedOrigins=['https://hliu13-jms.github.io','https://kirinsounds.art','https://www.kirinsounds.art'];
  for(const [index,origin] of allowedOrigins.entries()){
    response=await call('/api/content',{headers:{Origin:origin,'Sec-Fetch-Site':'cross-site'}});
    assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);assert.match(response.headers.get('Vary'),/Origin/);assert.equal(response.headers.get('Set-Cookie'),null);
    for(const [path,method] of [['/api/content','GET'],['/api/subscribe','POST']]){
      response=await call(path,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':'content-type'}});
      assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Access-Control-Allow-Methods'),method);assert.equal(response.headers.get('Access-Control-Allow-Headers'),'Content-Type');assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
    }
    response=await call('/api/subscribe',{method:'POST',body:{email:`cross${index}@example.test`,consent:true,website:''},headers:{Origin:origin,'Sec-Fetch-Site':'cross-site','CF-Connecting-IP':`192.0.2.${index+1}`}});
    assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
    response=await call('/api/subscribe',{method:'POST',body:{email:'no-consent@example.test',consent:false},headers:{Origin:origin}});
    assert.equal(response.status,400);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
    response=await call('/api/auth/status',{admin:true,headers:{Origin:origin}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(response.headers.get('Set-Cookie'),null);
    response=await call('/api/admin/subscribers',{admin:true,headers:{Origin:origin}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    response=await call('/api/admin/content',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type,x-csrf-token'}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:2},admin:true,csrf:true,headers:{Origin:origin}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  }
  for(const origin of ['https://evil.example','https://hliu13-jms.github.io.evil.example','http://kirinsounds.art','null']){
    response=await call('/api/content',{headers:{Origin:origin}});assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    response=await call('/api/subscribe',{method:'POST',body:{email:'untrusted@example.test',consent:true},headers:{Origin:origin}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    response=await call('/api/subscribe',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  }
  for(const headers of [
    {'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type'},
    {'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,authorization'},
    {'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-csrf-token'},
  ]){
    response=await call('/api/subscribe',{method:'OPTIONS',headers:{Origin:allowedOrigins[0],...headers}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  }
  response=await call('/api/auth/status',{admin:true,headers:{'Sec-Fetch-Site':'cross-site'}});assert.equal(response.status,403);assert.equal(response.headers.get('Set-Cookie'),null);
  response=await call(uploaded.url,{headers:{Origin:allowedOrigins[0]}});assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  for(let n=0;n<20;n++){
    response=await call('/api/subscribe',{method:'POST',body:{email:'limited@example.test',consent:true},headers:{Origin:allowedOrigins[0],'CF-Connecting-IP':'198.51.100.99'}});assert.equal(response.status,200);
  }
  response=await call('/api/subscribe',{method:'POST',body:{email:'limited@example.test',consent:true},headers:{Origin:allowedOrigins[0],'CF-Connecting-IP':'198.51.100.99'}});assert.equal(response.status,429);assert.equal(response.headers.get('Access-Control-Allow-Origin'),allowedOrigins[0]);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
  console.log('Hosted CMS integration passed: SQLite migration, identity authorization, CSRF/Origin, CAS, deduplication, safe CSV, R2 upload/ranges, deletion/token revocation; three-origin public CORS, strict preflight, cross-origin admin rejection, consent/errors and unchanged subscription rate limit.');
}finally{
  sqlite.close();
  await rm(testModule,{force:true});
}
