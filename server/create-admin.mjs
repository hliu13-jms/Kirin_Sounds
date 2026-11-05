import { mkdir, access, open, unlink } from 'node:fs/promises';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.mjs';
import { loadServerConfig } from './config.mjs';

async function hiddenPassword() {
  if (!process.stdin.isTTY || !process.stderr.isTTY) throw new Error('Use an interactive terminal, or --password-stdin with protected standard input.');
  const silent = new Writable({write(_chunk,_encoding,done){done();}});
  silent.columns = process.stderr.columns || 80;
  const terminal = createInterface({input:process.stdin,output:silent,terminal:true,historySize:0});
  function ask(prompt) {
    process.stderr.write(prompt);
    return new Promise((resolve,reject) => {
      const interrupted=()=>{terminal.close();reject(new Error('Administrator setup cancelled.'));};
      const closed=()=>reject(new Error('Administrator setup cancelled before a complete password was entered.'));
      terminal.once('SIGINT',interrupted);
      terminal.once('close',closed);
      terminal.question('',answer=>{terminal.off('SIGINT',interrupted);terminal.off('close',closed);process.stderr.write('\n');resolve(answer);});
    });
  }
  try {
    const password=await ask('New root password (hidden, at least 12 characters): ');
    const confirmed=await ask('Confirm root password (hidden): ');
    if(password!==confirmed)throw new Error('The passwords do not match. No administrator was created.');
    return password;
  } finally {terminal.close();silent.end();}
}
async function stdinPassword() {
  if(process.stdin.isTTY)throw new Error('Do not type an echoed password into --password-stdin. Omit the flag for the hidden interactive prompt.');
  const chunks=[];let size=0;
  for await(const chunk of process.stdin){size+=chunk.length;if(size>4096)throw new Error('Password input is too long.');chunks.push(chunk);}
  let password=Buffer.concat(chunks).toString('utf8');
  if(password.endsWith('\n'))password=password.slice(0,-1);
  if(password.endsWith('\r'))password=password.slice(0,-1);
  if(/[\r\n\0]/.test(password))throw new Error('Provide exactly one password through standard input.');
  return password;
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--help'){
    console.log('Create the standalone server root account before starting the public service.');
    console.log('Set KIRIN_DEPLOYMENT=server, PUBLIC_ORIGIN=https://kirinsounds.art, and absolute DATA_DIR.');
    console.log('Run: node server/create-admin.mjs (hidden interactive input)');
    console.log('Or use --password-stdin with a protected input stream. Never put a password in arguments or environment variables.');
    return;
  }
  if(args.length>1||(args.length===1&&args[0]!=='--password-stdin'))throw new Error('Use no arguments for hidden prompts, or --password-stdin. Password arguments are not accepted.');
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(major<22||(major===22&&minor<13))throw new Error('Node.js 22.13 or newer is required.');
  const baseDirectory=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const config=loadServerConfig({baseDirectory});
  if(!config.production)throw new Error('This CLI initializes standalone server mode only. Local preview uses the first-run browser setup.');
  process.umask(0o077);
  await mkdir(config.dataDirectory,{recursive:true,mode:0o700});
  const filename=path.join(config.dataDirectory,'admin.json');
  try {await access(filename);throw new Error('The root administrator already exists. This command never overwrites or resets credentials.');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const password=args[0]==='--password-stdin'?await stdinPassword():await hiddenPassword();
  const record=await hashPassword(password);
  let handle;
  try {
    handle=await open(filename,'wx',0o600);
    await handle.writeFile(JSON.stringify(record,null,2),'utf8');
    await handle.sync();
  } catch(error) {
    if(error.code==='EEXIST')throw new Error('The root administrator already exists. Credentials were not overwritten.');
    if(handle){await handle.close();handle=null;await unlink(filename).catch(()=>{});}
    throw error;
  } finally {if(handle)await handle.close();}
  console.log('Root administrator created. Only the salted password hash was saved.');
  console.log('Start the server using the same DATA_DIR. No password was printed or stored in plaintext.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
