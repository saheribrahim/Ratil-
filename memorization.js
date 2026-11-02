// Memorization mode (hifz)
// ---- حفظ memorization mode: one verse at a time, hidden text, repeat N times ----
let memOn=false,mv=0,rep=0,busy=false,lim=1e9,vs=0,hintIdx=-1,SRc=null,lines=[];
function vList(){return[...new Set(words.map(w=>w.v))]}
function vRange(v){let a=-1,b=-1;words.forEach((w,i)=>{if(w.v===v){if(a<0)a=i;b=i+1}});return[a,b]}
function memShow(){
 lines.forEach((l,k)=>{if(l)l.style.display=memOn&&k!==mv?"none":""});
 $("memBar").style.display=memOn?"flex":"none";
 if(memOn){const[a,b]=vRange(mv);vs=a;lim=b;$("mSt").textContent="الآية "+(mv+1)+" ("+(vList().indexOf(mv)+1)+"/"+vList().length+") · التكرار "+rep+"/"+$("mReps").value}else lim=1e9;
}
function restartSession(){if(!listening||!SRc)return;if(rec){rec.onend=null;try{rec.abort()}catch(_){}}spawn(SRc)}
function memStart(v,keep){
 const[a,b]=vRange(v);if(a<0)return;
 mv=v;if(!keep)rep=0;busy=false;
 for(let i=a;i<b;i++){st[i]="todo";hd[i]=""}
 pos=a;memShow();$("live").textContent="";render();if(!(!keep&&$("mListen").checked&&listenVerse(v)))restartSession();
}
function memReset(){const vl=vList();$("mFrom").innerHTML=vl.map(v=>`<option value="${v}">${v+1}</option>`).join("");if(memOn)memStart(vl[0]);else memShow()}
function memToggle(){memOn=$("hide").checked;if(memOn){const vl=vList(),f=+$("mFrom").value;memStart(vl.includes(f)?f:vl[0])}else memShow();render()}
function memCheck(){
 if(!memOn||busy||pos<lim)return;
 let ok=0,nr=0;const n=lim-vs;for(let i=vs;i<lim;i++){if(st[i]==="ok")ok++;else if(st[i]==="near")nr++}
 const acc=(ok+nr*.5)/n,goal=+$("mReps").value,pass=acc>=.8;busy=true;
 if(pass){rep++;memShow();msg("✅ أحسنت! "+Math.round(acc*100)+"% · التكرار "+rep+"/"+goal)}
 else msg("🔴 "+Math.round(acc*100)+"% — راجع هذه الكلمات: "+words.slice(vs,lim).filter((w,k)=>st[vs+k]!=="ok").map(w=>w.t).join("، ")+" · Review these, then try again");
 setTimeout(()=>{
  if(pass&&rep>=goal){
   const vl=vList(),k=vl.indexOf(mv);
   if(k+1<vl.length){memStart(vl[k+1]);msg("➡️ الآية التالية · Next verse")}
   else{stop();memStart(vl[0]);msg("🎉 ما شاء الله! أتممت الحفظ · You finished")}
  }else memStart(mv,true);
 },pass?1500:3500);
}
$("mFrom").onchange=()=>{if(memOn)memStart(+$("mFrom").value)};
$("mReps").onchange=memShow;
$("mHint").onclick=()=>{if(!memOn||pos>=lim)return;hintIdx=pos;render();setTimeout(()=>{hintIdx=-1;render()},2500)};
