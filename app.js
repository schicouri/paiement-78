const form = document.getElementById("paiement-form");
const errorBox = document.getElementById("form-error");
const recu = document.getElementById("recu");
const blocMail = document.getElementById("bloc-mail");
const emailInput = document.getElementById("email");
const rib = document.getElementById("rib");
const config = window.PAIEMENT;

document.getElementById("iban").textContent = config.iban;

const zonePhysique = document.getElementById("zone-physique");
const zoneMorale = document.getElementById("zone-morale");
const denomination = document.getElementById("denomination");

function estMorale() {
  return form.elements.qualite.value === "morale";
}

function majQualite() {
  const morale = estMorale();
  zonePhysique.hidden = morale;
  zoneMorale.hidden = !morale;
  form.prenom.required = !morale;
  form.nom.required = !morale;
  denomination.required = morale;
}

Array.from(form.elements.qualite).forEach((el) => el.addEventListener("change", majQualite));
majQualite();

recu.addEventListener("change", () => {
  blocMail.hidden = !recu.checked;
  emailInput.required = recu.checked;
});

function showError(message) {
  errorBox.hidden = !message;
  errorBox.textContent = message || "";
}

function identite() {
  if (!form.reportValidity()) {
    showError(estMorale() ? "Indiquez la dénomination sociale et acceptez la convention." : "Indiquez votre nom et acceptez la convention.");
    return null;
  }
  showError("");
  const morale = estMorale();
  return {
    qualite: morale ? "Personne morale" : "Personne physique",
    prenom: morale ? "" : form.prenom.value.trim(),
    nom: morale ? "" : form.nom.value.trim(),
    denomination: morale ? denomination.value.trim() : "",
    libelle: morale ? denomination.value.trim() : (form.prenom.value.trim() + " " + form.nom.value.trim()).trim(),
    email: recu.checked ? emailInput.value.trim() : "",
  };
}

async function notifier(personne, mode) {
  const payload = new FormData();
  payload.append("_subject", "Acceptation convention d’honoraires — 78 Champs-Élysées");
  payload.append("_template", "table");
  payload.append("_captcha", "false");
  payload.append("qualite", personne.qualite);
  payload.append("prenom", personne.prenom);
  payload.append("nom", personne.nom);
  payload.append("denomination", personne.denomination);
  payload.append("email", personne.email || "pas de reçu demandé");
  payload.append("montant", "447,50 EUR TTC");
  payload.append("mode", mode);
  payload.append("approbation", "Conditions générales et particulières acceptées.");
  if (personne.email) {
    payload.append("_replyto", personne.email);
    payload.append("_cc", personne.email);
  }
  const response = await fetch(`https://formsubmit.co/ajax/${config.copieEmail}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: payload,
  });
  if (!response.ok) throw new Error("mail");
}

document.getElementById("btn-virement").addEventListener("click", async () => {
  const personne = identite();
  if (!personne) return;
  const reference = config.dossier + " — " + personne.libelle;
  document.getElementById("reference").textContent = reference;
  const button = document.getElementById("btn-virement");
  button.disabled = true;
  try {
    await notifier(personne, "Virement");
    document.getElementById("envoi-ok").hidden = false;
  } catch {
    showError("L’envoi de la confirmation a échoué. Le RIB est tout de même affiché : vous pouvez virer, puis réessayer l’envoi.");
  }
  rib.hidden = false;
  rib.scrollIntoView({ behavior: "smooth" });
  button.disabled = false;
});

