(() => {
  'use strict';
  const path =
    'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z';
  window.CINELIQ_FOLDER_SAVE = ({
    members,
    escape,
    openAuth,
    notify,
    isBookmarked,
    setBookmarked,
  }) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'folder-save-dialog';
    dialog.setAttribute('aria-labelledby', 'folderSaveTitle');
    dialog.innerHTML =
      '<form><h2 id="folderSaveTitle">기법 저장</h2><p class="folder-save-technique"></p><label class="folder-save-bookmark"><input type="checkbox" data-save-bookmark> 즐겨찾기에 저장</label><p>저장할 폴더를 선택하세요.</p><div class="folder-save-list"></div><div class="folder-save-create"><label>새 폴더<input maxlength="60" autocomplete="off" placeholder="폴더 이름"></label><button type="button" data-folder-create>만들고 선택</button></div><p role="status" aria-live="polite"></p><div class="member-dialog-actions"><button type="button" data-folder-cancel>취소</button><button type="submit" data-folder-commit disabled>저장</button></div></form>';
    document.body.append(dialog);
    let user = null,
      version = 0,
      task = null,
      busy = false,
      returnFocus = null;
    const list = dialog.querySelector('.folder-save-list'),
      status = dialog.querySelector('[role="status"]'),
      commit = dialog.querySelector('[type="submit"]');
    function close() {
      if (!busy) {
        task = null;
        dialog.close();
        returnFocus?.focus({ preventScroll: true });
      }
    }
    dialog.querySelector('[data-folder-cancel]').onclick = close;
    dialog.addEventListener('cancel', (event) => {
      if (busy) event.preventDefault();
      else task = null;
    });
    function locked(value) {
      busy = value;
      dialog.querySelectorAll('input,button').forEach((el) => (el.disabled = value));
    }
    async function verify(current) {
      if (!user || current.version !== version || current.userId !== user.id)
        throw Error('session_changed');
      await members.identityState(current.userId);
      if (current.version !== version) throw Error('session_changed');
    }
    function row(folder, checked) {
      return `<label><input type="checkbox" value="${escape(folder.id)}" ${checked ? 'checked' : ''}><span>${escape(folder.name)}</span></label>`;
    }
    async function open(item) {
      if (!user) {
        openAuth();
        return;
      }
      if (busy) return;
      returnFocus = document.activeElement;
      const current = { item, userId: user.id, version, expected: [] };
      task = current;
      dialog.querySelector('[data-save-bookmark]').checked = true;
      list.replaceChildren();
      status.textContent = '폴더를 불러오고 있어요…';
      commit.disabled = true;
      dialog.querySelector('.folder-save-create input').value = '';
      dialog.querySelector('.folder-save-technique').textContent = item.ko;
      if (!dialog.open) dialog.showModal();
      locked(true);
      try {
        await verify(current);
        if (!(await members.folderStorageReady())) throw Error('not_ready');
        const data = await members.library(current.userId);
        await verify(current);
        if (task !== current) return;
        current.expected = data.entries
          .filter((entry) => entry.technique_id === item.id)
          .map((entry) => entry.folder_id);
        list.innerHTML =
          data.folders
            .map((folder) => row(folder, current.expected.includes(folder.id)))
            .join('') || '<p>새 폴더를 만들어 저장할 수 있어요.</p>';
        dialog.querySelector('[data-save-bookmark]').checked =
          isBookmarked(item.id) || !current.expected.length;
        status.textContent =
          '즐겨찾기와 폴더를 각각 선택할 수 있어요. 체크 해제한 폴더에서만 제거됩니다.';
        current.ready = true;
      } catch {
        if (task === current)
          status.textContent =
            '폴더 저장 기능을 준비 중이거나 목록을 불러오지 못했어요. 기존 데이터는 변경하지 않았습니다.';
      } finally {
        if (task === current) {
          locked(false);
          commit.disabled = !current.ready;
          dialog.querySelector('[data-folder-create]').disabled = !current.ready;
          (
            list.querySelector('input') || dialog.querySelector('[data-folder-cancel]')
          ).focus();
        }
      }
    }
    dialog.querySelector('[data-folder-create]').onclick = async () => {
      const current = task;
      if (!current?.ready || busy) return;
      const name = dialog.querySelector('.folder-save-create input').value.trim();
      if (!name || [...name].length > 60) {
        status.textContent = '폴더 이름을 1~60자로 입력해 주세요.';
        return;
      }
      locked(true);
      try {
        await verify(current);
        const folder = await members.createFolder(name, current.userId);
        await verify(current);
        if (task !== current) return;
        list.querySelector('p')?.remove();
        list.insertAdjacentHTML('beforeend', row(folder, true));
        dialog.querySelector('.folder-save-create input').value = '';
        status.textContent = '폴더를 만들고 선택했어요. 저장을 눌러 기법을 추가하세요.';
        window.dispatchEvent(new Event('cineliq-library-changed'));
      } catch {
        if (task === current)
          status.textContent =
            '폴더를 만들지 못했어요. 같은 이름이 있는지 확인해 주세요.';
      } finally {
        if (task === current) locked(false);
      }
    };
    dialog.querySelector('form').onsubmit = async (event) => {
      event.preventDefault();
      const current = task;
      if (!current?.ready || busy) return;
      locked(true);
      const selected = [...list.querySelectorAll('input:checked')].map((el) => el.value);
      try {
        await verify(current);
        await setBookmarked(
          current.item.id,
          dialog.querySelector('[data-save-bookmark]').checked,
        );
        await verify(current);
        await members.setTechniqueFolders(current.item.id, selected, current.expected);
        await verify(current);
        if (task !== current) return;
        notify('저장 상태를 반영했어요.');
        window.dispatchEvent(new Event('cineliq-library-changed'));
        locked(false);
        close();
      } catch {
        if (task === current) {
          status.textContent =
            '일부 저장이 완료되지 않았어요. 즐겨찾기는 이미 반영됐을 수 있습니다. 취소 후 다시 열어 현재 상태를 확인해 주세요.';
          current.ready = false;
        }
      } finally {
        if (task === current) {
          locked(false);
          commit.disabled = !current.ready;
        }
      }
    };
    return {
      open,
      sync(next) {
        const nextUser = next?.user ?? null;
        if (user?.id !== nextUser?.id) {
          version++;
          task = null;
          busy = false;
          dialog.close();
        }
        user = nextUser;
      },
      button: (id) =>
        `<button class="folder-save-button" type="button" data-save-folders="${id}" aria-label="개인 폴더에 저장" title="개인 폴더에 저장"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></button>`,
    };
  };
})();
