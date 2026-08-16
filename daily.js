// Checklist diario de Mi Huerta. Se reinicia cada fecha y se guarda localmente por dispositivo.
const dailyKey=()=>`mi-huerta-daily-${today()}`;
const dailyDone=()=>{try{return JSON.parse(localStorage.getItem(dailyKey())||'{}')}catch{return {}}};
const taskId=(cropId,type)=>`${cropId}:${type}`;

function dailyTasksFor(c){
  const g=typeof guideFor==='function'?guideFor(c):null;
  const age=typeof daysSince==='function'?daysSince(c.sowing_date):0;
  const germ=c.quantity_germinated||0;
  const items=[];
  const add=(type,icon,title,text,priority='normal')=>items.push({id:taskId(c.id,type),cropId:c.id,crop:c.name,variety:c.variety||'',type,icon,title,text,priority});

  // Observación breve diaria: la base para detectar problemas temprano.
  add('observacion','👀','Revisión visual','Observa color y firmeza de hojas, crecimiento, daño de insectos, hongos o marchitez.','normal');

  if(!g) return items;
  if(!germ){
    add('humedad','💧','Revisar humedad de germinación','Toca la superficie del sustrato. Debe mantenerse húmeda, no encharcada.','important');
    if(age>=g.germ[0]) add('germinacion','🌱','Contar germinación',`Revisa cuántas semillas han germinado. Referencia habitual: días ${g.germ[0]}–${g.germ[1]}.`,age>g.germ[1]?'important':'normal');
    return items;
  }

  add('humedad','💧','Revisar humedad antes de regar','Comprueba el sustrato con el dedo. Riega solo si realmente lo necesita; evita mantenerlo saturado.','important');
  add('plagas','🐛','Revisar plagas y hojas','Mira especialmente el envés de las hojas y brotes tiernos. Registra cualquier daño o plaga que aparezca.','normal');

  if(g.transplant && age>=g.transplant[0] && age<=g.transplant[1]) add('trasplante','🪴','Evaluar trasplante','Comprueba raíces, vigor y hojas verdaderas. Trasplanta solo si la planta está suficientemente fuerte.','important');
  if(age>30){
    const feedAgo=typeof lastLogDays==='function'?lastLogDays(c.id,'fertilizacion'):null;
    if(feedAgo===null||feedAgo>=g.feed) add('nutricion','🌿','Evaluar nutrición','Observa color y vigor. Fertiliza únicamente si corresponde y evita aplicar por rutina sin revisar la planta.','normal');
  }
  if(g.harvest && age>=g.harvest[0]) add('cosecha','🥬','Revisar punto de cosecha',`Por edad del cultivo, revisa tamaño y madurez. Referencia habitual: ${g.harvest[0]}–${g.harvest[1]} días desde siembra.`,'normal');
  return items;
}

function makeDailyChecklist(){return crops.flatMap(dailyTasksFor)}

function renderDailyChecklist(){
  const box=document.getElementById('todayList'), progress=document.getElementById('todayProgress');
  if(!box||typeof crops==='undefined')return;
  const items=makeDailyChecklist(),done=dailyDone(),completed=items.filter(x=>done[x.id]).length;
  if(progress)progress.textContent=`${completed} / ${items.length}`;
  if(!crops.length){box.innerHTML='<div class="empty">Agrega cultivos y aquí aparecerá automáticamente el checklist de cada día.</div>';return}
  const groups=crops.map(c=>({c,items:items.filter(x=>x.cropId===c.id)}));
  box.innerHTML=groups.map(({c,items})=>`<article class="card daily-group"><div class="card-top"><div><h3>${esc(c.name)}${c.variety?' · '+esc(c.variety):''}</h3><div class="meta">Día ${typeof daysSince==='function'?daysSince(c.sowing_date):0} · ${esc(c.location||'Sin ubicación')}</div></div><span class="pill">${items.filter(x=>done[x.id]).length}/${items.length}</span></div><div class="daily-items">${items.map(x=>`<label class="daily-item ${done[x.id]?'done':''}"><input type="checkbox" ${done[x.id]?'checked':''} onchange="toggleDaily('${x.id}',this.checked)"><span class="daily-icon">${x.icon}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></span></label>`).join('')}</div><div class="card-actions"><button class="secondary" onclick="quickLog('${c.id}')">Registrar actividad</button></div></article>`).join('');
}

window.toggleDaily=(id,checked)=>{const d=dailyDone();if(checked)d[id]=new Date().toISOString();else delete d[id];localStorage.setItem(dailyKey(),JSON.stringify(d));renderDailyChecklist()};
const dailyObserver=new MutationObserver(()=>renderDailyChecklist());
window.addEventListener('DOMContentLoaded',()=>{const cropList=document.getElementById('cropList');if(cropList)dailyObserver.observe(cropList,{childList:true,subtree:true});setTimeout(renderDailyChecklist,350)});
