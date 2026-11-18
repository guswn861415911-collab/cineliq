(()=>{'use strict';
const CONFIG={DB_NAME:'frame-camera-atlas-v1',DB_STORE:'media',PAGE_SIZE:24};
const ITEMS=window.CAMERA_TECHNIQUES||[];
const cloud=window.CINELIQ_CLOUD;
const itemById=new Map(ITEMS.map(item=>[item.id,item]));
const MAJORS=[{id:'all',name:'전체 기법',icon:'▦'},{id:'composition',name:'카메라 구도',icon:'▧'},{id:'cut',name:'카메라 컷',icon:'◫'},{id:'movement',name:'카메라 무빙',icon:'↗'},{id:'effects',name:'시각 효과',icon:'✧'},{id:'lighting',name:'조명',icon:'☼'},{id:'styles',name:'아트 스타일',icon:'◇'},{id:'post',name:'영상·후반',icon:'▷'}];
const TAGS=['인물','풍경','제품·디테일','드라마','역동적 연출','기본 연출'];
const state={major:'all',section:0,tags:new Set(),media:'all',sort:'number',search:'',limit:CONFIG.PAGE_SIZE,admin:false,open:null,mediaMap:new Map(),legacy:new Map()};
const $=s=>document.querySelector(s);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const majorName=id=>MAJORS.find(x=>x.id===id)?.name||'기타';
let toastTimer;function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2500)}
let cleanupDetail=()=>{};
let catalogRequest=0;
const admin=window.CINELIQ_ADMIN({state,items:itemById,escape:esc,notify:toast,refresh:refreshCloud,updateDetail});

function readLegacy(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(CONFIG.DB_NAME,1);
    request.onupgradeneeded=()=>request.transaction.abort();
    request.onerror=()=>{
      if(request.error?.name==='AbortError')resolve([]);
      else reject(request.error);
    };
    request.onsuccess=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(CONFIG.DB_STORE)){
        db.close();
        resolve([]);
        return;
      }
      const tx=db.transaction(CONFIG.DB_STORE,'readonly');
      const records=tx.objectStore(CONFIG.DB_STORE).getAll();
      records.onsuccess=()=>resolve(records.result);
      records.onerror=()=>reject(records.error);
      db.close();
    };
  });
}

async function refreshCloud(){
  const request=++catalogRequest;
  try{
    const catalog=await cloud.catalog(state.admin,state.mediaMap);
    if(request!==catalogRequest)return false;
    state.mediaMap=new Map([...catalog].filter(([id])=>itemById.has(id)));
    renderCards();
    return true;
  }catch(error){
    if(request===catalogRequest){
      console.warn('CINELIQ online catalog:',error);
      toast('온라인 미디어를 불러오지 못했어요. 잠시 후 새로고침해 주세요.');
    }
    return false;
  }
}

async function initMedia(){
  try{
    const records=await readLegacy();
    for(const record of records){
      const item=itemById.get(record.id);
      if(!item||!(record.blob instanceof Blob))continue;
      const url=URL.createObjectURL(record.blob);
      state.legacy.set(record.id,{...record,url});
      if(!cloud.configured){
        state.mediaMap.set(record.id,[{kind:item.mediaType,url,is_primary:true}]);
      }
    }
  }catch(error){
    console.warn('CINELIQ legacy IndexedDB:',error);
  }
  if(!cloud.configured){
    renderCards();
    updateDetail();
    return;
  }
  try{
    await cloud.connect();
    await refreshCloud();
    await admin.start();
    updateDetail();
    window.addEventListener('focus',()=>{
      const expired=[...state.mediaMap.values()].some(rows=>rows.some(row=>row.expiresAt<=Date.now()+5*60*1000));
      if(expired)void refreshCloud();
    });
  }catch(error){
    console.warn('CINELIQ Supabase connection:',error);
    toast('온라인 저장소에 연결하지 못했어요.');
  }
}

function refreshCounts(){$('#totalCount').textContent=ITEMS.length;$('#readyCount').textContent=state.mediaMap.size;const collections=$('#collectionCount');if(collections)collections.textContent=new Set(ITEMS.map(x=>x.sectionNo)).size}
function renderNav(){const counts=Object.fromEntries(MAJORS.map(x=>[x.id,x.id==='all'?ITEMS.length:ITEMS.filter(i=>i.major===x.id).length]));$('#majorNav').innerHTML=MAJORS.map(x=>`<button class="nav-btn ${state.major===x.id?'active':''}" data-major="${x.id}" aria-pressed="${state.major===x.id}"><span class="nav-icon">${x.icon}</span>${x.name}<span class="nav-count">${counts[x.id]}</span></button>`).join('');const sections=[...new Map(ITEMS.filter(i=>state.major==='all'||i.major===state.major).map(i=>[i.sectionNo,{id:i.sectionNo,name:i.section}])).values()];$('#sectionNav').innerHTML=`<button class="section-btn ${state.section===0?'active':''}" data-section="0"><span class="sec-no">—</span>모든 세부 분야</button>`+sections.map(s=>`<button class="section-btn ${state.section===s.id?'active':''}" data-section="${s.id}"><span class="sec-no">${String(s.id).padStart(2,'0')}</span>${esc(s.name)}</button>`).join('')}
function renderTags(){$('#tagFilters').innerHTML=`<button class="chip ${state.tags.size===0?'active':''}" data-tag="all">전체</button>`+TAGS.map(t=>`<button class="chip ${state.tags.has(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');document.querySelectorAll('[data-media]').forEach(b=>b.classList.toggle('active',b.dataset.media===state.media));document.querySelectorAll('.admin-media-filter').forEach(b=>b.hidden=!state.admin)}
function filtered(){const q=state.search.toLocaleLowerCase().trim();let a=ITEMS.filter(i=>{if(state.major!=='all'&&i.major!==state.major)return false;if(state.section&&i.sectionNo!==state.section)return false;if(state.tags.size&&![...state.tags].some(t=>i.tags.includes(t)))return false;const has=state.mediaMap.has(i.id);if(state.media==='ready'&&!has||state.media==='missing'&&has||state.media==='image'&&i.mediaType!=='image'||state.media==='video'&&i.mediaType!=='video')return false;return !q||[i.ko,i.en,i.description,i.section,...i.tags].join(' ').toLocaleLowerCase().includes(q)});const sort=state.sort;if(sort==='az')a.sort((a,b)=>a.en.localeCompare(b.en,'en'));else if(sort==='za')a.sort((a,b)=>b.en.localeCompare(a.en,'en'));else if(sort==='ko')a.sort((a,b)=>a.ko.localeCompare(b.ko,'ko'));else if(sort==='media')a.sort((a,b)=>Number(state.mediaMap.has(b.id))-Number(state.mediaMap.has(a.id))||a.number-b.number);return a}
function mediaElement(item,row,detail){
  const source=detail?row.url:row.thumbnail||row.url;
  if(row.kind==='video'){
    return `<video src="${esc(source)}" ${detail?'controls playsinline preload="metadata"':'muted playsinline preload="metadata"'}></video>`;
  }
  return `<img src="${esc(source)}" alt="${esc(item.ko)} 시각 예시" loading="lazy">`;
}
function mediaHTML(i,detail=false){
  const rows=(state.mediaMap.get(i.id)||[]).filter(row=>row.url);
  const primary=rows.find(row=>row.is_primary)||rows[0];
  if(primary){
    if(detail){
      const ordered=[primary,...rows.filter(row=>row!==primary)];
      return `<div class="media-gallery">${ordered.map(row=>`<div class="detail-media">${mediaElement(i,row,true)}</div>`).join('')}</div>`;
    }
    return `<div class="card-media">${mediaElement(i,primary,false)}<span class="media-indicator">● MEDIA READY</span></div>`;
  }
  if(detail)return `<div class="detail-media empty"><div class="placeholder-inner"><span class="placeholder-icon">${i.mediaType==='video'?'▷':'▧'}</span><strong>아직 ${i.mediaType==='video'?'영상':'이미지'}이 등록되지 않았어요</strong><p>기법 설명과 프롬프트를 먼저 학습해 보세요.<br>등록된 자료는 이곳에 표시됩니다.</p></div></div>`;return `<div class="card-media empty"><span class="media-indicator">${i.mediaType==='video'?'▷ VIDEO':'▧ IMAGE'} · 준비 중</span><span class="card-no">${String(i.number).padStart(3,'0')}</span></div>`}

function cardSummary(i){
  const full=String(i.description||'').trim().replace(/\s+/g,' ');
  if(!full)return '';
  // 카드에서는 핵심 정의 한 문장만 보여주고, 상세 패널은 원문 전체를 유지합니다.
  const sentence=full.match(/^.+?[.!?。](?=\s|$)/);
  const first=sentence?sentence[0]:full;
  const max=76;
  if(first.length<=max)return first;
  const slice=first.slice(0,max);
  const lastSpace=slice.lastIndexOf(' ');
  return (lastSpace>max*0.65?slice.slice(0,lastSpace):slice).replace(/[\s,，;；]+$/,'')+'…';
}
function card(i){return `<article class="tech-card" data-open="${i.id}"${state.open===i.id?' data-selected':''} tabindex="0" role="button" aria-label="${esc(i.ko)} 상세 보기">${mediaHTML(i)}<div class="card-content"><div class="card-section">${esc(i.section)} · ${majorName(i.major)}</div><div class="card-title-row"><h3 class="card-title">${esc(i.ko)}</h3><button class="copy-icon-btn" type="button" data-copy="${i.id}" aria-label="${esc(i.en)} 영문 명칭 복사" title="영문 명칭 복사">⧉</button></div><div class="card-en">${esc(i.en)}</div><p class="card-description">${esc(cardSummary(i))}</p><div class="card-actions"><span class="open-link">자세히 보기 ↗</span></div></div></article>`}
function renderCards(){const arr=filtered(),shown=arr.slice(0,state.limit);$('#visibleCount').textContent=arr.length;$('#resultSummary').textContent=state.admin?`${arr.length}개 기법 중 ${shown.length}개 표시 · 등록된 미디어 ${state.mediaMap.size}개`:`${arr.length}개 기법 중 ${shown.length}개 표시`;$('#cardGrid').innerHTML=shown.map(card).join('');$('#emptyState').hidden=arr.length!==0;$('#loadMore').hidden=arr.length<=state.limit;refreshCounts()}
function copyText(s){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(()=>toast('클립보드에 복사했어요')).catch(()=>fallbackCopy(s))}else fallbackCopy(s)}function fallbackCopy(s){const ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('클립보드에 복사했어요')}catch{toast('복사할 수 없어요. 텍스트를 선택해 주세요.')}ta.remove()}
function makePrompt(i){
  const isMotion=i.mediaType==='video';
  const style=i.major==='styles'?'해당 아트 스타일의 재질, 캐릭터 비율, 윤곽과 렌더링 특성을 정확하게 표현합니다.':i.major==='effects'?'해당 광학·색감 효과를 실제 사진처럼 명확히 보여주고 다른 효과와 혼동되지 않도록 표현합니다.':i.major==='lighting'?'광원의 방향과 그림자 형태를 정확하게 표현하고 자연스러운 빛의 물리적 특성을 유지합니다.':i.major==='post'?'편집 또는 후반 효과의 시간에 따른 변화가 분명하게 드러나도록 연출합니다.':'실제 촬영이 가능한 자연스러운 프레이밍과 카메라 위치를 유지합니다.';
  return `가로 16:9, ${isMotion?'고화질 시네마틱 영상':'초고화질 이미지'}.\n\n기법: ${i.ko} / ${i.en}\n${i.description}\n\n${style}\n\n[피사체와 장소]: 기법이 명확히 드러나는 구체적인 인물·사물·환경을 지정합니다.\n[카메라와 연출]: 피사체의 크기, 카메라 위치, 거리, 렌즈 특성과 조명을 구체적으로 지정합니다.\n${isMotion?'[움직임]: 시작 프레임, 동작 변화, 종료 프레임과 재생 시간을 지정합니다.':'[이미지]: 핵심 효과가 한눈에 구분되도록 프레임을 구성합니다.'}\n텍스트, 자막, 워터마크, 로고 없음.`;
}
function updateDetail(){if(state.open)openDetail(state.open,false)}
function openDetail(id,focus=true){const i=itemById.get(id);if(!i)return;cleanupDetail();state.open=id;document.querySelector('.tech-card[data-selected]')?.removeAttribute('data-selected');$('.tech-card[data-open="'+id+'"]')?.setAttribute('data-selected','');const prompt=makePrompt(i);$('#detailBody').innerHTML=`<div class="detail-inner"><div class="detail-overline">${esc(majorName(i.major).toUpperCase())} / ${esc(i.section)} / ${i.id}</div><div class="detail-heading"><h2 id="detailTitle">${esc(i.ko)}</h2><button class="btn outline small" data-copy="${i.id}" type="button">⧉ 영문명 복사</button></div><p class="detail-en">${esc(i.en)}</p>${mediaHTML(i,true)}<div class="detail-info"><p class="info-label">ABOUT THIS TECHNIQUE</p><p class="detail-description">${esc(i.description)}</p><div class="detail-tags">${i.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><div class="prompt-box"><div class="prompt-head"><strong>✦ AI 영상 프롬프트 예시</strong><button class="btn outline small" type="button" id="copyPrompt">⧉ 프롬프트 복사</button></div><p class="prompt-text">${esc(prompt)}</p><div class="prompt-hint">* 학습용 기본 템플릿입니다. 장면과 사용 모델에 맞게 수정하세요.</div></div>${state.admin?admin.markup(i,state.mediaMap.get(i.id)||[]):legacyDownload(i)}</div>`;
  $('#detailModal').hidden=false;
  document.body.style.overflow='hidden';
  if(focus)$('#closeDetail').focus();
  $('#copyPrompt').addEventListener('click',()=>copyText(prompt));
  cleanupDetail=admin.bind(i,$('#mediaManager'));
}
function legacyDownload(item){
  const record=state.legacy.get(item.id);
  if(cloud.configured||!record)return '';
  return `<p class="storage-status"><a class="btn outline small" href="${esc(record.url)}" download="cineliq-${esc(item.id)}-${esc(record.name)}">로컬 원본 다운로드</a></p>`;
}
function closeDetail(){cleanupDetail();$('#detailModal').hidden=true;const selected=$('.tech-card[data-selected]');selected?.removeAttribute('data-selected');state.open=null;document.body.style.overflow='';selected?.focus()}
function resetFilters(){state.major='all';state.section=0;state.tags.clear();state.media='all';state.search='';state.sort='number';state.limit=CONFIG.PAGE_SIZE;$('#searchInput').value='';$('#sortSelect').value='number';renderAll()}
function renderAll(){renderNav();renderTags();renderCards()}
function setupNavigation(){
  const toggle=$('#navToggle'), panel=$('#techniqueNav');
  const mobile=matchMedia('(max-width:760px)');
  let pinned=false, leaveTimer;
  const setOpen=open=>toggle.setAttribute('aria-expanded',String(open));
  function close(restoreFocus=false){
    clearTimeout(leaveTimer);
    pinned=false;
    setOpen(false);
    if(restoreFocus)toggle.focus();
  }
  for(const target of [toggle,panel]){
    target.addEventListener('pointerenter',e=>{
      if(mobile.matches||e.pointerType!=='mouse')return;
      clearTimeout(leaveTimer);
      setOpen(true);
    });
    target.addEventListener('pointerleave',e=>{
      if(mobile.matches||e.pointerType!=='mouse'||pinned)return;
      leaveTimer=setTimeout(()=>{
        if(!panel.querySelector(':focus-visible'))close();
      },220);
    });
  }
  toggle.addEventListener('click',e=>{
    if(pinned){close();return}
    clearTimeout(leaveTimer);
    pinned=true;
    setOpen(true);
    if(e.detail===0)panel.querySelector(mobile.matches?'.section-btn.active':'.nav-btn.active')?.focus();
  });
  document.addEventListener('click',e=>{
    if(toggle.getAttribute('aria-expanded')!=='true')return;
    if(mobile.matches&&e.target.closest('.section-btn')){
      close(e.detail===0);
      return;
    }
    if(!toggle.contains(e.target)&&!panel.contains(e.target))close();
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){
      close(panel.contains(document.activeElement));
    }
  });
  mobile.addEventListener('change',()=>close());
}
function events(){setupNavigation();const filterToggle=$('#filterToggle');
filterToggle.addEventListener('click',()=>filterToggle.setAttribute('aria-expanded',String(filterToggle.getAttribute('aria-expanded')!=='true')));
document.addEventListener('click',e=>{const copy=e.target.closest('[data-copy]');if(copy){e.stopPropagation();const i=ITEMS.find(x=>x.id===copy.dataset.copy);if(i)copyText(i.en);return}const focused=document.activeElement;const major=e.target.closest('[data-major]');if(major){state.major=major.dataset.major;state.section=0;state.limit=CONFIG.PAGE_SIZE;renderAll();if(major===focused)$(".nav-btn.active")?.focus();return}const sec=e.target.closest('[data-section]');if(sec){state.section=Number(sec.dataset.section);state.limit=CONFIG.PAGE_SIZE;renderAll();if(sec===focused)$(".section-btn.active")?.focus();return}const tag=e.target.closest('[data-tag]');if(tag){const t=tag.dataset.tag;if(t==='all')state.tags.clear();else if(state.tags.has(t))state.tags.delete(t);else state.tags.add(t);state.limit=CONFIG.PAGE_SIZE;renderTags();renderCards();return}const media=e.target.closest('[data-media]');if(media){state.media=media.dataset.media;state.limit=CONFIG.PAGE_SIZE;renderTags();renderCards();return}const card=e.target.closest('[data-open]');if(card){openDetail(card.dataset.open);return}if(e.target.closest('[data-close]'))closeDetail()});$('#searchInput').addEventListener('input',e=>{state.search=e.target.value;state.limit=CONFIG.PAGE_SIZE;renderCards()});$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderCards()});$('#clearFilters').addEventListener('click',resetFilters);$('#emptyReset').addEventListener('click',resetFilters);$('#loadMore').addEventListener('click',()=>{state.limit+=CONFIG.PAGE_SIZE;renderCards()});$('#closeDetail').addEventListener('click',closeDetail);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#detailModal').hidden)closeDetail();if(e.key==='/'&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'&&$('#detailModal').hidden){e.preventDefault();$('#searchInput').focus()}if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tech-card')){e.preventDefault();openDetail(e.target.dataset.open)}})}
renderAll();events();void initMedia();
})();
