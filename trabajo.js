const dateText=document.getElementById('dateText');
const timeText=document.getElementById('timeText');
const weekdayText=document.getElementById('weekdayText');
const dayNumber=document.getElementById('dayNumber');
const monthText=document.getElementById('monthText');
const statusText=document.getElementById('statusText');
const messages=['READY FOR DEPARTURE','CABIN SECURED','CLEARED FOR TAKEOFF','ON SCHEDULE','CRUISING ALTITUDE','SMOOTH SKIES','CREW ON DUTY'];
function updateClock(){
  const now=new Date();
  const parts={
    ws:new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'America/Lima'}).format(now).toUpperCase(),
    wl:new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'America/Lima'}).format(now).toUpperCase(),
    ms:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'America/Lima'}).format(now).toUpperCase(),
    ml:new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'America/Lima'}).format(now).toUpperCase(),
    d:new Intl.DateTimeFormat('en-US',{day:'2-digit',timeZone:'America/Lima'}).format(now),
    t:new Intl.DateTimeFormat('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/Lima'}).format(now)
  };
  dateText.textContent=`${parts.ws} · ${parts.d} ${parts.ms}`;
  timeText.textContent=parts.t;
  weekdayText.textContent=parts.wl;
  dayNumber.textContent=parts.d;
  monthText.textContent=parts.ml;
}
function rotateStatus(){statusText.textContent=messages[Math.floor(Math.random()*messages.length)]}
updateClock();rotateStatus();setInterval(updateClock,1000);setInterval(rotateStatus,12000);
