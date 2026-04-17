(function () {
  var PANEL_ID = "elice-speed-panel";
  var existing = document.getElementById(PANEL_ID);
  if (existing) {
    existing.remove();
    return;
  }

  var targetRate = 2;
  var PRESETS = [1, 1.5, 2, 2.5, 3, 4];

  function clamp(v) {
    return Math.min(16, Math.max(0.1, v));
  }

  function applyRate(rate) {
    targetRate = clamp(rate);
    document.querySelectorAll("video").forEach(function (v) {
      v.playbackRate = targetRate;
    });
    input.value = targetRate;
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

  document.querySelectorAll("video").forEach(attachGuard);

  if (!window._eliceSpeedObserver) {
    window._eliceSpeedObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeName === "VIDEO") attachGuard(node);
          if (node.querySelectorAll) {
            node.querySelectorAll("video").forEach(attachGuard);
          }
        });
      });
    });
    window._eliceSpeedObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  var panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText =
    "position:fixed;top:16px;right:16px;z-index:2147483647;" +
    "background:#1a1a2e;color:#fff;border-radius:12px;padding:14px;" +
    "font-family:-apple-system,sans-serif;font-size:15px;" +
    "box-shadow:0 4px 24px rgba(0,0,0,.4);min-width:220px;" +
    "touch-action:manipulation;user-select:none;";

  var row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";

  var label = document.createElement("span");
  label.textContent = "배속";
  label.style.cssText = "font-weight:600;flex-shrink:0;";

  var input = document.createElement("input");
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
  applyBtn.textContent = "적용";
  applyBtn.style.cssText =
    "padding:8px 14px;border-radius:8px;border:none;background:#6c5ce7;" +
    "color:#fff;font-size:15px;font-weight:600;cursor:pointer;" +
    "min-height:44px;min-width:44px;";
  applyBtn.addEventListener("click", function () {
    applyRate(parseFloat(input.value) || 1);
  });

  var closeBtn = document.createElement("button");
  closeBtn.textContent = "\u2715";
  closeBtn.style.cssText =
    "padding:8px 10px;border-radius:8px;border:none;background:#444;" +
    "color:#fff;font-size:15px;cursor:pointer;min-height:44px;min-width:44px;";
  closeBtn.addEventListener("click", function () {
    panel.remove();
  });

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(applyBtn);
  row.appendChild(closeBtn);
  panel.appendChild(row);

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

  panel.appendChild(chips);
  document.body.appendChild(panel);

  var toast = document.createElement("div");
  toast.style.cssText =
    "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
    "background:rgba(0,0,0,.8);color:#fff;padding:10px 20px;" +
    "border-radius:20px;font-size:16px;z-index:2147483647;" +
    "pointer-events:none;opacity:0;transition:opacity .3s;";
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(function () {
      toast.style.opacity = "0";
    }, 1200);
  }

  input.focus();
})();
