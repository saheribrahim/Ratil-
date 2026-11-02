// Tajweed colors (rule-based, Hafs-style)
const TJ={q:"#2d7ff9",g:"#f08a24",m:"#a259ff",iq:"#e84393",ik:"#b5651d",ig:"#0ea5c6",id:"#7cb342"};
const TJN=[["q","قلقلة Qalqalah"],["g","غنة Ghunnah"],["m","مد Madd"],["iq","إقلاب Iqlab"],["ik","إخفاء Ikhfa"],["ig","إدغام بغنة Idgham + ghunnah"],["id","إدغام بلا غنة Idgham, no ghunnah"]];
$("legend").innerHTML=TJN.map(([k,n])=>`<span><b style="color:${TJ[k]}">●</b> ${n}</span>`).join("")+`<small>Colors are generated automatically from the text’s spelling (Hafs-style rules). They are a study aid, not a replacement for a teacher or a printed tajweed mushaf.</small>`;
function tj(t,nx){
 const cl=[];const re=/([\u0621-\u064A\u0671])([^\u0621-\u064A\u0671]*)/g;let m;
 while(m=re.exec(t))cl.push([m[1],m[2]]);
 if(!cl.length)return t;
 const first=s=>{const x=(s||"").match(/[\u0621-\u064A\u0671]/);return x?x[0]:""};
 const L=cl.length;
 return cl.map(([b,mk],i)=>{
  let c="";
  const end=i>=L-1||(i===L-2&&/[اى]/.test(cl[L-1][0])&&!cl[L-1][1]);
  if("قطبجد".includes(b)&&mk.includes("\u0652"))c="q";
  else if("نم".includes(b)&&mk.includes("\u0651")){
   const shams=b==="ن"&&i>=2&&cl[i-1][0]==="ل"&&/[ا\u0671]/.test(cl[i-2][0])&&!/[\u064E-\u0650]/.test(cl[i-1][1]);
   if(!shams)c="g";
  }
  else if(mk.includes("\u0653")||b==="آ")c="m";
  else{
   const tan=/[\u064B-\u064D]/.test(mk)&&end;
   const ns=b==="ن"&&!/[\u064E-\u0651\u0670]/.test(mk);
   if(tan||ns){
    const cross=i===L-1||tan;
    const nb=cross?first(nx):cl[i+1][0];
    if(nb==="ب")c="iq";
    else if(nb&&"صذثكجشقسدطزفتضظ".includes(nb))c="ik";
    else if(cross&&nb){if("ينمو".includes(nb))c="ig";else if("لر".includes(nb))c="id"}
   }
  }
  return c?`<i style="color:${TJ[c]}">${b+mk}</i>`:b+mk;
 }).join("");
}
function paint(){const on=$("tjw").checked;words.forEach((w,i)=>{w.m=false;if(on){const nx=words[i+1]&&words[i+1].v===w.v?words[i+1].t:"";w.el.innerHTML=tj(w.t,nx)}else w.el.textContent=w.t});$("legend").style.display=on?"flex":"none"}
$("tjw").onchange=()=>{paint();render()};
