let nama = "", pin = "", chatWith = "";

// Generate PIN unik
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function login() {
  nama = document.getElementById("namaInput").value.trim();
  if (!nama) return alert("Isi namamu dulu!");

  pin = generatePIN();
  localStorage.setItem("nama", nama);
  localStorage.setItem("pin", pin);

  db.ref("users/" + pin).set({
    nama: nama,
    online: true,
    friends: {},
    requests: {}
  });

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("chatSection").style.display = "block";
  document.getElementById("userName").textContent = nama;
  document.getElementById("userPIN").textContent = pin;

  listenPermintaan();
  loadTeman();
}

function kirimPermintaan() {
  const targetPIN = document.getElementById("pinInput").value.trim();
  if (!targetPIN || targetPIN === pin) return;
  db.ref("users/" + targetPIN + "/requests/" + pin).set(nama);
}

function listenPermintaan() {
  db.ref("users/" + pin + "/requests").on("value", snap => {
    const data = snap.val() || {};
    const list = document.getElementById("permintaanList");
    list.innerHTML = "";
    for (let dari in data) {
      const li = document.createElement("li");
      li.textContent = `${data[dari]} (${dari}) `;
      const btn = document.createElement("button");
      btn.textContent = "Terima";
      btn.onclick = () => terimaTeman(dari, data[dari]);
      li.appendChild(btn);
      list.appendChild(li);
    }
  });
}

function terimaTeman(pinTeman, namaTeman) {
  db.ref("users/" + pin + "/friends/" + pinTeman).set(namaTeman);
  db.ref("users/" + pinTeman + "/friends/" + pin).set(nama);
  db.ref("users/" + pin + "/requests/" + pinTeman).remove();
}

function loadTeman() {
  db.ref("users/" + pin + "/friends").on("value", snap => {
    const data = snap.val() || {};
    const list = document.getElementById("temanList");
    list.innerHTML = "";
    for (let temanPIN in data) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = `Chat ${data[temanPIN]} (${temanPIN})`;
      btn.onclick = () => bukaChat(temanPIN);
      li.appendChild(btn);
      list.appendChild(li);
    }
  });
}

function bukaChat(penerimaPIN) {
  chatWith = penerimaPIN;
  document.getElementById("chatWith").textContent = penerimaPIN;
  document.getElementById("chatBox").style.display = "block";

  const chatID = [pin, chatWith].sort().join("_");
  db.ref("chats/" + chatID).on("value", snap => {
    const chatData = snap.val() || {};
    const box = document.getElementById("chatMessages");
    box.innerHTML = "";
    for (let id in chatData) {
      const pesan = chatData[id];
      const div = document.createElement("div");
      div.textContent = `[${pesan.from}] ${pesan.text}`;
      box.appendChild(div);
    }
    box.scrollTop = box.scrollHeight;
  });
}

function kirimPesan() {
  const teks = document.getElementById("chatInput").value.trim();
  if (!teks) return;
  const chatID = [pin, chatWith].sort().join("_");
  db.ref("chats/" + chatID).push({
    from: pin,
    text: teks,
    time: Date.now()
  });
  document.getElementById("chatInput").value = "";
}
