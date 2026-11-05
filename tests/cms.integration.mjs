import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {pbkdf2Sync,createHash} from 'node:crypto';

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
for(const name of (await readdir(resolve(root,'drizzle'))).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(await readFile(resolve(root,'drizzle',name),'utf8'));
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
const password='Disposable test password! 2026';
const salt='ab'.repeat(32);
const credential='pbkdf2-sha256$100000$'+salt+'$'+pbkdf2Sync(password,Buffer.from(salt,'hex'),100000,32,'sha256').toString('hex');
const env={DB:db,BUCKET:bucket,ADMIN_PASSWORD_HASH:credential,ADMIN_EMAIL:'owner@example.test'};
const base='https://portfolio.example.test';
const origin='https://kirinsounds.art';
let token='';
const hash=value=>createHash('sha256').update(value).digest('hex');
try{
  const {handleCmsRequest}=await import(pathToFileURL(testModule).href);
  const call=(path,{method='GET',body,headers={},authenticated=false,csrf=false,environment=env}={})=>handleCmsRequest(new Request(base+path,{method,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.1',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(authenticated?{Authorization:'Bearer '+token}:{}),...(csrf?{'X-CSRF-Token':token}:{}),...headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}),environment);
  const unlock=async(headers={})=>{
    const r=await call('/api/auth/login',{method:'POST',body:{username:'root',password},headers});
    assert.equal(r.status,200,await r.clone().text());
    assert.equal(r.headers.get('Set-Cookie'),null);
    assert.equal(r.headers.get('Access-Control-Allow-Origin'),headers.Origin||origin);
    const body=await r.json();assert.match(body.sessionToken,/^[a-f0-9]{64}$/);assert.equal(body.csrfToken,body.sessionToken);
    assert.ok(body.expiresAt>Date.now()+3.9*60*60*1000 && body.expiresAt<=Date.now()+4*60*60*1000);
    token=body.sessionToken;return body;
  };
  let response=await call('/api/content');assert.equal(response.status,200);
  const initial=await response.json();assert.equal(initial.revision,1);assert.equal(initial.content.projects.length,3);
  response=await call('/api/admin/subscribers');assert.equal(response.status,401);
  response=await call('/api/auth/status');let status=await response.json();assert.equal(status.mode,'password');assert.equal(status.authenticated,false);assert.equal(status.initialized,true);assert.equal(status.setupAllowed,false);assert.equal(status.loginUrl,undefined);
  // Platform owner identity and old CSRF cookies cannot authorize password CMS.
  response=await call('/api/admin/subscribers',{headers:{'oai-authenticated-user-id':'old-owner','oai-authenticated-user-email':'owner@example.test',Cookie:'__Host-kirin-csrf='+('a'.repeat(64))}});assert.equal(response.status,401);
  response=await call('/api/auth/login',{method:'POST',body:{username:'root',password:'wrong'}});assert.equal(response.status,401);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  response=await call('/api/auth/setup',{method:'POST',body:{password}});assert.equal(response.status,403);
  const noSecret={...env,ADMIN_PASSWORD_HASH:undefined};
  response=await call('/api/auth/status',{environment:noSecret});status=await response.json();assert.equal(status.initialized,false);assert.equal(status.authenticated,false);
  response=await call('/api/auth/login',{method:'POST',body:{username:'root',password},environment:noSecret});assert.equal(response.status,503);
  response=await call('/api/admin/subscribers',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'},environment:noSecret});assert.equal(response.status,401);
  await unlock();
  const savedToken=token;
  const sessionRow=sqlite.prepare('SELECT * FROM admin_sessions').get();assert.equal(sessionRow.token_hash,hash(token));assert.equal(sessionRow.credential_hash,hash(credential));assert.notEqual(sessionRow.token_hash,token);assert.equal(sessionRow.token,undefined);
  response=await call('/api/auth/status',{authenticated:true});status=await response.json();assert.equal(status.authenticated,true);assert.equal(status.csrfToken,token);assert.equal(status.username,'root');assert.equal(response.headers.get('Set-Cookie'),null);
  response=await call('/api/admin/content',{method:'PUT',body:{content:initial.content,expectedRevision:1},authenticated:true});assert.equal(response.status,403);
  const changed=structuredClone(initial.content);changed.profile.artistName='Updated test artist';
  response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:1},authenticated:true,csrf:true});assert.equal(response.status,200);assert.equal((await response.json()).revision,2);
  response=await call('/api/admin/content',{method:'PUT',body:{content:initial.content,expectedRevision:1},authenticated:true,csrf:true});assert.equal(response.status,409);
  response=await call('/api/content');const saved=await response.json();assert.equal(saved.revision,2);assert.equal(saved.content.profile.artistName,'Updated test artist');
  response=await call('/api/admin/content',{method:'PUT',body:{content:changed,expectedRevision:2},authenticated:true,csrf:true,headers:{Origin:'https://other.example.test'}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  response=await call('/api/subscribe',{method:'POST',body:{email:'Reader@Example.test',name:'=2+2',consent:true}});assert.equal(response.status,200);
  response=await call('/api/subscribe',{method:'POST',body:{email:'reader@example.test',consent:true}});assert.equal(response.status,200);
  response=await call('/api/admin/subscribers',{authenticated:true});const readers=(await response.json()).subscribers;assert.equal(readers.length,1);assert.equal(readers[0].email,'reader@example.test');
  response=await call('/api/admin/subscribers.csv',{authenticated:true});assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.match(await response.text(),/"'=2\+2"/);
  response=await call('/api/subscribe',{method:'POST',body:{email:'second@example.test',consent:false}});assert.equal(response.status,400);
  const wav=new Uint8Array(12);wav.set(new TextEncoder().encode('RIFF'),0);wav.set(new TextEncoder().encode('WAVE'),8);
  response=await handleCmsRequest(new Request(base+'/api/admin/upload',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'X-CSRF-Token':token,'Content-Type':'audio/wav','X-Filename':'test.wav'},body:wav}),env);assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  const uploaded=await response.json();assert.match(uploaded.url,/^\/uploads\/[a-f0-9-]+\.wav$/);
  response=await call(uploaded.url,{headers:{Range:'bytes=0-3'}});assert.equal(response.status,206);assert.equal(await response.text(),'RIFF');assert.equal(response.headers.get('Content-Range'),'bytes 0-3/12');
  response=await call(uploaded.url,{headers:{Range:'bytes=50-99'}});assert.equal(response.status,416);
  response=await handleCmsRequest(new Request(base+'/api/admin/upload',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+token,'X-CSRF-Token':token,'Content-Type':'image/svg+xml'},body:'<svg/>'}),env);assert.equal(response.status,415);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  response=await call('/api/admin/subscribers/'+readers[0].id,{method:'DELETE',authenticated:true,csrf:true});assert.equal(response.status,200);
  response=await call('/api/admin/subscribers',{authenticated:true});assert.equal((await response.json()).subscribers.length,0);
  // Narrow admin CORS accepts only the two owned portfolio origins.
  for(const adminOrigin of [origin,'https://www.kirinsounds.art']){
    response=await call('/api/auth/status',{authenticated:true,headers:{Origin:adminOrigin,'Sec-Fetch-Site':'cross-site'}});assert.equal(response.status,200);assert.equal((await response.json()).authenticated,true);assert.equal(response.headers.get('Access-Control-Allow-Origin'),adminOrigin);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
    for(const [path,method] of [['/api/auth/status','GET'],['/api/auth/login','POST'],['/api/admin/content','PUT'],['/api/admin/subscribers.csv','GET'],['/api/admin/upload','POST'],['/api/admin/subscribers/'+readers[0].id,'DELETE']]){
      response=await call(path,{method:'OPTIONS',headers:{Origin:adminOrigin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':'authorization,content-type,x-csrf-token,x-filename'}});assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),adminOrigin);assert.equal(response.headers.get('Access-Control-Allow-Methods'),method);assert.equal(response.headers.get('Set-Cookie'),null);
    }
  }
  for(const badOrigin of ['https://evil.example','https://hliu13-jms.github.io','https://kirinsounds.art.evil.example','http://kirinsounds.art','null']){
    response=await call('/api/auth/status',{authenticated:true,headers:{Origin:badOrigin}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
    response=await call('/api/admin/subscribers',{authenticated:true,headers:{Origin:badOrigin}});assert.equal(response.status,403);
    response=await call('/api/auth/login',{method:'OPTIONS',headers:{Origin:badOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
  }
  for(const requested of [
    {'Access-Control-Request-Method':'DELETE','Access-Control-Request-Headers':'authorization'},
    {'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'authorization,x-unexpected'},
  ]){
    response=await call('/api/admin/content',{method:'OPTIONS',headers:requested});assert.equal(response.status,403);
  }
  response=await handleCmsRequest(new Request(base+'/api/auth/status',{headers:{Authorization:'Bearer '+token,'Sec-Fetch-Site':'same-origin'}}),env);assert.equal(response.status,200);assert.equal((await response.json()).authenticated,true);
  response=await handleCmsRequest(new Request(base+'/api/auth/status',{headers:{Authorization:'Bearer '+token}}),env);assert.equal(response.status,403);
  response=await handleCmsRequest(new Request(base+'/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token,'X-CSRF-Token':token,'Sec-Fetch-Site':'same-origin'}}),env);assert.equal(response.status,403);
  // Token expiry, credential rotation, and logout each remove authority.
  sqlite.prepare('UPDATE admin_sessions SET expires_at = ? WHERE token_hash = ?').run(Math.floor(Date.now()/1000)-1,hash(token));
  response=await call('/api/admin/subscribers',{authenticated:true});assert.equal(response.status,401);
  await unlock({'CF-Connecting-IP':'192.0.2.2'});
  const rotated={...env,ADMIN_PASSWORD_HASH:credential.slice(0,-2)+(credential.endsWith('00')?'01':'00')};
  response=await call('/api/admin/subscribers',{authenticated:true,environment:rotated});assert.equal(response.status,401);
  response=await call('/api/auth/logout',{method:'POST',authenticated:true,csrf:true});assert.equal(response.status,200);assert.equal((await response.json()).logoutUrl,undefined);
  response=await call('/api/admin/subscribers',{authenticated:true});assert.equal(response.status,401);
  response=await call('/api/auth/status',{authenticated:true});assert.equal((await response.json()).authenticated,false);assert.equal(sqlite.prepare('SELECT * FROM admin_sessions WHERE token_hash = ?').get(hash(token)),undefined);
  assert.notEqual(token,savedToken);
  // Public content/subscriptions preserve their original three-origin contract.
  const publicOrigins=['https://hliu13-jms.github.io',origin,'https://www.kirinsounds.art'];
  for(const [index,publicOrigin] of publicOrigins.entries()){
    response=await call('/api/content',{headers:{Origin:publicOrigin,'Sec-Fetch-Site':'cross-site'}});assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),publicOrigin);assert.equal(response.headers.get('Access-Control-Allow-Credentials'),null);
    for(const [path,method] of [['/api/content','GET'],['/api/subscribe','POST']]){
      response=await call(path,{method:'OPTIONS',headers:{Origin:publicOrigin,'Access-Control-Request-Method':method,'Access-Control-Request-Headers':'content-type'}});assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Methods'),method);
    }
    response=await call('/api/subscribe',{method:'POST',body:{email:`cross${index}@example.test`,consent:true,website:''},headers:{Origin:publicOrigin,'CF-Connecting-IP':`198.51.100.${index+1}`}});assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),publicOrigin);
  }
  response=await call('/api/subscribe',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,authorization'}});assert.equal(response.status,403);
  for(let n=0;n<20;n++){
    response=await call('/api/subscribe',{method:'POST',body:{email:'limited@example.test',consent:true},headers:{'CF-Connecting-IP':'198.51.100.99'}});assert.equal(response.status,200);
  }
  response=await call('/api/subscribe',{method:'POST',body:{email:'limited@example.test',consent:true},headers:{'CF-Connecting-IP':'198.51.100.99'}});assert.equal(response.status,429);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
  // Count failures and successful logins together, with a server-side IP window.
  sqlite.prepare('DELETE FROM request_limits WHERE key LIKE ?').run('login:%');
  for(let n=0;n<5;n++){
    response=await call('/api/auth/login',{method:'POST',body:{username:'root',password:'wrong'},headers:{'CF-Connecting-IP':'203.0.113.10'}});assert.equal(response.status,401);
  }
  response=await call('/api/auth/login',{method:'POST',body:{username:'root',password},headers:{'CF-Connecting-IP':'203.0.113.10'}});assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'900');
  const ipKey='login:ip:'+hash('203.0.113.10');sqlite.prepare('UPDATE request_limits SET window_start = ? WHERE key = ?').run(Math.floor(Date.now()/1000)-901,ipKey);
  await unlock({'CF-Connecting-IP':'203.0.113.10'});
  sqlite.prepare('UPDATE request_limits SET count = 100 WHERE key = ?').run('login:global');
  response=await call('/api/auth/login',{method:'POST',body:{username:'root',password},headers:{'CF-Connecting-IP':'203.0.113.11'}});assert.equal(response.status,429);
  console.log('Hosted password CMS passed: schema migration; PBKDF2 login; opaque hashed sessions; private setup; owner identity disabled; 4h expiry/credential rotation/revocation; exact CORS/origin and CSRF; IP/global limits; persistent CAS CRUD; subscriber dedupe/CSV/deletion; uploads/ranges; unchanged public APIs.');
}finally{
  sqlite.close();
  await rm(testModule,{force:true});
}