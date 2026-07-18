(() => {
  "use strict";

  const TIME_ZONE = "America/Lima";
  const LOCALE = "es-PE";

  const MESSAGE_INTERVAL = 12_000;
  const GREETING_INTERVAL = 10 * 60_000;

  const widget = document.getElementById("startWidget");
  const greetingHeading = document.querySelector(".greeting");
  const greeting = document.getElementById("greeting");
  const clock = document.getElementById("clock");
  const date = document.getElementById("date");
  const messageWrap = document.getElementById("messageWrap");
  const message = document.getElementById("message");
  const periodLabel = document.getElementById("periodLabel");

  const GREETINGS = {
    lateNight: [
      "Buenas noches",
      "Sigues por aquí",
      "Todavía despierta"
    ],

    earlyMorning: [
      "Buenos días",
      "Madrugaste",
      "Un nuevo día"
    ],

    morning: [
      "Buenos días",
      "Qué gusto verte",
      "Bienvenida de nuevo"
    ],

    midday: [
      "Buenas tardes",
      "Buen mediodía",
      "Seguimos"
    ],

    afternoon: [
      "Buenas tardes",
      "Qué gusto verte",
      "Bienvenida de nuevo"
    ],

    evening: [
      "Buenas noches",
      "Ya estás de vuelta",
      "Hola de nuevo"
    ],

    lateEvening: [
      "Buenas noches",
      "Hora de bajar el ritmo",
      "Ya puedes aterrizar"
    ]
  };

  const MESSAGES = {
    lateNight: [
      "No todo tiene que resolverse esta noche, corazón.",
      "La madrugada también sabe guardar silencios bonitos.",
      "Tu única tarea ahora puede ser bajar el ritmo.",
      "El mundo puede esperar un ratito más.",
      "Cerrar pestañas también cuenta como productividad.",
      "Mañana tendrás otra oportunidad; ahora toca respirar.",
      "No necesitas ganarle al sueño para sentir que avanzaste.",
      "Haz espacio para una noche tranquila."
    ],

    earlyMorning: [
      "Empieza suave; tu día no tiene que arrancar corriendo.",
      "Un café, una prioridad y cero dramas innecesarios.",
      "Hoy también puedes hacerlo bonito, no solo rápido.",
      "Todavía no tienes que tener todo resuelto.",
      "El día apenas está abriendo sus alas.",
      "Haz primero eso que te dará paz mental.",
      "Tu energía de la mañana vale oro: úsala con cariño.",
      "Respira. Ya estás aquí y eso es un buen comienzo."
    ],

    morning: [
      "Una cosa bien hecha vale más que diez a medias.",
      "No confundas avanzar con agotarte.",
      "Trabajo, estudios y vida no tienen que resolverse en un solo bloque.",
      "Empieza por lo más importante, no por lo más ruidoso.",
      "Hoy también cuenta, incluso si avanzas despacito.",
      "Tu agenda es una guía, no una sentencia.",
      "Kanelista, deja un poquito de aire entre pendiente y pendiente.",
      "Una pausa con Osiris también cuenta como recargar energía.",
      "No necesitas demostrar nada: solo seguir tu propio ritmo.",
      "Hazlo simple primero; bonito viene después."
    ],

    midday: [
      "Come, respira y vuelve con la cabeza más ligera.",
      "La mitad del día también merece una pausa.",
      "Reorganizar no es retroceder; es cuidar tu energía.",
      "Todavía hay tiempo para cambiar el plan.",
      "Un pendiente menos ya cuenta muchísimo.",
      "No conviertas el descanso en otro pendiente.",
      "Tu cerebro no es una pestaña infinita.",
      "Que la tarde te encuentre más ligera, no más apurada."
    ],

    afternoon: [
      "Segundo tramo: sin prisa, pero con intención.",
      "Todavía puedes salvar el día sin exigirte perfección.",
      "Que tu energía vaya a lo que sí importa.",
      "No todo lo urgente merece tu atención.",
      "Mira todo lo que ya moviste hoy.",
      "Una tarea terminada es mejor que cinco empezadas.",
      "Deja un ratito para Yhorbis y otro solo para ti.",
      "Si el plan cambió, ajusta la ruta; no abandones el vuelo.",
      "Haz lo posible y suelta la culpa por lo demás.",
      "Tu mejor ritmo no siempre es el más rápido."
    ],

    evening: [
      "No necesitas terminarlo todo para haber tenido un buen día.",
      "Cierra lo urgente y suelta lo que puede esperar.",
      "La tarde baja el volumen. Tú también puedes hacerlo.",
      "Guarda una idea bonita para mañana.",
      "Ordenar un poco la mente ya es suficiente por hoy.",
      "Lo pendiente seguirá ahí; tu descanso también importa.",
      "Hoy hiciste más de lo que probablemente estás contando.",
      "Aterriza con suavidad. Mañana seguimos.",
      "Una noche tranquila también forma parte del progreso.",
      "Kanelista, ya puedes quitarte el peso del día."
    ],

    lateEvening: [
      "Ya hiciste suficiente por hoy.",
      "Mañana se verá más claro después de descansar.",
      "Baja el brillo, cierra pendientes y vuelve a ti.",
      "El descanso no se gana: se necesita.",
      "No lleves a la cama todo lo que quedó abierto.",
      "Haz una pausa con tus perritos; el mundo puede esperar.",
      "Respira profundo. El día ya está aterrizando.",
      "Buenas noches, Kanelista. Lo demás puede esperar."
    ]
  };

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

  let currentMessageKey = "";
  let messageIndex = -1;
  let lastGreeting = "";

  function capitalize(text) {
    return text.charAt(0).toLocaleUpperCase(LOCALE) + text.slice(1);
  }

  function getHour(now) {
    const hour = Number(formatters.hour.format(now));
    return hour === 24 ? 0 : hour;
  }

  function timeProfile(hour) {
    if (hour < 5) {
      return {
        key: "lateNight",
        period: "night",
        label: "MODO DESCANSO"
      };
    }

    if (hour < 8) {
      return {
        key: "earlyMorning",
        period: "morning",
        label: "MODO AMANECER"
      };
    }

    if (hour < 12) {
      return {
        key: "morning",
        period: "morning",
        label: "MODO MAÑANA"
      };
    }

    if (hour < 15) {
      return {
        key: "midday",
        period: "afternoon",
        label: "MODO MEDIODÍA"
      };
    }

    if (hour < 19) {
      return {
        key: "afternoon",
        period: "afternoon",
        label: "MODO TARDE"
      };
    }

    if (hour < 22) {
      return {
        key: "evening",
        period: "night",
        label: "MODO NOCHE"
      };
    }

    return {
      key: "lateEvening",
      period: "night",
      label: "MODO DESCANSO"
    };
  }

  function hashText(text) {
    let hash = 0;

    for (const character of text) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return hash;
  }

  function greetingFor(profile, now) {
    const options = GREETINGS[profile.key];
    const tenMinuteBlock = Math.floor(now.getTime() / GREETING_INTERVAL);
    return options[tenMinuteBlock % options.length];
  }

  function setGreeting(nextGreeting) {
    if (nextGreeting === lastGreeting) return;

    greetingHeading.classList.add("is-changing");

    window.setTimeout(() => {
      greeting.textContent = nextGreeting;
      lastGreeting = nextGreeting;
      greetingHeading.classList.remove("is-changing");
    }, 220);
  }

  function pickNextMessage(profileKey) {
    const options = MESSAGES[profileKey];

    if (currentMessageKey !== profileKey) {
      currentMessageKey = profileKey;

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());

      messageIndex = hashText(`${today}-${profileKey}`) % options.length;
      return options[messageIndex];
    }

    let nextIndex = messageIndex;

    while (nextIndex === messageIndex && options.length > 1) {
      nextIndex = Math.floor(Math.random() * options.length);
    }

    messageIndex = nextIndex;
    return options[messageIndex];
  }

  function rotateMessage(profileKey, immediate = false) {
    const nextMessage = pickNextMessage(profileKey);

    if (immediate) {
      message.textContent = nextMessage;
      return;
    }

    messageWrap.classList.add("is-changing");

    window.setTimeout(() => {
      message.textContent = nextMessage;
      messageWrap.classList.remove("is-changing");
    }, 260);
  }

  function updateDateTime() {
    const now = new Date();
    const hour = getHour(now);
    const minute = formatters.minute.format(now).padStart(2, "0");
    const profile = timeProfile(hour);

    widget.dataset.period = profile.period;
    periodLabel.textContent = profile.label;
    setGreeting(greetingFor(profile, now));

    clock.textContent = `${String(hour).padStart(2, "0")}:${minute}`;
    date.textContent = capitalize(formatters.date.format(now));
    document.title = `${clock.textContent} · Kanelista`;

    return profile;
  }

  function scheduleMinuteRefresh() {
    const now = new Date();
    const untilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 30;

    window.setTimeout(() => {
      updateDateTime();
      window.setInterval(updateDateTime, 60_000);
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
    if (!document.hidden) {
      const profile = updateDateTime();
      rotateMessage(profile.key, true);
    }
  });

  const initialProfile = updateDateTime();
  rotateMessage(initialProfile.key, true);
  scheduleMinuteRefresh();

  window.setInterval(() => {
    const profile = timeProfile(getHour(new Date()));
    rotateMessage(profile.key);
  }, MESSAGE_INTERVAL);
})();
