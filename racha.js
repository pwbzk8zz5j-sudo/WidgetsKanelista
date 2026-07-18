(() => {
  "use strict";

  const TIME_ZONE = "America/Lima";
  const STORAGE_KEY = "kanelista-week-streak-v1";

  const DAYS = [
    { short: "L", name: "Lunes" },
    { short: "M", name: "Martes" },
    { short: "M", name: "Miércoles" },
    { short: "J", name: "Jueves" },
    { short: "V", name: "Viernes" },
    { short: "S", name: "Sábado" },
    { short: "D", name: "Domingo" }
  ];

  const WEEK_MESSAGES = [
    "Lunes: empieza suave, pero empieza.",
    "Martes: ya tomaste impulso.",
    "Miércoles: llegaste a la mitad.",
    "Jueves: la semana ya está de tu lado.",
    "Viernes: casi aterrizamos.",
    "Sábado: también vale descansar.",
    "Domingo: cierra bonito y vuelve a empezar."
  ];

  const STREAK_MESSAGES = {
    1: "Hoy empezamos suave.",
    2: "Dos días seguidos. Ya hay ritmo.",
    3: "Tres días: esto ya parece costumbre.",
    4: "Cuatro días sin soltar el hilo.",
    5: "Cinco días. Mira esa constancia.",
    6: "Seis días seguidos, Kanelista.",
    7: "Una semana completa. Iconic."
  };

  const el = {
    streakNumber: document.getElementById("streakNumber"),
    streakUnit: document.getElementById("streakUnit"),
    streakNote: document.getElementById("streakNote"),
    progressCopy: document.getElementById("progressCopy"),
    progressPercent: document.getElementById("progressPercent"),
    weekTrack: document.getElementById("weekTrack"),
    barFill: document.getElementById("barFill"),
    weekMessage: document.getElementById("weekMessage")
  };

  function limaDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long"
    }).formatToParts(date);

    return Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
  }

  function limaDateKey(date = new Date()) {
    const parts = limaDateParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function localMidnightFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function daysBetween(previousKey, currentKey) {
    return Math.round(
      (localMidnightFromKey(currentKey) - localMidnightFromKey(previousKey)) /
      86400000
    );
  }

  function loadStreak() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

      if (
        saved &&
        typeof saved.lastVisit === "string" &&
        Number.isInteger(saved.streak) &&
        saved.streak > 0
      ) {
        return saved;
      }
    } catch {
      // Un valor inválido simplemente inicia una racha nueva.
    }

    return {
      lastVisit: "",
      streak: 0
    };
  }

  function updateStreak() {
    const today = limaDateKey();
    const data = loadStreak();

    if (data.lastVisit === today) {
      return data.streak || 1;
    }

    const difference = data.lastVisit
      ? daysBetween(data.lastVisit, today)
      : null;

    const streak = difference === 1
      ? data.streak + 1
      : 1;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastVisit: today,
        streak
      })
    );

    return streak;
  }

  function weekdayIndex() {
    const weekday = limaDateParts().weekday.toLowerCase();

    const map = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6
    };

    return map[weekday] ?? 0;
  }

  function streakMessage(streak) {
    if (STREAK_MESSAGES[streak]) {
      return STREAK_MESSAGES[streak];
    }

    if (streak < 14) {
      return `${streak} días seguidos. Ya agarraste vuelo.`;
    }

    if (streak < 30) {
      return `${streak} días. La constancia está haciendo lo suyo.`;
    }

    return `${streak} días. Esto ya es parte de ti.`;
  }

  function render() {
    const todayIndex = weekdayIndex();
    const completedDays = todayIndex + 1;
    const percentage = Math.round((completedDays / 7) * 100);
    const streak = updateStreak();

    el.streakNumber.textContent = streak;
    el.streakUnit.textContent = streak === 1 ? "día" : "días";
    el.streakNote.textContent = streakMessage(streak);

    el.progressCopy.textContent =
      `${DAYS[todayIndex].name} · ${completedDays} de 7 días`;

    el.progressPercent.textContent = `${percentage}%`;
    el.weekMessage.textContent = WEEK_MESSAGES[todayIndex];

    el.weekTrack.replaceChildren(
      ...DAYS.map((day, index) => {
        const item = document.createElement("div");
        item.className = "day";

        if (index < todayIndex) {
          item.classList.add("is-past");
        } else if (index === todayIndex) {
          item.classList.add("is-today");
        }

        item.setAttribute(
          "aria-label",
          index === todayIndex
            ? `${day.name}, hoy`
            : day.name
        );

        item.innerHTML = `
          <span class="day-dot">${index < todayIndex ? "✓" : day.short}</span>
          <span class="day-label">${day.short}</span>
        `;

        return item;
      })
    );

    requestAnimationFrame(() => {
      el.barFill.style.width = `${percentage}%`;
    });

    document.title = `${percentage}% de la semana · Kanelista`;
  }

  render();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      render();
    }
  });

  window.setInterval(render, 60 * 1000);
})();
