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
const member=window.CINELIQ_MEMBER({items:itemById,navigate:view=>navigateView(view),notify:toast,escape:esc,thumbnail:item=>mediaHTML(item)});

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
    const previousMedia=state.mediaMap;
    state.mediaMap=new Map([...catalog].filter(([id])=>itemById.has(id)));
    renderCards(previousMedia);
    member.refreshMedia();
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
  const previousMedia=new Map(state.mediaMap);
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
    renderCards(previousMedia);
    updateDetail();
    return;
  }
  try{
    await cloud.connect();
    void member.start().catch(error=>console.warn('CINELIQ member session:',error));
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
function renderMobileFilters(){
 const tagRoot=$('#mobileTagFilters'),mediaRoot=$('#mobileMediaFilters');
 if(!tagRoot||!mediaRoot)return;
 tagRoot.innerHTML=`<button class="mobile-filter-chip ${state.tags.size===0?'active':''}" data-tag="all">전체</button>`+TAGS.map(t=>`<button class="mobile-filter-chip ${state.tags.has(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
 mediaRoot.innerHTML=[['all','전체'],['image','이미지 기법'],['video','영상 기법']].map(([v,n])=>`<button class="mobile-filter-chip ${state.media===v?'active':''}" data-media="${v}">${n}</button>`).join('');
}
function renderTags(){$('#tagFilters').innerHTML=`<button class="chip ${state.tags.size===0?'active':''}" data-tag="all">전체</button>`+TAGS.map(t=>`<button class="chip ${state.tags.has(t)?'active':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');document.querySelectorAll('[data-media]').forEach(b=>b.classList.toggle('active',b.dataset.media===state.media));document.querySelectorAll('.admin-media-filter').forEach(b=>b.hidden=!state.admin);renderMobileFilters()}
function filtered(){const q=state.search.toLocaleLowerCase().trim();let a=ITEMS.filter(i=>{if(state.major!=='all'&&i.major!==state.major)return false;if(state.section&&i.sectionNo!==state.section)return false;if(state.tags.size&&![...state.tags].some(t=>i.tags.includes(t)))return false;const has=state.mediaMap.has(i.id);if(state.media==='ready'&&!has||state.media==='missing'&&has||state.media==='image'&&i.mediaType!=='image'||state.media==='video'&&i.mediaType!=='video')return false;return !q||(practice?practice.matches(i,q):[i.ko,i.en,i.description,i.section,...i.tags].join(' ').toLocaleLowerCase().includes(q))});const sort=state.sort;if(sort==='az')a.sort((a,b)=>a.en.localeCompare(b.en,'en'));else if(sort==='za')a.sort((a,b)=>b.en.localeCompare(a.en,'en'));else if(sort==='ko')a.sort((a,b)=>a.ko.localeCompare(b.ko,'ko'));else if(sort==='media')a.sort((a,b)=>Number(state.mediaMap.has(b.id))-Number(state.mediaMap.has(a.id))||a.number-b.number);return a}
function mediaElement(item,row,detail){
  const source=detail?row.url:row.thumbnail||row.url;
  if(row.kind==='video'){
    return `<video src="${esc(source)}" ${detail?'controls playsinline preload="metadata"':'muted playsinline preload="metadata"'}></video>`;
  }
  return `<img src="${esc(source)}" alt="${esc(item.ko)} 시각 예시" loading="lazy">`;
}
function mediaHTML(i,detail=false,catalog=state.mediaMap){
  const rows=(catalog.get(i.id)||[]).filter(row=>row.url);
  const primary=rows.find(row=>row.is_primary)||rows[0];
  if(primary){
    if(detail){
      const ordered=[primary,...rows.filter(row=>row!==primary)];
      return `<div class="media-gallery">${ordered.map(row=>`<div class="detail-media">${mediaElement(i,row,true)}</div>`).join('')}</div>`;
    }
    return `<div class="card-media">${mediaElement(i,primary,false)}</div>`;
  }
  if(detail)return `<div class="detail-media empty"><div class="placeholder-inner"><span class="placeholder-icon">${i.mediaType==='video'?'▷':'▧'}</span><strong>아직 ${i.mediaType==='video'?'영상':'이미지'}이 등록되지 않았어요</strong><p>기법 설명과 프롬프트를 먼저 학습해 보세요.<br>등록된 자료는 이곳에 표시됩니다.</p></div></div>`;return `<div class="card-media empty"><span class="media-indicator">${i.mediaType==='video'?'MOTION STUDY':'FRAME STUDY'}</span><span class="media-placeholder-label">VISUAL REFERENCE</span></div>`}

function cardSummary(i){
  if(i.summary)return i.summary;
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
const copyIcon = `<svg class="copy-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="8.5" width="12" height="12" rx="3"/><path d="M8.5 8.5V6.5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2"/></svg>`;
const practice=window.CINELIQ_PRACTICE?.({items:itemById,escape:esc,copyIcon});
const fullLearning=window.CINELIQ_FULL_UI?.({items:itemById,escape:esc,copyIcon});
function card(i){return `<article class="tech-card" data-open="${i.id}"${state.open===i.id?' data-selected':''} tabindex="0" role="button" aria-label="${esc(i.ko)} 상세 보기">${mediaHTML(i)}<div class="card-content"><div class="card-section">${esc(i.section)} · ${majorName(i.major)}</div><div class="card-title-row"><h3 class="card-title">${esc(i.ko)}</h3><button class="copy-icon-btn" type="button" data-copy="${i.id}" aria-label="${esc(i.en)} 영문 명칭 복사" title="영문 명칭 복사">${copyIcon}</button></div><div class="card-en">${esc(i.en)}</div><p class="card-description">${esc(cardSummary(i))}</p><div class="card-actions">${member.favoriteButton(i.id)}${member.folderButton(i.id)}<span class="open-link">기법 살펴보기 <span aria-hidden="true">↗</span></span></div></div></article>`}
let revealObserver=null;
let scrollObserver=null;
function observeReveals(){
  const cards=[...document.querySelectorAll('.tech-card:not(.is-visible)')];
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){
    cards.forEach(el=>el.classList.add('is-visible'));return;
  }
  if(!revealObserver){
    revealObserver=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top||a.boundingClientRect.left-b.boundingClientRect.left);
      visible.forEach(entry=>{
        const el=entry.target;
        el.style.setProperty('--reveal-delay',`${Math.min(Number(el.dataset.revealOrder||0)%3,2)*85}ms`);
        el.classList.add('is-visible');revealObserver.unobserve(el);
      });
    },{threshold:.08,rootMargin:'0px 0px 35px 0px'});
  }
  cards.forEach((el,index)=>{el.dataset.revealOrder=index;revealObserver.observe(el)});
}
function renderCards(previousMedia){
  const arr=filtered(),shown=arr.slice(0,state.limit);
  $('#visibleCount').textContent=arr.length;
  $('#resultSummary').textContent=state.admin?`${arr.length}개 기법 중 ${shown.length}개 표시 · 등록된 미디어 ${state.mediaMap.size}개`:`${arr.length}개 기법 중 ${shown.length}개 표시`;
  const grid=$('#cardGrid');
  const ids=shown.map(i=>i.id);
  const old=[...grid.children].map(el=>el.dataset.open);
  const appendOnly=old.length>0&&old.length<=ids.length&&old.every((id,j)=>id===ids[j]);
  if(appendOnly){
    if(previousMedia){
      shown.slice(0,old.length).forEach((item,index)=>{
        const nextMedia=mediaHTML(item);
        if(nextMedia!==mediaHTML(item,false,previousMedia)){
          grid.children[index].querySelector('.card-media').outerHTML=nextMedia;
        }
      });
    }
    grid.insertAdjacentHTML('beforeend',shown.slice(old.length).map(card).join(''));
  }
  else{revealObserver?.disconnect();grid.innerHTML=shown.map(card).join('')}
  const termCount=practice?.renderSearch(state.search,$('#termBrowser'))||0;
  $('#emptyState').hidden=arr.length!==0||termCount>0;
  $('#loadMore').hidden=true;
  $('#scrollSentinel').hidden=arr.length<=state.limit;
  observeReveals();refreshCounts();
}
function setupInfiniteScroll(){
  const sentinel=$('#scrollSentinel');
  if(!('IntersectionObserver' in window)){
    $('#loadMore').hidden=false;
    return;
  }
  scrollObserver=new IntersectionObserver(entries=>{
    if(!entries[0].isIntersecting||sentinel.hidden)return;
    if(document.querySelector('#detailModal:not([hidden])'))return;
    const total=filtered().length;
    if(state.limit>=total)return;
    state.limit=Math.min(state.limit+CONFIG.PAGE_SIZE,total);
    renderCards();
  },{rootMargin:'0px 0px 650px 0px',threshold:0});
  scrollObserver.observe(sentinel);
}

function copyText(s){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(()=>toast('클립보드에 복사했어요')).catch(()=>fallbackCopy(s))}else fallbackCopy(s)}function fallbackCopy(s){const ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('클립보드에 복사했어요')}catch{toast('복사할 수 없어요. 텍스트를 선택해 주세요.')}ta.remove()}
function makePrompt(i){
  const isMotion=i.mediaType==='video';
  const style=i.major==='styles'?'해당 아트 스타일의 재질, 캐릭터 비율, 윤곽과 렌더링 특성을 정확하게 표현합니다.':i.major==='effects'?'해당 광학·색감 효과를 실제 사진처럼 명확히 보여주고 다른 효과와 혼동되지 않도록 표현합니다.':i.major==='lighting'?'광원의 방향과 그림자 형태를 정확하게 표현하고 자연스러운 빛의 물리적 특성을 유지합니다.':i.major==='post'?'편집 또는 후반 효과의 시간에 따른 변화가 분명하게 드러나도록 연출합니다.':'실제 촬영이 가능한 자연스러운 프레이밍과 카메라 위치를 유지합니다.';
  return `가로 16:9, ${isMotion?'고화질 시네마틱 영상':'초고화질 이미지'}.\n\n기법: ${i.ko} / ${i.en}\n${i.description}\n\n${style}\n\n[피사체와 장소]: 기법이 명확히 드러나는 구체적인 인물·사물·환경을 지정합니다.\n[카메라와 연출]: 피사체의 크기, 카메라 위치, 거리, 렌즈 특성과 조명을 구체적으로 지정합니다.\n${isMotion?'[움직임]: 시작 프레임, 동작 변화, 종료 프레임과 재생 시간을 지정합니다.':'[이미지]: 핵심 효과가 한눈에 구분되도록 프레임을 구성합니다.'}\n텍스트, 자막, 워터마크, 로고 없음.`;
}
let detailOrder=[],detailReturn=null,detailAnimation;
function detailListFor(element){
  if(element.closest('#cardGrid'))return filtered().map(item=>item.id);
  const list=element.closest('#favoriteList,#memberCollectionList');
  return list?[...new Set([...list.querySelectorAll('[data-open]')].map(node=>node.dataset.open))]:[element.dataset.open];
}
function paintDetailNavigation(){
  const index=detailOrder.indexOf(state.open);
  $('#detailPrevious').disabled=index<=0;
  $('#detailNext').disabled=index<0||index>=detailOrder.length-1;
  $('#detailPosition').textContent=String(index+1).padStart(2,'0')+' / '+detailOrder.length;
  $('#detailPosition').setAttribute('aria-label',(index+1)+'번째, 전체 '+detailOrder.length+'개: '+itemById.get(state.open)?.ko);
}
function stepDetail(direction){
  const index=detailOrder.indexOf(state.open),next=index+direction;
  if(index>=0&&next>=0&&next<detailOrder.length)openDetail(detailOrder[next],false);
}
function detailKeys(event){
  if($('#detailModal').hidden||document.querySelector('dialog[open]')||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey)return;
  if(event.key==='Escape'){event.preventDefault();closeDetail();return;}
  if(event.key==='Tab'){
    const controls=[...$('#detailModal').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),video[controls],[tabindex="0"]')].filter(node=>node.getClientRects().length&&!node.closest('[hidden]'));
    const first=controls[0],last=controls.at(-1),active=document.activeElement;
    if(!controls.includes(active)||event.shiftKey&&active===first||!event.shiftKey&&active===last){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    return;
  }
  if(event.shiftKey)return;
  const interactive=event.target.closest?.('input,textarea,select,button,a,[contenteditable],[role="slider"],[role="textbox"],summary,video,audio');
  if(interactive&&!interactive.matches('#closeDetail,#detailPrevious,#detailNext'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepDetail(event.key==='ArrowLeft'?-1:1);}
}
$('#detailPrevious').addEventListener('click',()=>stepDetail(-1));
$('#detailNext').addEventListener('click',()=>stepDetail(1));
function updateDetail(){if(state.open)openDetail(state.open,false)}
function openDetail(id,focus=true,order=null){const i=itemById.get(id);if(!i)return;
  const panel=$('.detail-panel'),scroll=panel.scrollTop,changed=state.open!==id;
  if(order){detailOrder=[...new Set(order)].filter(key=>itemById.has(key));detailReturn=document.activeElement;}
  if(!detailOrder.includes(id))detailOrder=[id];
  $('#detailBody').querySelectorAll('video').forEach(video=>video.pause());
  cleanupDetail();detailAnimation?.cancel();state.open=id;document.querySelector('.tech-card[data-selected]')?.removeAttribute('data-selected');$('.tech-card[data-open="'+id+'"]')?.setAttribute('data-selected','');const prompt=makePrompt(i);const lesson=window.CINELIQ_LESSON?.({item:i,items:itemById,escape:esc,media:item=>mediaHTML(item),copyIcon,practice,fullLearning})||'';$('#detailBody').innerHTML=`<div class="detail-inner"><div class="detail-overline">${esc(majorName(i.major).toUpperCase())} / ${esc(i.section)} / ${i.id}</div><div class="detail-heading"><h2 id="detailTitle" tabindex="-1">${esc(i.ko)}</h2><div class="detail-actions">${member.favoriteButton(i.id)}<button class="btn outline small" data-copy="${i.id}" type="button">${copyIcon} 영문명 복사</button></div></div><p class="detail-en">${esc(i.en)} ${practice?.badges(id)||''}</p><p class="detail-summary">${esc(i.summary||cardSummary(i))}</p>${mediaHTML(i,true)}<div class="detail-info">${lesson||`<p class="info-label">ABOUT THIS TECHNIQUE</p><p class="detail-description">${esc(i.description)}</p>`}<div class="detail-tags">${i.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div><div class="prompt-box"><div class="prompt-head"><strong>프롬프트 템플릿 (수정용)</strong><button class="btn outline small" type="button" id="copyPrompt">${copyIcon} 템플릿 복사</button></div><p class="prompt-text">${esc(prompt)}</p><div class="prompt-hint">인물·장소·연출을 바꿔 쓰는 수정용 템플릿입니다. 위의 완성형 예시와 구분해 활용하세요.</div></div>${state.admin?admin.markup(i,state.mediaMap.get(i.id)||[]):legacyDownload(i)}</div>`;
  $('#detailModal').hidden=false;
  panel.scrollTop=changed?0:scroll;
  paintDetailNavigation();
  document.addEventListener('keydown',detailKeys);
  if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches)detailAnimation=$('#detailBody').animate([{opacity:.65},{opacity:1}],{duration:140,easing:'ease-out'});
  document.body.style.overflow='hidden';
  if(focus)$('#closeDetail').focus();
  $('#copyPrompt').addEventListener('click',()=>copyText(prompt));
  $('#detailBody').onclick=event=>{
    const fullCopy=event.target.closest('[data-full-video-copy]');
    if(fullCopy){const value=fullLearning?.copy(fullCopy.dataset.fullVideoCopy);if(value)copyText(value);return;}
    const practicalCopy=event.target.closest('[data-practice-copy]');
    if(practicalCopy){const value=practice?.copy(practicalCopy.dataset.practiceId,practicalCopy.dataset.practiceCopy);if(value)copyText(value);return;}
    const copy=event.target.closest('[data-lesson-copy]');
    if(copy){const data=window.CINELIQ_LEARNING?.[id];const value=copy.dataset.lessonCopy==='video'?data?.videoPromptExample:data?.imagePromptExample;if(value)copyText(value);return;}
    const related=event.target.closest('[data-related-technique]');
    if(related&&itemById.has(related.dataset.relatedTechnique)){
      const next=related.dataset.relatedTechnique,origin=detailReturn;
      const order=detailOrder.includes(next)?null:[id,...(window.CINELIQ_LEARNING?.[id]?.relatedTechniqueIds||[])];
      openDetail(next,false,order);detailReturn=origin;$('#detailTitle').focus({preventScroll:true});
    }
  };

  cleanupDetail=admin.bind(i,$('#mediaManager'));
}
function legacyDownload(item){
  const record=state.legacy.get(item.id);
  if(cloud.configured||!record)return '';
  return `<p class="storage-status"><a class="btn outline small" href="${esc(record.url)}" download="cineliq-${esc(item.id)}-${esc(record.name)}">로컬 원본 다운로드</a></p>`;
}
function closeDetail(){
  cleanupDetail();detailAnimation?.cancel();
  $('#detailBody').querySelectorAll('video').forEach(video=>video.pause());
  $('#detailModal').hidden=true;document.removeEventListener('keydown',detailKeys);
  document.querySelector('.tech-card[data-selected]')?.removeAttribute('data-selected');
  state.open=null;document.body.style.overflow='';
  const target=detailReturn?.isConnected?detailReturn:document.querySelector('.tech-card[data-open="'+detailOrder[0]+'"]')||$('#catalogTitle');
  target?.focus({preventScroll:true});detailOrder=[];detailReturn=null;
}
function resetFilters(){state.major='all';state.section=0;state.tags.clear();state.media='all';state.search='';state.sort='number';state.limit=CONFIG.PAGE_SIZE;$('#searchInput').value='';$('#sortSelect').value='number';renderAll()}
function renderAll(){renderNav();renderTags();renderCards()}
function setupNavigation(openLibrary){
  const toggle=$('#navToggle'),panel=$('#techniqueNav'),backdrop=$('#navBackdrop');
  let scrollLock=null;
  const main=$('.main-content');
  const setOpen=open=>{
    if(open===(toggle.getAttribute('aria-expanded')==='true'))return;
    if(open){
      const body=document.body;
      scrollLock={x:scrollX,y:scrollY,styles:Object.fromEntries(['position','top','left','width','overflow'].map(key=>[key,body.style[key]]))};
      Object.assign(body.style,{position:'fixed',top:`-${scrollLock.y}px`,left:`-${scrollLock.x}px`,width:'100%',overflow:'hidden'});
    }
    toggle.setAttribute('aria-expanded',String(open));
    document.body.classList.toggle('menu-open',open);
    backdrop.setAttribute('aria-hidden',String(!open));
    panel.inert=!open;panel.setAttribute('aria-hidden',String(!open));main.inert=open;
    $('.header-actions').inert=open;$('.brand').inert=open;
    if(open){
      panel.scrollTop=0;
      const first=[...panel.querySelectorAll('button,a[href]')].find(el=>el.getClientRects().length&&!el.hidden);
      first?.focus({preventScroll:true});
    }else if(scrollLock){
      Object.assign(document.body.style,scrollLock.styles);
      window.scrollTo({left:scrollLock.x,top:scrollLock.y,behavior:'instant'});scrollLock=null;
    }
  };
  const close=(focus=false)=>{setOpen(false);if(focus)toggle.focus()};
  $('#mobileMenuClose')?.addEventListener('click',()=>close(true));
  const mobile=matchMedia('(max-width:760px)');
  let swipeStart=null;
  panel.addEventListener('touchstart',event=>{
    swipeStart=mobile.matches&&event.touches.length===1
      ? {x:event.touches[0].clientX,y:event.touches[0].clientY}
      : null;
  },{passive:true});
  panel.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
  panel.addEventListener('touchend',event=>{
    const start=swipeStart;
    swipeStart=null;
    const end=event.changedTouches[0];
    if(!start||!end||event.touches.length)return;
    const distance=start.x-end.clientX;
    if(distance>=72&&distance>Math.abs(end.clientY-start.y)*1.6)close(true);
  },{passive:true});
  toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
  backdrop.addEventListener('click',()=>close());
  panel.addEventListener('click',e=>{
    if(e.target.closest('.service-menu a')){close();return;}
    if(!e.target.closest('[data-major],[data-section],[data-tag],[data-media]'))return;
    close();
    openLibrary();
  });
  // Release the page lock before an administrator dialog is opened by its own handler.
  panel.addEventListener('click',e=>{if(e.target.closest('#adminToggle'))close();},true);
  window.addEventListener('popstate',()=>close());
  window.addEventListener('hashchange',()=>close());
  document.addEventListener('keydown',e=>{
    if(toggle.getAttribute('aria-expanded')!=='true')return;
    if(e.key==='Escape'){e.preventDefault();close(true);return;}
    if(e.key!=='Tab')return;
    const controls=[...(mobile.matches?[]:[toggle]),...panel.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)')].filter(el=>el.getClientRects().length&&!el.hidden);
    const index=controls.indexOf(document.activeElement);
    const next=e.shiftKey?(index<=0?controls.length-1:index-1):(index+1)%controls.length;
    e.preventDefault();controls[next]?.focus();
  });
}

function setupMobileViews(updateHeroVideo){
  const main=$('.main-content');
  const hero=$('.hero');
  const library=$('.catalog');
  const mobile=matchMedia('(max-width:760px)');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let animation;
  let transitionId=0;
  const currentRoute=()=>/^#my(?:\/|$)/.test(location.hash)?'my':location.hash==='#library'?'library':'hero';
  const panelFor=view=>view==='my'?$('#memberPage'):view==='library'?library:hero;

  async function renderView({animate=false,focus=false}={}){
    const id=++transitionId;
    animation?.cancel();
    const next=currentRoute();
    if(next==='my')window.dispatchEvent(new Event('cineliq-member-route'));
    if(!mobile.matches&&next!=='my'){
      const leavingMember=main.dataset.mobileView==='my';
      delete main.dataset.mobileView;
      history.scrollRestoration='auto';
      updateHeroVideo();
      if(leavingMember){
        if(next==='library')$('#catalogTitle').scrollIntoView({behavior:'instant'});
        else window.scrollTo({top:0,behavior:'instant'});
        if(focus)$(next==='library'?'#catalogTitle':'.brand').focus({preventScroll:true});
      }
      return;
    }
    history.scrollRestoration='manual';
    const current=main.dataset.mobileView;
    if(current===next)return;
    const fade=animate&&current&&!reducedMotion.matches;
    if(fade){
      animation=panelFor(current).animate([{opacity:1},{opacity:0}],{duration:130,fill:'forwards'});
      await animation.finished.catch(()=>{});
      if(id!==transitionId)return;
      animation.cancel();
    }
    main.dataset.mobileView=next;
    window.scrollTo({top:0,behavior:'instant'});
    updateHeroVideo();
    if(focus)(next==='my'?$('#memberPageTitle'):next==='hero'?$('.hero-explore'):$('#catalogTitle')).focus({preventScroll:true});
    if(fade){
      animation=panelFor(next).animate([{opacity:0},{opacity:1}],{duration:180,easing:'ease-out'});
    }
  }

  function navigate(view){
    if((!mobile.matches&&view==='library'&&currentRoute()!=='my')
      || (currentRoute()===view && (view!=='my'||location.hash==='#my')))return;
    if(state.open)closeDetail();
    history.pushState(null,'',view==='my'?'#my':view==='library'?'#library':'#home');
    void renderView({animate:true,focus:true});
  }

  $('.hero-explore').addEventListener('click',e=>{
    if(!mobile.matches)return;
    e.preventDefault();
    navigate('library');
  });
  $('.brand').addEventListener('click',e=>{
    if(!mobile.matches&&currentRoute()!=='my')return;
    e.preventDefault();
    navigate('hero');
  });
  window.addEventListener('popstate',()=>void renderView({focus:true}));
  mobile.addEventListener('change',()=>void renderView());
  reducedMotion.addEventListener('change',()=>void renderView());
  void renderView();
  return navigate;
}
function events(openLibrary){setupNavigation(openLibrary);setupInfiniteScroll();const filterToggle=$('#filterToggle');
filterToggle.addEventListener('click',()=>filterToggle.setAttribute('aria-expanded',String(filterToggle.getAttribute('aria-expanded')!=='true')));
document.addEventListener('click',e=>{const copy=e.target.closest('[data-copy]');if(copy){e.stopPropagation();const i=ITEMS.find(x=>x.id===copy.dataset.copy);if(i)copyText(i.en);return}const focused=document.activeElement;const major=e.target.closest('[data-major]');if(major){state.major=major.dataset.major;state.section=0;state.limit=CONFIG.PAGE_SIZE;renderAll();if(major===focused)$(".nav-btn.active")?.focus();return}const sec=e.target.closest('[data-section]');if(sec){state.section=Number(sec.dataset.section);state.limit=CONFIG.PAGE_SIZE;renderAll();if(sec===focused)$(".section-btn.active")?.focus();return}const tag=e.target.closest('[data-tag]');if(tag){const t=tag.dataset.tag;if(t==='all')state.tags.clear();else if(state.tags.has(t))state.tags.delete(t);else state.tags.add(t);state.limit=CONFIG.PAGE_SIZE;renderTags();renderCards();return}const media=e.target.closest('[data-media]');if(media){state.media=media.dataset.media;state.limit=CONFIG.PAGE_SIZE;renderTags();renderCards();return}const card=e.target.closest('[data-open]');if(card){detailReturn=card;openDetail(card.dataset.open,true,detailListFor(card));detailReturn=card;return}if(e.target.closest('[data-close]'))closeDetail()});$('#searchInput').addEventListener('input',e=>{state.search=e.target.value;state.limit=CONFIG.PAGE_SIZE;renderCards()});$('#sortSelect').addEventListener('change',e=>{state.sort=e.target.value;renderCards()});$('#clearFilters').addEventListener('click',resetFilters);$('#emptyReset').addEventListener('click',resetFilters);$('#loadMore').addEventListener('click',()=>{state.limit+=CONFIG.PAGE_SIZE;renderCards()});$('#closeDetail').addEventListener('click',closeDetail);document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement?.tagName!=='INPUT'&&document.activeElement?.tagName!=='TEXTAREA'&&$('#detailModal').hidden){e.preventDefault();$('#searchInput').focus()}if((e.key==='Enter'||e.key===' ')&&e.target.matches('.tech-card')){e.preventDefault();openDetail(e.target.dataset.open,true,detailListFor(e.target));detailReturn=e.target}})}
function setupHeroVideo() {
  const video = document.querySelector('.hero-background-video');
  const mobile = matchMedia('(max-width:760px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');

  function updateVideo() {
    const device = mobile.matches ? 'mobile' : 'pc';
    const revision = mobile.matches ? '?v=mobile-v02' : '';
    const source = `assets/cineliq-hero-${device}.mp4${revision}`;
    video.poster = `assets/cineliq-hero-${device}-poster.jpg${revision}`;
    if (reducedMotion.matches) {
      if (video.hasAttribute('src')) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      return;
    }
    const view = $('.main-content').dataset.mobileView;
    if (view === 'my' || (mobile.matches && view === 'library')) {
      video.pause();
      return;
    }
    if (video.getAttribute('src') !== source) video.src = source;
    else if (video.paused) void video.play().catch(()=>{});
  }

  mobile.addEventListener('change', updateVideo);
  reducedMotion.addEventListener('change', updateVideo);
  return updateVideo;
}

const navigateView=setupMobileViews(setupHeroVideo());
renderAll();events(()=>navigateView('library'));void initMedia();
})();
