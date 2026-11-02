// Tap a word / verse audio (everyayah.com, Quran.com) and device voice
// ---- tap a word: hear the correct pronunciation ----
let hd=[],aud=null,cur=null;
const p3=n=>String(n).padStart(3,"0");
function stopAudio(){try{if(aud){aud.pause();aud=null}speechSynthesis.cancel()}catch(_){}}
function tts(txt){try{const u=new SpeechSynthesisUtterance(txt);u.lang="ar-SA";u.rate=.7;const v=(speechSynthesis.getVoices()||[]).find(x=>/^ar/i.test(x.lang));if(v)u.voice=v;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(_){}}
function playUrl(url,fb){stopAudio();try{aud=new Audio(url);aud.onerror=()=>{if(fb)fb()};const p=aud.play();if(p&&p.catch)p.catch(()=>{if(fb)fb()})}catch(_){if(fb)fb()}}
function sayWord(){if(!cur)return;if(!cur.hafs)return tts(cur.t);playUrl("https://audio.qurancdn.com/wbw/"+p3(cur.s)+"_"+p3(cur.a)+"_"+p3(cur.wn)+".mp3",()=>tts(cur.t))}
function explain(i){
 const w=words[i];if(listening){stop();msg("توقّف الميكروفون. اضغط Start للمتابعة. Mic paused — tap Start to continue.")}
 let wn=0;for(let k=0;k<=i;k++)if(words[k].v===w.v)wn++;
 cur={s:+$("surah").value,a:w.v+1,wn,t:w.t,riw:$("riwaya").value,hafs:$("riwaya").value==="حفص عن عاصم"};fillRec();
 const lab={ok:"✅ نطقتها صح · Correct",near:"🟡 قريبة · Close",miss:"🔴 غلط أو تخطيتها · Missed",todo:""}[st[i]]||"";
 $("sW").textContent=w.t;
 $("sI").textContent=lab+(hd[i]&&st[i]!=="ok"?"  ·  سمعتك: "+hd[i]:"");
 $("sheet").style.display="block";sayWord();
}
$("sPlay").onclick=sayWord;
$("sClose").onclick=()=>{stopAudio();$("sheet").style.display="none";cur=null};
$("text").onclick=e=>{const el=e.target.closest(".w");if(!el)return;const i=words.findIndex(w=>w.el===el);if(i>=0)explain(i)};
// ---- verse audio per riwaya (everyayah.com), sharper recognition, memorization helpers ----
const HM={};
const RECS={"حفص عن عاصم":[["Alafasy_128kbps","مشاري العفاسي"],["Husary_128kbps","الحصري"],["Hudhaify_128kbps","الحذيفي"],["Abdul_Basit_Murattal_192kbps","عبد الباسط"]],"ورش":[["warsh/warsh_yassin_al_jazaery_64kbps","ياسين الجزائري"],["warsh/warsh_ibrahim_aldosary_128kbps","إبراهيم الدوسري"],["warsh/warsh_Abdul_Basit_128kbps","عبد الباسط"]]};
function playQueue(urls,fb,done){stopAudio();let i=0,fin=false;const end=ok=>{if(fin)return;fin=true;if(!ok&&fb)fb();if(done)done()};const next=()=>{if(i>=urls.length)return end(true);try{aud=new Audio(urls[i++]);aud.onended=next;aud.onerror=()=>end(false);const p=aud.play();if(p&&p.catch)p.catch(()=>end(false))}catch(_){end(false)}};next()}
function verseUrls(s,a,riw,folder){
 const rl=RECS[riw];if(!rl)return null;
 const f=folder||rl[0][0];
 const nums=riw==="حفص عن عاصم"?[a]:(((HM[riw]||{})[s]||[])[a-1]||[]);
 return nums.length?nums.map(n=>"https://everyayah.com/data/"+f+"/"+p3(s)+p3(n)+".mp3"):null;
}
function fillRec(){const rl=RECS[cur.riw]||[];$("sRec").innerHTML=rl.map(([f,n])=>`<option value="${f}">${n}</option>`).join("");$("sRec").style.display=rl.length?"":"none"}
$("sVerse").onclick=()=>{if(!cur)return;const u=verseUrls(cur.s,cur.a,cur.riw,$("sRec").value);if(u)playQueue(u,()=>msg("تعذّر تشغيل الصوت. Audio unavailable.",1));else{tts(words.filter(w=>w.v===cur.a-1).map(w=>w.t).join(" "));msg("لا يوجد صوت قارئ لهذه الرواية بعد، تُقرأ بصوت الجهاز. No reciter audio for this riwaya yet.",1)}};
function listenVerse(v){
 const u=verseUrls(+$("surah").value,v+1,$("riwaya").value,"");
 if(!u)return false;
 const was=listening;if(was)stop();
 msg("🔊 استمع للآية ثم رتّلها · Listen first, then recite");
 playQueue(u,null,()=>{if(was)start()});
 return true;
}
