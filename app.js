const form = document.getElementById("paiement-form");
const errorBox = document.getElementById("form-error");
const recu = document.getElementById("recu");
const blocMail = document.getElementById("bloc-mail");
const emailInput = document.getElementById("email");
const rib = document.getElementById("rib");
const config = window.PAIEMENT;

document.getElementById("iban").textContent = config.iban;

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
    showError("Indiquez votre nom et acceptez la convention.");
    return null;
  }
  showError("");
  return {
    prenom: form.prenom.value.trim(),
    nom: form.nom.value.trim(),
    email: recu.checked ? emailInput.value.trim() : "",
  };
}

async function notifier(personne, mode) {
  const payload = new FormData();
  payload.append("_subject", "Acceptation convention d’honoraires — 78 Champs-Élysées");
  payload.append("_template", "table");
  payload.append("_captcha", "false");
  payload.append("prenom", personne.prenom);
  payload.append("nom", personne.nom);
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
  const reference = config.dossier + " — " + personne.prenom + " " + personne.nom;
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

document.getElementById("btn-paypal").addEventListener("click", async () => {
  const personne = identite();
  if (!personne) return;
  const lien = String(config.paypalMe || "").trim();
  if (!lien) {
    showError("Le lien PayPal n’est pas encore en place. Utilisez le virement, ou envoyez-nous le lien paypal.me.");
    return;
  }
  const button = document.getElementById("btn-paypal");
  button.disabled = true;
  try {
    await notifier(personne, "PayPal");
  } catch {
    button.disabled = false;
    showError("L’envoi de la confirmation a échoué. Le paiement PayPal n’a pas été ouvert.");
    return;
  }
  const base = lien.replace(/\/$/, "");
  const avecMontant = /\/[\d.,]+/.test(base) ? base : base + "/447.50EUR";
  window.location.href = avecMontant;
});
