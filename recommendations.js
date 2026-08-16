// Recomendaciones locales para Mi Huerta.
// Se calculan a partir de cultivo, fecha de siembra, germinación e historial.

const CROP_GUIDES = {
  tomate: { germ:[5,10], transplant:[25,40], water:2, feed:14, harvest:[70,100], tips:['Mantén humedad constante sin encharcar.','Cuando tenga hojas verdaderas, dale buena luz y ventilación.','En floración evita exceso de nitrógeno y vigila hongos en follaje.'] },
  zucchini: { germ:[4,10], transplant:[18,28], water:2, feed:14, harvest:[45,65], tips:['Prefiere sol y suelo húmedo, pero con buen drenaje.','Vigila oídio en hojas y buena circulación de aire.','Cosecha frutos tiernos con frecuencia para estimular producción.'] },
  kale: { germ:[4,10], transplant:[25,35], water:3, feed:21, harvest:[55,80], tips:['Mantén humedad uniforme durante el desarrollo.','Revisa el envés de las hojas por orugas y áfidos.','Puedes cosechar primero las hojas exteriores.'] },
  'pak choi': { germ:[3,8], transplant:[18,25], water:2, feed:18, harvest:[35,55], tips:['Evita que el sustrato se seque por completo.','El estrés por calor o sequedad puede adelantar la floración.','Revisa babosas y daño en hojas tiernas.'] },
  arugula: { germ:[3,8], transplant:null, water:2, feed:21, harvest:[25,45], tips:['Mantén humedad ligera y uniforme.','Cosecha hojas jóvenes para sabor más suave.','Si hace mucho calor, algo de sombra de tarde puede ayudar.'] },
  'arúgula': { germ:[3,8], transplant:null, water:2, feed:21, harvest:[25,45], tips:['Mantén humedad ligera y uniforme.','Cosecha hojas jóvenes para sabor más suave.','Si hace mucho calor, algo de sombra de tarde puede ayudar.'] },
  albahaca: { germ:[5,12], transplant:[25,35], water:2, feed:21, harvest:[45,70], tips:['Necesita buena luz y temperaturas cálidas.','Pinza las puntas para estimular una planta más ramificada.','Evita mojar el follaje por la noche.'] },
  lechuga: { germ:[3,10], transplant:[20,30], water:2, feed:18, harvest:[40,70], tips:['Prefiere humedad constante y temperaturas moderadas.','El calor y la sequedad favorecen el espigado.','Cosecha hojas externas o la planta completa según la variedad.'] },
  'chile dulce': { germ:[7,21], transplant:[35,55], water:3, feed:14, harvest:[80,120], tips:['La germinación mejora con temperatura cálida y estable.','Trasplanta cuando la planta esté fuerte y con varias hojas verdaderas.','Durante floración y fructificación mantén riego uniforme.'] },
  eneldo: { germ:[7,14], transplant:null, water:3, feed:30, harvest:[40,70], tips:['Prefiere siembra directa porque no le gusta mucho el trasplante.','Evita exceso de fertilización nitrogenada.','Corta hojas antes de la floración para mayor aroma.'] },
  zanahoria: { germ:[7,21], transplant:null, water:2, feed:30, harvest:[70,100], tips:['Mantén la superficie húmeda durante la germinación.','Aclara plántulas para que las raíces tengan espacio.','Evita exceso de nitrógeno porque favorece follaje sobre raíz.'] }
};

const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const daysSince = d => d ? Math.max(0, Math.floor((new Date(today()+'T12:00:00') - new Date(d+'T12:00:00')) / 86400000)) : 0;
const lastLogDays = (cropId,type) => {
  const hit = logs.find(l => l.crop_id===cropId && l.log_type===type);
  if(!hit) return null;
  return Math.floor((Date.now()-new Date(hit.occurred_at).getTime())/86400000);
};

function guideFor(crop){
  const n=norm(crop.name);
  if(n.includes('tomate')) return CROP_GUIDES.tomate;
  if(n.includes('zucchini')||n.includes('calabacin')) return CROP_GUIDES.zucchini;
  if(n.includes('kale')) return CROP_GUIDES.kale;
  if(n.includes('pak choi')||n.includes('bok choy')) return CROP_GUIDES['pak choi'];
  if(n.includes('arugula')) return CROP_GUIDES.arugula;
  if(n.includes('albahaca')) return CROP_GUIDES.albahaca;
  if(n.includes('lechuga')) return CROP_GUIDES.lechuga;
  if(n.includes('chile dulce')||n.includes('pimiento')) return CROP_GUIDES['chile dulce'];
  if(n.includes('eneldo')) return CROP_GUIDES.eneldo;
  if(n.includes('zanahoria')) return CROP_GUIDES.zanahoria;
  return {germ:[5,14],transplant:[25,45],water:3,feed:21,harvest:null,tips:['Observa humedad, color de hojas y crecimiento para ajustar el manejo.','Registra riegos, fertilizaciones y problemas para recibir alertas más útiles.']};
}

function makeRecommendations(){
  const out=[];
  crops.forEach(c=>{
    const g=guideFor(c), age=daysSince(c.sowing_date), germ=c.quantity_germinated, sown=c.quantity_sown||0;
    const base={cropId:c.id,crop:c.name,variety:c.variety||'',age};

    if(germ==null || germ===0){
      if(age>=g.germ[1]) out.push({...base,level:'important',icon:'🌱',title:'Revisar germinación',text:`Han pasado ${age} días desde la siembra. Para ${c.name}, la germinación normalmente ya debería ser visible. Revisa humedad, temperatura y estado de la semilla.`});
      else if(age>=g.germ[0]) out.push({...base,level:'preventive',icon:'👀',title:'Ventana de germinación',text:`Está entrando en su ventana habitual de germinación (${g.germ[0]}–${g.germ[1]} días). Mantén humedad uniforme y revisa diariamente.`});
      else out.push({...base,level:'normal',icon:'🌱',title:'Esperando germinación',text:`Día ${age} desde la siembra. La ventana habitual empieza alrededor del día ${g.germ[0]}.`});
    } else if(sown && germ/sown < .6 && age>g.germ[1]+3){
      out.push({...base,level:'preventive',icon:'📉',title:'Germinación baja',text:`Han germinado ${germ} de ${sown}. Conviene revisar semilla, humedad y condiciones antes de resembrar los espacios faltantes.`});
    }

    if(g.transplant && age>=g.transplant[0] && age<=g.transplant[1] && germ>0){
      out.push({...base,level:'preventive',icon:'🪴',title:'Evaluar trasplante',text:`Por edad, ${c.name} está en una ventana razonable para evaluar trasplante. Confirma que tenga buen sistema radicular y varias hojas verdaderas.`});
    }

    const waterAgo=lastLogDays(c.id,'riego');
    if(germ>0 && waterAgo===null) out.push({...base,level:'normal',icon:'💧',title:'Registra el riego',text:'No hay riegos registrados. Anotarlos permitirá que la app te avise mejor cuando pase demasiado tiempo.'});
    else if(waterAgo!==null && waterAgo>g.water+1) out.push({...base,level:'preventive',icon:'💧',title:'Revisar humedad',text:`El último riego registrado fue hace ${waterAgo} días. Antes de regar, revisa la humedad del sustrato; si está seco a poca profundidad, puede necesitar agua.`});

    const feedAgo=lastLogDays(c.id,'fertilizacion');
    if(germ>0 && age>30 && feedAgo!==null && feedAgo>g.feed) out.push({...base,level:'normal',icon:'🌿',title:'Revisar nutrición',text:`Han pasado ${feedAgo} días desde la última fertilización registrada. Observa vigor y color de hojas antes de aplicar más nutrientes.`});

    if(g.harvest && age>=g.harvest[0] && age<=g.harvest[1]+15){
      out.push({...base,level:'normal',icon:'🥬',title:'Acercándose a cosecha',text:`Con ${age} días desde siembra, entra en una referencia habitual de cosecha (${g.harvest[0]}–${g.harvest[1]} días). Revisa tamaño, madurez y variedad.`});
    }

    if(age%7===0 && g.tips?.length){
      out.push({...base,level:'normal',icon:'💡',title:'Consejo de manejo',text:g.tips[Math.floor(age/7)%g.tips.length]});
    }
  });
  const rank={important:0,preventive:1,normal:2};
  return out.sort((a,b)=>rank[a.level]-rank[b.level] || b.age-a.age);
}

function renderRecommendations(){
  const box=document.getElementById('recommendationList');
  const count=document.getElementById('alertCount');
  if(!box||typeof crops==='undefined'||typeof logs==='undefined') return;
  const items=makeRecommendations();
  const actionable=items.filter(x=>x.level!=='normal').length;
  if(count) count.textContent=actionable;
  if(!crops.length){box.innerHTML='<div class="empty">Agrega cultivos para recibir recomendaciones personalizadas.</div>';return;}
  if(!items.length){box.innerHTML='<div class="empty">Todo se ve al día. Sigue registrando actividades para afinar las recomendaciones.</div>';return;}
  box.innerHTML=items.map(r=>`<article class="card recommendation ${r.level}"><div class="card-top"><div><div class="rec-kicker">${r.icon} ${esc(r.crop)}${r.variety?' · '+esc(r.variety):''}</div><h3>${esc(r.title)}</h3></div><span class="pill rec-pill">${r.level==='important'?'Importante':r.level==='preventive'?'Preventiva':'Consejo'}</span></div><p>${esc(r.text)}</p><div class="card-actions"><button class="secondary" onclick="openRecLog('${r.cropId}')">Registrar actividad</button></div></article>`).join('');
}

window.openRecLog=id=>{
  const tab=[...document.querySelectorAll('.tab')].find(x=>x.dataset.tab==='logs');
  if(tab) tab.click();
  if(typeof quickLog==='function') quickLog(id);
};

const recObserver=new MutationObserver(()=>renderRecommendations());
window.addEventListener('DOMContentLoaded',()=>{
  const cropList=document.getElementById('cropList');
  if(cropList) recObserver.observe(cropList,{childList:true,subtree:true});
  setTimeout(renderRecommendations,300);
});
