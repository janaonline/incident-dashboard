document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  fetch('content.json')
    .then((response) => response.json())
    .then((data) => {
      renderHero(data.site);
      const sectionLayers = renderSections(data.sections);
      renderFooter(data.footer);
      observeReveals();
      measureSections(sectionLayers);
      window.addEventListener('resize', debounce(() => measureSections(sectionLayers), 150));
      startScrollEngine(sectionLayers);
    })
    .catch(() => {
      /* content.json missing or invalid - leave the page blank rather than crash */
    });
});

const THEME_KEY = 'isd-theme';

function persistTheme(value) {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch (err) {
    /* localStorage unavailable (private mode, etc.) - theme just won't persist */
  }
}

function tintLightness() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 0.85 : 0.32;
}

function reapplyTints() {
  document.querySelectorAll('[data-tint-h]').forEach((el) => {
    const [r, g, b] = hslToRgb(Number(el.dataset.tintH), Number(el.dataset.tintS), tintLightness());
    el.style.setProperty('--tint-r', Math.round(r));
    el.style.setProperty('--tint-g', Math.round(g));
    el.style.setProperty('--tint-b', Math.round(b));
  });
}

function switchTheme(next, originEl) {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !document.startViewTransition) {
    root.setAttribute('data-theme', next);
    persistTheme(next);
    reapplyTints();
    return;
  }

  const rect = originEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const transition = document.startViewTransition(() => {
    root.setAttribute('data-theme', next);
    persistTheme(next);
    reapplyTints();
  });

  transition.ready.then(() => {
    root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      { duration: 1000, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
    );
  });
}

function initThemeToggle() {
  const button = document.getElementById('themeToggle');
  if (!button) return;

  const syncButton = (theme) => {
    button.setAttribute('aria-pressed', String(theme === 'light'));
    button.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  };

  syncButton(document.documentElement.getAttribute('data-theme') || 'dark');

  button.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    syncButton(next);
    switchTheme(next, button);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY && e.newValue) {
      document.documentElement.setAttribute('data-theme', e.newValue);
      syncButton(e.newValue);
      reapplyTints();
    }
  });
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function createMedia(container, filename, altText, onLoadTint) {
  container.innerHTML = '';

  const inner = document.createElement('div');
  inner.className = 'media-inner';
  container.appendChild(inner);

  if (!filename) {
    showPlaceholder(inner, 'No image set');
    return inner;
  }

  const img = document.createElement('img');
  img.className = 'media-inner__img';
  img.alt = altText || '';
  img.onerror = () => showPlaceholder(inner, filename);
  if (onLoadTint) {
    img.onload = () => onLoadTint(img);
  }
  img.src = filename;
  inner.appendChild(img);

  return inner;
}

function showPlaceholder(inner, label) {
  inner.innerHTML = '';
  inner.classList.add('is-placeholder');
  const span = document.createElement('span');
  span.className = 'placeholder-label';
  span.textContent = label;
  inner.appendChild(span);
}

function buildKineticText(el, text) {
  el.innerHTML = '';
  const words = text.split(' ');
  words.forEach((word, i) => {
    const mask = document.createElement('span');
    mask.className = 'word-mask';

    const span = document.createElement('span');
    span.className = 'word';
    span.style.transitionDelay = `${i * 55}ms`;
    span.textContent = word;

    mask.appendChild(span);
    el.appendChild(mask);

    // A real space as its own sibling text node - not inside the
    // overflow:hidden mask, where a trailing space's advance width gets
    // visually collapsed by some engines - and it's what gives the browser
    // a line-break opportunity between word-mask spans (two adjacent
    // inline-blocks with nothing between them in the DOM don't wrap).
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(' '));
    }
  });
}

/**
 * Samples a downscaled copy of the loaded image to estimate its average
 * color, then nudges that color into a usable mid-range lightness so the
 * translucent glass panel stays readable regardless of how bright/dark the
 * source photo is. Applies the result as --tint-r/--tint-g/--tint-b on
 * panelEl. Falls back silently (panel keeps the CSS default tint) if the
 * canvas read fails for any reason.
 */
function applyTintFromImage(img, panelEl) {
  try {
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0, g = 0, b = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r = r / pixelCount;
    g = g / pixelCount;
    b = b / pixelCount;

    const [h, s] = rgbToHsl(r, g, b);
    const cappedS = Math.min(s, 0.65);
    panelEl.dataset.tintH = h;
    panelEl.dataset.tintS = cappedS;

    const [tr, tg, tb] = hslToRgb(h, cappedS, tintLightness());

    panelEl.style.setProperty('--tint-r', Math.round(tr));
    panelEl.style.setProperty('--tint-g', Math.round(tg));
    panelEl.style.setProperty('--tint-b', Math.round(tb));
  } catch (err) {
    /* canvas read failed (e.g. opaque decode error) - keep default tint */
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function renderHero(site) {
  if (!site) return;

  const titleEl = document.getElementById('hero-title');
  const taglineEl = document.getElementById('hero-tagline');
  const mediaEl = document.getElementById('hero-media');
  const panelEl = document.getElementById('hero-content');
  const ctaEl = document.getElementById('hero-cta');

  if (site.title) buildKineticText(titleEl, site.title);
  if (site.tagline) taglineEl.textContent = site.tagline;
  createMedia(mediaEl, site.heroImage, site.heroImageAlt, (img) => applyTintFromImage(img, panelEl));

  if (site.cta && site.cta.label && site.cta.url) {
    ctaEl.textContent = site.cta.label;
    ctaEl.href = site.cta.url;
    ctaEl.classList.add('has-link');
  }
}

function renderSections(sections) {
  if (!Array.isArray(sections)) return [];

  const sectionsRoot = document.getElementById('sections');
  const imageStack = document.getElementById('image-stack');
  const sectionLayers = [];

  sections.forEach((section, index) => {
    if (!section || !section.heading || !section.body) return;

    const sideClass = index % 2 === 0 ? 'text-left' : 'text-right';

    const textEl = document.createElement('div');
    textEl.className = 'content-section__text glass-panel';

    const kickerEl = document.createElement('span');
    kickerEl.className = 'content-section__kicker';
    kickerEl.setAttribute('aria-hidden', 'true');
    textEl.appendChild(kickerEl);

    const headingEl = document.createElement('h2');
    headingEl.className = 'content-section__heading kinetic-heading';
    buildKineticText(headingEl, section.heading);
    textEl.appendChild(headingEl);

    const bodyEl = document.createElement('p');
    bodyEl.className = 'content-section__body';
    bodyEl.textContent = section.body;
    textEl.appendChild(bodyEl);

    if (section.caption) {
      const captionEl = document.createElement('p');
      captionEl.className = 'content-section__caption';
      captionEl.textContent = section.caption;
      textEl.appendChild(captionEl);
    }

    // Cross-fading background layer, shared across all sections via #image-stack.
    // Tinting the *text panel* (not the layer itself) from this same image.
    const layerEl = document.createElement('div');
    layerEl.className = 'image-layer';
    layerEl.setAttribute('data-index', String(index));
    const mediaInnerEl = createMedia(layerEl, section.image, section.imageAlt, (img) => applyTintFromImage(img, textEl));
    imageStack.appendChild(layerEl);

    // Reduced-motion-only fallback: this section's own full-bleed image,
    // hidden unless prefers-reduced-motion strips the cross-fade stack out.
    const fallbackEl = document.createElement('div');
    fallbackEl.className = 'content-section__media-fallback';
    createMedia(fallbackEl, section.image, section.imageAlt);

    const scrimEl = document.createElement('div');
    scrimEl.className = 'content-section__scrim';

    const indexEl = document.createElement('span');
    indexEl.className = 'content-section__index';
    indexEl.setAttribute('aria-hidden', 'true');
    indexEl.textContent = String(index + 1).padStart(2, '0');

    const sectionEl = document.createElement('section');
    sectionEl.className = 'content-section reveal ' + sideClass;
    sectionEl.appendChild(fallbackEl);
    sectionEl.appendChild(scrimEl);
    sectionEl.appendChild(indexEl);
    sectionEl.appendChild(textEl);
    sectionsRoot.appendChild(sectionEl);

    sectionLayers.push({ sectionEl, layerEl, mediaInnerEl, top: 0, height: 0 });
  });

  return sectionLayers;
}

function renderFooter(footer) {
  if (!footer) return;

  const creditEl = document.getElementById('footer-credit');
  const linksEl = document.getElementById('footer-links');

  if (footer.credit) creditEl.textContent = footer.credit;

  if (Array.isArray(footer.links) && footer.links.length > 0) {
    footer.links.forEach((link) => {
      if (!link || !link.label || !link.url) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = link.url;
      a.textContent = link.label;
      if (/^https?:\/\//i.test(link.url)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      li.appendChild(a);
      linksEl.appendChild(li);
    });
  }
}

function observeReveals() {
  const targets = document.querySelectorAll('.hero, .content-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  targets.forEach((target) => observer.observe(target));
}

function measureSections(sectionLayers) {
  sectionLayers.forEach((entry) => {
    // getBoundingClientRect (not offsetTop) so this is correct regardless of
    // which ancestor ends up as the offsetParent - #sections is
    // position:relative (so the fixed image-stack z-index-stacks correctly
    // under it), which makes it .content-section's offsetParent, so
    // offsetTop alone would be relative to #sections, not the document.
    const rect = entry.sectionEl.getBoundingClientRect();
    entry.top = rect.top + window.scrollY;
    entry.height = entry.sectionEl.offsetHeight;
  });
}

/**
 * Cross-fade opacity for a section whose viewport-center distance from its
 * own top edge is `distTop`, given its `height` and a fade-zone half-width
 * `overlap` (in px). Each section's fade-in/fade-out zone is centered ON
 * the boundary it shares with its neighbor (extending `overlap` px on
 * either side of that boundary, not just inward) - that's what makes
 * adjacent sections' curves actually overlap and sum to ~1 through the
 * handoff, rather than both hitting 0 at the same instant. See CLAUDE.md.
 */
function edgeFadeOpacity(distTop, height, overlap) {
  const distFromStartBoundary = distTop + overlap;
  const distFromEndBoundary = height + overlap - distTop;
  return Math.min(1, Math.max(0, Math.min(distFromStartBoundary, distFromEndBoundary) / (2 * overlap)));
}

function startScrollEngine(sectionLayers) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progressBar = document.getElementById('scroll-progress');
  if (reduceMotion || sectionLayers.length === 0) return;

  const tick = () => {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const center = scrollY + viewportHeight / 2;
    const overlap = viewportHeight * 0.3;

    sectionLayers.forEach(({ layerEl, mediaInnerEl, top, height }) => {
      if (height === 0) return;
      const distTop = center - top;
      const opacity = edgeFadeOpacity(distTop, height, overlap);
      const zoomProgress = Math.min(1, Math.max(0, distTop / height));

      layerEl.style.opacity = opacity;
      layerEl.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
      mediaInnerEl.style.transform = `scale(${1 + 0.06 * zoomProgress})`;
    });

    if (progressBar) {
      const max = document.documentElement.scrollHeight - viewportHeight;
      progressBar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}
