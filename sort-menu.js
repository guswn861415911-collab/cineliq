(() => {
  'use strict';

  const sortSelect = document.querySelector('#sortSelect');
  if (!sortSelect) return;
  const sortMenu = document.createElement('div');
  sortMenu.className = 'sort-menu';
  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'sort-menu-trigger';
  menuButton.setAttribute('aria-haspopup', 'listbox');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'sortOptions');
  const optionsList = document.createElement('div');
  optionsList.id = 'sortOptions';
  optionsList.className = 'sort-menu-options';
  optionsList.role = 'listbox';
  optionsList.setAttribute('aria-label', '정렬 방식');
  optionsList.hidden = true;
  sortMenu.append(menuButton, optionsList);
  sortSelect.after(sortMenu);
  sortSelect.hidden = true;
  sortSelect.tabIndex = -1;
  function closeSortMenu(focus = false) {
    optionsList.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (focus) menuButton.focus();
  }
  function renderSortMenu() {
    const selectedOption = sortSelect.selectedOptions[0];
    menuButton.replaceChildren(
      document.createTextNode(selectedOption?.textContent || '기본 순서'),
    );
    const arrow = document.createElement('span');
    arrow.textContent = '⌄';
    arrow.setAttribute('aria-hidden', 'true');
    menuButton.append(arrow);
    menuButton.setAttribute(
      'aria-label',
      '정렬 방식: ' + (selectedOption?.textContent || ''),
    );
    optionsList.replaceChildren();
    for (const option of sortSelect.options) {
      if (option.hidden || option.disabled) continue;
      const optionElement = document.createElement('div');
      optionElement.role = 'option';
      optionElement.tabIndex = -1;
      optionElement.dataset.value = option.value;
      optionElement.textContent = option.textContent;
      optionElement.setAttribute('aria-selected', String(option.selected));
      optionsList.append(optionElement);
    }
  }
  function openSortMenu() {
    renderSortMenu();
    optionsList.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    (
      optionsList.querySelector('[aria-selected=true]') || optionsList.firstElementChild
    )?.focus();
  }
  function selectSortOption(optionElement) {
    if (!optionElement) return;
    sortSelect.value = optionElement.dataset.value;
    sortSelect.dispatchEvent(
      new Event('change', {
        bubbles: true,
      }),
    );
    closeSortMenu(true);
    renderSortMenu();
  }
  menuButton.addEventListener('click', () =>
    optionsList.hidden ? openSortMenu() : closeSortMenu(),
  );
  menuButton.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openSortMenu();
    }
  });
  optionsList.addEventListener('click', (event) =>
    selectSortOption(event.target.closest('[role=option]')),
  );
  optionsList.addEventListener('keydown', (event) => {
    const optionElements = [...optionsList.children],
      focusedOptionIndex = optionElements.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSortMenu(true);
    } else if (event.key === 'Tab') closeSortMenu();
    else if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      selectSortOption(document.activeElement);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const nextOptionIndex =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? optionElements.length - 1
            : (focusedOptionIndex +
                (event.key === 'ArrowDown' ? 1 : -1) +
                optionElements.length) %
              optionElements.length;
      optionElements[nextOptionIndex]?.focus();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (!sortMenu.contains(event.target)) closeSortMenu();
  });
  sortSelect.addEventListener('change', renderSortMenu);
  document.querySelector('#clearFilters').addEventListener('click', renderSortMenu);
  new MutationObserver(() => {
    renderSortMenu();
  }).observe(sortSelect, {
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden', 'disabled'],
  });
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-major=all]')) renderSortMenu();
  });
  renderSortMenu();
})();
