(() => {
  "use strict";

  const TIME_ZONE = "America/Lima";
  const LOCALE = "es-PE";

  const widget = document.getElementById("startWidget");
  const greeting = document.getElementById("greeting");
  const clock = document.getElementById("clock");
  const date = document.getElementById("date");
  const message = document.getElementById("message");
  const periodLabel = document.getElementById("periodLabel");

  const hourlyMessages = [
    "Descansa. No todo tiene que resolverse esta noche.",
    "La madrugada también sabe guardar silencios bonitos.",
    "Tu única tarea ahora es bajar el ritmo.",
    "Todavía falta para el día. Déjate descansar.",
    "El mundo puede esperar un ratito más.",
    "Empieza despacio; no tienes que correr desde el primer minuto.",
    "Un nuevo día está abriendo sus alas.",
    "Café, aire y una prioridad a la vez.",
    "Haz primero lo que te dé paz mental.",
    "Ya despegaste. Mantén el rumbo sin exigirte perfección.",
    "Una cosa bien hecha vale más que diez a medias.",
    "No confundas avanzar con agotarte.",
    "La mitad del día también merece una pausa.",
    "Come, respira y vuelve con la cabeza más ligera.",
    "Todavía hay tiempo; reorganizar también es avanzar.",
    "Segundo tramo: sin prisa, pero con intención.",
    "Que tu energía vaya a lo que sí importa.",
    "Mira todo lo que ya moviste hoy.",
    "Cierra lo urgente y suelta lo que puede esperar.",
    "La tarde baja el volumen. Tú también puedes hacerlo.",
    "No necesitas terminarlo todo para haber tenido un buen día.",
    "Guarda una idea bonita para mañana.",
    "Haz espacio para una noche tranquila.",
    "Aterriza con suavidad. Mañana seguimos."
  ];

  const formatters = {
    hour: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false
    }),
    minute: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      minute: "2-digit"
    }),
    date: new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long"
    })
  };

  function capitalize(text) {
    return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
  }

  function getHour(now) {
    const hour = Number(formatters.hour.format(now));
    return hour === 24 ? 0 : hour;
  }

  function periodFor(hour) {
    if (hour >= 5 && hour < 12) {
      return { key: "morning", greeting: "Buenos días", label: "MODO MAÑANA" };
    }

    if (hour >= 12 && hour < 19) {
      return { key: "afternoon", greeting: "Buenas tardes", label: "MODO TARDE" };
    }

    return { key: "night", greeting: "Buenas noches", label: "MODO NOCHE" };
  }

  function updateWidget() {
    const now = new Date();
    const hour = getHour(now);
    const minute = formatters.minute.format(now).padStart(2, "0");
    const period = periodFor(hour);

    widget.dataset.period = period.key;
    greeting.textContent = period.greeting;
    periodLabel.textContent = period.label;
    clock.textContent = `${String(hour).padStart(2, "0")}:${minute}`;
    date.textContent = capitalize(formatters.date.format(now));
    message.textContent = hourlyMessages[hour];
    document.title = `${clock.textContent} · Kanelista`;
  }

  function scheduleRefresh() {
    const now = new Date();
    const untilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 30;

    window.setTimeout(() => {
      updateWidget();
      window.setInterval(updateWidget, 60_000);
    }, untilNextMinute);
  }

  function updateParallax(event) {
    const bounds = widget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    widget.style.setProperty("--mx", x.toFixed(3));
    widget.style.setProperty("--my", y.toFixed(3));
  }

  widget.addEventListener("pointermove", updateParallax);
  widget.addEventListener("pointerleave", () => {
    widget.style.setProperty("--mx", "0");
    widget.style.setProperty("--my", "0");
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateWidget();
  });

  updateWidget();
  scheduleRefresh();
})();
