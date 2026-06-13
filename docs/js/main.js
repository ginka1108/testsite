/**
 * きみ夏宵あそび – Main JS (Three.js removed)
 * Handles: white-reveal, navbar, GSAP animations, UX helpers
 */

(function () {
  'use strict';

  // ──────────────────────────────────────────────
  //  1. Dive-reveal: オーバーレイの生成・沈降・フェードは
  //     top.html の <head> インラインCSS + インラインJS が担当。
  //     ここで #page-reveal に触らないこと(インライン側が
  //     transitionend 後に要素を remove() するため)。
  //     フェード開始時に 'dive-reveal:out' イベントが飛んでくる。
  // ──────────────────────────────────────────────

  // ──────────────────────────────────────────────
  //  2. Register GSAP plugins
  // ──────────────────────────────────────────────
  gsap.registerPlugin(ScrollTrigger);

  // ──────────────────────────────────────────────
  //  3. Navbar scroll effect
  // ──────────────────────────────────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ──────────────────────────────────────────────
  //  4. Hero entrance animation (GSAP timeline)
  //     intro経由: オーバーレイのフェード開始('dive-reveal:out')に
  //               同期して再生 → 泡が消えながらロゴが浮かび上がる
  //     直接アクセス: 従来どおり0.2秒後に再生
  // ──────────────────────────────────────────────
  const fromIntro = new URLSearchParams(window.location.search).get('from') === 'intro';

  function playHeroEntrance(delay) {
    gsap.timeline({ defaults: { ease: 'power3.out' }, delay })
      .to('#hero-eyebrow',    { opacity: 1, y: 0, duration: 1.0 }, 0.0)
      .to('#hero-logo-wrap',  { opacity: 1, y: 0, scale: 1, duration: 1.2 }, 0.2)
      .to('#hero-date',       { opacity: 1, y: 0, duration: 0.9 }, 0.7)
      .to('#hero-tagline',    { opacity: 1, y: 0, duration: 0.9 }, 1.0)
      .to('#hero-ctas',       { opacity: 1, y: 0, duration: 0.8 }, 1.3)
      .to('#scroll-indicator',{ opacity: 1, duration: 0.8 },        1.8);
  }

  if (fromIntro && document.getElementById('page-reveal')) {
    let heroStarted = false;
    const startHero = () => {
      if (heroStarted) return;
      heroStarted = true;
      playHeroEntrance(0.3);
    };
    if (window.__diveRevealOut) {
      // イベント発火がmain.js読み込みより先だった場合のフォールバック
      startHero();
    } else {
      window.addEventListener('dive-reveal:out', startHero, { once: true });
    }
    // フェイルセーフ: 万一イベントが来なくても必ず再生する
    setTimeout(startHero, 11000);
  } else {
    playHeroEntrance(0.2);
  }

  // ──────────────────────────────────────────────
  //  5. Scroll-triggered reveal for .reveal elements
  // ──────────────────────────────────────────────
  document.querySelectorAll('.reveal').forEach((el) => {
    const delay = parseFloat(el.style.getPropertyValue('--delay') || '0');
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      delay,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
    });
  });

  // ──────────────────────────────────────────────
  //  6. Background video: graceful fallback
  // ──────────────────────────────────────────────
  const video = document.getElementById('hero-video');
  if (video) {
    video.addEventListener('error', () => {
      const bg = document.getElementById('video-bg');
      if (bg) {
        bg.style.background =
          'linear-gradient(135deg, #03020E 0%, #0E1B5A 40%, #1A1040 70%, #03020E 100%)';
      }
    }, { once: true });
    video.play().catch(() => {});
  }

  // ──────────────────────────────────────────────
  //  7. KV gallery: parallax tilt on hover
  // ──────────────────────────────────────────────
  document.querySelectorAll('.kv-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      gsap.to(card, {
        rotateX: -y * 8, rotateY: x * 8,
        duration: 0.3, transformPerspective: 600, ease: 'power1.out',
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: 'power2.out' });
    });
  });

  // ──────────────────────────────────────────────
  //  8. Guest scroll: drag to scroll on desktop
  // ──────────────────────────────────────────────
  const guestScroll = document.getElementById('guests-scroll');
  if (guestScroll) {
    let isDown = false, startX, scrollLeft;
    guestScroll.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - guestScroll.offsetLeft;
      scrollLeft = guestScroll.scrollLeft;
      guestScroll.style.cursor = 'grabbing';
    });
    ['mouseleave', 'mouseup'].forEach(ev =>
      guestScroll.addEventListener(ev, () => { isDown = false; guestScroll.style.cursor = 'grab'; })
    );
    guestScroll.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - guestScroll.offsetLeft;
      guestScroll.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
    guestScroll.style.cursor = 'grab';
  }

})();
