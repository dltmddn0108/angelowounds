// ==UserScript==
// @name         Elice Speed Control
// @namespace    https://github.com/dltmddn0108/angelowounds
// @version      1.0.0
// @description  엘리스 강의 영상 커스텀 배속 — 플로팅 버블, 슬라이더, 롱프레스 부스트, 남은시간 표시
// @match        *://*.elice.io/*
// @match        *://elice.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var PANEL_ID = "es-ctrl";
  var STORAGE_KEY = "elice-speed-rate";
  var POS_KEY = "elice-speed-pos";
  var PRESETS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5];

  var targetRate = parseFloat(localStorage.getItem(STORAGE_KEY)) || 2;
  var expanded = false;
  var boosting = false;
  var boostPrevRate = 1;
  var bubble, panelBody, rateInput, slider, remainLabel, overlayEl;
  var activeVideos = new Set();

  function clamp(v, lo, hi) {
    return Math.min(hi || 16, Math.max(lo || 0.1, v));
  }

  function round(v) {
    return Math.round(v * 100) / 100;
  }

  function applyRate(rate, silent) {
    targetRate = round(clamp(rate));
    activeVideos.forEach(function (v) {
      if (!v.paused || v.readyState > 0) v.playbackRate = targetRate;
    });
    if (rateInput) rateInput.value = targetRate;
    if (slider) slider.value = targetRate;
    if (!silent) localStorage.setItem(STORAGE_KEY, targetRate);
    updateOverlay();
    updateRemaining();
    updateBubbleLabel();
    if (!silent) showToast(targetRate + "x");
  }

  function guardRate(e) {
    if (boosting) return;
    if (Math.abs(e.target.playbackRate - targetRate) > 0.001) {
      e.target.playbackRate = targetRate;
    }
  }

  function attachGuard(video) {
    if (video._esGuard) return;
    video._esGuard = true;
    activeVideos.add(video);
    video.addEventListener("ratechange", guardRate);
    video.playbackRate = targetRate;
    video.addEventListener("timeupdate", updateRemaining);
    setupGestures(video);
    updateOverlay();
  }

  // --- Gesture: long-press right half = temporary boost ---
  function setupGestures(video) {
    var timer = null;
    var BOOST_RATE = 5;

    function startBoost(e) {
      var rect = video.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      if (x < rect.width * 0.5) return;
      timer = setTimeout(function () {
        boosting = true;
        boostPrevRate = targetRate;
        video.playbackRate = BOOST_RATE;
        showOverlayMsg(BOOST_RATE + "x ▶▶");
        if (navigator.vibrate) navigator.vibrate(30);
      }, 400);
    }

    function endBoost() {
      clearTimeout(timer);
      if (boosting) {
        boosting = false;
        video.playbackRate = targetRate;
        showOverlayMsg(targetRate + "x");
        setTimeout(function () { hideOverlayMsg(); }, 800);
      }
    }

    video.addEventListener("touchstart", startBoost, { passive: true });
    video.addEventListener("touchend", endBoost);
    video.addEventListener("touchcancel", endBoost);
    video.addEventListener("mousedown", startBoost);
    video.addEventListener("mouseup", endBoost);
    video.addEventListener("mouseleave", endBoost);
  }

  // --- Toast ---
  var toastEl, toastTimer;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText =
        "position:fixed;bottom:100px;left:50%;transform:translateX(-50%) scale(.9);" +
        "background:rgba(0,0,0,.85);color:#fff;padding:10px 24px;" +
        "border-radius:24px;font:600 15px/1.4 -apple-system,sans-serif;" +
        "z-index:2147483647;pointer-events:none;opacity:0;" +
        "transition:opacity .25s,transform .25s;backdrop-filter:blur(8px);";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1";
    toastEl.style.transform = "translateX(-50%) scale(1)";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(-50%) scale(.9)";
    }, 1200);
  }

  // --- Video overlay (on-video speed indicator) ---
  function getVideoContainer() {
    var v = document.querySelector("video");
    if (!v) return null;
    var p = v.parentElement;
    while (p && getComputedStyle(p).position === "static") p = p.parentElement;
    return p || v.parentElement;
  }

  function updateOverlay() {
    if (!overlayEl) {
      var container = getVideoContainer();
      if (!container) return;
      overlayEl = document.createElement("div");
      overlayEl.style.cssText =
        "position:absolute;top:12px;left:12px;background:rgba(0,0,0,.6);" +
        "color:#fff;padding:4px 10px;border-radius:6px;font:600 13px/1.3 -apple-system,sans-serif;" +
        "z-index:999;pointer-events:none;backdrop-filter:blur(4px);" +
        "transition:opacity .3s;opacity:0;";
      container.appendChild(overlayEl);
      setTimeout(function () { overlayEl.style.opacity = "1"; }, 100);
    }
    overlayEl.textContent = targetRate + "x";
  }

  function showOverlayMsg(msg) {
    if (overlayEl) {
      overlayEl.textContent = msg;
      overlayEl.style.background = "rgba(108,92,231,.8)";
    }
  }

  function hideOverlayMsg() {
    if (overlayEl) {
      overlayEl.textContent = targetRate + "x";
      overlayEl.style.background = "rgba(0,0,0,.6)";
    }
  }

  // --- Remaining time ---
  function updateRemaining() {
    if (!remainLabel) return;
    var v = document.querySelector("video");
    if (!v || !v.duration || !isFinite(v.duration)) {
      remainLabel.textContent = "";
      return;
    }
    var left = (v.duration - v.currentTime) / targetRate;
    var m = Math.floor(left / 60);
    var s = Math.floor(left % 60);
    remainLabel.textContent = "남은시간 " + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // --- Bubble label ---
  function updateBubbleLabel() {
    if (bubble && !expanded) {
      bubble.textContent = targetRate + "x";
    }
  }

  // --- CSS injection ---
  function injectStyles() {
    if (document.getElementById("es-styles")) return;
    var style = document.createElement("style");
    style.id = "es-styles";
    style.textContent = [
      "#es-bubble{position:fixed;z-index:2147483647;width:52px;height:52px;" +
        "border-radius:50%;background:linear-gradient(135deg,#6c5ce7,#a29bfe);" +
        "color:#fff;font:700 15px/52px -apple-system,sans-serif;text-align:center;" +
        "box-shadow:0 4px 20px rgba(108,92,231,.5);cursor:pointer;" +
        "touch-action:none;user-select:none;transition:transform .2s,box-shadow .2s;}",
      "#es-bubble:active{transform:scale(.92);}",
      "#es-bubble.expanded{width:auto;height:auto;border-radius:16px;line-height:normal;" +
        "background:#1a1a2e;box-shadow:0 8px 32px rgba(0,0,0,.5);}",
      "#es-panel-body{padding:14px;min-width:260px;}",
      "#es-panel-body .es-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;}",
      "#es-panel-body input[type=number]{width:60px;padding:8px;border-radius:10px;" +
        "border:1px solid #3a3a5c;background:#2a2a3e;color:#fff;font-size:16px;" +
        "text-align:center;-webkit-appearance:none;outline:none;}",
      "#es-panel-body input[type=number]:focus{border-color:#6c5ce7;}",
      "#es-slider{-webkit-appearance:none;width:100%;height:6px;border-radius:3px;" +
        "background:linear-gradient(90deg,#6c5ce7 0%,#2a2a3e 0%);outline:none;margin:8px 0;}",
      "#es-slider::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;" +
        "border-radius:50%;background:#6c5ce7;box-shadow:0 2px 8px rgba(108,92,231,.5);" +
        "cursor:pointer;}",
      "#es-panel-body .es-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}",
      "#es-panel-body .es-chip{padding:7px 12px;border-radius:10px;border:1px solid #3a3a5c;" +
        "background:#2a2a3e;color:#ccc;font-size:13px;font-weight:600;cursor:pointer;" +
        "min-height:40px;min-width:40px;transition:all .15s;}",
      "#es-panel-body .es-chip.active{background:#6c5ce7;color:#fff;border-color:#6c5ce7;}",
      "#es-panel-body .es-chip:active{transform:scale(.93);}",
      "#es-remain{font-size:12px;color:#888;margin-top:8px;text-align:right;}",
      "#es-header{display:flex;align-items:center;justify-content:space-between;" +
        "padding:12px 14px 0;font-weight:700;font-size:14px;color:#ccc;}",
      "#es-close{background:none;border:none;color:#666;font-size:18px;cursor:pointer;" +
        "padding:4px 8px;min-height:40px;min-width:40px;}",
      "#es-close:active{color:#fff;}",
    ].join("\n");
    document.head.appendChild(style);
  }

  // --- Draggable bubble ---
  function makeDraggable(el) {
    var startX, startY, origX, origY, dragging = false;

    function onStart(e) {
      if (expanded) return;
      var t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
      var rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      dragging = false;

      function onMove(e2) {
        var t2 = e2.touches ? e2.touches[0] : e2;
        var dx = t2.clientX - startX;
        var dy = t2.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragging = true;
        if (dragging) {
          var nx = clamp(origX + dx, 0, window.innerWidth - 56);
          var ny = clamp(origY + dy, 0, window.innerHeight - 56);
          el.style.left = nx + "px";
          el.style.top = ny + "px";
          el.style.right = "auto";
        }
      }

      function onEnd() {
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        if (!dragging) togglePanel();
        if (dragging) {
          localStorage.setItem(POS_KEY, JSON.stringify({
            left: parseInt(el.style.left),
            top: parseInt(el.style.top)
          }));
        }
      }

      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("mousedown", onStart);
  }

  function updateSliderTrack() {
    if (!slider) return;
    var pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
      "linear-gradient(90deg,#6c5ce7 " + pct + "%,#2a2a3e " + pct + "%)";
  }

  function updateChipStates() {
    if (!panelBody) return;
    panelBody.querySelectorAll(".es-chip").forEach(function (c) {
      var v = parseFloat(c.dataset.rate);
      if (Math.abs(v - targetRate) < 0.001) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
  }

  function togglePanel() {
    expanded = !expanded;
    if (expanded) {
      bubble.classList.add("expanded");
      bubble.textContent = "";
      bubble.appendChild(buildPanel());
    } else {
      bubble.classList.remove("expanded");
      if (panelBody) panelBody.remove();
      var header = bubble.querySelector("#es-header");
      if (header) header.remove();
      bubble.textContent = targetRate + "x";
    }
  }

  function buildPanel() {
    var wrap = document.createDocumentFragment();

    var header = document.createElement("div");
    header.id = "es-header";
    var title = document.createElement("span");
    title.textContent = "Speed Control";
    var closeBtn = document.createElement("button");
    closeBtn.id = "es-close";
    closeBtn.textContent = "\u2715";
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      togglePanel();
    });
    header.appendChild(title);
    header.appendChild(closeBtn);
    wrap.appendChild(header);

    panelBody = document.createElement("div");
    panelBody.id = "es-panel-body";

    var row = document.createElement("div");
    row.className = "es-row";

    rateInput = document.createElement("input");
    rateInput.type = "number";
    rateInput.inputMode = "decimal";
    rateInput.step = "0.1";
    rateInput.min = "0.1";
    rateInput.max = "16";
    rateInput.value = targetRate;
    rateInput.addEventListener("change", function () {
      applyRate(parseFloat(rateInput.value) || 1);
      updateSliderTrack();
      updateChipStates();
    });

    var applyBtn = document.createElement("button");
    applyBtn.className = "es-chip active";
    applyBtn.textContent = "적용";
    applyBtn.style.cssText = "background:#6c5ce7;color:#fff;border-color:#6c5ce7;font-size:14px;";
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      applyRate(parseFloat(rateInput.value) || 1);
      updateSliderTrack();
      updateChipStates();
    });

    row.appendChild(rateInput);
    row.appendChild(applyBtn);
    panelBody.appendChild(row);

    slider = document.createElement("input");
    slider.type = "range";
    slider.id = "es-slider";
    slider.min = "0.25";
    slider.max = "8";
    slider.step = "0.25";
    slider.value = targetRate;
    updateSliderTrack();
    slider.addEventListener("input", function () {
      var v = round(parseFloat(slider.value));
      rateInput.value = v;
      applyRate(v, true);
      updateSliderTrack();
      updateChipStates();
    });
    slider.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEY, targetRate);
    });
    panelBody.appendChild(slider);

    var chips = document.createElement("div");
    chips.className = "es-chips";
    PRESETS.forEach(function (p) {
      var chip = document.createElement("button");
      chip.className = "es-chip";
      chip.dataset.rate = p;
      chip.textContent = p + "x";
      if (Math.abs(p - targetRate) < 0.001) chip.classList.add("active");
      chip.addEventListener("click", function (e) {
        e.stopPropagation();
        applyRate(p);
        slider.value = p;
        updateSliderTrack();
        updateChipStates();
        if (navigator.vibrate) navigator.vibrate(15);
      });
      chips.appendChild(chip);
    });
    panelBody.appendChild(chips);

    remainLabel = document.createElement("div");
    remainLabel.id = "es-remain";
    panelBody.appendChild(remainLabel);
    updateRemaining();

    wrap.appendChild(panelBody);
    return wrap;
  }

  function createBubble() {
    if (document.getElementById("es-bubble")) return;
    injectStyles();

    bubble = document.createElement("div");
    bubble.id = "es-bubble";
    bubble.textContent = targetRate + "x";

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY)); } catch (e) {}
    if (saved) {
      bubble.style.left = saved.left + "px";
      bubble.style.top = saved.top + "px";
    } else {
      bubble.style.right = "16px";
      bubble.style.top = "80px";
    }

    makeDraggable(bubble);
    document.body.appendChild(bubble);
  }

  // --- MutationObserver ---
  var observer = new MutationObserver(function (mutations) {
    var found = false;
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeName === "VIDEO") { attachGuard(node); found = true; }
        if (node.querySelectorAll) {
          node.querySelectorAll("video").forEach(function (v) {
            attachGuard(v); found = true;
          });
        }
      });
    });
    if (found) createBubble();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  var existing = document.querySelectorAll("video");
  if (existing.length > 0) {
    existing.forEach(attachGuard);
    createBubble();
  }
})();
