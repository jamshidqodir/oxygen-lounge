/* EDIT THESE. whatsapp = country code + number, digits only. Leave telegram, address or hours empty to hide them. */
const CONFIG = {
  web3formsKey: "8d2ced08-2d99-4faf-b8d0-853262255d47", // Web3Forms form "Oxygen Lounge Reservations" -> oxygenloungezone@gmail.com
  name: "Oxygen Lounge",
  whatsapp: "15137130707",
  phoneDisplay: "(513) 713-0707",
  address: "",               // street address text, e.g. "123 Main St, Cincinnati, OH 45202"
  mapUrl: "https://maps.app.goo.gl/BXqugYGyWNm2Sd146?g_st=ic",
  hours: [["Daily", "7:00 PM – 1:00 AM"]],   // edit days if they differ
  open: "19:00",             // first seating
  lastSeating: "25:00",      // 25:00 = 1:00 AM the next day
  slotMinutes: 30,
  maxGuests: 10,
  leadMinutes: 30            // earliest booking today = now + this
};

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const fmtDate = (s) => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
const fmtTime = (t) => { if (!t) return ""; const mins = toMin(t) % 1440; const h = Math.floor(mins / 60), m = mins % 60; return (h % 12 || 12) + ":" + pad(m) + " " + (h >= 12 ? "PM" : "AM"); };
const late = (t) => toMin(t) >= 1440;
const timeLabel = (t) => fmtTime(t) + (late(t) ? " (after midnight)" : "");

let guests = 2;

function applyConfig() {
  $("phoneTop").textContent = CONFIG.phoneDisplay;
  $("phoneDisp").textContent = CONFIG.phoneDisplay;
  $("lastSeat").textContent = "Last seating " + fmtTime(CONFIG.lastSeating);
  $("guestHint").textContent = "Parties of " + (CONFIG.maxGuests + 1) + " or more: please call us.";
  if (CONFIG.address || CONFIG.mapUrl) { $("addrBox").hidden = false; $("infoRow").hidden = false; }
  if (CONFIG.address) { $("addr").textContent = CONFIG.address; $("addr").hidden = false; $("copyAddr").hidden = false; }
  if (CONFIG.mapUrl) { $("mapLink").href = CONFIG.mapUrl; $("mapLink").hidden = false; }
  if (CONFIG.hours.length) { $("hoursList").innerHTML = CONFIG.hours.map((r) => "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>").join(""); $("hoursBox").hidden = false; $("infoRow").hidden = false; }
}

function fillTimes() {
  const sel = $("time"), prev = sel.value, date = $("date").value;
  const now = new Date();
  const cutoff = date === todayStr() ? now.getHours() * 60 + now.getMinutes() + CONFIG.leadMinutes : -1;
  let html = '<option value="">Select time</option>', count = 0;
  for (let t = toMin(CONFIG.open); t <= toMin(CONFIG.lastSeating); t += CONFIG.slotMinutes) {
    if (t <= cutoff) continue;
    const v = pad(Math.floor(t / 60)) + ":" + pad(t % 60);
    html += '<option value="' + v + '">' + timeLabel(v) + "</option>"; count++;
  }
  if (!count) html = '<option value="">No times left today</option>';
  sel.innerHTML = html;
  if (prev && sel.querySelector('option[value="' + prev + '"]')) sel.value = prev;
}

function summaryText() {
  const d = fmtDate($("date").value), t = timeLabel($("time").value);
  return "Table for " + guests + " · " + (d || "pick a date") + " · " + (t || "pick a time");
}
function updateSummary() { $("summary").textContent = summaryText(); }
function setGuests(n) {
  guests = Math.min(CONFIG.maxGuests, Math.max(1, n));
  $("guestsOut").textContent = guests;
  $("minus").disabled = guests <= 1; $("plus").disabled = guests >= CONFIG.maxGuests;
  updateSummary();
}

function buildMessage() {
  const notes = $("notes").value.trim();
  const lines = [
    "Hello " + CONFIG.name + ", I'd like to reserve a table.",
    "Name: " + $("name").value.trim(),
    "Phone: " + $("phone").value.trim(),
    "Date: " + fmtDate($("date").value),
    "Time: " + (late($("time").value) ? fmtTime($("time").value) + " (after midnight, night of " + fmtDate($("date").value) + ")" : fmtTime($("time").value)),
    "Guests: " + guests
  ];
  if (notes) lines.push("Notes: " + notes);
  return lines.join("\n");
}

function showErr(msg) { const e = $("err"); e.textContent = msg; e.hidden = !msg; }

$("bookForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!$("name").value.trim()) { showErr("Enter your name."); $("name").focus(); return; }
  if ($("phone").value.replace(/\D/g, "").length < 7) { showErr("Enter a phone number we can reach."); $("phone").focus(); return; }
  if (!$("date").value || $("date").value < todayStr()) { showErr("Pick today or a later date."); $("date").focus(); return; }
  if (!$("time").value) { showErr("Pick a time."); $("time").focus(); return; }
  showErr("");
  const msg = buildMessage();
  const btn = $("sendBtn"), label = btn.textContent;
  btn.disabled = true; btn.textContent = "Sending…";
  try {
    const data = {
      access_key: CONFIG.web3formsKey,
      subject: "New table request: " + $("name").value.trim() + ", " + guests + " guests, " + fmtDate($("date").value) + " " + fmtTime($("time").value),
      from_name: CONFIG.name + " website",
      Name: $("name").value.trim(),
      Phone: $("phone").value.trim(),
      Date: fmtDate($("date").value),
      Time: timeLabel($("time").value),
      Guests: guests,
      Notes: $("notes").value.trim() || "-",
      botcheck: $("bookForm").botcheck.checked
    };
    const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
    const j = await r.json();
    if (!j.success) throw new Error(j.message || "failed");
  } catch (e) {
    btn.disabled = false; btn.textContent = label;
    showErr("Your request was not sent. Please try again or call " + CONFIG.phoneDisplay + ".");
    return;
  }
  btn.disabled = false; btn.textContent = label;
  $("summary2").textContent = summaryText();
  $("waLink").href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
  $("formPanel").hidden = true; $("donePanel").hidden = false;
  $("reserve").scrollIntoView({ block: "start" });
});

$("editBtn").addEventListener("click", () => { $("bookForm").reset(); $("date").value = todayStr(); fillTimes(); setGuests(2); $("donePanel").hidden = true; $("formPanel").hidden = false; $("name").focus(); });

function selectNode(el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function wireCopy(btnId, srcId) {
  const b = $(btnId); if (!b) return;
  b.addEventListener("click", async () => {
    const label = b.textContent; let ok = true;
    try { await navigator.clipboard.writeText($(srcId).textContent.trim()); } catch (e) { ok = false; selectNode($(srcId)); }
    b.textContent = ok ? "Copied" : "Selected";
    setTimeout(() => (b.textContent = label), 1600);
  });
}
wireCopy("copyPhone", "phoneDisp");
wireCopy("copyAddr", "addr");

$("minus").addEventListener("click", () => setGuests(guests - 1));
$("plus").addEventListener("click", () => setGuests(guests + 1));
$("date").addEventListener("change", () => { fillTimes(); updateSummary(); });
$("time").addEventListener("change", updateSummary);

applyConfig();
$("date").min = todayStr();
$("date").value = todayStr();
fillTimes();
setGuests(2);
