(() => {
  'use strict';
  window.CINELIQ_IMAGE_CAROUSEL = {
    markup(item, rows, render, escape) {
      return (
        '<section class="image-stack" data-image-stack role="region" aria-roledescription="이미지 캐러셀" aria-label="' +
        escape(item.ko) +
        ' 예시 이미지" tabindex="0"><div class="image-stack-stage"><div class="image-stack-back" aria-hidden="true">' +
        render(item, rows[1], true).replace(/alt="[^"]*"/, 'alt=""') +
        '</div><div class="image-stack-frame">' +
        rows
          .map(
            (row, index) =>
              '<div class="image-stack-slide" role="group" aria-roledescription="슬라이드" aria-label="' +
              (index + 1) +
              ' / ' +
              rows.length +
              '" ' +
              (index ? 'hidden' : '') +
              '>' +
              render(item, row, true) +
              '</div>',
          )
          .join('') +
        '</div></div><div class="image-stack-controls"><button type="button" data-image-step="-1" aria-label="이전 예시 이미지">‹</button><output role="status" aria-live="polite" aria-atomic="true">1 / ' +
        rows.length +
        '</output><button type="button" data-image-step="1" aria-label="다음 예시 이미지">›</button></div></section>'
      );
    },
    bind(root) {
      root.querySelectorAll('[data-image-stack]').forEach((stack) => {
        const slides = [...stack.querySelectorAll('.image-stack-slide')],
          counter = stack.querySelector('output'),
          back = stack.querySelector('.image-stack-back');
        let index = 0,
          animation,
          touch = null;
        function move(delta) {
          animation?.cancel();
          slides[index].hidden = true;
          index = (index + delta + slides.length) % slides.length;
          const slide = slides[index];
          slide.hidden = false;
          counter.textContent = index + 1 + ' / ' + slides.length;
          const preview = slides[(index + 1) % slides.length]
            .querySelector('img')
            .cloneNode(true);
          preview.alt = '';
          back.replaceChildren(preview);
          if (!(
            window.CINELIQ_A11Y?.reducedMotion() ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
          ))
            animation = slide.animate(
              [
                {
                  opacity: 0.35,
                  transform: 'translateX(' + (delta > 0 ? 1 : -1) * 7 + 'px)',
                },
                { opacity: 1, transform: 'translateX(0)' },
              ],
              { duration: 240, easing: 'ease-out' },
            );
        }
        stack.addEventListener('click', (e) => {
          const button = e.target.closest('[data-image-step]');
          if (button) {
            e.stopPropagation();
            move(Number(button.dataset.imageStep));
          }
        });
        stack.addEventListener('keydown', (e) => {
          if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            move(e.key === 'ArrowLeft' ? -1 : 1);
          }
        });
        stack.addEventListener(
          'touchstart',
          (e) => {
            touch =
              e.touches.length === 1
                ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                : null;
          },
          { passive: true },
        );
        stack.addEventListener('touchcancel', () => (touch = null), { passive: true });
        stack.addEventListener(
          'touchend',
          (e) => {
            const start = touch;
            touch = null;
            const end = e.changedTouches[0];
            if (!start || !end || e.touches.length) return;
            const dx = start.x - end.clientX,
              dy = start.y - end.clientY;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) {
              e.stopPropagation();
              move(dx > 0 ? 1 : -1);
            }
          },
          { passive: true },
        );
      });
    },
  };
})();
