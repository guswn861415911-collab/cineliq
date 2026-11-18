(() => {
  'use strict';
  const cloud = window.CINELIQ_CLOUD;
  const identityNames = {google:'Google', kakao:'카카오'};
  const linkAttemptKey = 'cineliq.identity-link';
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
    const kakao = document.querySelector('#memberKakao');
    const identityPanel = root.querySelector('#memberIdentities');
    const identityStatus = root.querySelector('#memberIdentityStatus');
    const authCallback = new URL(location.href);
    let session = null;
    let mode = 'login';
    let lookupVersion = 0;
    let loadingFavorites = false;
    let favorites = new Map();
    const pending = new Set();
    let identities = null;
    let identityBusy = false;
    let identityRefresh;

    function paintIdentities() {
      for (const row of identityPanel.querySelectorAll('[data-identity-provider]')) {
        const provider = row.dataset.identityProvider;
        const linked = identities?.some(identity => identity.provider === provider);
        const hasBackup = identities?.some(identity =>
          identity.provider !== provider && Object.hasOwn(identityNames,identity.provider));
        const button = row.querySelector('button');
        row.querySelector('span').textContent = identities ? (linked ? '연결됨' : '연결 안 됨') : '확인 중';
        button.textContent = linked ? '연결 해제' : '연결하기';
        button.setAttribute('aria-label',`${identityNames[provider]} ${button.textContent}`);
        button.disabled = identityBusy || !identities || Boolean(linked && !hasBackup);
      }
    }

    async function refreshIdentities(version) {
      try {
        const rows = await cloud.members.identities();
        if (version !== lookupVersion) return null;
        identities = rows;
        return rows;
      } catch {
        if (version === lookupVersion) identityStatus.textContent = '연결된 계정을 불러오지 못했어요. 페이지를 새로고침해 주세요.';
        return null;
      } finally {
        if (version === lookupVersion) paintIdentities();
      }
    }

    function identityError(code, description = '') {
      if (['identity_already_exists','user_already_exists','email_exists'].includes(code)
        || /already (?:linked|associated)|identity.+already exists/i.test(description)) {
        return '이미 다른 CINELIQ 계정에 연결된 로그인 방법입니다.';
      }
      if (code === 'manual_linking_disabled') return '계정 연결 설정이 아직 활성화되지 않았어요.';
      if (code === 'access_denied' || /access[ _]+denied|cancel(?:led|ed)?|denied access/i.test(description)) {
        return '계정 연결을 취소했어요.';
      }
      return '계정 연결을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
    }

    function readLinkAttempt() {
      try {
        const attempt = JSON.parse(sessionStorage.getItem(linkAttemptKey) ?? 'null');
        sessionStorage.removeItem(linkAttemptKey);
        return attempt && Date.now() - attempt.startedAt < 30 * 60 * 1000
          && Object.hasOwn(identityNames,attempt.provider) ? attempt : null;
      } catch { return null; }
    }

    async function hasSameSession(version, userId) {
      const latest = await cloud.members.session();
      return version === lookupVersion && latest?.user.id === userId;
    }

    async function changeIdentity(provider) {
      if (!session || !identities || identityBusy) return;
      const current = lookupVersion;
      const userId = session.user.id;
      const linked = identities.some(identity => identity.provider === provider);
      identityBusy = true;
      paintIdentities();
      identityStatus.textContent = linked ? '연결을 확인하고 있어요…' : '계정 연결을 시작하고 있어요…';
      let leaving = false;
      try {
        const rows = await cloud.members.identities();
        if (!(await hasSameSession(current,userId))) return;
        identities = rows;
        const identity = rows.find(item => item.provider === provider);
        if (!linked && identity) {
          identityStatus.textContent = '이미 이 CINELIQ 계정에 연결되어 있어요.';
          return;
        }
        if (linked) {
          const enabled = await cloud.members.enabledProviders();
          const backup = rows.find(item => item.provider !== provider
            && Object.hasOwn(identityNames,item.provider) && enabled[item.provider]);
          if (!identity || !backup) {
            identityStatus.textContent = '다시 로그인할 수 있는 다른 소셜 계정을 먼저 연결해 주세요.';
            return;
          }
          if (!window.confirm(`${identityNames[backup.provider]} 계정으로 다시 로그인할 수 있나요? ${identityNames[provider]} 연결을 해제할까요?`)) {
            identityStatus.textContent = '연결 해제를 취소했어요.';
            return;
          }
          if (!(await hasSameSession(current,userId))) return;
          await cloud.members.unlinkIdentity(identity);
          const updated = await refreshIdentities(current);
          if (updated && current === lookupVersion) identityStatus.textContent = '로그인 수단 연결을 해제했어요.';
          return;
        }
        const url = await cloud.members.linkIdentity(provider);
        if (!(await hasSameSession(current,userId))) return;
        if (!url) throw Error('No identity authorization URL');
        sessionStorage.setItem(linkAttemptKey,JSON.stringify({provider,userId,startedAt:Date.now()}));
        location.assign(url);
        leaving = true;
      } catch (error) {
        if (current === lookupVersion) {
          identityStatus.textContent = linked && error.code !== 'manual_linking_disabled'
            ? '연결을 해제하지 못했어요. 잠시 후 다시 시도해 주세요.'
            : identityError(error.code,error.message);
        }
      } finally {
        if (!leaving && current === lookupVersion) {
          identityBusy = false;
          paintIdentities();
        }
      }
    }

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
      google.hidden = kakao.hidden = next !== 'login';
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
      root.querySelector('#memberEmail').textContent = user ? user.email || '등록된 이메일 없음' : '';
      root.querySelector('#memberSignedIn').hidden = !user;
      root.querySelector('#memberGuest').hidden = Boolean(user);
      if (!changed) return;
      const current = ++lookupVersion;
      identities = null;
      identityBusy = false;
      identityStatus.textContent = '';
      paintIdentities();
      if (user) identityRefresh = refreshIdentities(current);
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
    identityPanel.addEventListener('click',event=>{
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      void changeIdentity(button.closest('[data-identity-provider]').dataset.identityProvider);
    });
    window.addEventListener('pageshow',event=>{
      if (!event.persisted || !identityBusy) return;
      readLinkAttempt();
      identityBusy = false;
      identityStatus.textContent = '계정 연결이 완료되지 않았어요. 다시 시도할 수 있어요.';
      paintIdentities();
    });
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
    async function startSocialLogin(provider) {
      google.disabled = kakao.disabled = true;
      status.textContent = '';
      try { await cloud.members[provider](); }
      catch (error) {
        if (error.code==='google_unavailable') {
          status.textContent = 'Google 로그인 연결 설정이 필요합니다. 이메일로 로그인할 수 있습니다.';
        } else if (provider==='kakao') {
          status.textContent = '카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도하거나 다른 로그인 방법을 이용해 주세요.';
        } else showAuthError(error);
      } finally { google.disabled = kakao.disabled = !ready; }
    }
    google.addEventListener('click',()=>startSocialLogin('google'));
    kakao.addEventListener('click',()=>startSocialLogin('kakao'));
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
      google.disabled = kakao.disabled = false;
      const fragment = new URLSearchParams(authCallback.hash.slice(1));
      const authError = authCallback.searchParams.get('error') || fragment.get('error');
      const errorCode = authCallback.searchParams.get('error_code') || fragment.get('error_code');
      const errorDescription = authCallback.searchParams.get('error_description') || fragment.get('error_description') || '';
      const attempt = readLinkAttempt();
      const linkReturn = attempt && (authError || authCallback.searchParams.has('code'));
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
        if (linkReturn) {
          const message = identityError(errorCode || authError,errorDescription);
          if (current?.user.id === attempt.userId) {
            navigate('my');
            identityStatus.textContent = message;
          } else notify(message);
          return;
        }
        const cancelled = authError === 'access_denied' || /access[ _]+denied|cancel(?:led|ed)?|denied access/i.test(errorDescription);
        openAuth('login',cancelled
          ? '로그인이 취소됐어요. 원하시면 다시 시도해 주세요.'
          : '인증 링크가 만료되었거나 로그인을 완료하지 못했어요. 다시 시도하거나 다른 로그인 방법을 이용해 주세요.');
      } else if (linkReturn) {
        if (current?.user.id !== attempt.userId) {
          notify('원래 로그인한 계정을 확인할 수 없어 연결 결과를 확인하지 못했어요.');
          return;
        }
        const rows = await identityRefresh;
        if (session?.user.id !== attempt.userId) return;
        navigate('my');
        identityStatus.textContent = rows?.some(identity => identity.provider === attempt.provider)
          ? `${identityNames[attempt.provider]} 계정을 연결했어요.`
          : '계정 연결 결과를 확인하지 못했어요. 다시 로그인하기 전에 연결 상태를 확인해 주세요.';
      }
    }

    return {start,favoriteButton};
  }

  window.CINELIQ_MEMBER = setup;
})();
