// ==UserScript==
// @name         Elice Speed Control
// @namespace    https://github.com/dltmddn0108/angelowounds
// @version      0.1.0
// @description  엘리스 강의 영상에 커스텀 배속 입력 UI 추가 (모바일 브라우저 대응)
// @match        *://*.elice.io/*
// @match        *://elice.io/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var PANEL_ID = "elice-speed-panel";
  var STORAGE_KEY = "elice-speed-last";
  var PRESETS = [1, 1.5, 2, 2.5, 3, 4];

  var targetRate = parseFloat(localStorage.getItem(STORAGE_KEY)) || 2;
  var minimized = false;
  var panel, input, body;

  function clamp(v) {
    return Math.min(16, Math.max(0.1, v));
  }

  function applyRate(rate) {
    targetRate = clamp(rate);
    document.querySelectorAll("video").forEach(function (v) {
      v.playbackRate = targetRate;
    });
    if (input) input.value = targetRate;
    localStorage.setItem(STORAGE_KEY, targetRate);
    showToast(targetRate + "x");
  }

  function guardRate(e) {
    if (Math.abs(e.target.playbackRate - targetRate) > 0.001) {
      e.target.playbackRate = targetRate;
    }
  }

  function attachGuard(video) {
    if (video._eliceGuard) return;
    video._eliceGuard = true;
    video.addEventListener("ratechange", guardRate);
    video.playbackRate = targetRate;
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText =
      "position:fixed;top:16px;right:16px;z-index:2147483647;" +
      "background:#1a1a2e;color:#fff;border-radius:12px;" +
      "font-family:-apple-system,sans-serif;font-size:15px;" +
      "box-shadow:0 4px 24px rgba(0,0,0,.4);" +
      "touch-action:manipulation;user-select:none;";

    var toggle = document.createElement("button");
    toggle.textContent = "\u25B6 \uBC30\uC18D";
    toggle.style.cssText =
      "display:block;width:100%;padding:10px 14px;border:none;background:transparent;" +
      "color:#fff;font-size:14px;font-weight:600;cursor:pointer;text-align:left;" +
      "border-radius:12px;min-height:44px;";
    toggle.addEventListener("click", function () {
      minimized = !minimized;
      body.style.display = minimized ? "none" : "block";
      toggle.textContent = minimized
        ? "\u25B6 \uBC30\uC18D " + targetRate + "x"
        : "\u25B6 \uBC30\uC18D";
    });

    body = document.createElement("div");
    body.style.cssText = "padding:0 14px 14px;";

    var row = document.createElement("div");
    row.style.cssText =
      "display:flex;align-items:center;gap:8px;margin-bottom:10px;";

    var label = document.createElement("span");
    label.textContent = "\uBC30\uC18D";
    label.style.cssText = "font-weight:600;flex-shrink:0;";

    input = document.createElement("input");
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "0.1";
    input.min = "0.1";
    input.max = "16";
    input.value = targetRate;
    input.style.cssText =
      "width:64px;padding:8px;border-radius:8px;border:1px solid #444;" +
      "background:#2a2a3e;color:#fff;font-size:16px;text-align:center;" +
      "-webkit-appearance:none;";

    var applyBtn = document.createElement("button");
    applyBtn.textContent = "\uC801\uC6A9";
    applyBtn.style.cssText =
      "padding:8px 14px;border-radius:8px;border:none;background:#6c5ce7;" +
      "color:#fff;font-size:15px;font-weight:600;cursor:pointer;" +
      "min-height:44px;min-width:44px;";
    applyBtn.addEventListener("click", function () {
      applyRate(parseFloat(input.value) || 1);
    });

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(applyBtn);
    body.appendChild(row);

    var chips = document.createElement("div");
    chips.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";

    PRESETS.forEach(function (p) {
      var chip = document.createElement("button");
      chip.textContent = p + "x";
      chip.style.cssText =
        "padding:8px 12px;border-radius:8px;border:1px solid #555;" +
        "background:#2a2a3e;color:#fff;font-size:14px;cursor:pointer;" +
        "min-height:44px;min-width:44px;";
      chip.addEventListener("click", function () {
        applyRate(p);
      });
      chips.appendChild(chip);
    });

    body.appendChild(chips);
    panel.appendChild(toggle);
    panel.appendChild(body);
    document.body.appendChild(panel);
  }

  var toast;
  function showToast(msg) {
    if (!toast) {
      toast = document.createElement("div");
      toast.style.cssText =
        "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
        "background:rgba(0,0,0,.8);color:#fff;padding:10px 20px;" +
        "border-radius:20px;font-size:16px;z-index:2147483647;" +
        "pointer-events:none;opacity:0;transition:opacity .3s;";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(function () {
      toast.style.opacity = "0";
    }, 1200);
  }

  var observer = new MutationObserver(function (mutations) {
    var hasVideo = false;
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeName === "VIDEO") {
          attachGuard(node);
          hasVideo = true;
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("video").forEach(function (v) {
            attachGuard(v);
            hasVideo = true;
          });
        }
      });
    });
    if (hasVideo) createPanel();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  var existing = document.querySelectorAll("video");
  if (existing.length > 0) {
    existing.forEach(attachGuard);
    createPanel();
  }
})();
