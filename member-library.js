(() => {
  'use strict';
  const cloud = window.CINELIQ_CLOUD;
  const paths = {
    user:'M20 21v-2a7 7 0 0 0-14 0v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    folder:'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
    layers:'m12 3 10 5-10 5L2 8l10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5',
    link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    settings:'m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3H9Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    screen:'M3 4h18v13H3V4Z M8 21h8 M12 17v4',
    language:'M3 5h12 M9 3v2 M5 5c0 5 4 9 8 10 M13 5c0 5-4 9-9 11 M14 21l4-10 4 10 M16 17h4',
  };
  const categoryEnglish = {
    1:'Shot Sizes & Roles',2:'Camera Angles & Directions',3:'Composition & Framing',
    4:'Relationships & Point of View',5:'Basic Camera Movements',6:'Tracking & Movement Paths',
    7:'Movement Speed & Intensity',8:'Rigs & Aerial Movements',9:'Lenses & Focus',
    10:'Cuts & Continuity Editing',11:'Transitions',12:'Time, Speed & Sound Editing',
    13:'Special Cinematography',14:'Lens & Optical Effects',15:'Color Grading & Film Looks',
    16:'Lighting',17:'Art & Character Styles',18:'Video & Post-production',
  };
  const categoryDescriptions = [
    '인물과 배경의 크기 비율, 샷의 역할','시점과 높이에 따른 시각적 효과','화면 요소의 배치와 균형',
    '인물의 관계와 관찰하는 시점','카메라의 기본적인 움직임','피사체를 따라가는 경로와 이동',
    '움직임의 속도와 강도 조절','촬영 장비와 공중에서의 움직임','렌즈의 특성과 초점 활용',
    '샷 사이의 연결과 편집 리듬','장면을 전환하는 시각적 방법','시간과 속도, 소리를 활용한 편집',
    '특수한 촬영 방식과 장면 연출','빛과 렌즈로 만드는 광학적 표현','색과 질감으로 만드는 영상의 인상',
    '조명의 방향, 질감과 빛 표현','이미지의 미술적 표현과 캐릭터 스타일','촬영 이후 영상에 적용하는 효과',
  ];
  const titles = {
    profile:['회원 정보','내 계정의 기본 정보를 확인하고 관리할 수 있습니다.'],
    accounts:['연결된 계정','다른 로그인 수단을 연결하여 더 편리하게 CINELIQ를 이용할 수 있습니다.'],
    categories:['기법별 분류','저장한 기법이 카테고리별로 자동 정리되어 있어요.'],
    folders:['내 폴더','프로젝트별로 저장한 기법을 자유롭게 정리하세요.'],
    bookmarks:['즐겨찾기','저장한 카메라 기법을 다시 만나보세요.'],
    settings:['설정','현재 CINELIQ의 사용 환경을 확인할 수 있습니다.'],
    accessibility:['접근성','읽기와 조작을 편하게 설정하세요. 기기의 움직임 줄이기 설정도 존중합니다.'],
    'delete-account':['회원 탈퇴','계정과 개인 라이브러리의 삭제 내용을 확인해 주세요.'],
  };

  window.CINELIQ_LIBRARY = ({items, escape, favoriteButton, thumbnail, notify, resetPassword}) => {
    const root = document.querySelector('#memberPage');
    const find = selector => root.querySelector(selector);
    const status = find('#memberLibraryStatus');
    const dialog = find('#memberLibraryDialog');
    const form = find('#memberLibraryForm');
    const nameInput = find('#memberLibraryName');
    const choices = find('#memberLibraryChoices');
    const dialogStatus = find('#memberLibraryDialogStatus');
    const categories = [...new Map([...items.values()].map(item => [String(item.sectionNo),{
      id:String(item.sectionNo),name:item.section,description:categoryDescriptions[item.sectionNo - 1] || '',
    }])).values()];
    let user = null;
    let version = 0;
    let favorites = new Map();
    let favoritesLoaded = false;
    let folders = [];
    let entries = [];
    let loadRequest = 0;
    let loading = false;
    let failed = false;
    let operation = null;
    let saving = false;
    let lastRoute = '';

    function icon(name) {
      return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.layers}"/></svg>`;
    }
    root.querySelectorAll('[data-member-icon]').forEach(node => { node.innerHTML = icon(node.dataset.memberIcon); });

    function route() {
      const parts = location.hash.slice(1).split('/');
      return {page:parts[0] === 'my' ? parts[1] || '' : '',id:parts[2] || ''};
    }
    function go(page = '', id = '') {
      const url = '#my' + (page ? '/' + page : '') + (id ? '/' + encodeURIComponent(id) : '');
      if (location.hash === url) return;
      history.pushState({cineliqMember:true},'',url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    function empty(title, description, explore = false) {
      return `<div class="member-empty">${icon('folder')}<h3>${title}</h3><p>${description}</p>${explore ? '<a class="member-action" href="#library">기법 탐색하기</a>' : ''}</div>`;
    }
    function providerLabel(identities = user?.identities || []) {
      const labels = {google:'Google',kakao:'카카오',email:'이메일'};
      return [...new Set(identities.map(identity => labels[identity.provider]).filter(Boolean))].join(' · ') || '회원 계정';
    }
    function profile() {
      if (!user) return;
      find('#memberDisplayName').textContent = user.user_metadata?.display_name
        || user.user_metadata?.full_name || user.user_metadata?.name || '이름을 입력해 주세요';
      find('#memberProviders').textContent = providerLabel();
      find('#memberAccountSummary').textContent = user.email || providerLabel();
      const hasEmail = Boolean(user.email && user.identities?.some(identity => identity.provider === 'email'));
      find('#memberPasswordChange').hidden = !hasEmail;
      find('#memberPasswordNote').textContent = hasEmail
        ? '이메일로 받은 링크에서 비밀번호를 변경할 수 있습니다.'
        : '연결한 Google 또는 카카오 서비스에서 비밀번호를 관리할 수 있습니다.';
    }

    function renderCategories() {
      find('#memberCategoryCount').textContent = `저장한 기법 ${[...favorites.keys()].filter(id => items.has(id)).length}개`;
      find('#memberCategoryList').innerHTML = categories.map(category => {
        const count = [...favorites.keys()].filter(id => String(items.get(id)?.sectionNo) === category.id).length;
        const english = categoryEnglish[category.id];
        return `<a class="member-category member-nav-card" href="#my/categories/${category.id}"><span>${icon('layers')}</span><span><strong>${escape(category.name)}</strong>${english ? `<small>${english}</small>` : ''}<small class="member-category-description">${escape(category.description)}</small></span><span>${count}개</span><span aria-hidden="true">›</span></a>`;
      }).join('');
      if (!favorites.size) find('#memberCategoryList').insertAdjacentHTML('afterbegin',
        empty('아직 저장한 기법이 없어요.','관심 있는 카메라 기법을 즐겨찾기에 추가해 보세요.',true));
    }
    function renderFolders() {
      find('#newMemberFolder').disabled = loading || failed;
      if (loading) {
        find('#memberFolderList').innerHTML = '<p>폴더를 불러오는 중입니다.</p>';
        return;
      }
      if (failed) {
        find('#memberFolderList').replaceChildren();
        return;
      }
      find('#memberFolderList').innerHTML = folders.length ? folders.map(folder => {
        const count = entries.filter(entry => entry.folder_id === folder.id && items.has(entry.technique_id)).length;
        return `<div class="member-folder-row"><a href="#my/folders/${folder.id}">${icon('folder')}<span><strong>${escape(folder.name)}</strong><small>${count}개</small></span></a><button class="member-action" data-folder-edit="${folder.id}" aria-label="${escape(folder.name)} 이름 수정">수정</button><button class="member-action" data-folder-delete="${folder.id}" aria-label="${escape(folder.name)} 삭제">삭제</button></div>`;
      }).join('') : empty('아직 폴더가 없어요','새 폴더를 만들어 촬영 기법을 정리해 보세요.');
    }
    function collectionRows() {
      const {page,id} = route();
      if (page === 'categories') return [...favorites.keys()].filter(key => String(items.get(key)?.sectionNo) === id);
      return entries.filter(entry => entry.folder_id === id && items.has(entry.technique_id)).map(entry => entry.technique_id);
    }
    function renderCollection() {
      const {page,id} = route();
      const folder = page === 'folders' ? folders.find(folder => folder.id === id) : null;
      const category = page === 'categories' ? categories.find(category => category.id === id) : null;
      const actions = find('#memberCollectionActions');
      const list = find('#memberCollectionList');
      actions.replaceChildren();
      if (page === 'folders' && loading) { list.innerHTML = '<p>폴더를 불러오는 중입니다.</p>'; return; }
      if (!folder && !category) {
        list.innerHTML = empty('목록을 찾을 수 없어요','상위 목록으로 돌아가 다시 선택해 주세요.');
        return;
      }
      const query = find('#memberCollectionSearch').value.trim().toLocaleLowerCase();
      const all = collectionRows();
      const shown = all.map(key => items.get(key)).filter(item => item
        && `${item.ko} ${item.originalKo||''} ${item.en} ${item.description}`.toLocaleLowerCase().includes(query));
      shown.sort(find('#memberCollectionSort').value === 'name'
        ? (a,b) => a.ko.localeCompare(b.ko,'ko')
        : (a,b) => (favorites.get(b.id) || '').localeCompare(favorites.get(a.id) || ''));
      find('#memberViewTitle').textContent = folder?.name || category.name;
      find('#memberViewDescription').textContent = `저장된 기법 ${all.length}개`;
      if (folder) actions.innerHTML = `<button class="member-action member-primary" data-folder-add="${id}">기법 추가</button><button class="member-action" data-folder-edit="${id}">이름 수정</button><button class="member-action" data-folder-delete="${id}">폴더 삭제</button>`;
      list.innerHTML = shown.length ? shown.map(item => `<article class="member-technique"><button class="member-technique-open" data-open="${item.id}"><span class="member-thumbnail">${thumbnail(item)}</span><span><strong>${escape(item.ko)}</strong><small>${escape(item.displaySubtitle||item.en)}</small><span class="member-technique-description">${escape(item.description)}</span></span></button><div class="member-technique-actions">${favoriteButton(item.id)}${folder ? `<button class="member-action" data-folder-remove="${id}" data-technique="${item.id}" aria-label="${escape(item.ko)} 폴더에서 제거">폴더에서 제거</button>` : ''}</div></article>`).join('')
        : empty(query ? '검색 결과가 없어요' : '저장된 기법이 없어요',folder ? '기법 추가를 눌러 즐겨찾기에서 선택해 주세요.' : '관심 있는 기법을 즐겨찾기에 추가해 보세요.',!folder);
    }
    function renderRoute() {
      if (!/^#my(?:\/|$)/.test(location.hash)) return;
      const {page,id} = route();
      const known = Object.hasOwn(titles,page);
      const selected = id && ['folders','categories'].includes(page) ? 'collection' : known ? page : 'profile';
      root.dataset.memberPage = page && known ? page : 'overview';
      root.querySelectorAll('[data-member-panel]').forEach(panel => { panel.hidden = panel.dataset.memberPanel !== selected; });
      root.querySelectorAll('#memberNav a').forEach(link => {
        if (link.hash === '#my/' + (known ? page : 'profile')) link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      });
      const [title,description] = titles[known ? page : 'profile'];
      find('#memberViewTitle').textContent = title;
      find('#memberViewDescription').textContent = description;
      find('#memberBack').href = id ? '#my/' + page : '#my';
      status.hidden = !['folders','collection'].includes(selected);
      find('#retryMemberLibrary').hidden = !failed || status.hidden;
      if (selected === 'categories') renderCategories();
      if (selected === 'folders') renderFolders();
      if (selected === 'collection') renderCollection();
      if (lastRoute && lastRoute !== location.hash) {
        window.scrollTo({top:0,behavior:'instant'});
        if (matchMedia('(max-width:767px)').matches) find('#memberViewTitle').focus({preventScroll:true});
      }
      lastRoute = location.hash;
    }
    async function load() {
      if (!user) return;
      const current = version;
      const request = ++loadRequest;
      loading = true;
      failed = false;
      status.textContent = '';
      renderRoute();
      try {
        const data = await cloud.members.library(user.id);
        if (current !== version || request !== loadRequest) return;
        folders = data.folders.sort((a,b) => b.updated_at.localeCompare(a.updated_at));
        entries = data.entries;
      } catch {
        if (current !== version || request !== loadRequest) return;
        failed = true;
        status.textContent = '폴더를 불러오지 못했어요. 다시 시도해 주세요.';
      } finally {
        if (current === version && request === loadRequest) {
          loading = false;
          renderRoute();
        }
      }
    }

    function openEditor(type, id = '') {
      if (!user || saving) return;
      operation = {type,id,userId:user.id,version};
      const nameMode = type !== 'add';
      find('#memberLibraryNameLabel').hidden = !nameMode;
      nameInput.required = nameMode;
      nameInput.maxLength = 60;
      nameInput.value = type === 'rename' ? folders.find(folder => folder.id === id)?.name || ''
        : type === 'name' ? user.user_metadata?.display_name || '' : '';
      find('#memberLibraryDialogTitle').textContent = {create:'새 폴더 만들기',rename:'폴더 이름 수정',add:'즐겨찾기에서 기법 추가',name:'이름 수정'}[type];
      choices.replaceChildren();
      if (type === 'add') {
        const alreadyAdded = new Set(entries.filter(entry => entry.folder_id === id).map(entry => entry.technique_id));
        choices.innerHTML = [...favorites.keys()].map(key => items.get(key)).filter(item => item && !alreadyAdded.has(item.id))
          .map(item => `<label data-choice-row><input data-library-choice type="checkbox" value="${item.id}"><span>${escape(item.ko)}<small>${escape(item.displaySubtitle||item.en)}</small></span></label>`).join('')
          || '<p>추가할 즐겨찾기가 없습니다.</p>';
        window.CINELIQ_BULK_SELECTION(choices);
      }
      dialogStatus.textContent = '';
      find('#saveMemberLibrary').disabled = false;
      find('#cancelMemberLibrary').disabled = false;
      dialog.showModal();
      if (nameMode) nameInput.focus();
    }
    async function perform(action, success) {
      if (!user || saving) return false;
      const current = version;
      saving = true;
      if(dialog.open)dialog.querySelectorAll('input,button').forEach(control=>control.disabled=true);
      root.querySelectorAll('[data-folder-delete],[data-folder-remove]').forEach(button => { button.disabled = true; });
      try {
        await action();
        if (current !== version) return false;
        notify(success);
        await load();
        return true;
      } catch (error) {
        if (current !== version) return false;
        const message = error.code === '23505' ? '같은 이름의 폴더가 있어요. 다른 이름을 입력해 주세요.'
          : error.code === '23503' ? '즐겨찾기 또는 폴더가 변경됐어요. 목록을 새로 불러와 주세요.'
          : '저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
        if (dialog.open) dialogStatus.textContent = message;
        else status.textContent = message;
        return false;
      } finally {
        if (current === version) {
          saving = false;
          dialog.querySelectorAll('input,button').forEach(control=>control.disabled=false);
          find('#saveMemberLibrary').disabled = false;
          find('#cancelMemberLibrary').disabled = false;
          renderRoute();
        }
      }
    }
    find('#newMemberFolder').addEventListener('click',() => openEditor('create'));
    find('#editMemberName').addEventListener('click',() => openEditor('name'));
    find('#retryMemberLibrary').addEventListener('click',() => void load());
    find('#memberCollectionSearch').addEventListener('input',renderCollection);
    find('#memberCollectionSort').addEventListener('change',renderCollection);
    find('#cancelMemberLibrary').addEventListener('click',() => { if (!saving) dialog.close(); });
    dialog.addEventListener('cancel',event => { if (saving) event.preventDefault(); });
    form.addEventListener('submit',async event => {
      event.preventDefault();
      const task = operation;
      if (!task || !user || task.userId !== user.id || task.version !== version || saving) return;
      const name = nameInput.value.trim();
      if (task.type !== 'add' && (!name || [...name].length > 60)) {
        dialogStatus.textContent = '이름을 1~60자로 입력해 주세요.';
        return;
      }
      const ids = [...choices.querySelectorAll('input[data-library-choice]:checked')].map(input => input.value);
      if (task.type === 'add' && !ids.length) { dialogStatus.textContent = '추가할 기법을 선택해 주세요.'; return; }
      find('#saveMemberLibrary').disabled = true;
      find('#cancelMemberLibrary').disabled = true;
      const success = await perform(async () => {
        if (task.type === 'create') await cloud.members.createFolder(name,task.userId);
        if (task.type === 'rename') await cloud.members.renameFolder(task.id,name);
        if (task.type === 'add') await cloud.members.addFolderItems(task.id,ids);
        if (task.type === 'name') {
          const updated = await cloud.members.updateName(name);
          if (task.version === version && updated.id === user?.id) {
            user = updated;
            profile();
          }
        }
      },task.type === 'name' ? '이름을 저장했어요.' : '폴더에 저장했어요.');
      if (success && task.version === version) dialog.close();
    });
    root.addEventListener('click',event => {
      const edit = event.target.closest('[data-folder-edit]');
      const add = event.target.closest('[data-folder-add]');
      const remove = event.target.closest('[data-folder-remove]');
      const deletion = event.target.closest('[data-folder-delete]');
      if (edit) openEditor('rename',edit.dataset.folderEdit);
      if (add) openEditor('add',add.dataset.folderAdd);
      if (remove) void perform(() => cloud.members.removeFolderItem(remove.dataset.folderRemove,remove.dataset.technique),'폴더에서 제거했어요.');
      if (deletion && !saving && confirm('이 폴더를 삭제할까요? 즐겨찾기와 원본 기법은 유지됩니다.')) {
        const id = deletion.dataset.folderDelete;
        void perform(() => cloud.members.deleteFolder(id),'폴더를 삭제했어요.').then(success => {
          if (success && route().id === id) go('folders');
        });
      }
      const link = event.target.closest('a[href^="#my"]');
      if (link && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
        event.preventDefault();
        if (link.id === 'memberBack' && history.state?.cineliqMember) history.back();
        else {
          const [,page,id] = link.hash.slice(1).split('/');
          go(page,id);
        }
      }
    });
    find('#memberPasswordChange').addEventListener('click',async event => {
      if (!user?.email || !user.identities?.some(identity => identity.provider === 'email')) return;
      const current = version;
      event.target.disabled = true;
      try {
        await resetPassword(user.email);
        if (current === version) notify('비밀번호 변경 링크를 이메일로 요청했어요.');
      } catch {
        if (current === version) notify('메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally { event.target.disabled = false; }
    });
    window.addEventListener('popstate',renderRoute);
    window.addEventListener('hashchange',renderRoute);
    window.addEventListener('cineliq-member-route',renderRoute);
    window.addEventListener('cineliq-library-changed',()=>{if(user)void load();});
    renderRoute();
    return {
      sync(next) {
        const changed = user?.id !== next?.user.id;
        user = next?.user || null;
        if (changed) {
          version++;
          folders = [];
          entries = [];
          favorites = new Map();
          favoritesLoaded = false;
          loading = false;
          failed = false;
          status.textContent = '';
          saving = false;
          if (dialog.open) dialog.close();
          if (user) void load();
        }
        profile();
        renderRoute();
      },
      setIdentities(rows) {
        if (user) {
          user = {...user,identities:rows};
          profile();
        }
      },
      setFavorites(rows,loaded) {
        favorites = new Map(rows);
        favoritesLoaded = loaded;
        find('#memberSavedCount').textContent = favorites.size;
        renderRoute();
      },
      openAccounts() { go('accounts'); },
      refreshMedia() { if (route().id) renderCollection(); },
    };
  };
})();
