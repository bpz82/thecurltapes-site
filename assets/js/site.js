/* The Curl Tapes — site behaviour (vanilla JS, no dependencies).
   Header/mobile menu, home hover backgrounds, galleries, carousels, lightbox,
   contact forms, and the small cart. */
(function () {
  'use strict';
  var CFG = window.CT_CONFIG || {};
  var EMAIL = CFG.email || 'thecurltapes@gmail.com';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var mobileMQ = window.matchMedia('(max-width: 767px)');

  /* ------------------------------------------------------------ analytics (same GTM container as the old site) */
  if (CFG.gtmId) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CFG.gtmId);
    document.head.appendChild(g);
  }

  /* ------------------------------------------------------------ header + mobile menu */
  function initMenu() {
    var btn = $('.ct-burger'), menu = $('#ct-menu');
    if (!btn || !menu) return;
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close Menu' : 'Open Menu');
      document.body.classList.toggle('ct-menu-open', open);
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(function () { menu.classList.add('is-open'); });
      } else {
        menu.classList.remove('is-open');
        setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
      }
    }
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  }

  /* ------------------------------------------------------------ home / about index: hover backgrounds */
  function initPortfolioHover() {
    $$('.portfolio-hover').forEach(function (root) {
      var items = $$('.portfolio-hover-item', root);
      var bgs = $$('.portfolio-hover-bg', root);
      var wrapBg = $('.portfolio-hover-backgrounds', root);
      bgs.forEach(function (b) { b.setAttribute('data-active', 'false'); b.setAttribute('data-animated', 'true'); });
      items.forEach(function (it, i) {
        it.setAttribute('data-active', 'false');
        function on() {
          if (mobileMQ.matches) return;
          items.forEach(function (x, j) { x.setAttribute('data-active', i === j ? 'true' : 'false'); });
          bgs.forEach(function (b, j) { b.setAttribute('data-active', i === j ? 'true' : 'false'); });
          if (wrapBg) wrapBg.setAttribute('data-active', 'true');
        }
        function off() {
          it.setAttribute('data-active', 'false');
          if (bgs[i]) bgs[i].setAttribute('data-active', 'false');
          if (wrapBg) wrapBg.setAttribute('data-active', 'false');
        }
        it.addEventListener('mouseenter', on);
        it.addEventListener('focus', on);
        it.addEventListener('mouseleave', off);
        it.addEventListener('blur', off);
      });
    });
  }

  /* ------------------------------------------------------------ lightbox (gallery grids + carousels) */
  var LB = null;
  function lightbox() {
    if (LB) return LB;
    var el = document.createElement('div');
    el.className = 'ct-lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Image viewer');
    el.innerHTML =
      '<img alt="">' +
      '<button class="ct-lightbox-btn ct-lightbox-close" type="button" aria-label="Close"><svg width="18" height="18" viewBox="0 0 16 16"><path d="M1.4 1.4l13.2 13.2M14.6 1.4L1.4 14.6" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></button>' +
      '<button class="ct-lightbox-btn ct-lightbox-prev" type="button" aria-label="Previous image"><svg width="12" height="22" viewBox="0 0 9 16"><polyline points="7.3,14.7 2.5,8 7.3,1.2" fill="none" stroke="currentColor"/></svg></button>' +
      '<button class="ct-lightbox-btn ct-lightbox-next" type="button" aria-label="Next image"><svg width="12" height="22" viewBox="0 0 9 16"><polyline points="1.6,1.2 6.5,7.9 1.6,14.7" fill="none" stroke="currentColor"/></svg></button>' +
      '<div class="ct-lightbox-count" aria-live="polite"></div>';
    document.body.appendChild(el);
    var img = $('img', el), count = $('.ct-lightbox-count', el);
    var list = [], idx = 0, lastFocus = null;
    function show(i) {
      idx = (i + list.length) % list.length;
      var a = list[idx], im = $('img', a);
      img.src = a.getAttribute('href');
      img.alt = im ? im.alt : '';
      count.textContent = list.length > 1 ? (idx + 1) + ' / ' + list.length : '';
    }
    function open(group, i) {
      list = group; lastFocus = document.activeElement;
      el.hidden = false; show(i);
      requestAnimationFrame(function () { el.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      $('.ct-lightbox-close', el).focus();
    }
    function close() {
      el.classList.remove('is-open');
      setTimeout(function () { el.hidden = true; img.removeAttribute('src'); }, 250);
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }
    $('.ct-lightbox-close', el).addEventListener('click', close);
    $('.ct-lightbox-prev', el).addEventListener('click', function () { show(idx - 1); });
    $('.ct-lightbox-next', el).addEventListener('click', function () { show(idx + 1); });
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    document.addEventListener('keydown', function (e) {
      if (el.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = null;
    el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    });
    LB = { open: open };
    return LB;
  }
  function initLightboxLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-lightbox]');
      if (!a) return;
      e.preventDefault();
      var scope = a.closest('.ct-carousel, .gallery-grid, section') || document;
      var group = $$('a[data-lightbox]', scope).filter(function (x) { return !x.closest('[aria-hidden="true"]'); });
      lightbox().open(group, Math.max(0, group.indexOf(a)));
    });
  }

  /* ------------------------------------------------------------ gallery grids */
  function initGalleryGrids() {
    $$('.gallery-grid').forEach(function (g) {
      var wrap = $('.gallery-grid-wrapper', g);
      var cols = parseInt(g.getAttribute('data-columns') || '3', 10);
      var gutter = parseFloat(g.getAttribute('data-gutter') || '50');
      function layout() {
        var c = mobileMQ.matches ? Math.min(cols, 2) : cols;
        var gap = (gutter / 20) + 'vw';
        if (wrap) {
          wrap.style.gridTemplateColumns = 'repeat(' + c + ', 1fr)';
          wrap.style.gridColumnGap = gap;
          wrap.style.gridRowGap = gap;
        }
      }
      layout();
      mobileMQ.addEventListener ? mobileMQ.addEventListener('change', layout) : mobileMQ.addListener(layout);
      var items = $$('.gallery-grid-item', g);
      if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.setAttribute('data-show', 'true'); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.setAttribute('data-show', 'true'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -5% 0px' });
      items.forEach(function (i) { i.removeAttribute('data-show'); io.observe(i); });
    });
  }

  /* ------------------------------------------------------------ gallery slideshows */
  function initSlideshows() {
    $$('.gallery-slideshow').forEach(function (ss) {
      var items = $$('.gallery-slideshow-item', ss);
      var thumbs = $$('.gallery-slideshow-thumbnails-thumb', ss);
      if (!items.length) return;
      var cur = Math.max(0, items.findIndex(function (f) { return f.getAttribute('data-active') === 'true'; }));
      function go(n, dir) {
        n = (n + items.length) % items.length;
        items.forEach(function (f, i) {
          f.setAttribute('data-active', i === n ? 'true' : 'false');
          f.setAttribute('data-in', i === n ? 'true' : 'false');
          f.setAttribute('data-next', dir >= 0 ? 'true' : 'false');
          f.setAttribute('aria-hidden', i === n ? 'false' : 'true');
          var im = $('img', f);
          if (im) { im.style.display = ''; if (Math.abs(i - n) <= 1) im.loading = 'eager'; }
        });
        thumbs.forEach(function (t, i) {
          t.setAttribute('data-active', i === n ? 'true' : 'false');
          t.setAttribute('aria-current', i === n ? 'true' : 'false');
        });
        cur = n;
      }
      go(cur, 1);
      // size the slideshow the way the original theme script did:
      // desktop = galleryHeight vh (+ page padding) at galleryWidth% of the page; mobile = a square-ish 100vw box
      var props = {};
      try { props = JSON.parse(ss.getAttribute('data-props') || '{}'); } catch (e) {}
      var wrapper = $('.gallery-slideshow-wrapper', ss);
      var thumbsEl = $('.gallery-slideshow-thumbnails', ss);
      function layout() {
        if (mobileMQ.matches) {
          ss.style.height = '100vw';
          ss.style.maxWidth = 'var(--maxPageWidth)';
        } else {
          ss.style.height = 'calc(' + (props.galleryHeight || 100) + 'vh + (var(--pagePadding) * 2))';
          ss.style.maxWidth = 'calc(var(--maxPageWidth) * (' + ((props.galleryWidth || 100) / 100) + '))';
        }
        if (!wrapper) return;
        wrapper.style.height = '0px';
        var cs = getComputedStyle(ss), ws = getComputedStyle(wrapper);
        var avail = ss.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) -
          parseFloat(ws.marginTop) - parseFloat(ws.marginBottom) - (thumbsEl ? thumbsEl.offsetHeight : 0);
        var extra = wrapper.offsetHeight; // padding/borders that sit outside the content height
        wrapper.style.height = Math.max(100, avail - extra) + 'px';
      }
      layout();
      window.addEventListener('resize', layout);
      mobileMQ.addEventListener ? mobileMQ.addEventListener('change', layout) : mobileMQ.addListener(layout);
      $$('[data-previous]', ss).forEach(function (b) { b.addEventListener('click', function () { go(cur - 1, -1); }); });
      $$('[data-next]', ss).forEach(function (b) {
        if (b.tagName === 'BUTTON') b.addEventListener('click', function () { go(cur + 1, 1); });
      });
      thumbs.forEach(function (t, i) {
        t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0');
        t.addEventListener('click', function () { go(i, i > cur ? 1 : -1); });
        t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i, 1); } });
      });
      ss.setAttribute('tabindex', ss.getAttribute('tabindex') || '0');
      ss.addEventListener('keydown', function (e) {
        if (e.target.closest('input,textarea')) return;
        if (e.key === 'ArrowLeft') go(cur - 1, -1);
        if (e.key === 'ArrowRight') go(cur + 1, 1);
      });
      var sx = null;
      ss.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      ss.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      });
    });
  }

  /* ------------------------------------------------------------ carousels (rebuilt "user items" lists) */
  function initCarousels() {
    $$('[data-ct-carousel]').forEach(function (car) {
      var track = $('.ct-carousel-track', car);
      var slides = $$('.ct-carousel-slide', car);
      var cols = parseInt(car.getAttribute('data-columns') || '3', 10);
      car.style.setProperty('--cols', cols);
      var i = 0;
      function perView() { return mobileMQ.matches ? 1 : cols; }
      function update() {
        var max = Math.max(0, slides.length - perView());
        if (i > max) i = 0;
        if (i < 0) i = max;
        var s = slides[i];
        track.style.transform = 'translateX(' + (-(s ? s.offsetLeft : 0)) + 'px)';
        slides.forEach(function (sl, k) {
          var vis = k >= i && k < i + perView() + (mobileMQ.matches ? 1 : 0);
          sl.setAttribute('aria-hidden', vis ? 'false' : 'true');
          var im = $('img', sl); if (im && vis) im.loading = 'eager';
        });
      }
      $('.ct-carousel-prev', car).addEventListener('click', function () { i -= 1; update(); });
      $('.ct-carousel-next', car).addEventListener('click', function () { i += 1; update(); });
      car.setAttribute('tabindex', '0');
      car.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { i -= 1; update(); }
        if (e.key === 'ArrowRight') { i += 1; update(); }
      });
      var sx = null;
      car.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      car.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx; sx = null;
        if (Math.abs(dx) > 40) { i += dx < 0 ? 1 : -1; update(); }
      });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ------------------------------------------------------------ forms */
  function mailtoLink(subject, body) {
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function formToObject(form) {
    var o = {};
    $$('input, textarea, select', form).forEach(function (el) {
      if (!el.name || el.type === 'submit') return;
      if (el.type === 'checkbox') { o[el.name] = el.checked ? 'yes' : 'no'; return; }
      o[el.name] = el.value.trim();
    });
    return o;
  }
  function showError(form, html) {
    var box = $('.ct-form-error', form);
    if (!box) { box = document.createElement('div'); box.className = 'ct-form-error'; box.setAttribute('role', 'alert'); form.appendChild(box); }
    box.innerHTML = html;
  }
  function clearErrors(form) {
    $$('.ct-field-error, .ct-form-error', form).forEach(function (e) { e.remove(); });
  }
  function fieldError(el, msg) {
    var p = document.createElement('p');
    p.className = 'ct-field-error';
    p.textContent = msg;
    (el.closest('.form-item, .field, .newsletter-form-field-wrapper') || el.parentNode).appendChild(p);
  }
  function validate(form) {
    var ok = true;
    $$('[required]', form).forEach(function (el) {
      var v = (el.value || '').trim();
      if (!v) { ok = false; fieldError(el, 'This field is required.'); }
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { ok = false; fieldError(el, 'Please enter a valid email address.'); }
    });
    return ok;
  }
  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.ok === false) { var err = new Error(j.error || ('HTTP ' + r.status)); err.status = r.status; throw err; }
          return j;
        });
      });
  }
  function initContact(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors(form);
      if (!validate(form)) return;
      var data = formToObject(form);
      data.recipient = form.getAttribute('data-recipient') || '';
      data.form = form.getAttribute('data-form-name') || '';
      data.page = location.pathname;
      form.classList.add('ct-submitting');
      post((CFG.endpoints || {}).contact || '/api/contact', data).then(function () {
        var tpl = $('template.ct-success-html', form);
        var div = document.createElement('div');
        div.className = 'form-submission-text ct-form-message';
        div.setAttribute('role', 'status');
        div.innerHTML = tpl ? tpl.innerHTML : '<p>Thank you!</p>';
        form.parentNode.replaceChild(div, form);
      }).catch(function () {
        var body = 'Name: ' + [data.fname, data.lname].filter(Boolean).join(' ') + '\nEmail: ' + (data.email || '') +
          (data.phone ? '\nPhone: ' + data.phone : '') + '\n\n' + (data.message || '');
        showError(form, 'Sorry — your message couldn’t be sent from the site right now. Please email it to us at <a href="' +
          mailtoLink('Message from thecurltapes.com', body) + '">' + EMAIL + '</a> (we’ve filled it in for you).');
      }).then(function () { form.classList.remove('ct-submitting'); });
    });
  }
  function initForms() {
    $$('form[data-ct-form="contact"]').forEach(initContact);
  }

  /* ------------------------------------------------------------ cart */
  var CART_KEY = 'ct-cart-v1';
  function money(c) { return '$' + (c / 100).toFixed(2); }
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function writeCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} updateCartBadge(); }
  function updateCartBadge() {
    var n = readCart().reduce(function (s, x) { return s + x.qty; }, 0);
    $$('.ct-cart').forEach(function (a) { a.hidden = n === 0; var c = $('.ct-cart-count', a); if (c) c.textContent = n; });
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function ticketModal(product, done) {
    var m = document.createElement('div');
    m.className = 'ct-modal';
    var fields = product.fields || [];
    var html = '<div class="ct-modal-box" role="dialog" aria-modal="true" aria-labelledby="ct-modal-title">' +
      '<button type="button" class="ct-modal-close" aria-label="Close">×</button>' +
      '<h2 id="ct-modal-title">' + escapeHtml(product.formName || 'Information') + '</h2><form novalidate>';
    fields.forEach(function (f) {
      var id = 'ctf-' + f.id;
      html += '<label for="' + id + '">' + escapeHtml((f.title || '').trim()) + (f.required ? ' <span aria-hidden="true">(required)</span>' : '') + '</label>';
      if (f.description) html += '<span class="ct-desc">' + escapeHtml(f.description) + '</span>';
      var common = ' id="' + id + '" name="' + escapeHtml(f.id) + '" data-title="' + escapeHtml((f.title || '').trim()) + '"' + (f.required ? ' required' : '') + (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '');
      if (f.type === 'textarea') html += '<textarea' + common + '></textarea>';
      else html += '<input type="' + (f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : 'text') + '"' + common + '>';
    });
    html += '<button class="ct-btn-primary sqs-button-element--primary" type="submit">Add To Cart</button></form></div>';
    m.innerHTML = html;
    document.body.appendChild(m);
    var form = $('form', m);
    function close() { m.remove(); document.body.style.overflow = ''; }
    $('.ct-modal-close', m).addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    document.body.style.overflow = 'hidden';
    var first = $('input, textarea', m); if (first) first.focus();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors(form);
      if (!validate(form)) return;
      var info = {};
      $$('input, textarea', form).forEach(function (el) { info[el.getAttribute('data-title') || el.name] = el.value.trim(); });
      close();
      done(info);
    });
  }
  function addToCart(product, qty, info) {
    var cart = readCart();
    cart.push({ id: product.id, title: product.title, url: product.url, price: product.price, image: product.image, qty: qty, info: info || null });
    writeCart(cart);
  }
  function flashAdded(btn) {
    btn.classList.add('added');
    setTimeout(function () { btn.classList.remove('added'); }, 1800);
  }
  function initProducts() {
    // product page
    $$('[data-ct-product]').forEach(function (el) {
      var product = JSON.parse(el.getAttribute('data-ct-product'));
      var input = $('input[name="quantity-input"]', el);
      var dec = $('.decrease-button', el), inc = $('.increase-button', el);
      function setQty(v) {
        v = Math.max(1, Math.min(product.stock || 9999, parseInt(v, 10) || 1));
        if (input) input.value = v;
        if (dec) { dec.disabled = v <= 1; dec.style.opacity = v <= 1 ? '0.3' : '1'; }
      }
      if (dec) dec.addEventListener('click', function () { setQty((+input.value) - 1); });
      if (inc) inc.addEventListener('click', function () { setQty((+input.value) + 1); });
      if (input) input.addEventListener('change', function () { setQty(input.value); });
      $$('.sqs-add-to-cart-button, .product-list-item-add-to-cart button, button.sqs-button-element--primary', el).forEach(function (btn) {
        if (!/add to cart/i.test(btn.textContent)) return;
        btn.type = 'button';
        btn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          var qty = input ? Math.max(1, parseInt(input.value, 10) || 1) : 1;
          var go = function (info) { addToCart(product, qty, info); flashAdded(btn); };
          if (product.fields && product.fields.length) ticketModal(product, go); else go(null);
        });
      });
    });
  }
  function initCartPage() {
    var page = $('[data-ct-cart-page]');
    if (!page) return;
    var list = $('[data-cart-items]', page);
    function render() {
      var cart = readCart();
      $('[data-cart-empty]', page).hidden = cart.length > 0;
      $('[data-cart-full]', page).hidden = cart.length === 0;
      list.innerHTML = '';
      var total = 0;
      cart.forEach(function (it, k) {
        total += it.price * it.qty;
        var li = document.createElement('li');
        li.className = 'ct-cart-item';
        var meta = it.info ? Object.keys(it.info).filter(function (x) { return it.info[x]; }).map(function (x) { return x + ': ' + it.info[x]; }).join('\n') : '';
        li.innerHTML = (it.image ? '<a href="' + it.url + '"><img src="' + it.image + '" alt=""></a>' : '<span></span>') +
          '<div class="ct-cart-line"><p class="ct-cart-item-title"><a href="' + it.url + '">' + escapeHtml(it.title) + '</a></p>' +
          (meta ? '<p class="ct-cart-item-meta">' + escapeHtml(meta) + '</p>' : '') + '</div>' +
          '<input class="ct-cart-qty" type="number" min="1" value="' + it.qty + '" aria-label="Quantity">' +
          '<span>' + money(it.price * it.qty) + '</span>' +
          '<button class="ct-cart-remove" type="button" aria-label="Remove">×</button>';
        $('.ct-cart-qty', li).addEventListener('change', function (e) { var c = readCart(); c[k].qty = Math.max(1, parseInt(e.target.value, 10) || 1); writeCart(c); render(); });
        $('.ct-cart-remove', li).addEventListener('click', function () { var c = readCart(); c.splice(k, 1); writeCart(c); render(); });
        list.appendChild(li);
      });
      $('[data-cart-subtotal]', page).textContent = money(total);
    }
    render();
    $('[data-cart-checkout]', page).addEventListener('click', function () {
      var cart = readCart();
      if (!cart.length) return;
      var note = $('[data-cart-note]', page);
      var links = (CFG.store || {}).paymentLinks || {};
      var ids = cart.map(function (x) { return x.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (ids.length === 1 && links[ids[0]]) {
        var qty = cart.reduce(function (s, x) { return s + x.qty; }, 0);
        var info = cart.map(function (x) { return x.info; }).filter(Boolean);
        var u = links[ids[0]];
        var email = info.map(function (i) { return i.Email || i.email; }).filter(Boolean)[0];
        location.href = u + (u.indexOf('?') < 0 ? '?' : '&') + (email ? 'prefilled_email=' + encodeURIComponent(email) + '&' : '') + 'client_reference_id=' + encodeURIComponent('web-' + Date.now()) ;
        return;
      }
      var summary = cart.map(function (x) {
        var meta = x.info ? Object.keys(x.info).map(function (k) { return '  ' + k + ': ' + x.info[k]; }).join('\n') : '';
        return x.qty + ' × ' + x.title + ' (' + money(x.price * x.qty) + ')' + (meta ? '\n' + meta : '');
      }).join('\n\n');
      var total = money(cart.reduce(function (s, x) { return s + x.price * x.qty; }, 0));
      var btn = this;
      btn.disabled = true;
      post((CFG.endpoints || {}).order || '/api/order', { items: cart, total: total, page: location.pathname }).then(function () {
        writeCart([]);
        render();
        $('[data-cart-empty]', page).hidden = false;
        $('[data-cart-empty] p', page).textContent = 'Thanks! Your order request was sent to The Curl Tapes. We’ll email you to confirm and arrange payment.';
      }).catch(function () {
        note.hidden = false;
        note.innerHTML = 'Online payment isn’t set up on this site yet. To get tickets, email your order to <a href="' +
          mailtoLink('Order from thecurltapes.com', summary + '\n\nTotal: ' + total) + '">' + EMAIL + '</a> — we’ve written it out for you.';
      }).then(function () { btn.disabled = false; });
    });
  }

  /* ------------------------------------------------------------ first-section offset under the overlay header */
  function initHeaderOffset() {
    var header = $('.ct-header');
    var first = $('main#page section.page-section[data-ct-header-offset]');
    if (!header || !first) return;
    function set() {
      var h = header.offsetHeight;
      first.style.paddingTop = h + 'px';
      document.documentElement.style.setProperty('--sqs-first-section-header-offset', h + 'px');
    }
    set();
    window.addEventListener('resize', set);
  }

  /* ------------------------------------------------------------ "fit" image blocks: size the frame to the grid cell */
  function initFitImages() {
    var roots = $$('.fluid-image-component-root.image-component-container-fit');
    if (!roots.length) return;
    function ratio(r) {
      var img = $('img', r);
      var w = img && +img.getAttribute('width'), h = img && +img.getAttribute('height');
      return w && h ? w / h : 1;
    }
    function layout() {
      roots.forEach(function (r) {
        r.style.setProperty('--image-component-container-width', '0px');
        r.style.setProperty('--image-component-container-height', '0px');
      });
      var sizes = roots.map(function (r) {
        var cell = r.closest('.fe-block') || r.parentNode;
        return [cell.clientWidth, cell.clientHeight];
      });
      roots.forEach(function (r, i) {
        var ar = ratio(r), W = sizes[i][0], H = sizes[i][1];
        var w = H > 0 ? Math.min(W, H * ar) : W;
        r.style.setProperty('--image-component-container-width', Math.round(w) + 'px');
        r.style.setProperty('--image-component-container-height', Math.round(w / ar) + 'px');
      });
    }
    layout();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 100); });
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    initFitImages();
    initHeaderOffset();
    initMenu();
    initPortfolioHover();
    initLightboxLinks();
    initGalleryGrids();
    initSlideshows();
    initCarousels();
    initForms();
    initProducts();
    initCartPage();
    updateCartBadge();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
