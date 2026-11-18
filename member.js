(() => {
  'use strict';
  const cloud = window.CINELIQ_CLOUD;
  const modes = {
    login: ['로그인', '로그인'],
    signup: ['회원가입', '가입하기'],
    reset: ['비밀번호 찾기', '재설정 링크 보내기'],
    recovery: ['새 비밀번호 설정', '비밀번호 저장'],
  };

  function setup({items, navigate, notify, escape}) {
    const root = document.querySelector('#memberPage');
    const header = document.querySelector('#memberToggle');
    const dialog = document.querySelector('#memberDialog');
    const form = document.querySelector('#memberForm');
    const status = document.querySelector('#memberAuthStatus');
    const pageStatus = document.querySelector('#favoriteStatus');
    const list = document.querySelector('#favoriteList');
    const search = document.querySelector('#favoriteSearch');
    const sort = document.querySelector('#favoriteSort');
    const logout = document.querySelector('#memberLogout');
    const google = document.querySelector('#memberGoogle');
    const authCallback = new URL(location.href);
    let session = null;
    let mode = 'login';
    let lookupVersion = 0;
    let loadingFavorites = false;
    let favorites = new Map();
    const pending = new Set();

    function setMode(next) {
      mode = next;
      form.elements.password.value = '';
      const password = form.elements.password;
      const email = form.elements.email;
      email.closest('label').hidden = next === 'recovery';
      email.required = next !== 'recovery';
      password.closest('label').hidden = next === 'reset';
      password.required = next !== 'reset';
      password.minLength = ['signup','recovery'].includes(next) ? 6 : 0;
      password.autocomplete = next === 'login' ? 'current-password' : 'new-password';
      document.querySelector('#memberAuthTitle').textContent = modes[next][0];
      document.querySelector('#memberSubmit').textContent = modes[next][1];
      document.querySelector('.member-auth-links').hidden = next === 'recovery';
      google.hidden = next !== 'login';
      for (const button of dialog.querySelectorAll('[data-auth-mode]')) button.hidden = button.dataset.authMode === next;
      status.textContent = '';
    }

    function openAuth(next = 'login', message = '') {
      setMode(next);
      status.textContent = message;
      if (!dialog.open) dialog.showModal();
      (next === 'recovery' ? form.elements.password : form.elements.email).focus();
    }

    function favoriteButton(id) {
      const saved = isBookmarked(id);
      const unavailable = loadingFavorites || pending.has(id);
      return `<button type="button" class="favorite-toggle" data-favorite="${escape(id)}" aria-label="즐겨찾기" aria-pressed="${saved}" aria-disabled="${unavailable}"><svg class="bookmark-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/></svg></button>`;
    }

    function isBookmarked(id) {
      return favorites.has(id) !== pending.has(id);
    }

    function paintButton(button) {
      const id = button.dataset.favorite;
      button.setAttribute('aria-pressed', String(isBookmarked(id)));
      button.setAttribute('aria-disabled', String(loadingFavorites || pending.has(id)));
    }

    function renderFavorites() {
      const query = search.value.trim().toLocaleLowerCase();
      const saved = [...favorites].map(([id,date]) => ({item:items.get(id),date}))
        .filter(({item}) => item && `${item.ko} ${item.en} ${item.description}`.toLocaleLowerCase().includes(query));
      saved.sort(sort.value === 'name'
        ? (a,b) => a.item.ko.localeCompare(b.item.ko,'ko')
        : (a,b) => b.date.localeCompare(a.date));
      list.innerHTML = saved.map(({item}) => `<li><button class="member-saved-item" type="button" data-open="${escape(item.id)}"><strong>${escape(item.ko)}</strong><span>${escape(item.en)}</span></button>${favoriteButton(item.id)}</li>`).join('');
      document.querySelector('#favoriteEmpty').hidden = Boolean(saved.length);
      document.querySelector('#favoriteEmpty').textContent = query ? '검색 결과가 없습니다.' : '저장한 기법이 없습니다.';
      document.querySelectorAll('[data-favorite]').forEach(paintButton);
    }

    async function sync(next) {
      const user = next?.user;
      const changed = session?.user.id !== user?.id;
      session = next;
      header.querySelector('.member-toggle-label').textContent = user ? '마이페이지' : '로그인';
      root.querySelector('#memberEmail').textContent = user?.email ?? '';
      root.querySelector('#memberSignedIn').hidden = !user;
      root.querySelector('#memberGuest').hidden = Boolean(user);
      if (!changed) return;
      const current = ++lookupVersion;
      favorites = new Map();
      pending.clear();
      search.value = '';
      loadingFavorites = Boolean(user);
      pageStatus.textContent = user ? '즐겨찾기를 불러오는 중입니다.' : '';
      renderFavorites();
      if (!user) return;
      try {
        const rows = await cloud.members.favorites(user.id);
        if (current !== lookupVersion) return;
        favorites = new Map(rows.map(row => [row.technique_id,row.created_at]));
        pageStatus.textContent = '';
      } catch (error) {
        if (current === lookupVersion) pageStatus.textContent = '즐겨찾기를 불러오지 못했습니다.';
        console.warn('CINELIQ favorites:', error);
      } finally {
        if (current === lookupVersion) {
          loadingFavorites = false;
          renderFavorites();
        }
      }
    }

    async function toggleFavorite(button) {
      if (!session) {
        openAuth('login','로그인하면 이 기법을 즐겨찾기에 저장할 수 있습니다.');
        return;
      }
      const id = button.dataset.favorite;
      if (loadingFavorites || !items.has(id) || pending.has(id)) return;
      const userId = session.user.id;
      const version = lookupVersion;
      const saved = favorites.has(id);
      pending.add(id);
      const selector = `[data-favorite="${CSS.escape(id)}"]`;
      document.querySelectorAll(selector).forEach(paintButton);
      if (!saved && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        button.querySelector('.bookmark-icon').animate(
          [{transform:'scale(1)'},{transform:'scale(1.14)',offset:.45},{transform:'scale(1)'}],
          {duration:210,easing:'ease-in-out'});
      }
      try {
        await cloud.members[saved?'remove':'save'](userId,id);
        if (version !== lookupVersion) return;
        pending.delete(id);
        if (saved) favorites.delete(id);
        else favorites.set(id,new Date().toISOString());
        renderFavorites();
        notify(saved?'즐겨찾기를 해제했습니다.':'즐겨찾기에 저장했습니다.');
      } catch (error) {
        if (version === lookupVersion) {
          pending.delete(id);
          document.querySelectorAll(selector).forEach(paintButton);
          notify('즐겨찾기를 변경하지 못했습니다.');
        }
        console.warn('CINELIQ favorite update:', error);
      }
    }

    function showAuthError(error) {
      console.warn('CINELIQ member authentication:',error.code ?? error.status);
      const messages = {
        invalid_credentials:'이메일 또는 비밀번호를 확인해 주세요.',
        email_not_confirmed:'가입 확인 메일의 링크를 먼저 열어 주세요.',
        weak_password:'더 긴 비밀번호를 입력해 주세요.',
        over_email_send_rate_limit:'메일 발송 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
        validation_failed:'입력한 이메일과 비밀번호를 확인해 주세요.',
      };
      status.textContent = messages[error.code] ?? '요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }

    header.addEventListener('click',()=>session?navigate('my'):openAuth());
    document.querySelector('#memberGuestLogin').addEventListener('click',()=>openAuth());
    document.querySelector('#closeMemberAuth').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{
      form.reset();
      setMode('login');
    });
    dialog.querySelectorAll('[data-auth-mode]').forEach(button=>
      button.addEventListener('click',()=>setMode(button.dataset.authMode)));
    search.addEventListener('input',renderFavorites);
    sort.addEventListener('change',renderFavorites);
    document.addEventListener('click',event=>{
      const button = event.target.closest('[data-favorite]');
      if (!button) return;
      event.stopPropagation();
      void toggleFavorite(button);
    },true);
    logout.addEventListener('click',async()=>{
      logout.disabled = true;
      try {
        await cloud.logout();
        void sync(null);
        navigate('hero');
      } catch (error) {
        console.warn('CINELIQ member logout:',error.code ?? error.status);
        notify('로그아웃하지 못했습니다. 다시 시도해 주세요.');
      } finally {
        logout.disabled = false;
      }
    });
    google.addEventListener('click',async()=>{
      google.disabled = true;
      try { await cloud.members.google(); }
      catch (error) {
        if (error.code==='google_unavailable') {
          status.textContent = 'Google 로그인 연결 설정이 필요합니다. 이메일로 로그인할 수 있습니다.';
        } else showAuthError(error);
      } finally { google.disabled = !ready; }
    });
    let ready = false;
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const submit = document.querySelector('#memberSubmit');
      if (!ready || submit.disabled) return;
      submit.disabled = true;
      status.textContent = '';
      const email = form.elements.email.value.trim();
      const password = form.elements.password.value;
      try {
        if (mode === 'reset') {
          await cloud.members.reset(email);
          status.textContent = '계정이 등록되어 있다면 비밀번호 재설정 메일이 발송됩니다.';
        } else if (mode === 'recovery') {
          await cloud.members.updatePassword(password);
          dialog.close();
          notify('비밀번호를 변경했습니다.');
        } else {
          const data = await cloud.members[mode](email,password);
          if (data.session) {
            void sync(data.session);
            dialog.close();
          } else {
            status.textContent = '이메일에서 가입 확인 링크를 열어 주세요.';
          }
        }
      } catch (error) {
        showAuthError(error);
      } finally {
        form.elements.password.value = '';
        submit.disabled = !ready;
      }
    });

    async function start() {
      ready = true;
      document.querySelector('#memberSubmit').disabled = false;
      google.disabled = false;
      const authError = authCallback.searchParams.has('error') || authCallback.hash.startsWith('#error=');
      cloud.onAuthChange((event,next)=>{
        void sync(next);
        if (event==='PASSWORD_RECOVERY' && next) openAuth('recovery');
      });
      const current = await cloud.members.session();
      void sync(current);
      if (authError) {
        const callback = new URL(location.href);
        callback.searchParams.delete('code');
        ['error','error_code','error_description'].forEach(key=>callback.searchParams.delete(key));
        if (callback.hash.startsWith('#error=')) callback.hash='';
        history.replaceState(history.state,'',callback.href);
        openAuth('login','인증 링크가 만료되었거나 연결을 완료하지 못했습니다.');
      }
    }

    return {start,favoriteButton};
  }

  window.CINELIQ_MEMBER = setup;
})();
