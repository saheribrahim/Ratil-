// Accounts (stored in this browser) + welcome email via EmailJS -> edit CFG below
// ---- Accounts + welcome email (fill CFG to enable emails via emailjs.com) ----
const CFG={service:"YOUR_SERVICE_ID",template:"YOUR_TEMPLATE_ID",key:"YOUR_PUBLIC_KEY",owner:"ssaheror@gmail.com",adminEmail:"ssaheror@gmail.com"};
const ADMIN_NAMES=["saher","saheribrahim"];
let U={};try{U=JSON.parse(localStorage.getItem("ratil-users")||"{}")}catch(_){ }
const saveU=()=>{try{localStorage.setItem("ratil-users",JSON.stringify(U))}catch(_){ }};
const am=(t,e)=>{$("aMsg").textContent=t;$("aMsg").className=e?"err":""};
let mode="login";
function isAdminUser(u){if(!u)return false;const email=String(u.email||"").toLowerCase();const username=String(u.username||"").toLowerCase();return email===String(CFG.adminEmail||"").toLowerCase()||ADMIN_NAMES.includes(username)||!!u.isAdmin;}
function setMode(m){mode=m;$("tL").classList.toggle("primary",m==="login");$("tS").classList.toggle("primary",m==="signup");$("aU").style.display=m==="signup"?"":"none";$("aE").placeholder=m==="signup"?"Email / البريد الإلكتروني":"Email or username / البريد أو اسم المستخدم";$("aGo").textContent=m==="signup"?"Create account إنشاء حساب":"Log in دخول";am("")}
async function hp(p,salt){try{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}catch(_){return btoa(unescape(encodeURIComponent(salt+p)))} }
async function sendMail(to,subject,message){if(!CFG.service||!CFG.template||!CFG.key)return false;try{const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:CFG.service,template_id:CFG.template,user_id:CFG.key,template_params:{to_email:to,subject,message}})});return r.ok}catch(_){return false}}
function showAdminPanel(){const panel=$("adminPanel");if(!panel)return;const users=Object.values(U).sort((a,b)=>(a.username||"").localeCompare(b.username||""));panel.innerHTML=`<h3 style="margin:0 0 12px;">Admin Panel</h3><ul style="margin:0;padding-left:18px;">${users.length?users.map(u=>`<li style="margin-bottom:8px;"><strong>${u.username||"Unknown"}</strong> — ${u.email||"no-email"}${isAdminUser(u)?" <span style='color:gold;'>[Admin]</span>":""}</li>`).join(""):"<li>No users yet</li>"}</ul>`;panel.style.display="block"}
function hideAdminPanel(){const panel=$("adminPanel");if(panel)panel.style.display="none"}
function enter(u){$("auth").style.display="none";$("me").style.display="block";$("who").textContent=u.username;try{localStorage.setItem("ratil-session",u.email)}catch(_){ };if(isAdminUser(u)){showAdminPanel()}else{hideAdminPanel()}}
$("out").onclick=()=>{stop();try{localStorage.removeItem("ratil-session")}catch(_){ }$("me").style.display="none";$("auth").style.display="flex";$("aP").value="";hideAdminPanel();setMode("login")};
$("tL").onclick=()=>setMode("login");$("tS").onclick=()=>setMode("signup");
$("aGo").onclick=async()=>{
 const id=$("aE").value.trim(),pw=$("aP").value;
 if(mode==="signup"){
  const un=$("aU").value.trim(),em=id.toLowerCase();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return am("Enter a valid email · أدخل بريدًا صحيحًا",1);
  if(!/^[\w\u0600-\u06FF]{3,20}$/.test(un))return am("Username: 3–20 letters or numbers · اسم المستخدم ٣–٢٠ حرفًا",1);
  if(pw.length<6)return am("Password: 6+ characters · كلمة المرور ٦ أحرف على الأقل",1);
  if(U[em]||Object.values(U).some(x=>x.username.toLowerCase()===un.toLowerCase()))return am("Email or username already used · مستخدم من قبل",1);
  const isAdmin=(em===String(CFG.adminEmail||"").toLowerCase()||ADMIN_NAMES.includes(un.toLowerCase()));
  const salt=Math.random().toString(36).slice(2);U[em]={email:em,username:un,salt,h:await hp(pw,salt),isAdmin};saveU();enter(U[em]);
  const ok=await sendMail(em,"أهلاً بك في Ratil | Welcome to Ratil",`أهلاً بك في Ratil، ${un}!\nاسم المستخدم: ${un}\n\nWelcome to Ratil! Your username is: ${un}`);
  if(CFG.owner)sendMail(CFG.owner,"New Ratil signup","Username: "+un+"\nEmail: "+em);
  msg(ok?"Welcome email sent to "+em+".":"Account created. (Welcome email isn’t set up yet.)");
 }else{
  const k=id.toLowerCase(),u=U[k]||Object.values(U).find(x=>x.username.toLowerCase()===k);
  if(!u||await hp(pw,u.salt)!==u.h)return am("Wrong email/username or password · بيانات غير صحيحة",1);
  enter(u);msg("Welcome back, "+u.username+".");
 }
};
try{const s=localStorage.getItem("ratil-session");if(s&&U[s])enter(U[s])}catch(_){ }
setMode("login");
