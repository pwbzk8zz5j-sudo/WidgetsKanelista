(() => {
  "use strict";

  const MESSAGES = [
    "Vuelve al centro.",
    "Suelta el ruido.",
    "Una cosa a la vez.",
    "Tu siguiente idea ya viene.",
    "Respira antes de seguir.",
    "No tienes que resolverlo todo hoy.",
    "Haz espacio para lo importante.",
    "Estás entrando en modo enfoque."
  ];

  const card = document.getElementById("portalCard");
  const portal = document.getElementById("portalButton");
  const message = document.getElementById("portalMessage");
  const particleField = document.getElementById("particleField");

  let messageIndex = 0;
  let activationTimer = null;
  let resetPointerTimer = null;

  function createParticles() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 20; index += 1) {
      const particle = document.createElement("span");

      particle.className = "particle";
      particle.style.left = `${6 + Math.random() * 88}%`;
      particle.style.top = `${10 + Math.random() * 78}%`;
      particle.style.setProperty("--size", `${1.2 + Math.random() * 2.4}px`);
      particle.style.setProperty("--opacity", `${0.18 + Math.random() * 0.52}`);
      particle.style.setProperty("--duration", `${3.8 + Math.random() * 5.4}s`);
      particle.style.setProperty("--delay", `${-Math.random() * 6}s`);

      fragment.appendChild(particle);
    }

    particleField.appendChild(fragment);
  }

  function changeMessage() {
    message.classList.add("is-changing");

    window.setTimeout(() => {
      messageIndex = (messageIndex + 1) % MESSAGES.length;
      message.textContent = MESSAGES[messageIndex];
      message.classList.remove("is-changing");
    }, 250);
  }

  function activatePortal() {
    portal.classList.remove("is-activated");
    void portal.offsetWidth;
    portal.classList.add("is-activated");

    changeMessage();

    window.clearTimeout(activationTimer);
    activationTimer = window.setTimeout(() => {
      portal.classList.remove("is-activated");
    }, 1100);
  }

  function handlePointerMove(event) {
    const bounds = card.getBoundingClientRect();
    const normalizedX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const normalizedY = (event.clientY - bounds.top) / bounds.height - 0.5;

    const moveX = normalizedX * 8;
    const moveY = normalizedY * 6;
    const rotateY = normalizedX * 6;
    const rotateX = normalizedY * -5;

    portal.style.setProperty("--mx", `${moveX}px`);
    portal.style.setProperty("--my", `${moveY}px`);
    portal.style.setProperty("--rx", `${rotateX}deg`);
    portal.style.setProperty("--ry", `${rotateY}deg`);

    window.clearTimeout(resetPointerTimer);
    resetPointerTimer = window.setTimeout(resetPointer, 500);
  }

  function resetPointer() {
    portal.style.setProperty("--mx", "0px");
    portal.style.setProperty("--my", "0px");
    portal.style.setProperty("--rx", "0deg");
    portal.style.setProperty("--ry", "0deg");
  }

  portal.addEventListener("click", activatePortal);
  card.addEventListener("pointermove", handlePointerMove);
  card.addEventListener("pointerleave", resetPointer);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      resetPointer();
    }
  });

  createParticles();
})();
