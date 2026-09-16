
    (() => {
      const navbar = document.querySelector('.navbar');
      const menuToggle = document.querySelector('.menu-toggle');
      const navMenu = document.querySelector('.nav-menu');
      const mobileMenu = window.matchMedia('(max-width: 600px)');
      navbar.classList.add('is-enhanced');
      menuToggle.hidden = false;

      function setMenu(open) {
        navbar.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
      menuToggle.addEventListener('click', () => {
        setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
      });
      navMenu.addEventListener('click', event => {
        if (event.target.closest('a[href]')) {
          if (mobileMenu.matches) menuToggle.focus();
          setMenu(false);
        }
      });
      document.addEventListener('click', event => {
        if (!navbar.contains(event.target)) setMenu(false);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navbar.classList.contains('is-open')) {
          setMenu(false);
          menuToggle.focus();
        }
      });
      navbar.addEventListener('focusout', event => {
        if (!navbar.contains(event.relatedTarget)) setMenu(false);
      });
      mobileMenu.addEventListener('change', () => {
        if (mobileMenu.matches && navMenu.contains(document.activeElement)) menuToggle.focus();
        if (!mobileMenu.matches && document.activeElement === menuToggle) document.querySelector('.brand').focus();
        setMenu(false);
      });

      const hero = document.querySelector('.hero');
      if (!hero) return;
      const slides = [...document.querySelectorAll('.slide')];
      const dots = [...document.querySelectorAll('.dot')];
      const interval = 2000; // Normal autoplay interval.
      const interactionDelay = 8000; // Resume after manual interaction.
      let resumeAt = 0;
      let current = 0;
      let timer;
      let hovered = false;
      let touching = false;
      let touchStart = null;

      function schedule() {
        clearTimeout(timer);
        if (!hovered && !touching && !document.hidden) {
          const delay = Math.max(interval, resumeAt - Date.now());
          timer = setTimeout(() => show(current + 1), delay);
        }
      }

      function pauseForInteraction() {
        resumeAt = Date.now() + interactionDelay;
        schedule();
      }

      function show(index, manual = false) {
        if (manual) resumeAt = Date.now() + interactionDelay;
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          slide.classList.toggle('is-active', i === current);
          slide.setAttribute('aria-hidden', String(i !== current));
          dots[i].classList.toggle('is-active', i === current);
          if (i === current) dots[i].setAttribute('aria-current', 'true');
          else dots[i].removeAttribute('aria-current');
        });
        if (manual) document.querySelector('#slide-status').textContent = `Photo ${current + 1} of ${slides.length}`;
        schedule();
      }

      dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
      hero.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          show(current + (event.key === 'ArrowLeft' ? -1 : 1), true);
        }
      });
      hero.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
      hero.addEventListener('pointerleave', () => { hovered = false; schedule(); });
      // Focus pauses briefly; it must not permanently stop autoplay after a click.
      hero.addEventListener('focusin', pauseForInteraction);
      hero.addEventListener('touchstart', event => {
        touching = true;
        pauseForInteraction();
        touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      }, { passive: true });
      hero.addEventListener('touchend', event => {
        touching = event.touches.length > 0;
        pauseForInteraction();
        if (!touchStart) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1), true);
        touchStart = null;
      }, { passive: true });
      hero.addEventListener('touchcancel', () => { touchStart = null; touching = false; pauseForInteraction(); });
      document.addEventListener('visibilitychange', schedule);
      schedule();
    })();
  
/* Shared category gallery and lightbox using local photographs. */
(() => {
  const collections = {
  "portrait": {
    "title": "Portrait",
    "files": [
      "images/portrait-01.jpg",
      "images/portrait-02.jpg"
    ]
  },
  "landscape": {
    "title": "Landscape",
    "files": [
      "images/landscape-01.jpg",
      "images/landscape-02.jpg",
      "images/landscape-03.jpg",
      "images/landscape-05.jpg"
    ]
  },
  "street": {
    "title": "Street",
    "files": [
      "images/street-01.jpg",
      "images/street-02.jpg",
      "images/street-03.jpg",
      "images/street-04.jpg",
      "images/street-05.jpg",
      "images/street-06.jpg",
      "images/street-07.jpg",
      "images/street-08.jpg",
      "images/street-09.jpg",
      "images/street-10.jpg",
      "images/street-11.jpg"
    ]
  },
  "still-life": {
    "title": "Still Life",
    "files": [
      "images/still-life-01.jpg",
      "images/still-life-02.jpg",
      "images/still-life-03.jpg",
      "images/still-life-04.jpg",
      "images/still-life-05.jpg",
      "images/still-life-06.jpg",
      "images/still-life-07.jpg"
    ]
  },
  "travel": {
    "title": "Travel",
    "files": [
      "images/travel-01.jpg",
      "images/travel-02.jpg"
    ]
  },
  "daily": {
    "title": "Daily",
    "files": []
  }
};
  const collection = collections[document.body.dataset.category];
  if (!collection) return;

  const grid = document.querySelector('.gallery-grid');
  const dialog = document.querySelector('.lightbox');
  const largeImage = document.querySelector('.lightbox-image');
  const caption = document.querySelector('.lightbox-caption');
  let activeLabel = '';

  const existingButtons = [...grid.querySelectorAll('.gallery-item')];
  const photoFiles = existingButtons.length
    ? existingButtons.map(button => button.querySelector('img').getAttribute('src'))
    : collection.files;

  if (!photoFiles.length) {
    const message = document.createElement('p');
    message.className = 'gallery-empty';
    message.textContent = 'Photos coming soon.';
    grid.append(message);
    return;
  }

  photoFiles.forEach((src, index) => {
    const label = `${collection.title} / ${String(index + 1).padStart(2, '0')}`;
    const button = existingButtons[index] || document.createElement('button');
    button.type = 'button';
    button.classList.add('gallery-item');
    button.setAttribute('aria-label', `Enlarge ${label}`);
    button.setAttribute('aria-haspopup', 'dialog');
    let img = button.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.src = src;
      img.alt = `${collection.title} photograph ${index + 1}`;
      img.width = 900;
      img.height = 675;
      img.loading = 'lazy';
      img.decoding = 'async';
      button.append(img);
      grid.append(button);
    }

    button.addEventListener('click', () => {
      activeLabel = label;
      caption.textContent = `${label} — Loading…`;
      largeImage.alt = img.alt;
      largeImage.src = src;
      dialog.showModal();
      document.body.classList.add('lightbox-open');
    });
  });

  largeImage.addEventListener('load', () => { caption.textContent = activeLabel; });
  largeImage.addEventListener('error', () => {
    caption.textContent = `${activeLabel} — Image unavailable. Please close and try again.`;
  });
  document.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  // Native dialog supports Escape and returns focus to the thumbnail.
  dialog.addEventListener('close', () => {
    document.body.classList.remove('lightbox-open');
    largeImage.removeAttribute('src');
  });
})();
