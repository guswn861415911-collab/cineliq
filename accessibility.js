(() => {
  'use strict';
  const defaults = {
    textSize: 'normal',
    contrast: false,
    motion: false,
    links: false,
    captions: false,
  };
  function clean(value = {}) {
    return {
      textSize: ['normal', 'large', 'xlarge'].includes(value?.textSize)
        ? value.textSize
        : 'normal',
      contrast: value?.contrast === true,
      motion: value?.motion === true,
      links: value?.links === true,
      captions: value?.captions === true,
    };
  }
  const read = (key) => {
    try {
      return clean(JSON.parse(localStorage.getItem(key)) || {});
    } catch {
      return { ...defaults };
    }
  };
  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  let user = null,
    version = 0,
    busy = false,
    preferences = read('cineliq.a11y.last');
  const system = matchMedia('(prefers-reduced-motion: reduce)'),
    seen = new WeakSet(),
    autoCaption = new WeakMap();
  const key = () => (user ? 'cineliq.a11y.' + user.id : 'cineliq.a11y.guest');
  const reducedMotion = () => system.matches || preferences.motion;
  function captions(video) {
    const tracks = [...video.textTracks].filter((track) =>
      ['captions', 'subtitles'].includes(track.kind),
    );
    if (preferences.captions && tracks.length) {
      const chosen =
        tracks.find((track) => track.language?.startsWith('ko')) || tracks[0];
      if (!tracks.some((track) => track.mode === 'showing')) {
        chosen.mode = 'showing';
        autoCaption.set(video, chosen);
      }
    } else if (!preferences.captions) {
      const prior = autoCaption.get(video);
      if (prior?.mode === 'showing') prior.mode = 'disabled';
      autoCaption.delete(video);
    }
  }
  function videos() {
    document.querySelectorAll('video').forEach((video) => {
      if (!seen.has(video)) {
        seen.add(video);
        video.addEventListener('loadedmetadata', () => captions(video));
        video.textTracks.addEventListener('addtrack', () => captions(video));
      }
      captions(video);
    });
  }
  function apply() {
    write('cineliq.a11y.last', preferences);
    const root = document.documentElement;
    root.dataset.textSize = preferences.textSize;
    root.dataset.highContrast = String(preferences.contrast);
    root.dataset.reduceMotion = String(reducedMotion());
    root.dataset.linkUnderlines = String(preferences.links);
    document.querySelectorAll('[data-a11y]').forEach((input) => {
      const value = preferences[input.dataset.a11y];
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
      input.disabled = busy;
    });
    if (reducedMotion())
      document.getAnimations?.().forEach((animation) => animation.cancel());
    videos();
    window.dispatchEvent(new Event('cineliq-a11y-change'));
  }
  async function change(keyName, value) {
    if (busy || !Object.hasOwn(defaults, keyName)) return;
    const current = version,
      id = user?.id,
      old = preferences,
      storageKey = key();
    preferences = clean({ ...preferences, [keyName]: value });
    busy = true;
    apply();
    const status = document.querySelector('#accessibilityStatus');
    try {
      if (id) {
        const updated = await window.CINELIQ_CLOUD.members.updateAccessibility(
          preferences,
          id,
        );
        if (current !== version) return;
        user = updated;
      }
      if (current === version) {
        write(storageKey, preferences);
        if (status) status.textContent = '접근성 설정을 저장했어요.';
      }
    } catch {
      if (current === version) {
        preferences = old;
        if (status) status.textContent = '저장하지 못해 이전 접근성 설정으로 되돌렸어요.';
      }
    } finally {
      if (current === version) {
        busy = false;
        apply();
      }
    }
  }
  window.CINELIQ_A11Y = {
    reducedMotion,
    sync(next) {
      const changed = user?.id !== next?.id;
      if (changed) {
        version++;
        busy = false;
      }
      user = next;
      preferences = user?.user_metadata?.cineliq_accessibility
        ? clean(user.user_metadata.cineliq_accessibility)
        : read(key());
      apply();
    },
    change,
  };
  system.addEventListener('change', apply);
  document.addEventListener('DOMContentLoaded', () => {
    document
      .querySelectorAll('[data-a11y]')
      .forEach((input) =>
        input.addEventListener(
          'change',
          () =>
            void change(
              input.dataset.a11y,
              input.type === 'checkbox' ? input.checked : input.value,
            ),
        ),
      );
    new MutationObserver(videos).observe(document.body, {
      childList: true,
      subtree: true,
    });
    apply();
  });
  apply();
})();
