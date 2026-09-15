const h=require('http'),f=require('fs'),p=require('path');
const dir='C:\\Users\\User\\portfolio-bootcamp';
h.createServer((r,s)=>{
  let u=(r.url||'').split('?')[0]||'/';
  let fp=p.join(dir,u==='/'?'index.html':u);
  try{
    if(f.existsSync(fp)&&f.statSync(fp).isDirectory()) fp=p.join(fp,'index.html');
    let c=f.readFileSync(fp);
    let ext=p.extname(fp).slice(1);
    let m={'html':'text/html','js':'text/javascript','css':'text/css','png':'image/png','jpg':'image/jpeg','svg':'image/svg+xml'};
    s.writeHead(200,{'Content-Type':m[ext]||'text/plain','Cache-Control':'no-store'});
    s.end(c);
  }catch(e){s.writeHead(404);s.end('404 '+r.url)}
}).listen(8080,()=>console.log('Server: http://localhost:8080'));
