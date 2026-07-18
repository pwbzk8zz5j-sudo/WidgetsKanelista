const timeZone = "America/Lima";

function getCurrentParts() {
  const now = new Date();

  const hour = Number(
    new Intl.DateTimeFormat("es-PE", {
      timeZone,
      hour: "2-digit",
      hour12: false
    }).format(now)
  );

  const minute = new Intl.DateTimeFormat("es-PE", {
    timeZone,
    minute: "2-digit"
  }).format(now);

  const fullDate = new Intl.DateTimeFormat("es-PE", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(now);

  return { hour, minute, fullDate };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function greetingVariant(hour) {
  const base = greetingFor(hour);
  const variants = [
    base,
    base,
    "Hola",
    "Qué gusto verte",
    "Bienvenida de nuevo"
  ];

  const index = new Date().getDate() % variants.length;
  return variants[index];
}

function messageIndexForToday() {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  let hash = 0;
  for (const character of dateKey) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % messages.length;
}

function updateWidget() {
  const { hour, minute, fullDate } = getCurrentParts();

  document.getElementById("greeting").textContent = greetingVariant(hour);
  document.getElementById("clock").textContent =
    String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
  document.getElementById("date").textContent = capitalize(fullDate);
  document.getElementById("message").textContent =
    messages[messageIndexForToday()];
}

updateWidget();
setInterval(updateWidget, 1000);
