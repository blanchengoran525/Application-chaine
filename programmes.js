const $ = id => document.getElementById(id);

const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const decaler = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const minutes = h => { const [a, b] = h.split(":"); return +a * 60 + +b; };
const heure = m => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const debutMs = p => new Date(p.date + "T" + p.debut).getTime();
const finMs = p => debutMs(p) + p.duree * 60000;

function exemples(){
  const j = decaler(0);
  return [
    {id:1, titre:"Le journal du matin", cat:"Info", date:j, debut:"07:00", duree:60},
    {id:2, titre:"Magazine Santé", cat:"Magazine", date:j, debut:"10:00", duree:90},
    {id:3, titre:"Film de l'après-midi", cat:"Film", date:j, debut:"14:00", duree:120},
    {id:4, titre:"Le Grand Jeu", cat:"Divertissement", date:j, debut:"18:00", duree:90},
    {id:5, titre:"Le journal de 20h", cat:"Info", date:j, debut:"20:00", duree:45},
    {id:6, titre:"Soirée sport", cat:"Sport", date:j, debut:"21:00", duree:150}
  ];
}

let progs;
try { progs = JSON.parse(localStorage.getItem("grilleTV") || "null") || exemples(); }
catch (e) { progs = exemples(); }

let jour = decaler(0);
let editId = null;
let visibles = [];
const choisis = new Set();

function sauver(){
  localStorage.setItem("grilleTV", JSON.stringify(progs));
  afficher();
}

function quand(p){
  let j;
  if (p.date === decaler(0)) j = "à";
  else if (p.date === decaler(1)) j = "demain à";
  else j = "le " + p.date.split("-").reverse().join("/") + " à";
  return j + " " + p.debut;
}

function afficherDirect(){
  const maintenant = Date.now();
  let enCours = null, suivant = null;
  progs.forEach(p => {
    if (maintenant >= debutMs(p) && maintenant < finMs(p)) enCours = p;
    else if (debutMs(p) > maintenant && (!suivant || debutMs(p) < debutMs(suivant))) suivant = p;
  });

  const direct = $("direct");
  direct.innerHTML = "";
  const etiquette = document.createElement("small");
  const titreEl = document.createElement("h2");
  direct.append(etiquette, titreEl);

  if (enCours){
    etiquette.textContent = "● EN DIRECT";
    etiquette.className = "live";
    titreEl.textContent = enCours.titre;
    const barre = document.createElement("div");
    barre.className = "barre";
    const prog = document.createElement("div");
    prog.id = "prog";
    prog.style.width = Math.round((maintenant - debutMs(enCours)) / (enCours.duree * 60000) * 100) + "%";
    barre.appendChild(prog);
    const suite = document.createElement("small");
    suite.textContent = suivant ? "Ensuite : " + suivant.titre + " " + quand(suivant) : "Fin des programmes";
    direct.append(barre, suite);
  } else {
    etiquette.textContent = "HORS ANTENNE";
    titreEl.textContent = suivant
      ? "Prochaine émission : " + suivant.titre + " " + quand(suivant)
      : "Aucune émission programmée";
  }
}

const cellule = texte => { const td = document.createElement("td"); td.textContent = texte; return td; };

function afficherListe(){
  const q = $("recherche").value.trim().toLowerCase();
  const fc = $("filtreCat").value;

  visibles = progs
    .filter(p => p.date === jour && (!fc || p.cat === fc) && p.titre.toLowerCase().includes(q))
    .sort((a, b) => minutes(a.debut) - minutes(b.debut));

  const liste = $("liste");
  liste.innerHTML = "";
  const maintenant = Date.now();

  visibles.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.cat = p.cat;
    if (maintenant >= debutMs(p) && maintenant < finMs(p)) tr.classList.add("now");

    const tdCase = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = choisis.has(p.id);
    cb.onchange = () => {
      if (cb.checked) choisis.add(p.id); else choisis.delete(p.id);
      majSelection();
    };
    tdCase.appendChild(cb);

    const tdCat = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.dataset.cat = p.cat;
    badge.textContent = p.cat;
    tdCat.appendChild(badge);

    const tdAct = document.createElement("td");
    const bMod = document.createElement("button");
    bMod.textContent = "Modifier";
    bMod.onclick = () => modifier(p.id);
    tdAct.appendChild(bMod);

    tr.append(tdCase, cellule(p.debut + " - " + heure(minutes(p.debut) + p.duree)), cellule(p.titre), tdCat, tdAct);
    liste.appendChild(tr);
  });

  $("vide").hidden = visibles.length > 0;
  majSelection();
}

function afficher(){
  afficherDirect();
  afficherListe();
}

function majSelection(){
  const n = choisis.size;
  $("supprSel").disabled = n === 0;
  $("supprSel").textContent = n ? "Supprimer la sélection (" + n + ")" : "Supprimer la sélection";
  $("toutCocher").checked = visibles.length > 0 && visibles.every(p => choisis.has(p.id));
}

$("toutCocher").onchange = () => {
  visibles.forEach(p => { if ($("toutCocher").checked) choisis.add(p.id); else choisis.delete(p.id); });
  afficherListe();
};

$("supprSel").onclick = () => {
  if (!confirm("Supprimer " + choisis.size + " émission(s) ?")) return;
  progs = progs.filter(p => !choisis.has(p.id));
  choisis.clear();
  if (editId !== null && !progs.some(p => p.id === editId)) annulerEdition();
  sauver();
};

function calculerDuree(){
  if (!$("debut").value || !$("fin").value) return 0;
  let d = minutes($("fin").value) - minutes($("debut").value);
  if (d <= 0) d += 1440;
  return d;
}

function majDuree(){
  const d = calculerDuree();
  $("dureeAff").textContent = d ? "Durée : " + d + " min" : "";
}
$("debut").oninput = majDuree;
$("fin").oninput = majDuree;

function modifier(id){
  const p = progs.find(x => x.id === id);
  if (!p) return;
  editId = id;
  $("titre").value = p.titre;
  $("cat").value = p.cat;
  $("date").value = p.date;
  $("debut").value = p.debut;
  $("fin").value = heure(minutes(p.debut) + p.duree);
  $("btnForm").textContent = "Enregistrer";
  $("annuler").hidden = false;
  majDuree();
  $("f").scrollIntoView({ behavior: "smooth" });
  $("titre").focus();
}

function annulerEdition(){
  editId = null;
  $("f").reset();
  $("date").value = jour;
  $("btnForm").textContent = "Ajouter";
  $("annuler").hidden = true;
  majDuree();
}
$("annuler").onclick = annulerEdition;

$("f").onsubmit = e => {
  e.preventDefault();
  const donnees = {
    titre: $("titre").value.trim(),
    cat: $("cat").value,
    date: $("date").value,
    debut: $("debut").value,
    duree: calculerDuree()
  };
  if (editId !== null){
    const p = progs.find(x => x.id === editId);
    if (p) Object.assign(p, donnees);
  } else {
    progs.push({ id: Date.now(), ...donnees });
  }
  jour = donnees.date;
  annulerEdition();
  majJour();
  sauver();
};

function majJour(){
  $("jourChoisi").value = jour;
  const nom = jour === decaler(-1) ? "Hier" : jour === decaler(0) ? "Aujourd'hui" : jour === decaler(1) ? "Demain" : "";
  const date = new Date(jour + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  $("titreJour").textContent = (nom ? nom + ", " : "") + date;
  $("hier").classList.toggle("actif", jour === decaler(-1));
  $("auj").classList.toggle("actif", jour === decaler(0));
  $("demain").classList.toggle("actif", jour === decaler(1));
  if (editId === null) $("date").value = jour;
  afficher();
}

$("hier").onclick = () => { jour = decaler(-1); majJour(); };
$("auj").onclick = () => { jour = decaler(0); majJour(); };
$("demain").onclick = () => { jour = decaler(1); majJour(); };
$("jourChoisi").onchange = () => {
  if ($("jourChoisi").value){ jour = $("jourChoisi").value; majJour(); }
};

$("recherche").oninput = afficherListe;
$("filtreCat").onchange = afficherListe;

function majHorloge(){
  $("horloge").textContent = new Date().toLocaleTimeString("fr-FR");
}
majHorloge();
setInterval(majHorloge, 1000);

$("regie").onclick = () => {
  document.body.classList.add("regie");
  document.documentElement.requestFullscreen();
};
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("regie");
});

majJour();
majDuree();
setInterval(afficher, 10000);
