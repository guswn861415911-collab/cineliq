(() => {
  'use strict';
  const select = document.querySelector('#sortSelect');
  if (!select) return;
  const root = document.createElement('div');
  root.className = 'sort-menu';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sort-menu-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'sortOptions');
  const list = document.createElement('div');
  list.id = 'sortOptions';
  list.className = 'sort-menu-options';
  list.role = 'listbox';
  list.setAttribute('aria-label', '정렬 방식');
  list.hidden = true;
  root.append(trigger, list);
  select.after(root);
  select.hidden = true;
  select.tabIndex = -1;
  function close(focus = false) {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
  }
  function sync() {
    const selected = select.selectedOptions[0];
    trigger.replaceChildren(
      document.createTextNode(selected?.textContent || '기본 순서'),
    );
    const arrow = document.createElement('span');
    arrow.textContent = '⌄';
    arrow.setAttribute('aria-hidden', 'true');
    trigger.append(arrow);
    trigger.setAttribute('aria-label', '정렬 방식: ' + (selected?.textContent || ''));
    list.replaceChildren();
    for (const option of select.options) {
      if (option.hidden || option.disabled) continue;
      const row = document.createElement('div');
      row.role = 'option';
      row.tabIndex = -1;
      row.dataset.value = option.value;
      row.textContent = option.textContent;
      row.setAttribute('aria-selected', String(option.selected));
      list.append(row);
    }
  }
  function open() {
    sync();
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    (list.querySelector('[aria-selected=true]') || list.firstElementChild)?.focus();
  }
  function choose(row) {
    if (!row) return;
    select.value = row.dataset.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    close(true);
    sync();
  }
  trigger.addEventListener('click', () => (list.hidden ? open() : close()));
  trigger.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });
  list.addEventListener('click', (e) => choose(e.target.closest('[role=option]')));
  list.addEventListener('keydown', (e) => {
    const rows = [...list.children],
      index = rows.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') close();
    else if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      choose(document.activeElement);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? rows.length - 1
            : (index + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      rows[next]?.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!root.contains(e.target)) close();
  });
  select.addEventListener('change', sync);
  document.querySelector('#clearFilters').addEventListener('click', sync);
  new MutationObserver(() => {
    sync();
  }).observe(select, {
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'disabled'],
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-major=all]')) sync();
  });
  sync();
})();
