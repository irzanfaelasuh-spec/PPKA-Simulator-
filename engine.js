'use strict';
/* Mesin simulasi deterministik. Blok absolut: satu KA per petak; rute dikunci sebelum KA masuk. Fisika disederhanakan (lihat README). */
const N=ST.length,Wz=36,SC=1.2,ROW=[[-26,-9],[26,9]],TN=['Sepur 2 (lurus)','Sepur 1 (belok)'];
const X=[];{let x=0;ST.forEach((s,i)=>{if(i)x+=(s.km-ST[i-1].km-1)*SC+Wz;X.push(x)})}
function wx(km){for(let i=0;i<N;i++){const a=ST[i].km-.5,b=ST[i].km+.5;if(km<a)return X[i]-Wz/2-(a-km)*SC;if(km<=b)return X[i]+(km-ST[i].km)*Wz}return X[N-1]+Wz/2+(km-ST[N-1].km-.5)*SC}
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const G={t:0,t0:0,speed:30,paused:false,auto:true,trains:[],log:[],inc:[],msgs:[],am:{},pref:{},sel:null,sel2:null,seed:7,dens:1,sq:[],idc:0,tz:7,sug:true};
let SEC=[[],[]];
const DAYS=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function fmt(t,s=1){const d=new Date((t+G.tz*3600)*1000),p=n=>String(n).padStart(2,'0');return p(d.getUTCHours())+':'+p(d.getUTCMinutes())+(s?':'+p(d.getUTCSeconds()):'')}
function log(type,msg,o={}){G.log.push({t:G.t,type,msg,tr:String(o.tr||''),st:o.st||'',id:o.id||''});if(G.log.length>1500)G.log.shift();if(G.onEv)G.onEv(type,msg)}
function build(){SEC=[[],[]];for(let d=0;d<2;d++){const sg=d?-1:1,ord=ST.map((s,i)=>i);if(d)ord.reverse();ord.forEach((i,j)=>{const x=ST[i].km*sg,c=ST[i].code,k=SEC[d].length;
SEC[d].push({d,k,Z:1,i,u0:x-.5,u1:x+.5,res:[null,null],fail:[0,0],lim:[80,40],fl:0,name:'Emplasemen '+c,id:'Z'+c+d,sig:{fail:0,id:'S'+c+(d?'W':'E')+'x'},sw:{pos:0,fail:0,lock:null,last:'-',id:'W'+c+(d?'W':'E')}});
if(j<N-1){const n2=ST[ord[j+1]],nx=n2.km*sg;SEC[d].push({d,k:k+1,Z:0,i,u0:x+.5,u1:nx-.5,res:[null],fail:[0],lim:[999],fl:0,name:'Petak '+c+'–'+n2.code,id:'B'+c+n2.code,sig:{fail:0,id:'S'+c+(d?'W':'E')+'b'}})}})}}
const sgn=d=>d?-1:1,kmOf=(d,u)=>d?-u:u;
function fastBehind(t){return G.trains.some(o=>o!==t&&o.d===t.d&&o.p>t.p&&o.u<t.u&&t.u-o.u<30&&!(o.dw&&!o.dw.org))}
function auto(t,n){const st=t.stops.has(n.i),y=st||t.p<=2,fb=fastBehind(t),l=n.res[1]==null&&!n.fail[1],m=n.res[0]==null&&!n.fail[0];
if(m&&!(y&&fb&&l))return 0;if(l&&(y||!m))return 1;return 0}
function tryRes(t,n){if(n.res.includes(t.id))return'';let w;
if(n.Z){const key=n.d+'_'+n.i;w=G.pref[key];if(w==null&&G.auto)w=auto(t,n);if(w==null)return'menunggu rute dari PPKA (mode manual)';
if(n.fail[w])return TN[w]+' tidak tersedia (gangguan)';if(n.res[w]!=null)return TN[w]+' dikunci KA lain';
const sw=n.sw;if(sw.pos!==w){if(sw.lock&&sw.lock!==t.id)return'wesel '+sw.id+' terkunci oleh rute KA lain';if(sw.fail)return'wesel '+sw.id+' rusak, tidak dapat dipindah';sw.pos=w;sw.last=fmt(G.t)+' → '+(w?'reverse':'normal');log('switch','Wesel '+sw.id+' → '+(w?'reverse (belok)':'normal (lurus)'),{id:sw.id,tr:t.no,st:ST[n.i].code})}
n.res[w]=t.id;sw.lock=t.id;t.trk[n.k]=w;n.fl=1;delete G.pref[key];
if(w===1&&fastBehind(t)){if(!t.ns.includes(n.i))t.ns.unshift(n.i);t.yl=n.i}}
else{if(n.fail[0])return'petak '+n.name+' ditutup (gangguan)';if(n.res[0]!=null)return'petak diduduki KA lain';n.res[0]=t.id}
log('route','Rute '+n.name+(n.Z?' '+TN[t.trk[n.k]]:'')+' ditetapkan untuk KA '+t.no,{tr:t.no,st:ST[n.i].code,id:n.id});if(G.onEv)G.onEv('routeok');return''}
function req(t,n){const r=tryRes(t,n);if(r&&t.lr!==r+n.k){t.lr=r+n.k;log('reject','Permintaan rute KA '+t.no+' ditolak: '+r,{tr:t.no,st:ST[n.i].code,id:n.id});if(G.onEv)G.onEv('rej')}return r}
function release(t){SEC[t.d].forEach(s=>{s.res=s.res.map(r=>r===t.id?null:r);if(s.sw&&s.sw.lock===t.id)s.sw.lock=null})}
function dwellOf(t){return t.fr?180:t.p>=4?120:90}
function terminate(t,why){release(t);G.trains=G.trains.filter(x=>x!==t);log(why?'cancel':'arrive','KA '+t.no+' '+t.name+(why?' dibatalkan oleh PPKA':' mengakhiri perjalanan di '+ST[t.b].name),{tr:t.no,st:ST[t.b].code});if(G.sel&&G.sel.id===t.id)G.sel=null}
function step(t,dt){const S=SEC[t.d];let k=t.k;while(k<S.length-1&&t.u>=S[k].u1)k++;t.k=k;const c=S[k],nx=S[k+1],b=t.fr?.4:.6;
for(let j=Math.max(0,k-3);j<=k;j++){const s=S[j];if(s.res.includes(t.id)&&t.u-t.len>s.u1+.01)s.res=s.res.map(r=>r===t.id?null:r);if(s.sw&&s.sw.lock===t.id&&t.u-t.len>s.u0+.3)s.sw.lock=null}
if(t.dw){t.v=0;t.vt=0;const w=t.dw;if(G.t<w.end){t.state='Dwelling di peron';return}
if(t.hold){t.state='Ditahan PPKA';t.why='ditahan oleh PPKA';return}
if(t.ns.length===0||!nx){terminate(t);return}
if(t.yl===c.i&&fastBehind(t)&&G.t-w.arr<1500){t.state='Menunggu penyusulan KA lebih cepat';t.why='memberi jalan KA prioritas lebih tinggi';return}
const r=req(t,nx);if(r){t.why=r;t.state=/KA lain|terkunci/.test(r)?'Menunggu pergerakan konflik':'Menunggu otorisasi rute';return}
t.dw=null;t.why='';t.yl=-1;log('depart','KA '+t.no+' berangkat dari '+ST[c.i].name,{tr:t.no,st:ST[c.i].code});if(G.onEv)G.onEv('dep');return}
const stopHere=c.Z&&t.ns[0]===c.i,pt=(c.u0+c.u1)/2+.15;let sp=1e9,why='';
if(stopHere)sp=Math.max(0,(pt-t.u)*1000);
const dEnd=(c.u1-t.u)*1000;
if(nx&&!nx.res.includes(t.id)&&!stopHere){if(dEnd<t.v*t.v/(2*b)+800)why=req(t,nx);if(!nx.res.includes(t.id))sp=Math.min(sp,Math.max(0,dEnd-12))}
if(c.sig.fail&&nx&&!stopHere){sp=Math.min(sp,Math.max(0,dEnd-12));why='sinyal '+c.sig.id+' tidak berfungsi'}
let vt=Math.min(t.vmax/3.6,(c.Z?c.lim[t.trk[k]??0]:c.lim[0])/3.6);
if(sp<1e9)vt=Math.min(vt,Math.sqrt(2*b*.85*sp));
if(nx){const nl=(nx.Z?nx.lim[t.trk[nx.k]??0]:nx.lim[0])/3.6;if(nl<vt)vt=Math.min(vt,Math.sqrt(nl*nl+2*b*.85*dEnd))}
t.vt=vt;if(t.v<vt)t.v=Math.min(vt,t.v+.5*dt);else t.v=Math.max(vt,t.v-b*dt);
let ds=t.v*dt;if(sp<1e9&&(ds>=sp||sp<4)){ds=sp;t.v=0}t.u+=ds/1000;
t.why=why;
if(stopHere&&t.v<.5&&(pt-t.u)*1000<1.5){t.u=pt;t.v=0;const j=t.ns.shift(),sc=t.sch[j];t.delay=sc?Math.max(0,(G.t-sc.a)/60):0;t.dw={k,arr:G.t,end:Math.max(G.t+dwellOf(t),sc?sc.d:0)};
log('arrive','KA '+t.no+' tiba di '+ST[j].name+' ('+TN[t.trk[k]??0]+'), terlambat '+t.delay.toFixed(1)+' mnt',{tr:t.no,st:ST[j].code});if(t.delay>=1)log('delay','Keterlambatan KA '+t.no+' = '+t.delay.toFixed(1)+' mnt',{tr:t.no,st:ST[j].code});if(G.onEv)G.onEv('arr');return}
t.state=t.v<.3?(why?(/KA lain|terkunci|diduduki/.test(why)?'Menunggu pergerakan konflik':'Menunggu otorisasi rute'):'Berhenti'):vt<t.v-.2?'Mengerem':(stopHere&&sp<2500)?'Memasuki stasiun':(nx&&!nx.res.includes(t.id)&&dEnd<2500)?'Mendekati sinyal':'Berjalan';
const ns=t.ns[0];if(ns!=null&&t.sch[ns]&&G.t>t.sch[ns].a)t.delay=Math.max(t.delay,(G.t-t.sch[ns].a)/60)}
function spawn(e){const s=SVC[e.si],d=e.d,a=d?s.b:s.a,b=d?s.a:s.b,S=SEC[d],k0=S.findIndex(x=>x.Z&&x.i===a),z=S[k0];
const trk=z.res[0]==null&&!z.fail[0]?0:(z.res[1]==null&&!z.fail[1]?1:-1);if(trk<0||z.sw.lock)return false;
const asc=d?-1:1,stops=s.stop.concat([b]).sort((x,y)=>(x-y)*(d?-1:1));
const t={id:++G.idc,no:s.no+d,name:s.n,cat:s.c,p:s.p,vmax:s.v,fr:s.p===1,d,si:e.si,u:(z.u0+z.u1)/2+.15,v:0,vt:0,len:s.p===1?.5:.4,k:k0,trk:{[k0]:trk},stops:new Set(stops),ns:stops.slice(),a,b,sch:{},dw:{k:k0,arr:e.t,end:e.t,org:1},delay:0,why:'',state:'Menunggu keberangkatan',hold:false,yl:-1};
z.res[trk]=t.id;z.sw.pos=trk;let tm=e.t,pv=a;stops.forEach(j=>{tm+=Math.abs(ST[j].km-ST[pv].km)/(.78*s.v)*3600;t.sch[j]={a:tm,d:tm+dwellOf(t)};tm=t.sch[j].d;pv=j});
G.trains.push(t);log('depart','KA '+t.no+' '+t.name+' disiapkan di '+ST[a].name+' tujuan '+ST[b].name,{tr:t.no,st:ST[a].code});return true}
function genSched(){const r=rng(G.seed),q=[];SVC.forEach((s,si)=>{const hw=s.h*60/G.dens;[0,1].forEach(d=>{let t=G.t0+r()*hw;while(t<G.t0+16*3600){q.push({t,si,d});const lc=new Date((t+G.tz*3600)*1000).getUTCHours(),pk=(lc>=6&&lc<9)||(lc>=16&&lc<19);t+=hw*(pk?.75:1.1)*(.85+.3*r())}})});q.sort((a,b)=>a.t-b.t);G.sq=q}
function tick(dt){G.t+=dt;while(G.sq.length&&G.sq[0].t<=G.t){if(spawn(G.sq[0]))G.sq.shift();else{G.sq[0].t=G.t+30;G.sq.sort((a,b)=>a.t-b.t);break}}
G.trains.slice().forEach(t=>step(t,dt));
G.inc.slice().forEach(i=>{if(i.until&&G.t>=i.until)resolveInc(i.id)});if(((G.t|0)%15)===0)assist()}
function adv(s){while(s>0){const d=Math.min(1,s);tick(d);s-=d}}
function reset(){build();G.trains=[];G.log=[];G.inc=[];G.msgs=[];G.am={};G.pref={};G.idc=0;G.sel=null;G.sel2=null;const now=Date.now()/1000;G.t0=now-10800;G.t=G.t0;genSched();const cb=G.onEv;G.onEv=null;for(let i=0;i<10800;i++)tick(1);G.onEv=cb;G.log=[];G.msgs=[];G.am={};log('info','Skenario dimulai (seed '+G.seed+', kepadatan ×'+G.dens+')')}
/* Perintah PPKA */
function manualRoute(d,i,w){const n=SEC[d].find(s=>s.Z&&s.i===i);if(w==null){delete G.pref[d+'_'+i];return{ok:1,m:'Rute manual dihapus; penetapan otomatis berlaku.'}}
if(n.fail[w])return rej(i,TN[w]+' tidak tersedia (gangguan)');if(n.sw.fail&&n.sw.pos!==w)return rej(i,'wesel '+n.sw.id+' rusak, tidak dapat dipindah');
const t=G.trains.find(x=>x.d===d&&x.k===n.k-1&&!x.res);G.pref[d+'_'+i]=w;log('route','PPKA meminta '+TN[w]+' di '+ST[i].name+' arah '+(d?'barat':'timur'),{st:ST[i].code});
const ap=G.trains.filter(x=>x.d===d&&x.k===n.k-1&&!n.res.includes(x.id)).sort((a,b)=>b.u-a.u)[0];
if(ap){const r=req(ap,n);return r?{ok:0,m:'Ditolak: '+r}:{ok:1,m:'Rute dibentuk untuk KA '+ap.no}}return{ok:1,m:'Permintaan diterima (pending): berlaku untuk KA berikutnya.'}}
function rej(i,r){log('reject','Permintaan ditolak: '+r,{st:ST[i].code});return{ok:0,m:'Ditolak: '+r}}
function swCmd(d,k,pos){const n=SEC[d][k],sw=n.sw;if(sw.fail)return{ok:0,m:'Ditolak: wesel rusak/tidak tersedia'};
if(sw.lock){const t=G.trains.find(x=>x.id===sw.lock);return{ok:0,m:'Ditolak: wesel terkunci rute KA '+(t?t.no:'?')+(' (KA masih di area wesel)')}}
if(n.res.some(r=>r)&&sw.pos!==pos)return{ok:0,m:'Ditolak: jalur yang akan dilewati sedang dipesan'};
if(sw.pos===pos)return{ok:1,m:'Wesel sudah pada posisi tersebut'};sw.pos=pos;sw.last=fmt(G.t)+' → '+(pos?'reverse':'normal');log('switch','Wesel '+sw.id+' dioperasikan PPKA → '+(pos?'reverse':'normal'),{id:sw.id});return{ok:1,m:'Wesel '+sw.id+' berpindah ke '+(pos?'reverse':'normal')}}
function trainCmd(t,c){if(c==='hold'){if(!t.dw)return{ok:0,m:'Tidak tersedia: KA hanya dapat ditahan saat berhenti di peron'};t.hold=true;log('hold','KA '+t.no+' ditahan PPKA di '+ST[t.dw.k?SEC[t.d][t.k].i:0].name,{tr:t.no});return{ok:1,m:'Diterima: KA '+t.no+' ditahan'}}
if(c==='resume'){if(!t.hold)return{ok:0,m:'Tidak tersedia: KA tidak sedang ditahan'};t.hold=false;log('hold','KA '+t.no+' dilepas',{tr:t.no});return{ok:1,m:'Diterima: KA dilepas (menunggu kondisi rute)'}}
if(c==='cancel'){terminate(t,1);return{ok:1,m:'Perjalanan dibatalkan'}}return{ok:0,m:'?'}}
function addInc(type,d,i){const n=SEC[d].find(s=>s.Z&&s.i===i),b=SEC[d][n.k+1],id=G.inc.length?G.inc[G.inc.length-1].id+1:1,rec={id,type,d,i,until:G.t+1800};
if(type==='blok'){if(!b)return null;b.fail[0]=1;rec.ref=b.name}else if(type==='wesel'){n.sw.fail=1;rec.ref=n.sw.id}else if(type==='sinyal'){n.sig.fail=1;rec.ref=n.sig.id}else if(type==='lambat'){if(!b)return null;b.lim[0]=30;rec.ref=b.name}else if(type==='peron'){n.fail[1]=1;rec.ref=n.name+' '+TN[1]}
G.inc.push(rec);log('incident','Gangguan aktif #'+id+': '+type+' di '+rec.ref,{st:ST[i].code,id:rec.ref});return rec}
function resolveInc(id){const r=G.inc.find(x=>x.id===id);if(!r)return;const n=SEC[r.d].find(s=>s.Z&&s.i===r.i),b=SEC[r.d][n.k+1];
if(r.type==='blok')b.fail[0]=0;if(r.type==='wesel')n.sw.fail=0;if(r.type==='sinyal')n.sig.fail=0;if(r.type==='lambat')b.lim[0]=999;if(r.type==='peron')n.fail[1]=0;G.inc=G.inc.filter(x=>x!==r);log('incident','Gangguan #'+id+' selesai ('+r.type+' di '+r.ref+')',{st:ST[r.i].code})}
function aspect(s){const n=SEC[s.d][s.k+1];if(!n)return'R';if(s.sig.fail)return'R';if(!n.res.some(r=>r))return'R';const n2=SEC[s.d][s.k+2];return(!n2||n2.res.some(r=>r))?'G':'Y'}
function eta(t,j){const dist=Math.abs(ST[j].km-kmOf(t.d,t.u));return G.t+dist*1000/Math.max(t.v,t.vmax/3.6*.65)+(t.dw?Math.max(0,t.dw.end-G.t):0)}
/* Asisten PPKA: hanya memberi saran; mesin interlocking tetap otoritatif. */
function say(key,lvl,txt,why){if(G.am[key]||!G.sug)return;G.am[key]=1;G.msgs.unshift({t:G.t,lvl,txt,why});if(G.msgs.length>60)G.msgs.pop();if(G.onEv&&lvl==='warn')G.onEv('warn')}
function assist(){G.trains.forEach(t=>{if(t.why&&t.v<.3){const s=SEC[t.d][t.k];say(t.id+t.why+t.k,'warn','KA '+t.no+' '+t.name+' menunggu di '+s.name+': '+t.why+'.','Saran: '+(t.hold?'lepas KA bila kondisi aman.':'tahan di sinyal hingga rute tersedia; interlocking tidak akan memberi aspek hijau sebelum syarat terpenuhi.'))}
if(t.delay>=4&&t.ns[0]!=null){const j=t.ns[0];say('d'+t.id+j,'info','Estimasi keterlambatan KA '+t.no+' tiba di '+ST[j].name+': '+t.delay.toFixed(0)+' mnt.','Dihitung dari selisih jadwal ilustratif dan ETA saat ini ('+fmt(eta(t,j),0)+'). KA berikutnya di lintas ini bisa ikut tertahan.')}});
for(let d=0;d<2;d++)ST.forEach(s=>{const near=G.trains.filter(t=>t.d===d&&Math.abs(kmOf(d,t.u)-s.km)<25);if(near.length>=3)say('c'+d+s.i+((G.t/1800)|0),'warn',near.length+' KA mendekati '+s.name+' dalam jendela konflik (±25 km).','Persimpangan padat: gunakan Sepur 1 (belok) untuk KA lambat agar KA prioritas tinggi mendahului.')});
G.trains.forEach(t=>{if(t.p<=3&&!t.dw){const j=t.ns[0]??t.b,f=G.trains.find(o=>o.d===t.d&&o.p>t.p&&o.u<t.u&&t.u-o.u<20);if(f)say('o'+t.id+f.id+((G.t/900)|0),'info','KA '+f.no+' ('+f.name+') akan menyusul KA '+t.no+'.','Saran: arahkan KA '+t.no+' ke Sepur 1 (belok) di stasiun berikutnya. Mode otomatis melakukannya jika jalur kosong.')}})}
