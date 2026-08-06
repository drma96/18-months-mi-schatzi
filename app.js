/* 19 Months — story engine. Content lives in data.js; nothing here is content. */
(function () {
  "use strict";

  var DATA = window.STORY_DATA;
  var IMAGE_MS = 5000;
  var INTRO_MS = 7000;
  var OUTRO_MS = 9000;
  var MUSIC_VOLUME = 0.5;
  var MUSIC_FADE_MS = 600;

  var stage = document.getElementById("stage");
  var progressEl = document.getElementById("progress");
  var backdrop = document.getElementById("backdrop");
  var frame = document.getElementById("frame");
  var pausedPill = document.getElementById("pausedPill");
  var tapZones = document.getElementById("tapZones");
  var musicEl = document.getElementById("music");
  var musicBtn = document.getElementById("musicToggle");

  /* ---------- build the slide list ---------- */
  var slides = [];
  slides.push({
    kind: "intro",
    data: DATA.intro,
    accent: "#ff6b6b",
    items: [null],
  });
  DATA.memories.forEach(function (m) {
    slides.push({
      kind: "memory",
      data: m,
      accent: m.accentColor || "#ff6b6b",
      items: m.media && m.media.length ? m.media : [null],
    });
  });
  slides.push({
    kind: "outro",
    data: DATA.outro,
    accent: "#818cf8",
    items: [null],
  });

  var si = 0; // slide index
  var ii = 0; // item index
  var started = false;
  var paused = true;
  var elapsed = 0;
  var lastTs = 0;
  var rafId = null;
  var cards = {}; // slideIndex -> element

  /* ---------- progress bar ---------- */
  var subEls = []; // [slideIdx][itemIdx] -> fill element
  slides.forEach(function (s) {
    var seg = document.createElement("div");
    seg.className = "seg";
    var row = [];
    s.items.forEach(function () {
      var sub = document.createElement("div");
      sub.className = "sub";
      var fill = document.createElement("i");
      sub.appendChild(fill);
      seg.appendChild(sub);
      row.push(fill);
    });
    subEls.push(row);
    progressEl.appendChild(seg);
  });

  function paintProgress(ratio) {
    for (var a = 0; a < subEls.length; a++) {
      for (var b = 0; b < subEls[a].length; b++) {
        var pct = 0;
        if (a < si || (a === si && b < ii)) pct = 100;
        else if (a === si && b === ii)
          pct = Math.max(0, Math.min(1, ratio)) * 100;
        subEls[a][b].style.width = pct + "%";
        subEls[a][b].style.background = a === si ? slides[si].accent : "#fff";
      }
    }
  }

  /* ---------- card rendering ---------- */
  function mediaSrc(item) {
    return item ? item.src : null;
  }

  function buildMediaLayer(item) {
    var layer = document.createElement("div");
    layer.className = "media-layer";
    var landscape = item.orientation === "landscape";

    if (landscape) {
      if (item.type === "video") {
        var bv = document.createElement("video");
        bv.className = "media-blur";
        bv.src = item.src;
        bv.muted = true;
        bv.loop = true;
        bv.playsInline = true;
        bv.setAttribute("playsinline", "");
        bv.setAttribute("aria-hidden", "true");
        layer.appendChild(bv);
      } else {
        var bi = document.createElement("img");
        bi.className = "media-blur";
        bi.src = item.src;
        bi.alt = "";
        bi.setAttribute("aria-hidden", "true");
        layer.appendChild(bi);
      }
    }

    var el;
    if (item.type === "video") {
      el = document.createElement("video");
      el.src = item.src;
      if (item.poster) el.poster = item.poster;
      el.muted = false;
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      el.preload = "auto";
    } else {
      el = document.createElement("img");
      el.src = item.src;
      el.alt = "";
      el.decoding = "async";
    }
    el.className = "media-main " + (landscape ? "fit-contain" : "fit-cover");
    layer.appendChild(el);
    return layer;
  }

  function buildCard(index) {
    var s = slides[index];
    var card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--accent", s.accent);

    if (s.kind === "intro" || s.kind === "outro") {
      card.classList.add("card-center");
      var bg = document.createElement("div");
      bg.className = "intro-bg";
      card.appendChild(bg);
      var body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML =
        '<h1 class="card-title"></h1><p class="card-caption"></p>' +
        (s.kind === "intro" ? '<div class="hint">Tap to begin</div>' : "");
      body.querySelector(".card-title").textContent = s.data.title || "";
      body.querySelector(".card-caption").textContent = s.data.subtitle || "";
      card.appendChild(body);
      return card;
    }

    var fallback = document.createElement("div");
    fallback.className = "card-fallback";
    card.appendChild(fallback);

    var holder = document.createElement("div");
    holder.className = "media-holder";
    card.appendChild(holder);

    var scrim = document.createElement("div");
    scrim.className = "scrim";
    card.appendChild(scrim);

    var idx = document.createElement("div");
    idx.className = "month-index";
    idx.textContent = s.data.month + " / " + DATA.memories.length;
    card.appendChild(idx);

    var cbody = document.createElement("div");
    cbody.className = "card-body";
    cbody.innerHTML =
      '<span class="label-chip"></span><h2 class="card-title"></h2><p class="card-caption"></p>';
    cbody.querySelector(".label-chip").textContent = s.data.label || "";
    cbody.querySelector(".card-title").textContent = s.data.title || "";
    cbody.querySelector(".card-caption").textContent = s.data.caption || "";
    card.appendChild(cbody);

    card._holder = holder;
    return card;
  }

  function ensureCard(index) {
    if (index < 0 || index >= slides.length) return null;
    if (!cards[index]) {
      var el = buildCard(index);
      cards[index] = el;
      stage.appendChild(el);
    }
    return cards[index];
  }

  function setCardItem(index, itemIndex) {
    var card = cards[index];
    var s = slides[index];
    if (!card || !card._holder) return;
    var item = s.items[itemIndex];
    card._holder.innerHTML = "";
    if (item) card._holder.appendChild(buildMediaLayer(item));
  }

  function pruneCards() {
    Object.keys(cards).forEach(function (k) {
      var n = Number(k);
      if (n < si - 1 || n > si + 1) {
        stage.removeChild(cards[n]);
        delete cards[n];
      }
    });
  }

  function stopAllVideos(exceptCard) {
    Object.keys(cards).forEach(function (k) {
      var c = cards[k];
      if (c === exceptCard) return;
      c.querySelectorAll("video").forEach(function (v) {
        v.pause();
        try {
          v.currentTime = 0;
        } catch (e) {}
      });
    });
  }

  function activeVideo() {
    var c = cards[si];
    return c ? c.querySelector("video.media-main") : null;
  }

  function currentDuration() {
    var s = slides[si];
    if (s.kind === "intro") return INTRO_MS;
    if (s.kind === "outro") return OUTRO_MS;
    var item = s.items[ii];
    if (item && item.type === "video") {
      var v = activeVideo();
      if (v && isFinite(v.duration) && v.duration > 0) return v.duration * 1000;
      return 15000; // until metadata arrives
    }
    return IMAGE_MS;
  }

  /* ---------- stop background music while a video plays ---------- */
  var musicFadeRaf = null;
  var musicWantsPlay = false; // true once autoplay succeeds or the user turns music on
  var musicDuckedForVideo = false; // true while music is paused for an active video

  function fadeMusicVolume(target, onComplete) {
    if (!DATA.music) return;
    if (musicFadeRaf) cancelAnimationFrame(musicFadeRaf);
    var start = musicEl.volume;
    var startTs = null;
    function step(ts) {
      if (!startTs) startTs = ts;
      var t = Math.min(1, (ts - startTs) / MUSIC_FADE_MS);
      musicEl.volume = start + (target - start) * t;
      if (t < 1) {
        musicFadeRaf = requestAnimationFrame(step);
      } else {
        musicFadeRaf = null;
        if (onComplete) onComplete();
      }
    }
    musicFadeRaf = requestAnimationFrame(step);
  }

  function updateMusicForVideo() {
    if (!DATA.music) return;
    var s = slides[si];
    var item = s.items ? s.items[ii] : null;
    var v = activeVideo();
    var videoPlaying =
      item && item.type === "video" && v && !v.paused && !v.ended;

    if (videoPlaying) {
      if (!musicDuckedForVideo) {
        musicDuckedForVideo = true;
        fadeMusicVolume(0, function () {
          musicEl.pause();
        });
      }
    } else if (musicDuckedForVideo) {
      musicDuckedForVideo = false;
      if (musicWantsPlay) {
        musicEl
          .play()
          .then(function () {
            fadeMusicVolume(MUSIC_VOLUME);
          })
          .catch(function () {});
      }
    }
  }

  /* ---------- rendering the current position ---------- */
  function render() {
    ensureCard(si);
    setCardItem(si, ii);
    ensureCard(si + 1); // preload next card shell
    if (slides[si + 1] && cards[si + 1] && !cards[si + 1]._loadedFirst) {
      setCardItem(si + 1, 0);
      cards[si + 1]._loadedFirst = true;
    }
    pruneCards();

    Object.keys(cards).forEach(function (k) {
      cards[k].classList.toggle("is-active", Number(k) === si);
    });

    frame.style.setProperty("--accent", slides[si].accent);
    var item = slides[si].items[ii];
    if (item && item.type === "image") {
      backdrop.style.backgroundImage = 'url("' + item.src + '")';
      backdrop.style.backgroundColor = "";
    } else {
      backdrop.style.backgroundImage = "none";
      backdrop.style.backgroundColor = slides[si].accent;
    }

    var card = cards[si];
    stopAllVideos(card);
    var v = activeVideo();
    if (v) {
      v.currentTime = 0;
      if (!paused) v.play().catch(function () {});
      var blur = card.querySelector("video.media-blur");
      if (blur && !paused) blur.play().catch(function () {});
    }
    updateMusicForVideo();

    elapsed = 0;
    paintProgress(0);
  }

  /* ---------- timing ---------- */
  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    if (!lastTs) lastTs = ts;
    var dt = ts - lastTs;
    lastTs = ts;
    if (paused || !started) return;

    var v = activeVideo();
    var dur = currentDuration();
    if (v && isFinite(v.duration) && v.duration > 0) {
      paintProgress(v.currentTime / v.duration);
      if (v.ended || v.currentTime >= v.duration - 0.05) next();
      return;
    }

    elapsed += dt;
    paintProgress(elapsed / dur);
    if (elapsed >= dur) next();
  }

  function next() {
    var s = slides[si];
    if (ii < s.items.length - 1) {
      ii++;
    } else if (si < slides.length - 1) {
      si++;
      ii = 0;
    } else {
      paused = true;
      paintProgress(1);
      pausedPill.textContent = "The end";
      pausedPill.classList.add("is-visible");
      return;
    }
    render();
  }

  function prev() {
    if (ii > 0) {
      ii--;
    } else if (si > 0) {
      si--;
      ii = 0;
    } else {
      elapsed = 0;
      paintProgress(0);
      return;
    }
    render();
  }

  function setPaused(p) {
    if (!started) return;
    paused = p;
    pausedPill.textContent = "Paused";
    pausedPill.classList.toggle("is-visible", p);
    var v = activeVideo();
    if (v) {
      if (p) v.pause();
      else v.play().catch(function () {});
    }
    var card = cards[si];
    var blur = card && card.querySelector("video.media-blur");
    if (blur) {
      if (p) blur.pause();
      else blur.play().catch(function () {});
    }
    updateMusicForVideo();
  }

  function requestFullscreenBestEffort() {
    var el = document.documentElement;
    var request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.webkitEnterFullscreen ||
      el.msRequestFullscreen;
    if (!request) return;
    try {
      var result = request.call(el);
      if (result && result.catch) result.catch(function () {});
    } catch (e) {}
  }

  function start() {
    started = true;
    paused = false;
    pausedPill.classList.remove("is-visible");
    si = 1;
    ii = 0;
    requestFullscreenBestEffort();
    render();
  }

  function bounce() {
    frame.classList.add("is-tapped");
    setTimeout(function () {
      frame.classList.remove("is-tapped");
    }, 150);
    if (navigator.vibrate) {
      try {
        navigator.vibrate(8);
      } catch (e) {}
    }
  }

  /* ---------- input ---------- */
  var downX = 0;
  var downY = 0;
  var downT = 0;
  var holdTimer = null;
  var didHold = false;

  function onDown(e) {
    var p = e.touches ? e.touches[0] : e;
    downX = p.clientX;
    downY = p.clientY;
    downT = Date.now();
    didHold = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      didHold = true;
      setPaused(true);
    }, 220);
  }

  function onUp(e) {
    clearTimeout(holdTimer);
    var p = e.changedTouches ? e.changedTouches[0] : e;
    var dx = p.clientX - downX;
    var dy = p.clientY - downY;

    if (didHold) {
      setPaused(false);
      return;
    }

    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      bounce();
      if (dx < 0) next();
      else prev();
      return;
    }

    if (!started) {
      bounce();
      start();
      return;
    }

    bounce();
    var rect = frame.getBoundingClientRect();
    var rel = (p.clientX - rect.left) / rect.width;
    if (rel < 0.32) prev();
    else next();
  }

  tapZones.addEventListener("pointerdown", onDown);
  tapZones.addEventListener("pointerup", onUp);
  tapZones.addEventListener("pointercancel", function () {
    clearTimeout(holdTimer);
    if (didHold) setPaused(false);
  });
  tapZones.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  /* ---------- kill iOS pinch/double-tap zoom (touch-action isn't reliable in Safari) ---------- */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (type) {
    document.addEventListener(
      type,
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
  });
  document.addEventListener(
    "touchmove",
    function (e) {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  var lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    function (e) {
      var now = Date.now();
      if (now - lastTouchEnd < 350) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") {
      if (!started) start();
      else next();
    } else if (e.key === "ArrowLeft") {
      prev();
    } else if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (!started) start();
      else setPaused(!paused);
    } else if (e.key === "Enter" && !started) {
      start();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) setPaused(true);
  });

  /* ---------- optional music ---------- */
  if (DATA.music) {
    musicEl.src = DATA.music;
    musicEl.volume = MUSIC_VOLUME;
    musicBtn.hidden = false;
    musicBtn.classList.add("is-off");
    musicBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (musicEl.paused) {
        musicWantsPlay = true;
        musicBtn.classList.remove("is-off");
        if (!musicDuckedForVideo) {
          musicEl.volume = MUSIC_VOLUME;
          musicEl.play().catch(function () {});
        }
      } else {
        musicWantsPlay = false;
        musicEl.pause();
        musicBtn.classList.add("is-off");
      }
    });

    var tryAutoplay = function () {
      musicEl.play().then(
        function () {
          musicBtn.classList.remove("is-off");
          musicWantsPlay = true;
          updateMusicForVideo();
        },
        function () {
          /* autoplay blocked; start on first user interaction */
          var startOnInteraction = function () {
            musicEl.play().catch(function () {});
            musicBtn.classList.remove("is-off");
            musicWantsPlay = true;
            updateMusicForVideo();
            document.removeEventListener("pointerdown", startOnInteraction);
            document.removeEventListener("keydown", startOnInteraction);
          };
          document.addEventListener("pointerdown", startOnInteraction, {
            once: true,
          });
          document.addEventListener("keydown", startOnInteraction, {
            once: true,
          });
        },
      );
    };
    tryAutoplay();
  }

  /* ---------- boot ---------- */
  render();
  paintProgress(0);
  rafId = requestAnimationFrame(tick);
})();
