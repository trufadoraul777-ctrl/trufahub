(() => {
const $ = id => document.getElementById(id);
const config = window.TRUFAHUB_CONFIG || {};
const configured = config.supabaseUrl && config.supabaseAnonKey &&
  !config.supabaseUrl.includes("COLE_") && !config.supabaseAnonKey.includes("COLE_");
let sb = null, mode = "login", currentUser = null, scripts = [], editing = null, sharing = null;
const MAX_FILE = 10 * 1024 * 1024;
const BUCKET = "lua-scripts";
const shareCache = [];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2800)}
function setMessage(id,msg,good=false){$(id).textContent=msg;$(id).style.color=good?"#61dfb8":""}
function bytes(n){if(n<1024)return n+" B";if(n<1024*1024)return (n/1024).toFixed(1)+" KB";return (n/1024/1024).toFixed(2)+" MB"}
function showAuth(){ $("authScreen").classList.remove("hidden");$("app").classList.add("hidden")}
function showApp(){ $("authScreen").classList.add("hidden");$("app").classList.remove("hidden");$("userEmail").textContent=currentUser.email;$("settingsEmail").textContent=currentUser.email;$("projectStatus").textContent="Conectado ao Supabase";loadScripts()}
function setMode(next){mode=next;document.querySelectorAll(".auth-tabs button").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));$("authSubmit").textContent=mode==="login"?"Entrar no painel":"Criar minha conta";$("password").autocomplete=mode==="login"?"current-password":"new-password";setMessage("authMessage","")}
document.querySelectorAll(".auth-tabs button").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
$("authForm").addEventListener("submit",async e=>{e.preventDefault();if(!sb){setMessage("authMessage","Configure primeiro o Supabase seguindo o README.");return}
 const email=$("email").value.trim(),password=$("password").value;$("authSubmit").disabled=true;setMessage("authMessage","Conectando…");
 try{const result=mode==="login"?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});if(result.error)throw result.error;
 if(mode==="signup"&&!result.data.session){setMessage("authMessage","Conta criada! Confirme o e-mail e depois entre.",true);return}
 currentUser=result.data.user;showApp()}catch(err){setMessage("authMessage",err.message||"Não foi possível entrar.")}finally{$("authSubmit").disabled=false}
});
async function logout(){if(sb)await sb.auth.signOut();currentUser=null;scripts=[];showAuth()}
$("logoutBtn").onclick=logout;$("settingsLogout").onclick=logout;
function switchView(view){["scripts","links","settings"].forEach(v=>$(v+"View").classList.toggle("hidden",v!==view));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("pageTitle").textContent=({scripts:"Meus Scripts",links:"Links compartilhados",settings:"Configurações"})[view];if(view==="links")renderShares()}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$("selectFileBtn").onclick=()=>$("fileInput").click();
$("fileInput").addEventListener("change",e=>{uploadFiles(e.target.files);e.target.value=""});
const dz=$("dropZone");["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("dragover")}));["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("dragover")}));dz.addEventListener("drop",e=>uploadFiles(e.dataTransfer.files));
async function uploadFiles(fileList){if(!sb||!currentUser)return toast("Configure o Supabase para hospedar arquivos na nuvem.");const files=[...fileList];for(const file of files){if(!file.name.toLowerCase().endsWith(".lua")){toast(file.name+": selecione somente arquivos .lua");continue}if(file.size>MAX_FILE){toast(file.name+": máximo de 10 MB");continue}
 const id=crypto.randomUUID(),path=`${currentUser.id}/${id}-${file.name.replace(/[^\w.-]/g,"_")}`;
 toast("Enviando "+file.name+"…");
 const {error:upErr}=await sb.storage.from(BUCKET).upload(path,file,{contentType:"text/plain",upsert:false});
 if(upErr){toast("Upload falhou: "+upErr.message);continue}
 const {error:dbErr}=await sb.from("scripts").insert({id:userIdSafe(id),user_id:currentUser.id,name:file.name,storage_path:path,size_bytes:file.size});
 if(dbErr){await sb.storage.from(BUCKET).remove([path]);toast("Não foi possível salvar os dados: "+dbErr.message);continue}
 }await loadScripts()}
function userIdSafe(id){return id}
async function loadScripts(){if(!sb||!currentUser)return;const {data,error}=await sb.from("scripts").select("*").order("created_at",{ascending:false});if(error){toast("Erro ao carregar scripts: "+error.message);return}scripts=data||[];renderScripts();updateStorage()}
function updateStorage(){const total=scripts.reduce((a,s)=>a+(s.size_bytes||0),0);$("fileCount").textContent=scripts.length+" / 20";$("storageText").textContent=bytes(total);$("fileProgress").style.width=Math.min(100,scripts.length/20*100)+"%";$("storageProgress").style.width=Math.min(100,total/(100*1024*1024)*100)+"%"}
function renderScripts(){const query=$("searchInput").value.toLowerCase();let rows=scripts.filter(s=>s.name.toLowerCase().includes(query));const sort=$("sortSelect").value;if(sort==="name")rows.sort((a,b)=>a.name.localeCompare(b.name));if(sort==="size")rows.sort((a,b)=>(b.size_bytes||0)-(a.size_bytes||0));$("listCount").textContent=rows.length;
 if(!rows.length){$("scriptList").innerHTML=`<div class="empty"><div>⌘</div><h3>${scripts.length?"Nenhum resultado":"Nenhum script por aqui ainda"}</h3><p>${scripts.length?"Tente outra busca.":"Envie seu primeiro arquivo .lua para começar."}</p></div>`;return}
 $("scriptList").innerHTML=rows.map(s=>`<div class="script-row"><div class="file-icon">&lt;/&gt;</div><div class="file-main"><b>${esc(s.name)}</b><small>${bytes(s.size_bytes||0)} · ${new Date(s.updated_at||s.created_at).toLocaleString("pt-BR")} <span class="tag">Lua</span></small></div><div class="row-actions"><button class="small-btn" data-action="edit" data-id="${s.id}">✎ <span class="long">Editar</span></button><button class="small-btn share" data-action="share" data-id="${s.id}" title="Criar link temporário">↗</button><button class="small-btn" data-action="download" data-id="${s.id}" title="Baixar">↓</button><button class="small-btn" data-action="delete" data-id="${s.id}" title="Excluir">⋯</button></div></div>`).join("");
}
$("searchInput").addEventListener("input",renderScripts);$("sortSelect").addEventListener("change",renderScripts);
$("scriptList").addEventListener("click",async e=>{const b=e.target.closest("button[data-action]");if(!b)return;const s=scripts.find(x=>x.id===b.dataset.id);if(!s)return;const action=b.dataset.action;
 if(action==="edit")openEditor(s);if(action==="share")openShare(s);if(action==="download")await downloadScript(s);if(action==="delete"){if(confirm(`Excluir ${s.name}? Essa ação não pode ser desfeita.`))await deleteScript(s)}
});
async function getContent(s){const {data,error}=await sb.storage.from(BUCKET).download(s.storage_path);if(error)throw error;return await data.text()}
function openEditor(s){editing=s;$("editorFilename").textContent=s.name;$("editorMeta").textContent=bytes(s.size_bytes||0)+" · arquivo privado";$("codeEditor").value="Carregando código…";$("editorModal").classList.remove("hidden");$("editorStatus").textContent="Carregando…";getContent(s).then(t=>{$("codeEditor").value=t;$("editorStatus").textContent="Lua · UTF-8"}).catch(err=>{$("codeEditor").value="";toast("Não foi possível abrir: "+err.message)})}
$("saveScriptBtn").onclick=async()=>{if(!editing)return;const content=$("codeEditor").value,blob=new Blob([content],{type:"text/plain"});if(blob.size>MAX_FILE)return toast("O arquivo excede 10 MB");$("saveScriptBtn").disabled=true;
 const {error:upErr}=await sb.storage.from(BUCKET).update(editing.storage_path,blob,{contentType:"text/plain",upsert:false});
 if(upErr){$("saveScriptBtn").disabled=false;return toast("Erro ao salvar: "+upErr.message)}
 const {error:dbErr}=await sb.from("scripts").update({size_bytes:blob.size,updated_at:new Date().toISOString()}).eq("id",editing.id);
 $("saveScriptBtn").disabled=false;if(dbErr)return toast("Arquivo salvo, mas não foi possível atualizar os metadados.");$("editorModal").classList.add("hidden");toast("Script salvo com sucesso");await loadScripts()
};
async function downloadScript(s){try{const {data,error}=await sb.storage.from(BUCKET).download(s.storage_path);if(error)throw error;const url=URL.createObjectURL(data),a=document.createElement("a");a.href=url;a.download=s.name;a.click();URL.revokeObjectURL(url)}catch(err){toast("Download falhou: "+err.message)}}
async function deleteScript(s){const {error}=await sb.storage.from(BUCKET).remove([s.storage_path]);if(error)return toast("Erro ao excluir arquivo: "+error.message);const {error:dbErr}=await sb.from("scripts").delete().eq("id",s.id);if(dbErr)return toast("Arquivo removido, mas falhou ao limpar metadados.");toast("Script excluído");await loadScripts()}
function openShare(s){sharing=s;$("shareResult").classList.add("hidden");setMessage("shareMessage","");$("shareModal").classList.remove("hidden")}
$("createShareBtn").onclick=async()=>{if(!sharing)return;const expires=Number($("shareExpiry").value);const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(sharing.storage_path,expires, {download:sharing.name});if(error){setMessage("shareMessage",error.message);return}const url=data.signedUrl;$("shareUrl").value=url;$("shareResult").classList.remove("hidden");setMessage("shareMessage","Link temporário criado. Qualquer pessoa com o link poderá ler o arquivo até expirar.",true);shareCache.unshift({name:sharing.name,url,expiresAt:Date.now()+expires*1000});renderShares()};
$("copyShareBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("shareUrl").value);toast("Link copiado")}catch{ $("shareUrl").select();document.execCommand("copy");toast("Link copiado")}};
function renderShares(){const box=$("shareList");if(!shareCache.length){box.innerHTML='<p class="muted">Nenhum link gerado nesta sessão. Para compartilhar, abra um script e clique no ícone ↗.</p>';return}box.innerHTML=shareCache.map((x,i)=>`<div class="share-item"><div><b>${esc(x.name)}</b><small>Expira em ${new Date(x.expiresAt).toLocaleString("pt-BR")}</small></div><button class="small-btn" data-copy-share="${i}">Copiar link</button></div>`).join("")}
$("shareList").addEventListener("click",async e=>{const b=e.target.closest("[data-copy-share]");if(!b)return;const x=shareCache[Number(b.dataset.copyShare)];if(x)try{await navigator.clipboard.writeText(x.url);toast("Link copiado")}catch{toast("Não foi possível copiar automaticamente")}});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close==="editor"?"editorModal":"shareModal").classList.add("hidden")));
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal").forEach(m=>m.classList.add("hidden"));if(e.key==="Tab"&&e.target===$("codeEditor")&&e.shiftKey===false){/* preserve normal tab navigation */}});
if(configured&&window.supabase){sb=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);sb.auth.getSession().then(({data})=>{if(data.session){currentUser=data.session.user;showApp()}else showAuth()});sb.auth.onAuthStateChange((_event,session)=>{if(session){currentUser=session.user;if($("app").classList.contains("hidden"))showApp()}else if(currentUser){currentUser=null;showAuth()}})}else{$("projectStatus").textContent="Supabase ainda não configurado";showAuth();setMessage("authMessage","Configure config.js e o banco seguindo o README.")}
})();