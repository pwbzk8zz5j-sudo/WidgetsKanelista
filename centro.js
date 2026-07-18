const widget = document.getElementById("widget");
const core = document.getElementById("core");
const title = document.getElementById("title");
const icon = document.getElementById("icon");
const hint = document.getElementById("hint");

const states = [
  { title: "Todo empieza con una idea.", icon: "✦", hint: "Toca el núcleo para cambiar de energía" },
  { title: "Haz espacio para lo que viene.", icon: "◌", hint: "Tu dashboard también puede respirar" },
  { title: "Menos ruido. Más intención.", icon: "◇", hint: "Una pausa visual entre tus mundos" },
  { title: "Convierte el caos en dirección.", icon: "↗", hint: "Siguiente parada: hacer que suceda" },
  { title: "Estás construyendo algo tuyo.", icon: "✧", hint: "Y eso merece verse increíble" }
];

let current = 0;

function changeState() {
  current = (current + 1) % states.length;
  const state = states[current];

  title.classList.remove("swap");
  core.classList.remove("changed");
  void title.offsetWidth;

  title.textContent = state.title;
  icon.textContent = state.icon;
  hint.textContent = state.hint;

  title.classList.add("swap");
  core.classList.add("changed");
  widget.classList.add("active");

  window.setTimeout(() => {
    core.classList.remove("changed");
    widget.classList.remove("active");
  }, 650);
}

core.addEventListener("click", changeState);

widget.addEventListener("pointermove", (event) => {
  const rect = widget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  widget.style.setProperty("--mx", `${x}%`);
  widget.style.setProperty("--my", `${y}%`);
});

widget.addEventListener("pointerleave", () => {
  widget.style.setProperty("--mx", "50%");
  widget.style.setProperty("--my", "50%");
});
