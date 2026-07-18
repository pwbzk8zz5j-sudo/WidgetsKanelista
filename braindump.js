(() => {
  "use strict";

  const STORAGE_KEY = "kanelista-brain-fidget-lava-v2";
  const playground = document.getElementById("playground");
  const card = document.getElementById("fidgetCard");
  const resetButton = document.getElementById("resetButton");
  const pauseButton = document.getElementById("pauseButton");
  const hint = document.getElementById("hint");
  const thoughts = [...document.querySelectorAll(".thought")];

  const state = thoughts.map((thought, index) => {
    const computed = getComputedStyle(thought);
    const x = parseFloat(computed.getPropertyValue("--x")) || 0;
    const y = parseFloat(computed.getPropertyValue("--y")) || 0;
    const angle = (Math.PI * 2 * index) / thoughts.length;

    thought.style.setProperty("--breath-duration", `${4.9 + index * 0.47}s`);

    return {
      thought,
      x,
      y,
      defaultX: x,
      defaultY: y,
      vx: Math.cos(angle) * (0.018 + index * 0.0018),
      vy: Math.sin(angle + 0.8) * (0.014 + index * 0.0015),
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      driftX: 0.010 + Math.random() * 0.010,
      driftY: 0.008 + Math.random() * 0.009,
      dragging: false,
      pointerId: null,
      offsetX: 0,
      offsetY: 0,
      lastPointerX: 0,
      lastPointerY: 0,
      lastPointerTime: 0
    };
  });

  let paused = false;
  let lastFrame = performance.now();
  let movedOnce = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function boundsFor(item) {
    const width = item.thought.offsetWidth;
    const height = item.thought.offsetHeight;

    return {
      minX: 8,
      minY: 8,
      maxX: Math.max(8, playground.clientWidth - width - 8),
      maxY: Math.max(8, playground.clientHeight - height - 8)
    };
  }

  function fitInside(item) {
    const bounds = boundsFor(item);
    item.x = clamp(item.x, bounds.minX, bounds.maxX);
    item.y = clamp(item.y, bounds.minY, bounds.maxY);
  }

  function applyPosition(item) {
    item.thought.style.setProperty("--x", `${item.x}px`);
    item.thought.style.setProperty("--y", `${item.y}px`);
  }

  function savePositions() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state.map((item) => ({ x: item.x, y: item.y })))
      );
    } catch {
      // El movimiento sigue aunque el navegador bloquee localStorage.
    }
  }

  function loadPositions() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

      if (!Array.isArray(saved) || saved.length !== state.length) return;

      saved.forEach((position, index) => {
        if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) {
          state[index].x = position.x;
          state[index].y = position.y;
          fitInside(state[index]);
          applyPosition(state[index]);
        }
      });
    } catch {
      // Se usan las posiciones iniciales.
    }
  }

  function gentlySeparateBubbles() {
    for (let i = 0; i < state.length; i += 1) {
      for (let j = i + 1; j < state.length; j += 1) {
        const a = state[i];
        const b = state[j];

        if (a.dragging || b.dragging) continue;

        const ax = a.x + a.thought.offsetWidth / 2;
        const ay = a.y + a.thought.offsetHeight / 2;
        const bx = b.x + b.thought.offsetWidth / 2;
        const by = b.y + b.thought.offsetHeight / 2;

        let dx = bx - ax;
        let dy = by - ay;
        let distance = Math.hypot(dx, dy);

        const minimum =
          (a.thought.offsetWidth + b.thought.offsetWidth) * 0.41;

        if (distance === 0) {
          dx = 0.01;
          dy = 0.01;
          distance = 0.014;
        }

        if (distance < minimum) {
          const force = (minimum - distance) * 0.000018;
          const nx = dx / distance;
          const ny = dy / distance;

          a.vx -= nx * force;
          a.vy -= ny * force;
          b.vx += nx * force;
          b.vy += ny * force;
        }
      }
    }
  }

  function animate(now) {
    const delta = Math.min(40, now - lastFrame);
    lastFrame = now;

    if (!paused) {
      gentlySeparateBubbles();

      state.forEach((item, index) => {
        if (item.dragging) return;

        const time = now / 1000;
        const bounds = boundsFor(item);

        // Corriente lenta y ondulada para sensación de lámpara de lava.
        const organicX =
          Math.sin(time * item.driftX * 11 + item.phaseX) * 0.0045;
        const organicY =
          Math.cos(time * item.driftY * 12 + item.phaseY) * 0.0042;

        item.vx += organicX * delta;
        item.vy += organicY * delta;

        // Velocidad limitada para que el movimiento sea suave.
        const maxSpeed = 0.052;
        const speed = Math.hypot(item.vx, item.vy);

        if (speed > maxSpeed) {
          item.vx = (item.vx / speed) * maxSpeed;
          item.vy = (item.vy / speed) * maxSpeed;
        }

        item.x += item.vx * delta;
        item.y += item.vy * delta;

        // Rebote blando en los bordes.
        if (item.x <= bounds.minX) {
          item.x = bounds.minX;
          item.vx = Math.abs(item.vx) * 0.92;
        } else if (item.x >= bounds.maxX) {
          item.x = bounds.maxX;
          item.vx = -Math.abs(item.vx) * 0.92;
        }

        if (item.y <= bounds.minY) {
          item.y = bounds.minY;
          item.vy = Math.abs(item.vy) * 0.92;
        } else if (item.y >= bounds.maxY) {
          item.y = bounds.maxY;
          item.vy = -Math.abs(item.vy) * 0.92;
        }

        applyPosition(item);
      });
    }

    requestAnimationFrame(animate);
  }

  function beginDrag(event, item) {
    event.preventDefault();

    const bubbleBounds = item.thought.getBoundingClientRect();
    const fieldBounds = playground.getBoundingClientRect();

    item.dragging = true;
    item.pointerId = event.pointerId;
    item.offsetX = event.clientX - bubbleBounds.left;
    item.offsetY = event.clientY - bubbleBounds.top;
    item.fieldLeft = fieldBounds.left;
    item.fieldTop = fieldBounds.top;
    item.lastPointerX = event.clientX;
    item.lastPointerY = event.clientY;
    item.lastPointerTime = performance.now();

    item.thought.classList.add("is-dragging");
    item.thought.setPointerCapture(event.pointerId);

    if (!movedOnce) {
      movedOnce = true;
      hint.classList.add("is-hidden");
    }
  }

  function moveDrag(event, item) {
    if (!item.dragging || event.pointerId !== item.pointerId) return;

    const now = performance.now();
    const elapsed = Math.max(1, now - item.lastPointerTime);

    item.vx = (event.clientX - item.lastPointerX) / elapsed;
    item.vy = (event.clientY - item.lastPointerY) / elapsed;

    item.x = event.clientX - item.fieldLeft - item.offsetX;
    item.y = event.clientY - item.fieldTop - item.offsetY;

    fitInside(item);
    applyPosition(item);

    item.lastPointerX = event.clientX;
    item.lastPointerY = event.clientY;
    item.lastPointerTime = now;
  }

  function endDrag(event, item) {
    if (!item.dragging || event.pointerId !== item.pointerId) return;

    item.dragging = false;
    item.pointerId = null;
    item.thought.classList.remove("is-dragging");

    // La burbuja conserva un poquito del impulso que le diste.
    const speed = Math.hypot(item.vx, item.vy);
    const maxThrow = 0.075;

    if (speed > maxThrow) {
      item.vx = (item.vx / speed) * maxThrow;
      item.vy = (item.vy / speed) * maxThrow;
    }

    try {
      item.thought.releasePointerCapture(event.pointerId);
    } catch {
      // Ya fue liberado.
    }

    savePositions();
  }

  function createRipple(event) {
    if (
      event.target.closest(".thought") ||
      event.target.closest(".header-actions")
    ) {
      return;
    }

    const bounds = playground.getBoundingClientRect();
    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.left = `${event.clientX - bounds.left}px`;
    ripple.style.top = `${event.clientY - bounds.top}px`;

    playground.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }

  function resetPositions() {
    state.forEach((item, index) => {
      item.x = item.defaultX;
      item.y = item.defaultY;

      const angle = (Math.PI * 2 * index) / state.length;
      item.vx = Math.cos(angle) * (0.018 + index * 0.0018);
      item.vy = Math.sin(angle + 0.8) * (0.014 + index * 0.0015);

      fitInside(item);
      applyPosition(item);
    });

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // No pasa nada.
    }

    hint.classList.remove("is-hidden");
    movedOnce = false;
  }

  function togglePause() {
    paused = !paused;
    card.classList.toggle("is-paused", paused);
    pauseButton.classList.toggle("is-paused", paused);
    pauseButton.textContent = paused ? "Reanudar" : "Pausar";
  }

  state.forEach((item) => {
    item.thought.addEventListener(
      "pointerdown",
      (event) => beginDrag(event, item)
    );

    item.thought.addEventListener(
      "pointermove",
      (event) => moveDrag(event, item)
    );

    item.thought.addEventListener(
      "pointerup",
      (event) => endDrag(event, item)
    );

    item.thought.addEventListener(
      "pointercancel",
      (event) => endDrag(event, item)
    );
  });

  playground.addEventListener("pointerdown", createRipple);
  resetButton.addEventListener("click", resetPositions);
  pauseButton.addEventListener("click", togglePause);

  window.addEventListener("resize", () => {
    state.forEach((item) => {
      fitInside(item);
      applyPosition(item);
    });

    savePositions();
  });

  document.addEventListener("visibilitychange", () => {
    lastFrame = performance.now();
  });

  loadPositions();
  requestAnimationFrame(animate);
})();
