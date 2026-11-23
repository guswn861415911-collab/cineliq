(() => {
 'use strict';
 const root=document.documentElement,system=matchMedia('(prefers-color-scheme: dark)'),valid=value=>['dark','light','system'].includes(value);
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 let user=null,version=0,busy=false,mode=read('cineliq.theme.guest')||'dark';if(!valid(mode))mode='dark';
 const key=()=>user?'cineliq.theme.'+user.id:'cineliq.theme.guest';
 function apply(){root.dataset.theme=mode==='system'?(system.matches?'dark':'light'):mode;root.dataset.themePreference=mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',root.dataset.theme==='dark'?'#0b0b0b':'#fafafa');
  document.querySelectorAll('[data-theme-control]').forEach(control=>{control.value=mode;control.disabled=busy;});
 }
 async function change(next){if(!valid(next)||busy)return;const current=version,id=user?.id,old=mode,storageKey=key();mode=next;busy=true;apply();
  try{if(id){const updated=await window.CINELIQ_CLOUD.members.updateTheme(next,id);if(current!==version)return;user=updated;}if(current===version){write(storageKey,next);document.querySelector('#themeStatus')?.replaceChildren(document.createTextNode('화면 모드를 저장했어요.'));}}
  catch{if(current===version){mode=old;document.querySelector('#themeStatus')?.replaceChildren(document.createTextNode('저장하지 못해 이전 화면 모드로 되돌렸어요.'));}}
  finally{if(current===version){busy=false;apply();}}
 }
 window.CINELIQ_THEME={sync(next){const changed=user?.id!==next?.id;if(changed){version++;busy=false;}user=next;const preferred=user?.user_metadata?.cineliq_preferences?.theme;mode=valid(preferred)?preferred:(read(key())||read('cineliq.theme.guest')||'dark');if(!valid(mode))mode='dark';apply();},change};
 system.addEventListener('change',()=>{if(mode==='system')apply();});
 document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('[data-theme-control]').forEach(control=>control.addEventListener('change',()=>void change(control.value)));apply();});apply();
})();
