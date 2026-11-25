"use strict";

// Cambiá estos textos para personalizar el juego. Se muestran como texto plano.
const dedicatoria = {
  firma: "Daniel",
  recuerdos: {
    estrella: "Realmente quiero pasar el tiempo del mundo a tu lado.",
    luna: "Me hace muy feliz haberte conocido, Linda.",
    corazon: "Me gusta cuando hablamos de cualquier cosa, hasta los días más normales se vuelven especiales con vos."
  },
  carta: "Hola cami, solo queria decirte que; quiero seguir conociéndote, mucho más allá de algo superficial, quiero conocer cada detalle tuyo y disfrutar de todo a tu lado, y una cosa más, ¿Puedo ser tu novio?.",
  si: "Si dijiste que si, te voy a dar un beso.",
};

const $ = id => document.getElementById(id);
const names = {heart:"corazon", pad:"pad", sound:"sonido", play:"play"};
const labels = {estrella:"Estrella", luna:"Luna", corazon:"Corazón"};
const icons = Object.keys(labels);
function pic(file, alt="") {
  const image = document.createElement("img");
  image.src = "./assets/" + file + ".png";
  image.alt = alt;
  return image;
}
function initIcons(container) {
  for (const item of container.querySelectorAll("[data-icon]")) {
    item.replaceChildren(pic(names[item.dataset.icon]));
  }
}
initIcons(document);
$("signature").textContent = dedicatoria.firma;
const state = {phase:"home", deck:[], matched:new Set(), open:[], focus:0, choice:0, timer:null, sound:false};
let context;
function chime(notes) {
  if (!state.sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    context ||= new Audio();
    context.resume().catch(()=>{});
    notes.forEach((frequency, i) => {
      const at = context.currentTime + .1*i;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(.075,at+.016);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at+.26);
    });
  } catch { /* El juego también funciona en silencio. */ }
}
$("sound").onclick = () => {
  state.sound = !state.sound;
  $("sound").setAttribute("aria-pressed",String(state.sound));
  chime([523,659]);
};
function progress() {
  const count = state.matched.size;
  $("hearts").replaceChildren(...icons.map((_,i)=>pic(i<count?"corazon":"vacio")));
  $("progress").textContent = count + " de 3 pares";
}
function action(label, fn, secondary=false, file=null) {
  const btn = document.createElement("button");
  btn.className = secondary ? "secondary" : "primary";
  if (file) {
    const wrap=document.createElement("i");
    wrap.dataset.icon=file;
    wrap.append(pic(names[file] || file));
    btn.append(wrap);
  }
  btn.append(document.createTextNode(label));
  btn.onclick = fn;
  return btn;
}
function scene(phase,kicker,first,second,description,buttons=[]) {
  state.phase=phase;
  state.choice=0;
  $("title").replaceChildren(document.createTextNode(first+" "),document.createElement("br"));
  const em=document.createElement("em");
  em.textContent=second;
  $("title").append(em);
  $("kicker").textContent=kicker;
  $("intro").textContent=description;
  $("buttons").replaceChildren(...buttons);
  $("overlay").replaceChildren();
  $("hud").hidden=phase==="play" || phase==="note" || phase==="letter";
  $("announcement").textContent=first+" "+second+" "+description;
  progress();
}
function home(){
  clearTimeout(state.timer);
  state.timer=null;
  state.matched.clear();
  state.open=[];
  scene("home","JUEGO DE MEMORIA","Un jueguito","para vos."," Encontrá los tres pares y descubrí la sorpresa que te espera al final.",[action("Empezar a jugar",start,false,"play")]);
}
function start(){
  state.deck=[...icons,...icons];
  for(let i=state.deck.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [state.deck[i],state.deck[j]]=[state.deck[j],state.deck[i]];
  }
  state.matched.clear();
  state.open=[];
  state.focus=0;
  chime([440,554,659]);
  play();
}
function play(){
  scene("play","JUEGO DE MEMORIA","Encontrá","los pares.","Tocá dos cartas para darles vuelta.");
  board();
}
function board(mark=false){
  const grid=document.createElement("div");
  grid.className="board";
  grid.setAttribute("role","group");
  grid.setAttribute("aria-label","Seis cartas de memoria");
  state.deck.forEach((symbol,i)=>{
    const matched=state.matched.has(symbol);
    const visible=matched || state.open.includes(i);
    const tile=document.createElement("button");
    tile.className="tile"+(matched?" matched":visible?" open":"")+(mark && i===state.focus?" selected":"");
    tile.setAttribute("aria-label","Carta "+(i+1)+", "+(visible?labels[symbol]+(matched?", par encontrado":""):"boca abajo"));
    tile.disabled=matched;
    tile.append(pic(visible?symbol:"brillo"));
    tile.onclick=()=>flip(i);
    grid.append(tile);
  });
  $("overlay").replaceChildren(grid);
}
function flip(i) {
  const symbol=state.deck[i];
  if(state.phase!=="play" || state.timer!==null || state.open.includes(i) || state.matched.has(symbol))return;
  state.focus=i;
  state.open.push(i);
  chime([state.open.length===1?440:523]);
  board();
  $("announcement").textContent="Carta "+(i+1)+". "+labels[symbol]+".";
  if(state.open.length!==2)return;
  const match=state.deck[state.open[0]]===symbol;
  state.timer=setTimeout(()=>{
    state.timer=null;
    state.open=[];
    if(match){
      state.matched.add(symbol);
      chime([523,659,784]);
      const last=state.matched.size===3;
      scene("note","PAR ENCONTRADO",last?"El último":"Un recuerdo",last?"recuerdo.":"para vos.",dedicatoria.recuerdos[symbol],[action(last?"Abrir mi carta":"Seguir jugando",last?letter:play,false,last?"carta":"play")]);
      note(symbol,last?"Los tres pares, juntos.":"Encontraste un par");
      state.focus=state.deck.findIndex(x=>!state.matched.has(x));
    }else{
      board();
      $("announcement").textContent="Son diferentes. Probá con otro par.";
    }
  },match?680:1000);
}
function note(symbol,text) {
  const card=document.createElement("div");
  card.className="note";
  const line=document.createElement("p");
  line.textContent=text;
  card.append(pic(symbol),line);
  $("overlay").replaceChildren(card);
}
function letter(){
  scene("letter","MI CARTA PARA VOS","Puedo ser","tu novio?",dedicatoria.carta,[action("Sí, quiero",yes,false,"heart")]);
  note("carta","Con cariño, "+dedicatoria.firma);
  chime([440,554,659]);
}
function yes(){
  scene("yes","NUESTRO PRIMER NIVEL"," Tu y Yo","Yo y tu",dedicatoria.si,[action("Volver al inicio",home)]);
  chime([523,659,784,1047]);
  if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    for(let n=0;n<20;n++){
      const star=document.createElement("span");
      star.className="spark";
      star.setAttribute("aria-hidden","true");
      star.textContent=n%3?"✦":"♥";
      star.style.left=(Math.random()*96)+"%";
      star.style.animationDelay=(Math.random()*.7)+"s";
      $("overlay").append(star);
    }
  }
}
function talk(){
  scene("talk","A TU TIEMPO","Estoy","con vos.",dedicatoria.enPersona,[action("Volver al inicio",home)]);
}
function move(direction) {
  if(state.phase==="play" && state.timer===null){
    const step={left:-1,right:1,up:-3,down:3}[direction];
    let dest=(state.focus+step+6)%6;
    for(let i=0;i<6 && state.matched.has(state.deck[dest]);i++) dest=(dest+(step<0?-1:1)+6)%6;
    state.focus=dest;
    board(true);
    $("overlay").querySelectorAll("button")[dest]?.focus({preventScroll:true});
  }else{
    const buttons=Array.from($("buttons").children);
    if(!buttons.length)return;
    state.choice=(state.choice+(direction==="left"||direction==="up"?-1:1)+buttons.length)%buttons.length;
    buttons[state.choice].focus({preventScroll:true});
  }
}
for(const arrow of document.querySelectorAll("[data-move]")) arrow.onclick=()=>move(arrow.dataset.move);
$("a").onclick=()=>{if(state.phase==="play")flip(state.focus);else $("buttons").children[state.choice]?.click();};
$("b").onclick=()=>{
  if(state.phase==="play" && state.timer===null && state.open.length){state.open=[];board();$("announcement").textContent="Carta cerrada.";}
  else if(state.phase==="yes" || state.phase==="talk")letter();
  else if(state.phase==="letter"){
    scene("note","LOS TRES PARES","Una carta","para vos.","Cuando estés lista, abrí el sobre.",[action("Abrir mi carta",letter,false,"carta")]);
    note("carta","Para vos");
  }else if(state.phase==="play" && !state.matched.size && state.timer===null)home();
  else if(state.phase==="note" && state.matched.size<3)play();
};
document.addEventListener("keydown",ev=>{
  const dir={ArrowRight:"right",ArrowLeft:"left",ArrowUp:"up",ArrowDown:"down"}[ev.key];
  if(dir && state.phase==="play"){ev.preventDefault();move(dir);}
});
home();
