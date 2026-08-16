const SUPABASE_URL='https://rtmerootcrbkktluevzb.supabase.co';
const SUPABASE_KEY='sb_publishable_7aegPAVKSIfls44fpKr-nA_XDMS7oqA';
const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_KEY);

let session=null,crops=[],tasks=[],logs=[];
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>d?new Intl.DateTimeFormat('es-CR',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00')):'—';
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function showAuth(isAuth){$('authView').classList.toggle('hidden',isAuth);$('appView').classList.toggle('hidden',!isAuth);$('logoutBtn').classList.toggle('hidden',!isAuth)}
function msg(text,bad=false){$('authMessage').textContent=text;$('authMessage').style.color=bad?'#9b4138':'#286146'}

async function bootstrap(){
  const {data}=await db.auth.getSession();session=data.session;showAuth(!!session);
  if(session) await refreshAll();
  db.auth.onAuthStateChange(async(_,s)=>{session=s;showAuth(!!s);if(s)await refreshAll()});
  if('serviceWorker'in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

$('authForm').addEventListener('submit',async e=>{e.preventDefault();msg('Entrando…');const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});msg(error?error.message:'Listo',!!error)});
$('signupBtn').addEventListener('click',async()=>{msg('Creando cuenta…');const {error}=await db.auth.signUp({email:$('email').value.trim(),password:$('password').value});msg(error?error.message:'Cuenta creada. Si Supabase pide confirmación, revisa tu correo.',!!error)});
$('logoutBtn').addEventListener('click',()=>db.auth.signOut());

async function refreshAll(){
  const uid=session.user.id;
  const [c,t,l]=await Promise.all([
    db.from('crops').select('*').eq('owner_id',uid).order('sowing_date',{ascending:false}),
    db.from('tasks').select('*').eq('owner_id',uid).order('due_date'),
    db.from('crop_logs').select('*').eq('owner_id',uid).order('occurred_at',{ascending:false}).limit(100)
  ]);
  crops=c.data||[];tasks=t.data||[];logs=l.data||[];render();
}

function render(){
  $('cropCount').textContent=crops.length;
  $('pendingCount').textContent=tasks.filter(x=>!x.completed_at).length;
  const sown=crops.reduce((a,c)=>a+(c.quantity_sown||0),0),germ=crops.reduce((a,c)=>a+(c.quantity_germinated||0),0);
  $('germinationRate').textContent=sown&&crops.some(c=>c.quantity_germinated!=null)?Math.round(germ/sown*100)+'%':'—';
  renderCrops();renderTasks();renderLogs();renderCalendar();fillCropSelects();
}

function renderCrops(){
  const box=$('cropList');if(!crops.length){box.innerHTML='<div class="empty">Todavía no hay cultivos. Pulsa <b>+ Nuevo</b> para registrar tu primera siembra.</div>';return}
  box.innerHTML=crops.map(c=>`<article class="card"><div class="card-top"><div><h3>${esc(c.name)}</h3><div class="meta">${esc(c.variety||'Sin variedad')} · Sembrado ${fmt(c.sowing_date)}</div></div><span class="pill">${esc(c.status||'sembrado')}</span></div><p class="meta">🌱 ${c.quantity_germinated??'—'} germinadas de ${c.quantity_sown} · 📍 ${esc(c.location||'Sin ubicación')}</p>${c.notes?`<p>${esc(c.notes)}</p>`:''}<div class="card-actions"><button onclick="setGerminated('${c.id}',${c.quantity_sown})">Germinación</button><button class="secondary" onclick="quickLog('${c.id}')">Registrar</button><button class="danger" onclick="deleteCrop('${c.id}')">Eliminar</button></div></article>`).join('');
}

function renderTasks(){
  const box=$('taskList');if(!tasks.length){box.innerHTML='<div class="empty">No hay tareas todavía.</div>';return}
  box.innerHTML=tasks.map(t=>`<article class="card"><div class="card-top"><div><h3>${esc(t.title)}</h3><div class="meta">${fmt(t.due_date)} · ${esc(t.task_type)}</div></div><span class="pill">${t.completed_at?'Hecha':'Pendiente'}</span></div><div class="card-actions">${t.completed_at?'':`<button onclick="completeTask('${t.id}')">Completar</button>`}</div></article>`).join('');
}

function renderLogs(){
  const box=$('logList');if(!logs.length){box.innerHTML='<div class="empty">Aquí aparecerán riegos, fertilizaciones, observaciones y cosechas.</div>';return}
  const cropName=id=>crops.find(c=>c.id===id)?.name||'Cultivo';
  box.innerHTML=logs.map(l=>`<article class="card"><div class="card-top"><div><h3>${esc(cropName(l.crop_id))}</h3><div class="meta">${esc(l.log_type)} · ${new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(l.occurred_at))}</div></div></div>${l.notes?`<p>${esc(l.notes)}</p>`:''}</article>`).join('');
}

function renderCalendar(){
  const events=[];
  crops.forEach(c=>{
    if(c.expected_germination_start)events.push({date:c.expected_germination_start,title:`${c.name}: inicia ventana de germinación`});
    if(c.expected_germination_end)events.push({date:c.expected_germination_end,title:`${c.name}: fin estimado de germinación`});
    if(c.expected_transplant_date)events.push({date:c.expected_transplant_date,title:`${c.name}: trasplante estimado`});
    if(c.expected_harvest_start)events.push({date:c.expected_harvest_start,title:`${c.name}: posible inicio de cosecha`});
  });
  tasks.filter(t=>!t.completed_at).forEach(t=>events.push({date:t.due_date,title:t.title}));events.sort((a,b)=>a.date.localeCompare(b.date));
  $('calendarList').innerHTML=events.length?events.map(e=>`<div class="timeline-item"><strong>${esc(e.title)}</strong><span>${fmt(e.date)}</span></div>`).join(''):'<div class="empty">Las fechas estimadas y tareas aparecerán aquí.</div>';
}

function fillCropSelects(){
  const opts='<option value="">Sin cultivo</option>'+crops.map(c=>`<option value="${c.id}">${esc(c.name)}${c.variety?' · '+esc(c.variety):''}</option>`).join('');$('taskCrop').innerHTML=opts;
  $('logCrop').innerHTML=crops.map(c=>`<option value="${c.id}">${esc(c.name)}${c.variety?' · '+esc(c.variety):''}</option>`).join('');
}

$('newCropBtn').addEventListener('click',()=>{$('cropDate').value=today();$('cropDialog').showModal()});
$('newTaskBtn').addEventListener('click',()=>{$('taskDate').value=today();$('taskDialog').showModal()});
$('newLogBtn').addEventListener('click',()=>{if(!crops.length)return alert('Primero registra un cultivo.');$('logDialog').showModal()});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));

document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));$(b.dataset.tab).classList.remove('hidden')}));

$('cropForm').addEventListener('submit',async e=>{e.preventDefault();const row={owner_id:session.user.id,name:$('cropName').value.trim(),variety:$('cropVariety').value.trim()||null,quantity_sown:Number($('cropQty').value),sowing_date:$('cropDate').value,status:'sembrado',location:$('cropLocation').value.trim()||null,notes:$('cropNotes').value.trim()||null};const {error}=await db.from('crops').insert(row);if(error)return alert(error.message);$('cropForm').reset();$('cropDialog').close();await refreshAll()});
$('taskForm').addEventListener('submit',async e=>{e.preventDefault();const row={owner_id:session.user.id,crop_id:$('taskCrop').value||null,title:$('taskTitle').value.trim(),task_type:$('taskType').value,due_date:$('taskDate').value};const {error}=await db.from('tasks').insert(row);if(error)return alert(error.message);$('taskForm').reset();$('taskDialog').close();await refreshAll()});
$('logForm').addEventListener('submit',async e=>{e.preventDefault();const row={owner_id:session.user.id,crop_id:$('logCrop').value,log_type:$('logType').value,notes:$('logNotes').value.trim()||null};const {error}=await db.from('crop_logs').insert(row);if(error)return alert(error.message);$('logForm').reset();$('logDialog').close();await refreshAll()});

window.setGerminated=async(id,max)=>{const current=crops.find(c=>c.id===id)?.quantity_germinated??0;const raw=prompt(`¿Cuántas germinaron? (máximo ${max})`,current);if(raw===null)return;const n=Number(raw);if(!Number.isInteger(n)||n<0||n>max)return alert('Cantidad inválida.');const {error}=await db.from('crops').update({quantity_germinated:n,status:n>0?'germinando':'sembrado'}).eq('id',id);if(error)return alert(error.message);await refreshAll()};
window.quickLog=id=>{$('logCrop').value=id;$('logDialog').showModal()};
window.completeTask=async id=>{const {error}=await db.from('tasks').update({completed_at:new Date().toISOString()}).eq('id',id);if(error)return alert(error.message);await refreshAll()};
window.deleteCrop=async id=>{if(!confirm('¿Eliminar este cultivo y su historial relacionado?'))return;const {error}=await db.from('crops').delete().eq('id',id);if(error)return alert(error.message);await refreshAll()};

bootstrap();
