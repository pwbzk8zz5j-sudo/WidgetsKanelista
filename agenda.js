(() => {
  "use strict";

  const DEFAULT_LOCATION = {
    latitude: -12.0464,
    longitude: -77.0428,
    city: "Lima",
    timezone: "America/Lima"
  };

  const WEATHER_LABELS = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Neblina",
    48: "Neblina",
    51: "Llovizna ligera",
    53: "Llovizna",
    55: "Llovizna intensa",
    61: "Lluvia ligera",
    63: "Lluvia",
    65: "Lluvia intensa",
    71: "Nieve ligera",
    73: "Nieve",
    75: "Nieve intensa",
    80: "Chubascos ligeros",
    81: "Chubascos",
    82: "Chubascos intensos",
    95: "Tormenta",
    96: "Tormenta con granizo",
    99: "Tormenta fuerte"
  };

  const MESSAGES = [
    "Organiza tu día sin ahogarte en él.",
    "Una cosa a la vez también cuenta como progreso.",
    "Tu agenda es una guía, no una sentencia.",
    "Deja aire entre pendiente y pendiente.",
    "Haz primero lo que te dará paz mental.",
    "No todo lo urgente merece tu energía."
  ];

  const params = new URLSearchParams(window.location.search);

  const state = {
    latitude: numberParam("lat", DEFAULT_LOCATION.latitude),
    longitude: numberParam("lon", DEFAULT_LOCATION.longitude),
    city: params.get("city")?.trim() || DEFAULT_LOCATION.city,
    timezone: params.get("tz")?.trim() || DEFAULT_LOCATION.timezone
  };

  const el = {
    card: document.getElementById("agendaCard"),
    dayNumber: document.getElementById("dayNumber"),
    weekday: document.getElementById("weekday"),
    month: document.getElementById("month"),
    year: document.getElementById("year"),
    weekLabel: document.getElementById("weekLabel"),
    message: document.getElementById("message"),
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

  function numberParam(name, fallback) {
    const value = Number(params.get(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function cap(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function fmt(options) {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: state.timezone,
      ...options
    });
  }

  function parts(now = new Date()) {
    const data = fmt({
      year: "numeric",
      month: "long",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);

    return Object.fromEntries(
      data.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
    );
  }

  function weekNumber(now = new Date()) {
    const local = fmt({
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    const [day, month, year] = local.split("/").map(Number);
    const target = new Date(Date.UTC(year, month - 1, day));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil((((target - start) / 86400000) + 1) / 7);
  }

  function timezoneLabel() {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: state.timezone,
        timeZoneName: "shortOffset"
      }).formatToParts(new Date());

      return (parts.find((item) => item.type === "timeZoneName")?.value || state.timezone)
        .replace("GMT", "UTC")
        .replace(":00", "");
    } catch {
      return state.timezone;
    }
  }

  function updateDateTime() {
    const p = parts();

    el.dayNumber.textContent = p.day;
    el.weekday.textContent = cap(p.weekday);
    el.month.textContent = cap(p.month);
    el.year.textContent = p.year;
    el.weekLabel.textContent = `Semana ${weekNumber()}`;
    el.clock.textContent = `${p.hour}:${p.minute}`;
    el.timezoneLabel.textContent = timezoneLabel();

    const hour = Number(p.hour) === 24 ? 0 : Number(p.hour);
    el.card.dataset.period = hour >= 6 && hour < 18 ? "day" : "night";

    const messageIndex = Math.floor(Date.now() / 12000) % MESSAGES.length;
    el.message.textContent = MESSAGES[messageIndex];
  }

  function weatherCategory(code) {
    if (code === 0 || code === 1) return "clear";
    if ([2, 3, 45, 48].includes(code)) return "cloudy";
    if (code >= 51 && code <= 82) return "rain";
    if (code >= 95) return "storm";
    return "cloudy";
  }

  function iconMarkup(code, isDay) {
    const category = weatherCategory(code);

    if (category === "clear") {
      return isDay
        ? `<svg viewBox="0 0 120 120">
             <circle class="sun" cx="60" cy="60" r="26"></circle>
             <g stroke="rgba(255,229,133,.75)" stroke-width="4" stroke-linecap="round">
               <path d="M60 13v12M60 95v12M13 60h12M95 60h12M27 27l8 8M85 85l8 8M93 27l-8 8M35 85l-8 8"></path>
             </g>
           </svg>`
        : `<svg viewBox="0 0 120 120">
             <path class="moon" d="M72 21c-19 4-30 23-25 42 6 20 26 31 45 25-8 13-25 21-42 16-24-6-38-31-31-55 7-23 31-37 53-28Z"></path>
           </svg>`;
    }

    if (category === "rain") {
      return `<svg viewBox="0 0 120 120">
        <path class="cloud" d="M25 74h62c11 0 20-7 20-17s-9-17-20-17c-3 0-6 .6-8 1.7C75 31 65 24 53 24 38 24 26 36 26 51v1C15 54 8 63 8 73c0 11 9 20 20 20h-3Z"></path>
        <path class="rain" d="M39 90l-4 12"></path>
        <path class="rain" d="M61 91l-4 12"></path>
        <path class="rain" d="M83 89l-4 12"></path>
      </svg>`;
    }

    if (category === "storm") {
      return `<svg viewBox="0 0 120 120">
        <path class="cloud" d="M25 74h62c11 0 20-7 20-17s-9-17-20-17c-3 0-6 .6-8 1.7C75 31 65 24 53 24 38 24 26 36 26 51v1C15 54 8 63 8 73c0 11 9 20 20 20h-3Z"></path>
        <path class="bolt" d="M60 70 48 92h13l-4 18 18-25H63l7-15Z"></path>
      </svg>`;
    }

    return `<svg viewBox="0 0 120 120">
      <path class="cloud" d="M25 74h62c11 0 20-7 20-17s-9-17-20-17c-3 0-6 .6-8 1.7C75 31 65 24 53 24 38 24 26 36 26 51v1C15 54 8 63 8 73c0 11 9 20 20 20h-3Z"></path>
    </svg>`;
  }

  function round(value) {
    return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "--";
  }

  async function fetchWeather() {
    el.weatherError.hidden = true;
    el.updatedLabel.textContent = "AHORA";

    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", state.latitude);
      url.searchParams.set("longitude", state.longitude);
      url.searchParams.set("timezone", state.timezone);
      url.searchParams.set("forecast_days", "1");
      url.searchParams.set("current", [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "weather_code",
        "wind_speed_10m"
      ].join(","));
      url.searchParams.set("daily", [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max"
      ].join(","));

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error("No se pudo obtener el clima.");

      const data = await response.json();
      const current = data.current;
      const daily = data.daily;
      const code = Number(current.weather_code);
      const isDay = Number(current.is_day) === 1;

      el.locationName.textContent = state.city;
      el.temperature.textContent = round(current.temperature_2m);
      el.condition.textContent = WEATHER_LABELS[code] || "Condiciones variables";
      el.feelsLike.textContent = `Sensación térmica ${round(current.apparent_temperature)}°`;
      el.highLow.textContent = `${round(daily.temperature_2m_max?.[0])}° / ${round(daily.temperature_2m_min?.[0])}°`;
      el.rainChance.textContent = `${round(daily.precipitation_probability_max?.[0])}%`;
      el.humidity.textContent = `${round(current.relative_humidity_2m)}%`;
      el.wind.textContent = `${round(current.wind_speed_10m)} km/h`;
      el.weatherIcon.innerHTML = iconMarkup(code, isDay);
    } catch (error) {
      console.error(error);
      el.weatherError.hidden = false;
      el.updatedLabel.textContent = "SIN DATOS";
      el.condition.textContent = "Clima no disponible";
      el.feelsLike.textContent = "La fecha sigue funcionando";
    }
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return;

    el.updatedLabel.textContent = "BUSCANDO";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.latitude = position.coords.latitude;
        state.longitude = position.coords.longitude;
        state.city = "Mi ubicación";
        state.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_LOCATION.timezone;
        updateDateTime();
        fetchWeather();
      },
      () => {
        el.updatedLabel.textContent = "AHORA";
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 1800000
      }
    );
  }

  el.locationButton.addEventListener("click", useCurrentLocation);

  updateDateTime();
  fetchWeather();

  setInterval(updateDateTime, 1000);
  setInterval(fetchWeather, 15 * 60 * 1000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateDateTime();
      fetchWeather();
    }
  });
})();
