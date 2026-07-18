/* =========================================================
   KANELISTA — AGENDA CENTRAL
   Fecha de Lima + clima en vivo con Open-Meteo
   ========================================================= */

(() => {
  "use strict";

  const DEFAULT_LOCATION = {
    latitude: -12.0464,
    longitude: -77.0428,
    city: "Lima",
    timezone: "America/Lima"
  };

  const REFRESH_INTERVAL = 15 * 60 * 1000;

  const params = new URLSearchParams(window.location.search);

  const state = {
    latitude: numberParam("lat", DEFAULT_LOCATION.latitude),
    longitude: numberParam("lon", DEFAULT_LOCATION.longitude),
    city: params.get("city")?.trim() || DEFAULT_LOCATION.city,
    timezone: params.get("tz")?.trim() || DEFAULT_LOCATION.timezone,
    weather: null
  };

  const elements = {
    card: document.getElementById("agendaCard"),
    year: document.getElementById("year"),
    weekday: document.getElementById("weekday"),
    dayNumber: document.getElementById("dayNumber"),
    month: document.getElementById("month"),
    dateCaption: document.getElementById("dateCaption"),
    dailyMessage: document.getElementById("dailyMessage"),
    clock: document.getElementById("clock"),
    timezoneLabel: document.getElementById("timezoneLabel"),

    locationButton: document.getElementById("locationButton"),
    locationName: document.getElementById("locationName"),
    updatedLabel: document.getElementById("updatedLabel"),
    weatherIcon: document.getElementById("weatherIcon"),
    temperature: document.getElementById("temperature"),
    condition: document.getElementById("condition"),
    feelsLike: document.getElementById("feelsLike"),
    highLow: document.getElementById("highLow"),
    rainChance: document.getElementById("rainChance"),
    humidity: document.getElementById("humidity"),
    wind: document.getElementById("wind"),
    weatherError: document.getElementById("weatherError")
  };

  const DAILY_MESSAGES = [
    "Haz espacio para lo importante; lo demás puede esperar.",
    "Una cosa a la vez también cuenta como progreso.",
    "Hoy no necesita ser perfecto para ser un buen día.",
    "Tu agenda es una guía, no una sentencia.",
    "Empieza por lo que te dé más paz al terminarlo.",
    "Pequeños avances, gran diferencia.",
    "Organizar también es cuidar tu energía.",
    "Deja un poquito de aire entre pendiente y pendiente."
  ];

  const WEATHER_LABELS = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Neblina con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna",
    55: "Llovizna intensa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada",
    61: "Lluvia ligera",
    63: "Lluvia",
    65: "Lluvia intensa",
    66: "Lluvia helada ligera",
    67: "Lluvia helada",
    71: "Nieve ligera",
    73: "Nieve",
    75: "Nieve intensa",
    77: "Granos de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos",
    82: "Chubascos intensos",
    85: "Chubascos de nieve",
    86: "Nieve intensa",
    95: "Tormenta",
    96: "Tormenta con granizo",
    99: "Tormenta fuerte"
  };

  function numberParam(name, fallback) {
    const value = Number(params.get(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function formatter(options) {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: state.timezone,
      ...options
    });
  }

  function zonedDateParts(date = new Date()) {
    const parts = formatter({
      year: "numeric",
      month: "long",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);

    return Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );
  }

  function isoWeekNumber(date = new Date()) {
    const localString = formatter({
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);

    const [day, month, year] = localString.split("/").map(Number);
    const target = new Date(Date.UTC(year, month - 1, day));

    const dayNumber = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

    return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  }

  function timezoneShortLabel() {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: state.timezone,
        timeZoneName: "shortOffset"
      }).formatToParts(new Date());

      return parts.find((part) => part.type === "timeZoneName")?.value
        ?.replace("GMT", "UTC")
        ?.replace(":00", "") || state.timezone;
    } catch {
      return state.timezone;
    }
  }

  function messageForToday() {
    const key = formatter({
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    let hash = 0;

    for (const character of key) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return DAILY_MESSAGES[hash % DAILY_MESSAGES.length];
  }

  function updateDateTime() {
    const parts = zonedDateParts();

    elements.year.textContent = parts.year;
    elements.weekday.textContent = capitalize(parts.weekday);
    elements.dayNumber.textContent = parts.day;
    elements.month.textContent = capitalize(parts.month);
    elements.dateCaption.textContent = `Semana ${isoWeekNumber()}`;
    elements.dailyMessage.textContent = messageForToday();
    elements.clock.textContent = `${parts.hour}:${parts.minute}`;
    elements.timezoneLabel.textContent = timezoneShortLabel();

    document.title = `${parts.day} ${capitalize(parts.month)} · Agenda`;

    const numericHour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    elements.card.dataset.period =
      numericHour >= 6 && numericHour < 18 ? "day" : "night";
  }

  function weatherCategory(code) {
    if (code === 0 || code === 1) return "clear";
    if ([2, 3].includes(code)) return "cloudy";
    if ([45, 48].includes(code)) return "fog";
    if (code >= 51 && code <= 86) return "rain";
    if (code >= 95) return "storm";
    return "cloudy";
  }

  function weatherIconMarkup(code, isDay) {
    const category = weatherCategory(code);
    const sky = isDay
      ? '<circle class="sun" cx="44" cy="40" r="20"></circle>'
      : '<path class="moon" d="M55 17c-13 4-20 18-16 31s17 21 30 18c-7 9-20 13-31 9-15-5-23-22-18-37 5-14 20-23 35-21Z"></path>';

    if (category === "clear") {
      return `
        <svg viewBox="0 0 120 120">
          ${isDay
            ? `
              <g class="sun-rays" stroke="rgba(255,205,118,.68)" stroke-width="3" stroke-linecap="round">
                <path d="M60 12v10M60 98v10M12 60h10M98 60h10M26 26l7 7M87 87l7 7M94 26l-7 7M33 87l-7 7"></path>
              </g>
              <circle class="sun" cx="60" cy="60" r="26"></circle>
            `
            : `
              <path class="moon" d="M72 24c-18 4-29 22-24 40 5 19 24 30 43 24-8 13-25 20-41 16-24-6-38-31-31-55 7-22 30-36 53-31Z"></path>
              <circle fill="rgba(232,225,255,.7)" cx="31" cy="33" r="3"></circle>
              <circle fill="rgba(232,225,255,.55)" cx="92" cy="34" r="2.5"></circle>
              <circle fill="rgba(232,225,255,.45)" cx="96" cy="76" r="2"></circle>
            `}
        </svg>
      `;
    }

    if (category === "fog") {
      return `
        <svg viewBox="0 0 120 120">
          ${sky}
          <path class="cloud" d="M31 72h58c10 0 18-7 18-16s-8-16-18-16c-3 0-5 .5-7 1.5C78 31 68 24 56 24 40 24 27 37 27 53v1C17 56 10 64 10 73c0 11 9 19 20 19h1Z"></path>
          <g class="fog-lines">
            <path class="fog-line" d="M20 89h72"></path>
            <path class="fog-line" d="M30 101h73" style="animation-delay:.8s"></path>
          </g>
        </svg>
      `;
    }

    if (category === "rain") {
      const isSnow = code >= 71 && code <= 86 && ![80, 81, 82].includes(code);

      return `
        <svg viewBox="0 0 120 120">
          ${sky}
          <path class="cloud-back" d="M42 67h52c9 0 16-6 16-14s-7-14-16-14c-2 0-5 .5-7 1.4C84 31 75 25 64 25 50 25 39 36 39 50v1c-9 1-16 9-16 18 0 10 8 18 19 18Z"></path>
          <path class="cloud" d="M24 75h62c11 0 20-7 20-17s-9-17-20-17c-3 0-6 .6-8 1.7C74 32 64 25 52 25 37 25 25 37 25 52v1C14 55 7 64 7 74c0 11 9 20 20 20h-3Z"></path>

          ${isSnow
            ? `
              <circle class="snow-dot" cx="38" cy="97" r="3"></circle>
              <circle class="snow-dot" cx="59" cy="101" r="3" style="animation-delay:.6s"></circle>
              <circle class="snow-dot" cx="80" cy="96" r="3" style="animation-delay:1.1s"></circle>
            `
            : `
              <path class="rain-drop" d="M39 93l-4 9"></path>
              <path class="rain-drop" d="M61 94l-4 10" style="animation-delay:.45s"></path>
              <path class="rain-drop" d="M83 92l-4 10" style="animation-delay:.8s"></path>
            `}
        </svg>
      `;
    }

    if (category === "storm") {
      return `
        <svg viewBox="0 0 120 120">
          <path class="cloud-back" d="M42 66h52c9 0 16-6 16-14s-7-14-16-14c-2 0-5 .5-7 1.4C84 30 75 24 64 24 50 24 39 35 39 49v1c-9 1-16 9-16 18 0 10 8 18 19 18Z"></path>
          <path class="cloud" d="M24 74h62c11 0 20-7 20-17s-9-17-20-17c-3 0-6 .6-8 1.7C74 31 64 24 52 24 37 24 25 36 25 51v1C14 54 7 63 7 73c0 11 9 20 20 20h-3Z"></path>
          <path class="bolt" d="M59 71 45 93h13l-4 21 22-29H62l8-14Z"></path>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 120 120">
        ${sky}
        <path class="cloud-back" d="M43 68h49c10 0 18-7 18-16s-8-16-18-16c-3 0-5 .5-7.5 1.5C81 27 71 20 59 20 44 20 32 32 32 47v1c-10 2-17 10-17 19 0 11 9 19 20 19h8Z"></path>
        <path class="cloud" d="M27 79h60c11 0 20-8 20-18s-9-18-20-18c-3 0-6 .6-8.4 1.8C74 34 64 27 52 27 37 27 25 39 25 54v1C14 57 7 66 7 76c0 11 9 20 20 20Z"></path>
      </svg>
    `;
  }

  function buildWeatherUrl() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.searchParams.set("latitude", state.latitude);
    url.searchParams.set("longitude", state.longitude);

    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m"
      ].join(",")
    );

    url.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max"
      ].join(",")
    );

    url.searchParams.set("timezone", state.timezone);
    url.searchParams.set("forecast_days", "1");

    return url;
  }

  async function fetchWeather() {
    elements.card.classList.add("is-loading");
    elements.weatherError.hidden = true;
    elements.updatedLabel.textContent = "Actualizando…";

    try {
      const response = await fetch(buildWeatherUrl(), {
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Clima HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.current || !data.daily) {
        throw new Error("Respuesta climática incompleta.");
      }

      state.weather = data;
      renderWeather(data);
    } catch (error) {
      console.error(error);
      elements.weatherError.hidden = false;
      elements.updatedLabel.textContent = "Sin conexión";
      elements.condition.textContent = "Clima no disponible";
      elements.feelsLike.textContent = "La fecha sigue actualizándose";
    } finally {
      elements.card.classList.remove("is-loading");
    }
  }

  function rounded(value) {
    return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "--";
  }

  function renderWeather(data) {
    const current = data.current;
    const daily = data.daily;

    const weatherCode = Number(current.weather_code);
    const isDay = Number(current.is_day) === 1;

    elements.card.dataset.period = isDay ? "day" : "night";
    elements.card.dataset.weather = weatherCategory(weatherCode);

    elements.locationName.textContent = state.city;
    elements.temperature.textContent = rounded(current.temperature_2m);
    elements.condition.textContent =
      WEATHER_LABELS[weatherCode] || "Condiciones variables";

    elements.feelsLike.textContent =
      `Sensación térmica ${rounded(current.apparent_temperature)}°`;

    elements.highLow.textContent =
      `${rounded(daily.temperature_2m_max?.[0])}° / ${rounded(daily.temperature_2m_min?.[0])}°`;

    elements.rainChance.textContent =
      `${rounded(daily.precipitation_probability_max?.[0])}%`;

    elements.humidity.textContent =
      `${rounded(current.relative_humidity_2m)}%`;

    elements.wind.textContent =
      `${rounded(current.wind_speed_10m)} km/h`;

    elements.weatherIcon.innerHTML = weatherIconMarkup(weatherCode, isDay);
    elements.updatedLabel.textContent = "Ahora";
    elements.weatherError.hidden = true;
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      elements.updatedLabel.textContent = "Ubicación no disponible";
      return;
    }

    elements.locationButton.disabled = true;
    elements.updatedLabel.textContent = "Buscando ubicación…";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.latitude = position.coords.latitude;
        state.longitude = position.coords.longitude;
        state.city = "Mi ubicación";
        state.timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          DEFAULT_LOCATION.timezone;

        elements.locationName.textContent = state.city;
        elements.locationButton.disabled = false;

        updateDateTime();
        fetchWeather();
      },
      () => {
        elements.locationButton.disabled = false;
        elements.updatedLabel.textContent = "Se mantiene Lima";
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30 * 60 * 1000
      }
    );
  }

  elements.locationButton.addEventListener("click", useCurrentLocation);

  updateDateTime();
  fetchWeather();

  window.setInterval(updateDateTime, 30 * 1000);
  window.setInterval(fetchWeather, REFRESH_INTERVAL);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateDateTime();
      fetchWeather();
    }
  });
})();
