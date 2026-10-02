/* ---- core/config.js ---- */
/* Configuration générale du site (les textes et les liens sont écrits dans les pages par l'admin) */
window.VPS = window.VPS || {};
VPS.config = {
  smoothScroll: true,           // défilement animé au clic sur le menu (false = saut direct)
  heroVideo: {
    mobileQuery: "(max-width: 767px) and (orientation: portrait)"   // version mobile de la vidéo d'accueil
  }
};

/* ---- core/reveal.js ---- */
/* =========================================================
   Apparitions au scroll — une seule fois par élément
   Usage : data-reveal="fade" | "rise" sur l'élément ; VPS.reveal.observe(root) après rendu
   Option : data-reveal-group="row" → apparition ligne par ligne
   Les éléments qui entrent ensemble dans l'écran apparaissent en décalé (stagger).
   ========================================================= */
(function () {
  document.documentElement.classList.add("js");

  function stagger() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--reveal-stagger")) || 0.1;
  }

  function reveal(el, delay) {
    if (delay) {
      el.style.transitionDelay = delay + "s";
      var clear = function () { el.style.transitionDelay = ""; el.removeEventListener("transitionend", clear); };
      el.addEventListener("transitionend", clear);
    }
    el.classList.add("is-revealed");
  }

  var io = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
    batch.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    var step = stagger();
    /* data-reveal-group="row" : même décalage pour toute une ligne, les lignes arrivent l'une après l'autre */
    var rowTops = [];
    batch.forEach(function (el) {
      if (el.getAttribute("data-reveal-group") !== "row") return;
      var top = Math.round(el.getBoundingClientRect().top);
      if (rowTops.indexOf(top) === -1) rowTops.push(top);
    });
    rowTops.sort(function (a, b) { return a - b; });
    var i = 0;
    batch.forEach(function (el) {
      io.unobserve(el);
      var delay = 0;
      if (el.getAttribute("data-reveal-group") === "row") {
        delay = rowTops.indexOf(Math.round(el.getBoundingClientRect().top)) * step;
      } else if (el.getAttribute("data-reveal") === "rise") {
        delay = i++ * step;
      }
      reveal(el, delay);
    });
  }, { threshold: 0.15 }) : null;

  VPS.reveal = {
    observe: function (root) {
      (root || document).querySelectorAll("[data-reveal]:not(.is-revealed)").forEach(function (el) {
        if (io) io.observe(el); else el.classList.add("is-revealed");
      });
    },
    /* Affiche immédiatement (ex. retour depuis une fiche projet) */
    showAll: function (root) {
      (root || document).querySelectorAll("[data-reveal]").forEach(function (el) {
        if (io) io.unobserve(el);
        el.classList.add("is-revealed");
      });
    }
  };
})();

/* ---- components/header.js ---- */
/* =========================================================
   Header : DesktopMenu + MobileMenu (burger) + sélecteur de langue
   HTML écrit par l'admin (gabarit entete.html) ; page d'accueil = body.page-home
   ========================================================= */
(function () {
  var MOBILE_MAX = 767;

  /* Sections de l'accueil suivies par le menu (scroll-spy) */
  var SECTIONS = [
    { key: "home", section: "accueil" },
    { key: "projects", section: "projets" },
    { key: "clients", section: "clients" }
  ];

  function init(header, page) {
    var inner = header.querySelector(".header__inner");
    var burger = header.querySelector(".burger");
    var mobile = header.querySelector(".nav-mobile");

    /* ---- MobileMenu ---- */
    function setOpen(open) {
      burger.classList.toggle("is-open", open);
      mobile.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", open);
      burger.setAttribute("aria-label", burger.getAttribute(open ? "data-label-close" : "data-label-open"));
      mobile.setAttribute("aria-hidden", !open);
      document.body.classList.toggle("is-locked", open);
    }
    burger.addEventListener("click", function () { setOpen(!mobile.classList.contains("is-open")); });
    mobile.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });

    /* ---- Passage en burger : menu + 100px de chaque côté doivent tenir ---- */
    var logo = header.querySelector(".header__logo");
    var nav = header.querySelector(".nav-desktop");
    var right = header.querySelector(".header__right");
    var SAFE = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--burger-safe")) || 100;
    function updateMode() {
      var w = window.innerWidth;
      var cs = getComputedStyle(inner);
      var needed = parseFloat(cs.paddingLeft) + logo.offsetWidth + nav.offsetWidth +
                   right.offsetWidth + parseFloat(cs.paddingRight) + 2 * SAFE;
      var burgerMode = w <= MOBILE_MAX || w < needed;
      if (!burgerMode && header.classList.contains("is-burger")) setOpen(false);
      header.classList.toggle("is-burger", burgerMode);
    }
    updateMode();
    window.addEventListener("resize", updateMode);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateMode);

    /* ---- Item actif (soulignement) ---- */
    var desktopLinks = header.querySelectorAll(".nav-desktop__link");
    function setActive(key) {
      desktopLinks.forEach(function (a) {
        var on = a.getAttribute("data-nav") === key;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    }

    if (page === "home") {
      /* Fond au scroll */
      var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 0); };

      /* Suivi de la section visible : la dernière section dont le haut a passé le bas du header */
      var spy = SECTIONS.map(function (i) {
        return { key: i.key, el: document.getElementById(i.section) };
      }).filter(function (s) { return s.el; });
      var current = null;
      var updateSpy = function () {
        if (!spy.length) return;
        var line = header.offsetHeight + 1;
        var key = spy[0].key;
        spy.forEach(function (s) { if (s.el.getBoundingClientRect().top <= line) key = s.key; });
        var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (atBottom && window.scrollY > 0) key = spy[spy.length - 1].key;
        if (window.scrollY <= 0) key = spy[0].key;
        if (key !== current) { current = key; setActive(key); }
      };

      var tick = function () { onScroll(); updateSpy(); };  /* updateSpy peut être redéfini plus bas */
      tick();
      window.addEventListener("scroll", tick, { passive: true });
      window.addEventListener("resize", updateSpy);
      window.addEventListener("load", updateSpy);
      if (window.ResizeObserver) new ResizeObserver(updateSpy).observe(document.body);

      /* Au clic : l'item cliqué devient actif tout de suite, puis défilement vers la section.
         Pendant un défilement animé, le suivi de section est suspendu (pas de clignotement). */
      var spyLocked = false, unlockTimer = null;
      var baseUpdateSpy = updateSpy;
      updateSpy = function () { if (!spyLocked) baseUpdateSpy(); };
      var unlock = function () { spyLocked = false; clearTimeout(unlockTimer); };
      window.addEventListener("scrollend", unlock);

      header.querySelectorAll(".nav-desktop__link, .nav-mobile__link").forEach(function (a) {
        if (a.hasAttribute("data-contact-open")) return;
        a.addEventListener("click", function (e) {
          if (a.classList.contains("nav-mobile__link")) setOpen(false);
          var key = a.getAttribute("data-nav");
          var item = spy.filter(function (s) { return s.key === key; })[0];
          current = key; setActive(key);
          if (!item) return;
          e.preventDefault();
          var top = key === spy[0].key ? 0
            : item.el.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
          var smooth = VPS.config.smoothScroll !== false;
          if (smooth) {
            spyLocked = true;
            clearTimeout(unlockTimer);
            unlockTimer = setTimeout(unlock, 1500);   /* sécurité si « scrollend » n'est pas supporté */
          }
          window.scrollTo({ top: top, behavior: smooth ? "smooth" : "auto" });
          history.replaceState(null, "", "#" + item.el.id);
        });
      });
    }

    /* ---- Sélecteur de langue ---- */
    header.querySelectorAll(".lang").forEach(function (box) {
      var btn = box.querySelector(".lang__btn");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !box.classList.contains("is-open");
        closeLangs();
        box.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", open);
      });
      /* langue publiée : lien vers la page équivalente ; langue non publiée : bouton inactif */
      box.querySelectorAll("button.lang__option").forEach(function (opt) {
        opt.addEventListener("click", closeLangs);
      });
    });
    function closeLangs() {
      header.querySelectorAll(".lang.is-open").forEach(function (b) {
        b.classList.remove("is-open");
        b.querySelector(".lang__btn").setAttribute("aria-expanded", "false");
      });
    }
    document.addEventListener("click", closeLangs);

    /* ---- Contact : ouvre le formulaire (branché en phase 2) ---- */
    header.querySelectorAll("[data-contact-open]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("vps:contact-open"));
      });
    });
  }

  VPS.Header = {
    init: function () {
      var header = document.getElementById("site-header");
      if (header) init(header, document.body.classList.contains("page-home") ? "home" : "project");
    }
  };
})();

/* ---- components/contact.js ---- */
/* =========================================================
   Formulaire de contact (popup)
   - S'ouvre sur l'événement « vps:contact-open » (menu CONTACT, bouton du hero)
   - Validation : Nom, E-mail et Message obligatoires ; format de l'e-mail vérifié
   - Envoi : adresse dans data-endpoint du formulaire (Réglages de l'admin) ; vide = envoi simulé
   - HTML écrit par l'admin (gabarit contact.html)
   ========================================================= */
(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function init() {
    var root = document.querySelector(".contact");
    if (!root) return;
    var msg = function (k) { return root.querySelector("form").getAttribute("data-msg-" + k) || ""; };

    var form = root.querySelector("form");
    var status = root.querySelector(".contact__status");
    var submit = root.querySelector(".contact__submit");
    var lastFocus = null;

    /* Réinitialisation complète : champs vides, pas de message, pas d'erreur */
    function resetForm() {
      form.reset();
      setStatus("");
      Array.prototype.forEach.call(form.elements, function (el) { el.removeAttribute("aria-invalid"); });
      submit.disabled = false;
      root.querySelector(".contact__panel").scrollTop = 0;
    }

    function open() {
      resetForm();
      lastFocus = document.activeElement;
      root.classList.add("is-open");
      root.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 350);
    }
    function close() {
      if (!root.classList.contains("is-open")) return;
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      /* on vide le formulaire une fois le panneau redescendu */
      var dur = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--t-contact")) || 0.8) * 1000;
      setTimeout(function () { if (!root.classList.contains("is-open")) resetForm(); }, dur);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function setStatus(msg, type) {
      status.textContent = msg || "";
      status.className = "contact__status" + (type ? " is-" + type : "");
      if (msg) root.querySelector(".contact__panel").scrollTop = 0;
    }

    document.addEventListener("vps:contact-open", open);
    root.querySelector(".contact__close").addEventListener("click", close);
    root.querySelector(".contact__backdrop").addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    /* Retire l'état d'erreur d'un champ dès qu'on le corrige */
    form.addEventListener("input", function (e) { e.target.removeAttribute("aria-invalid"); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      var missing = ["name", "email", "message"].filter(function (n) { return !f[n].value.trim(); });
      [f.name, f.email, f.subject, f.message].forEach(function (el) { el.removeAttribute("aria-invalid"); });

      if (missing.length) {
        missing.forEach(function (n) { f[n].setAttribute("aria-invalid", "true"); });
        setStatus(msg("required"), "error");
        f[missing[0]].focus();
        return;
      }
      if (!EMAIL_RE.test(f.email.value.trim())) {
        f.email.setAttribute("aria-invalid", "true");
        setStatus(msg("email"), "error");
        f.email.focus();
        return;
      }

      var data = {
        name: f.name.value.trim(), email: f.email.value.trim(),
        subject: f.subject.value.trim(), message: f.message.value.trim()
      };
      submit.disabled = true;
      send(data, form.getAttribute("data-endpoint")).then(function () {
        setStatus(msg("success"), "success");
        form.reset();
      }).catch(function () {
        setStatus(msg("send"), "error");
      }).then(function () { submit.disabled = false; });
    });
  }

  /* Envoi : à brancher plus tard (service en ligne ou script serveur) */
  function send(data, endpoint) {
    if (!endpoint) {
      return new Promise(function (resolve) { setTimeout(resolve, 500); });   /* envoi simulé */
    }
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) { if (!r.ok) throw new Error(r.status); });
  }

  VPS.ContactForm = { init: init };
})();

/* ---- components/hero.js ---- */
/* =========================================================
   Hero : vidéo de fond + titre + bouton contact + souris
   HTML écrit par l'admin (gabarit accueil-hero.html)
   ========================================================= */
(function () {
  function init() {
    var mount = document.querySelector(".hero");
    if (!mount) return;
    initVideo(mount.querySelector(".hero__video"));

    mount.querySelector(".hero__cta").addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("vps:contact-open"));
    });

    mount.querySelector(".hero__mouse").addEventListener("click", function (e) {
      var target = document.getElementById("intro");
      if (!target) return;
      e.preventDefault();
      var header = document.getElementById("site-header");
      var top = target.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight : 0);
      window.scrollTo({ top: top, behavior: VPS.config.smoothScroll !== false ? "smooth" : "auto" });
    });
  }

  /* Choix de la version (desktop / mobile portrait) + bascule au redimensionnement */
  function initVideo(video) {
    var cfg = {
      desktop: { src: video.getAttribute("data-desktop-src"), poster: video.getAttribute("data-desktop-poster") },
      mobile: { src: video.getAttribute("data-mobile-src"), poster: video.getAttribute("data-mobile-poster") }
    };
    var mq = window.matchMedia(VPS.config.heroVideo.mobileQuery);
    var current = null;
    function apply() {
      var v = mq.matches ? cfg.mobile : cfg.desktop;
      if (v === current) return;
      current = v;
      video.poster = v.poster;
      video.src = v.src;
      video.muted = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply); else mq.addListener(apply);
  }

  VPS.Hero = { init: init };
})();

/* ---- components/projects.js ---- */
/* =========================================================
   Section Projets : ProjectFilters + ProjectGrid + ProjectCard
   HTML écrit par l'admin (gabarits accueil-projets.html, filtre.html, vignette-projet.html)
   - Filtres cumulatifs (OU) : un projet s'affiche s'il a au moins un des filtres actifs
   - « Tout » = aucun filtre ; l'ordre des projets (champ order) n'est jamais modifié
   - Recomposition animée (FLIP), indépendante de l'apparition au scroll et du survol
   ========================================================= */
(function () {
  var STORE_KEY = "vps-home-return";

  function init() {
    var mount = document.querySelector(".projects");
    if (!mount) return;

    var grid = mount.querySelector(".grid");
    var buttons = mount.querySelectorAll(".filter");
    var active = [];   // filtres actifs ; vide = « Tout »

    /* ---- État des boutons ---- */
    function syncButtons() {
      buttons.forEach(function (b) {
        var k = b.getAttribute("data-filter");
        var on = k === "all" ? active.length === 0 : active.indexOf(k) !== -1;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on);
      });
    }

    function isVisible(p) {
      if (!active.length) return true;
      return p.tags.some(function (tag) { return active.indexOf(tag) !== -1; });
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-filter");
        if (k === "all") active = [];
        else {
          var i = active.indexOf(k);
          if (i === -1) active.push(k); else active.splice(i, 1);
        }
        syncButtons();
        applyFilter(true);
      });
    });

    /* ---- ProjectGrid : filtrage + recomposition FLIP ---- */
    var items = Array.prototype.slice.call(grid.querySelectorAll(".grid__item"));
    var byId = {};
    items.forEach(function (li) {
      byId[li.getAttribute("data-id")] = { tags: (li.getAttribute("data-tags") || "").split(" ").filter(Boolean) };
    });
    var filterKeys = Array.prototype.map.call(buttons, function (b) { return b.getAttribute("data-filter"); })
      .filter(function (k) { return k !== "all"; });
    var cleanupTimer = null;

    /* Case grise de fin de grille (projects.css) : nombre impair de projets affichés */
    function setOdd(count) { grid.classList.toggle("is-odd", count % 2 === 1); }
    setOdd(items.filter(function (li) { return !li.classList.contains("is-hidden"); }).length);

    function resetAnim() {
      clearTimeout(cleanupTimer);
      grid.style.height = "";
      items.forEach(function (li) {
        li.classList.remove("is-leaving", "is-entering");
        li.style.cssText = "";
      });
    }

    function applyFilter(animate) {
      resetAnim();
      var target = items.map(function (li) { return isVisible(byId[li.getAttribute("data-id")]); });
      var count = target.filter(Boolean).length;

      if (!animate) {
        items.forEach(function (li, i) { li.classList.toggle("is-hidden", !target[i]); });
        setOdd(count);
        return;
      }

      var gridRect = grid.getBoundingClientRect();
      var startH = gridRect.height;
      /* First : positions actuelles */
      var first = items.map(function (li) {
        if (li.classList.contains("is-hidden")) return null;
        var r = li.getBoundingClientRect();
        return { x: r.left - gridRect.left, y: r.top - gridRect.top, w: r.width, h: r.height };
      });

      /* Changements d'état */
      items.forEach(function (li, i) {
        var wasVisible = !!first[i];
        if (wasVisible && !target[i]) {           /* sort : figé à sa place, en fondu */
          li.style.left = first[i].x + "px";
          li.style.top = first[i].y + "px";
          li.style.width = first[i].w + "px";
          li.style.height = first[i].h + "px";
          li.classList.add("is-leaving");
        } else if (!wasVisible && target[i]) {    /* entre */
          li.classList.remove("is-hidden");
          li.classList.add("is-entering");
        }
      });

      /* Case grise : placée à sa position finale (pour mesurer la bonne hauteur), invisible
         pendant la recomposition, puis fondu à la fin */
      grid.classList.add("filler-out");
      setOdd(count);

      /* Last + Invert */
      var endH = grid.getBoundingClientRect().height;
      var gridRect2 = grid.getBoundingClientRect();
      items.forEach(function (li, i) {
        if (!first[i] || !target[i]) return;
        var r = li.getBoundingClientRect();
        var dx = first[i].x - (r.left - gridRect2.left);
        var dy = first[i].y - (r.top - gridRect2.top);
        if (dx || dy) {
          li.style.transform = "translate(" + dx + "px," + dy + "px)";
          li.style.transition = "none";
        }
      });
      grid.style.height = startH + "px";

      /* Play */
      void grid.offsetHeight;
      var dur = getComputedStyle(document.documentElement).getPropertyValue("--t-flip").trim() || "0.5s";
      var fade = getComputedStyle(document.documentElement).getPropertyValue("--t-flip-fade").trim() || "0.3s";
      grid.style.height = endH + "px";
      items.forEach(function (li, i) {
        if (!target[i]) return;
        if (li.classList.contains("is-entering")) {
          li.style.transition = "opacity " + fade + " cubic-bezier(0.22, 1, 0.36, 1) 0.2s, transform " + fade + " cubic-bezier(0.22, 1, 0.36, 1) 0.2s";
          li.classList.remove("is-entering");
        } else if (li.style.transform) {
          li.style.transition = "transform " + dur + " cubic-bezier(0.65, 0, 0.35, 1)";
          li.style.transform = "";
        }
      });

      cleanupTimer = setTimeout(function () {
        items.forEach(function (li, i) {
          if (!target[i]) li.classList.add("is-hidden");
        });
        resetAnim();
        grid.classList.remove("filler-out");
        VPS.reveal.observe(grid);
      }, (parseFloat(dur) || 0.5) * 1000 + 100);
    }

    /* ---- Survol au doigt : 1er appui = voile + texte, 2e appui = fiche ---- */
    var touch = window.matchMedia("(hover: none)");
    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".card");
      if (!card) return;
      if (touch.matches && !card.classList.contains("is-touched")) {
        e.preventDefault();
        grid.querySelectorAll(".card.is-touched").forEach(function (c) { c.classList.remove("is-touched"); });
        card.classList.add("is-touched");
        return;
      }
      saveReturn();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".card")) grid.querySelectorAll(".card.is-touched").forEach(function (c) { c.classList.remove("is-touched"); });
    });

    /* ---- Retour depuis une fiche : même position et mêmes filtres ---- */
    function saveReturn() {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ y: window.scrollY, filters: active })); } catch (err) {}
    }
    function restoreReturn() {
      var data = null;
      try { data = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null"); } catch (err) {}
      if (!data) return;
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      var isBack = nav ? nav.type === "back_forward" : (performance.navigation && performance.navigation.type === 2);
      try { sessionStorage.removeItem(STORE_KEY); } catch (err) {}
      if (!isBack) return;
      active = (data.filters || []).filter(function (k) { return filterKeys.indexOf(k) !== -1; });
      syncButtons();
      applyFilter(false);
      VPS.reveal.showAll(grid);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, data.y);
      requestAnimationFrame(function () { window.scrollTo(0, data.y); });
    }

    VPS.Projects._restore = restoreReturn;
  }

  VPS.Projects = { init: init, restore: function () { if (VPS.Projects._restore) VPS.Projects._restore(); } };
})();

/* ---- components/project-page.js ---- */
/* =========================================================
   Fiche projet : ProjectPage → MediaPlayer + MediaThumbnails + ProjectDescription
   HTML écrit par l'admin (gabarits fiche.html, fiche-vignette.html) : projets/<identifiant>.html
   ========================================================= */
(function () {
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* Lien Vimeo (y compris lien privé https://vimeo.com/<id>/<hash>) → URL d'intégration */
  function vimeoEmbed(url, autoplay, muted) {
    var m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/i);
    if (!m) return url;
    var q = new URLSearchParams();
    if (m[2]) q.set("h", m[2]);
    q.set("autoplay", autoplay ? "1" : "0");
    if (autoplay && muted) q.set("muted", "1");        /* à l'ouverture de la page, les navigateurs n'autorisent que la lecture muette */
    q.set("title", "0"); q.set("byline", "0"); q.set("portrait", "0"); q.set("dnt", "1");
    q.set("pip", "0");                     /* pas de bouton « incrustation » (image dans l'image) */
    return "https://player.vimeo.com/video/" + m[1] + "?" + q.toString();
  }

  /* Modèle Sketchfab (identifiant de 32 caractères) → URL d'intégration.
     Démarrage automatique seulement si le média est réglé ainsi dans l'admin ; sinon Sketchfab
     affiche son image d'attente et son bouton ▶.
     Options d'interface (abonnement payant) reprises de l'intégration Express+ : titre, logo,
     inspecteur, aide, réglages, AR/VR masqués ; annotations disponibles mais cachées au départ.
     La molette zoome dans le modèle (choix du 02/10). */
  function sketchfabEmbed(uid, autoplay) {
    var q = new URLSearchParams({
      autostart: autoplay ? "1" : "0", dnt: "1",
      ui_animations: "0", ui_infos: "0", ui_inspector: "0", ui_watermark_link: "0", ui_watermark: "0",
      ui_ar: "0", ui_help: "0", ui_settings: "0", ui_vr: "0", ui_annotations: "1", annotations_visible: "0", ui_stop: "0"
    });
    return "https://sketchfab.com/models/" + encodeURIComponent(uid) + "/embed?" + q.toString();
  }

  /* ---------- MediaPlayer ---------- */
  function MediaPlayer(stage, videoTitle, modelTitle) {
    var current = null;
    function layerFor(media, autoplay, muted) {
      var layer = document.createElement("div");
      layer.className = "player__layer";
      if (media.type === "video") {
        layer.innerHTML = '<iframe src="' + esc(vimeoEmbed(media.vimeo, autoplay, muted)) + '" title="' + esc(videoTitle) + '" ' +
          'allow="autoplay; fullscreen" allowfullscreen></iframe>';
      } else if (media.type === "3d") {
        layer.innerHTML = '<iframe src="' + esc(sketchfabEmbed(media.sketchfab, autoplay)) + '" title="' + esc(modelTitle) + '" ' +
          'allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>';
      } else {
        layer.innerHTML = '<img src="' + media.src + '-1920.jpg" srcset="' + media.src + "-960.jpg 960w, " + media.src + '-1920.jpg 1920w" sizes="100vw" alt="">';
      }
      return layer;
    }
    return {
      show: function (media, autoplay, muted) {
        var next = layerFor(media, autoplay, muted);
        stage.appendChild(next);
        void next.offsetWidth;
        next.classList.add("is-shown");
        var old = current;
        current = next;
        if (old) {
          old.classList.remove("is-shown");
          var dur = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--t-media-fade")) || 0.6) * 1000;
          setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, dur + 50);
        }
      }
    };
  }

  function init() {
    var wrap = document.querySelector(".project");
    if (!wrap) return;
    var thumbs = wrap.querySelectorAll(".thumb");
    var media = Array.prototype.map.call(thumbs, function (b) {
      var type = b.getAttribute("data-type"), auto = b.getAttribute("data-autoplay") === "1";
      if (type === "video") return { type: "video", vimeo: b.getAttribute("data-vimeo"), autoplay: auto };
      if (type === "3d") return { type: "3d", sketchfab: b.getAttribute("data-sketchfab"), autoplay: auto };
      return { type: "image", src: b.getAttribute("data-src") };
    });
    if (!media.length) return;
    var playerEl = wrap.querySelector(".player");

    var player = MediaPlayer(wrap.querySelector(".player__stage"), playerEl.getAttribute("data-video-title"),
                             playerEl.getAttribute("data-model-title"));
    var active = 0;
    /* lancement automatique : seulement pour les médias réglés « oui » dans l'admin (non par défaut) ;
       à l'ouverture de la page, une vidéo ne peut démarrer que muette (règle des navigateurs) */
    player.show(media[0], !!media[0].autoplay, true);

    /* Au clic sur une vignette : si le haut du lecteur est masqué (page scrollée),
       la page remonte en douceur pour le cadrer sous l'en-tête */
    var header = document.getElementById("site-header");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function revealPlayer() {
      var headerH = header ? header.offsetHeight : 0;
      var top = playerEl.getBoundingClientRect().top;
      if (top >= headerH - 1) return;
      window.scrollTo({ top: Math.max(0, window.pageYOffset + top - headerH), behavior: reduceMotion ? "auto" : "smooth" });
    }

    thumbs.forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.getAttribute("data-index");
        revealPlayer();
        if (i === active) return;
        active = i;
        thumbs.forEach(function (x, j) {
          x.classList.toggle("is-active", j === i);
          x.setAttribute("aria-pressed", j === i);
        });
        player.show(media[i], !!media[i].autoplay, false);   /* après un clic : avec le son */
      });
    });
  }

  VPS.ProjectPage = { init: init };
})();

/* ---- components/back-button.js ---- */
/* =========================================================
   Bouton de retour flottant (fiche projet)
   - Si l'on vient de l'accueil : retour navigateur (position et filtres de la grille conservés)
   - Sinon (lien direct) : ouvre l'accueil sur la section Projets
   HTML écrit par l'admin (gabarit bouton-retour.html)
   ========================================================= */
(function () {
  function init() {
    var a = document.querySelector(".back-btn");
    if (!a) return;
    a.addEventListener("click", function (e) {
      /* clé posée par la grille de l'accueil au clic sur une vignette (js/components/projects.js) */
      var fromGrid = false;
      try { fromGrid = !!sessionStorage.getItem("vps-home-return"); } catch (err) {}
      if (fromGrid && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
  }

  VPS.BackButton = { init: init };
})();

/* ---- main.js ---- */
/* =========================================================
   Point d'entrée commun aux pages : branche les comportements
   sur le HTML écrit par l'admin
   ========================================================= */
(function () {
  if (VPS.Header) VPS.Header.init();
  if (VPS.Hero) VPS.Hero.init();
  if (VPS.Projects) VPS.Projects.init();
  if (VPS.ProjectPage) VPS.ProjectPage.init();
  if (VPS.ContactForm) VPS.ContactForm.init();
  if (VPS.BackButton) VPS.BackButton.init();
  VPS.reveal.observe();
  if (VPS.Projects) VPS.Projects.restore();   /* retour depuis une fiche projet */
})();
