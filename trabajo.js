/* =========================================================
   KANELISTA — WORK BOARDING PASS V2
   Hora, fecha y estado dinámico en la zona horaria de Lima
   ========================================================= */

(() => {
  "use strict";

  const TIME_ZONE = "America/Lima";
  const LOCALE = "es-PE";

  const dateValue = document.getElementById("dateValue");
  const timeValue = document.getElementById("timeValue");
  const statusPill = document.getElementById("statusPill");
  const statusText = document.getElementById("statusText");
  const statusMessage = document.getElementById("statusMessage");
  const timezoneValue = document.getElementById("timezoneValue");

  const STATUS_BY_HOUR = [
    {
      start: 0,
      end: 6,
      state: "off-duty",
      label: "OFF DUTY",
      message: "Cabina en descanso. Mañana volvemos a despegar."
    },
    {
      start: 6,
      end: 9,
      state: "standby",
      label: "STANDBY",
      message: "Preparando ruta, café y prioridades del día."
    },
    {
      start: 9,
      end: 13,
      state: "on-duty",
      label: "ON DUTY",
      message: "Modo enfoque activo. Destino: avanzar."
    },
    {
      start: 13,
      end: 15,
      state: "cruising",
      label: "CRUISING",
      message: "Altitud estable. Una pausa también es parte del vuelo."
    },
    {
      start: 15,
      end: 19,
      state: "on-duty",
      label: "ON DUTY",
      message: "Segundo tramo en curso. Manteniendo el rumbo."
    },
    {
      start: 19,
      end: 22,
      state: "standby",
      label: "STANDBY",
      message: "Cerrando pendientes y preparando el próximo despegue."
    },
    {
      start: 22,
      end: 24,
      state: "off-duty",
      label: "OFF DUTY",
      message: "Vuelo finalizado. Es hora de aterrizar por hoy."
    }
  ];

  const formatters = {
    time: new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }),

    date: new Intl.DateTimeFormat(LOCALE, {
      timeZone: TIME_ZONE,
      day: "2-digit",
      month: "short"
    }),

    hour: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false
    })
  };

  function getLimaHour(now) {
    const rawHour = Number(formatters.hour.format(now));
    return rawHour === 24 ? 0 : rawHour;
  }

  function getStatusForHour(hour) {
    return (
      STATUS_BY_HOUR.find(({ start, end }) => hour >= start && hour < end) ??
      STATUS_BY_HOUR[0]
    );
  }

  function formatDate(now) {
    return formatters.date
      .format(now)
      .replace(".", "")
      .toLocaleUpperCase(LOCALE);
  }

  function updateWidget() {
    const now = new Date();
    const limaHour = getLimaHour(now);
    const status = getStatusForHour(limaHour);

    if (dateValue) {
      dateValue.textContent = formatDate(now);
    }

    if (timeValue) {
      timeValue.textContent = formatters.time.format(now);
    }

    if (statusPill) {
      statusPill.dataset.state = status.state;
      statusPill.setAttribute("aria-label", `Estado: ${status.label}`);
    }

    if (statusText) {
      statusText.textContent = status.label;
    }

    if (statusMessage) {
      statusMessage.textContent = status.message;
    }

    if (timezoneValue) {
      timezoneValue.textContent = "Lima · UTC−5";
    }

    document.title = `${formatters.time.format(now)} · Kanelista Work`;
  }

  function scheduleMinuteRefresh() {
    const now = new Date();
    const millisecondsToNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 30;

    window.setTimeout(() => {
      updateWidget();
      window.setInterval(updateWidget, 60_000);
    }, millisecondsToNextMinute);
  }

  updateWidget();
  scheduleMinuteRefresh();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateWidget();
    }
  });
})();
