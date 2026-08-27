(()=>{
  function init(){
    const authForm=document.getElementById('authForm');
    const authView=document.getElementById('authView');
    const authMessage=document.getElementById('authMessage');
    if(!authForm||!authView||document.getElementById('magicLinkPasteBox'))return;

    const box=document.createElement('div');
    box.id='magicLinkPasteBox';
    box.className='stack';
    box.style.marginTop='16px';
    box.innerHTML=`
      <div style="text-align:center;opacity:.7">— o configura este dispositivo una sola vez —</div>
      <p style="margin:0">En el correo, mantén presionado el botón/enlace de acceso y elige <strong>Copiar enlace</strong>. Luego vuelve a este ícono de Mi Huerta y pégalo aquí. No abras el enlace en Safari.</p>
      <label>Enlace del correo
        <input id="magicLinkPasteInput" type="url" inputmode="url" autocomplete="off" placeholder="Pega aquí el enlace recibido por correo" />
      </label>
      <button type="button" id="magicLinkPasteBtn" class="secondary">Activar este dispositivo</button>
    `;
    authForm.insertAdjacentElement('afterend',box);

    const setMsg=(text,bad=false)=>{
      if(typeof window.msg==='function')return window.msg(text,bad);
      if(authMessage){authMessage.textContent=text;authMessage.style.color=bad?'#9b4138':'#286146';}
    };

    document.getElementById('magicLinkPasteBtn').addEventListener('click',async()=>{
      const raw=document.getElementById('magicLinkPasteInput').value.trim();
      if(!raw)return setMsg('Pega primero el enlace que recibiste por correo.',true);
      let u;
      try{u=new URL(raw);}catch{return setMsg('Ese texto no parece ser un enlace válido.',true);}
      const tokenHash=u.searchParams.get('token_hash')||u.searchParams.get('token');
      if(!tokenHash)return setMsg('No encontré el código de acceso dentro de ese enlace.',true);
      setMsg('Activando este dispositivo…');
      const {error}=await db.auth.verifyOtp({token_hash:tokenHash,type:'email'});
      if(error)return setMsg(error.message||'No se pudo activar este dispositivo.',true);
      document.getElementById('magicLinkPasteInput').value='';
      setMsg('Listo. Este dispositivo quedó activado y la sesión se guardará aquí.');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();