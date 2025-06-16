let nama = "", pin = "", chatPartner = "";

// Fungsi login
function login() {
  nama = document.getElementById("namaInput").value.trim();
  if (!nama) return alert("Nama tidak boleh kosong");

  pin = Math.floor(100000 + Math.random() * 900000).toString();
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
  document.getElementById("namaSaya").textContent = nama;
  document.getElementById("pinSaya").textContent = pin;

  listenPermintaan();
  loadTeman();
}

// Kirim permintaan teman
function kirimPermintaan() {
  const targetPIN = document.getElementById("pinTeman").value.trim();
  if (!targetPIN || targetPIN === pin) return;
  db.ref("users/" + targetPIN + "/requests/" + pin).set(nama);
}

// Pantau permintaan masuk
function listenPermintaan() {
  db.ref("users/" + pin + "/requests").on("value", snap => {
    const list = document.getElementById("permintaanList");
    list.innerHTML = "";
    const data = snap.val() || {};
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

// Terima permintaan teman
function terimaTeman(pinTeman, namaTeman) {
  db.ref("users/" + pin + "/friends/" + pinTeman).set(namaTeman);
  db.ref("users/" + pinTeman + "/friends/" + pin).set(nama);
  db.ref("users/" + pin + "/requests/" + pinTeman).remove();
}

// Muat daftar teman
function loadTeman() {
  db.ref("users/" + pin + "/friends").on("value", snap => {
    const list = document.getElementById("daftarTeman");
    list.innerHTML = "";
    const data = snap.val() || {};
    for (let p in data) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.textContent = `Chat ${data[p]} (${p})`;
      btn.onclick = () => bukaChat(p);
      li.appendChild(btn);
      list.appendChild(li);
    }
  });
}

// Buka jendela chat
function bukaChat(partnerPIN) {
  chatPartner = partnerPIN;
  document.getElementById("chatBox").style.display = "block";
  document.getElementById("chatWithPIN").textContent = partnerPIN;
  tampilkanChat();
}

// Tampilkan pesan chat
function tampilkanChat() {
  const chatID = [pin, chatPartner].sort().join("_");
  db.ref("chats/" + chatID).on("value", snap => {
    const messages = snap.val() || {};
    const chatBox = document.getElementById("chatMessages");
    chatBox.innerHTML = "";
    for (let id in messages) {
      const msg = messages[id];
      const div = document.createElement("div");
      div.textContent = `[${msg.from}] ${msg.text}`;
      chatBox.appendChild(div);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// Kirim pesan
function kirimPesan() {
  const isi = document.getElementById("chatInput").value.trim();
  if (!isi || !chatPartner) return;
  const chatID = [pin, chatPartner].sort().join("_");
  db.ref("chats/" + chatID).push({
    from: pin,
    text: isi,
    time: Date.now()
  });
  document.getElementById("chatInput").value = "";
}
