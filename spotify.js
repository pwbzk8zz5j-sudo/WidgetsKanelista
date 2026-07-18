const CLIENT_ID = "5386cabc1af846769d22adb4577396b2";
const REDIRECT_URI = "https://pwbzk8zz5j-sudo.github.io/WidgetsKanelista/callback.html";
const APP_ORIGIN = "https://pwbzk8zz5j-sudo.github.io";
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_URL = "https://api.spotify.com/v1/me/player";
const SCOPES = "user-read-currently-playing user-read-playback-state";

const $ = (id) => document.getElementById(id);

const ui = {
  player: $("player"),
  connectView: $("connectView"),
  musicView: $("musicView"),
  idleView: $("idleView"),
  errorView: $("errorView"),
  loading: $("loading"),
  connectButton: $("connectButton"),
  refreshButton: $("refreshButton"),
  idleRefreshButton: $("idleRefreshButton"),
  retryButton: $("retryButton"),
  disconnectButton: $("disconnectButton"),
  idleDisconnectButton: $("idleDisconnectButton"),
  errorDisconnectButton: $("errorDisconnectButton"),
  albumArt: $("albumArt"),
  backdrop: $("backdrop"),
  vinyl: $("vinyl"),
  equalizer: $("equalizer"),
  statusLabel: $("statusLabel"),
  deviceLabel: $("deviceLabel"),
  trackName: $("trackName"),
  artistName: $("artistName"),
  progressFill: $("progressFill"),
  elapsed: $("elapsed"),
  duration: $("duration"),
  spotifyLink: $("spotifyLink"),
  idleText: $("idleText"),
  errorTitle: $("errorTitle"),
  errorMessage: $("errorMessage")
};

let playback = null;
let progressTimer = null;
let pollingTimer = null;
let authPopup = null;
let popupWatchTimer = null;

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => chars[byte % chars.length]).join("");
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(value) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

async function connectSpotify() {
  try {
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    const state = randomString(32);

    // Estos datos se guardan dentro del propio contexto del embed.
    localStorage.setItem("spotify_code_verifier", verifier);
    localStorage.setItem("spotify_auth_state", state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      scope: SCOPES,
      redirect_uri: REDIRECT_URI,
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
      show_dialog: "true"
    });

    const width = 520;
    const height = 720;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);

    // IMPORTANTE: no usamos "noopener", porque callback.html necesita
    // comunicarse de vuelta con este embed mediante window.opener.
    authPopup = window.open(
      `${AUTH_URL}?${params.toString()}`,
      "kanelista_spotify_auth",
      `popup=yes,width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authPopup) {
      throw new Error("El navegador bloqueó la ventana de Spotify. Permite las ventanas emergentes y vuelve a intentarlo.");
    }

    clearInterval(popupWatchTimer);
    popupWatchTimer = setInterval(() => {
      if (authPopup?.closed) {
        clearInterval(popupWatchTimer);
        authPopup = null;
      }
    }, 500);
  } catch (error) {
    renderError(error);
  }
}

async function exchangeAuthorizationCode(code, returnedState) {
  const verifier = localStorage.getItem("spotify_code_verifier");
  const expectedState = localStorage.getItem("spotify_auth_state");

  if (!verifier) {
    throw new Error("Se perdió el verificador de seguridad. Pulsa conectar e inténtalo otra vez.");
  }

  if (!expectedState || expectedState !== returnedState) {
    throw new Error("La validación de seguridad no coincide. Pulsa conectar nuevamente.");
  }

  setLoading(true);

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || "Spotify rechazó la autorización.");
    }

    localStorage.setItem("spotify_access_token", data.access_token);
    localStorage.setItem(
      "spotify_token_expires_at",
      String(Date.now() + data.expires_in * 1000)
    );

    if (data.refresh_token) {
      localStorage.setItem("spotify_refresh_token", data.refresh_token);
    }

    localStorage.removeItem("spotify_code_verifier");
    localStorage.removeItem("spotify_auth_state");

    await fetchPlayback({silent: true});
    startPolling();
  } finally {
    setLoading(false);
  }
}

window.addEventListener("message", async (event) => {
  // El mensaje solo puede venir de nuestro propio callback en GitHub Pages.
  if (event.origin !== APP_ORIGIN) return;

  const payload = event.data;
  if (!payload || payload.type !== "kanelista_spotify_callback") return;

  clearInterval(popupWatchTimer);

  if (payload.error) {
    renderError(new Error(
      payload.error === "access_denied"
        ? "Cancelaste el permiso de Spotify."
        : `Spotify devolvió este error: ${payload.error}`
    ));
    return;
  }

  if (!payload.code || !payload.state) {
    renderError(new Error("Spotify no devolvió todos los datos de autorización."));
    return;
  }

  try {
    await exchangeAuthorizationCode(payload.code, payload.state);
  } catch (error) {
    console.error(error);
    renderError(error);
  }
});

function hasSession() {
  return Boolean(
    localStorage.getItem("spotify_refresh_token") ||
    localStorage.getItem("spotify_access_token")
  );
}

function clearSession() {
  [
    "spotify_access_token",
    "spotify_refresh_token",
    "spotify_token_expires_at",
    "spotify_code_verifier",
    "spotify_auth_state"
  ].forEach(key => localStorage.removeItem(key));
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("spotify_refresh_token");

  if (!refreshToken) {
    throw new Error("Tu sesión venció. Conecta Spotify otra vez.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  const data = await response.json();

  if (!response.ok) {
    clearSession();
    throw new Error(data.error_description || "No pudimos renovar la sesión.");
  }

  localStorage.setItem("spotify_access_token", data.access_token);
  localStorage.setItem(
    "spotify_token_expires_at",
    String(Date.now() + data.expires_in * 1000)
  );

  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  return data.access_token;
}

async function getValidToken() {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = Number(localStorage.getItem("spotify_token_expires_at") || 0);

  if (token && Date.now() < expiresAt - 60_000) return token;
  return refreshAccessToken();
}

function show(name) {
  ["connectView", "musicView", "idleView", "errorView"].forEach(key => {
    ui[key].classList.toggle("hidden", key !== name);
  });
}

function setLoading(value) {
  ui.loading.classList.toggle("hidden", !value);
}

function formatTime(milliseconds = 0) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateProgress() {
  if (!playback?.item) return;

  const elapsedSinceFetch = playback.is_playing
    ? Date.now() - playback.fetchedAt
    : 0;

  const position = Math.min(
    playback.item.duration_ms,
    playback.progress_ms + elapsedSinceFetch
  );

  const percentage = playback.item.duration_ms
    ? (position / playback.item.duration_ms) * 100
    : 0;

  ui.progressFill.style.width = `${percentage}%`;
  ui.elapsed.textContent = formatTime(position);
  ui.duration.textContent = formatTime(playback.item.duration_ms);
}

function startProgressTimer() {
  clearInterval(progressTimer);
  updateProgress();
  progressTimer = setInterval(updateProgress, 1000);
}

function startPolling() {
  clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    if (!document.hidden && hasSession()) {
      fetchPlayback({silent: true});
    }
  }, 10_000);
}

function renderPlayback(data) {
  playback = {...data, fetchedAt: Date.now()};

  const item = data.item;
  const isEpisode = item.type === "episode";
  const images = isEpisode ? item.images : item.album?.images;
  const image = images?.[0]?.url || "";
  const artists = isEpisode
    ? (item.show?.name || "Podcast")
    : (item.artists || []).map(artist => artist.name).join(", ");

  ui.trackName.textContent = item.name || "Sin título";
  ui.artistName.textContent = artists || "Spotify";
  ui.statusLabel.textContent = data.is_playing ? "NOW PLAYING" : "PAUSED";
  ui.deviceLabel.textContent = data.device?.name
    ? `${data.device.name} · ${data.device.type || "Spotify"}`
    : "Spotify";

  ui.spotifyLink.href =
    item.external_urls?.spotify || "https://open.spotify.com/";

  ui.albumArt.src = image;
  ui.albumArt.alt = item.name ? `Portada de ${item.name}` : "Portada";
  ui.backdrop.style.backgroundImage = image ? `url("${image}")` : "none";

  ui.vinyl.classList.toggle("playing", data.is_playing);
  ui.equalizer.classList.toggle("playing", data.is_playing);
  ui.equalizer.setAttribute(
    "aria-label",
    data.is_playing ? "Reproduciendo" : "En pausa"
  );

  show("musicView");
  startProgressTimer();
}

function renderIdle(message = "Pon una canción y aparecerá aquí.") {
  playback = null;
  clearInterval(progressTimer);
  ui.idleText.textContent = message;
  ui.backdrop.style.backgroundImage = "none";
  show("idleView");
}

function renderError(error) {
  playback = null;
  clearInterval(progressTimer);
  ui.errorTitle.textContent = "No pudimos consultar Spotify.";
  ui.errorMessage.textContent = error.message || "Vuelve a intentarlo.";
  show("errorView");
}

async function fetchPlayback({silent = false} = {}) {
  if (!hasSession()) {
    show("connectView");
    return;
  }

  if (!silent) setLoading(true);

  try {
    const token = await getValidToken();

    let response = await fetch(
      `${API_URL}?additional_types=track,episode`,
      {headers: {Authorization: `Bearer ${token}`}}
    );

    if (response.status === 401) {
      const renewed = await refreshAccessToken();
      response = await fetch(
        `${API_URL}?additional_types=track,episode`,
        {headers: {Authorization: `Bearer ${renewed}`}}
      );
    }

    if (response.status === 204) {
      renderIdle("No hay una sesión activa de Spotify en este momento.");
      return;
    }

    if (response.status === 403) {
      throw new Error(
        "Spotify no permitió leer la reproducción. Reconecta y acepta ambos permisos."
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Spotify pidió esperar un poco antes de volver a consultar."
      );
    }

    if (!response.ok) {
      throw new Error(`Spotify respondió con el error ${response.status}.`);
    }

    const data = await response.json();

    if (!data?.item) {
      renderIdle("No encontramos una canción activa.");
      return;
    }

    renderPlayback(data);
  } catch (error) {
    console.error(error);
    renderError(error);
  } finally {
    setLoading(false);
  }
}

function disconnect() {
  clearSession();
  clearInterval(progressTimer);
  clearInterval(pollingTimer);
  clearInterval(popupWatchTimer);

  playback = null;
  ui.backdrop.style.backgroundImage = "none";
  show("connectView");
}

ui.connectButton.addEventListener("click", connectSpotify);
ui.refreshButton.addEventListener("click", () => fetchPlayback());
ui.idleRefreshButton.addEventListener("click", () => fetchPlayback());
ui.retryButton.addEventListener("click", () => {
  if (hasSession()) fetchPlayback();
  else connectSpotify();
});

[
  ui.disconnectButton,
  ui.idleDisconnectButton,
  ui.errorDisconnectButton
].forEach(button => button.addEventListener("click", disconnect));

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasSession()) {
    fetchPlayback({silent: true});
  }
});

(async function init() {
  if (!hasSession()) {
    show("connectView");
    return;
  }

  await fetchPlayback();
  startPolling();
})();
