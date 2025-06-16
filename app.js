let nama = "";
let pin = "";
let chatWithPIN = "";
let chatWithName = "";

// Generate PIN unik 6 digit
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function login() {
  const inputNama = document.getElementById("namaInput").value.trim();
  if (!inputNama) {
    alert("Isi namamu dulu!");
    return;
  }

  // Cek apakah sudah ada data user di localStorage
  if (!localStorage.getItem("pin") || !localStorage.getItem("nama")) {
    // Generate PIN baru
    pin = generatePIN();
    nama = inputNama;

    // Simpan di localStorage
    localStorage.setItem("pin", pin);
    localStorage.setItem("nama", nama);

    // Simpan data user ke Firebase (jika belum ada)
    db.ref("users/" + pin).set({
      nama: nama,
      online: true,
      friends: {},
      requests: {},
    });
  } else {
    pin = localStorage.getItem("pin");
    nama = localStorage.getItem("nama");

    // Update status online setiap login
    db.ref("users/" + pin + "/online").set(true);
  }

  // Update UI
  document.getElementById("userName").textContent = nama;
  document.getElementById("userPIN").textContent = pin;

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("chatSection").style.display = "block";

  listenPermintaan();
  loadTeman();
}

// Kirim permintaan pertemanan
function kirimPermintaan() {
  const targetPIN = document.getElementById("pinInput").value.trim();
  if (!targetPIN) {
    alert("Isi PIN teman dulu!");
    return;
  }
  if (targetPIN === pin) {
    alert("Tidak bisa mengirim permintaan ke diri sendiri!");
    return;
  }

  // Cek apakah PIN teman ada di database
  db.ref("users/" + targetPIN)
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        // Kirim permintaan ke teman
        db.ref("users/" + targetPIN + "/requests/" + pin).set(nama);
        alert("Permintaan terkirim!");
        document.getElementById("pinInput").value = "";
      } else {
        alert("PIN teman tidak ditemukan!");
      }
    });
}

// Dengarkan permintaan pertemanan masuk
function listenPermintaan() {
  db.ref("users/" + pin + "/requests").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const list = document.getElementById("permintaanList");
    list.innerHTML = "";

    for (const requesterPIN in data) {
      const requesterName = data[requesterPIN];
      const li = document.createElement("li");
      li.textContent = `${requesterName} (PIN: ${requesterPIN}) `;

      const btnTerima = document.createElement("button");
      btnTerima.textContent = "Terima";
      btnTerima.onclick = () => terimaTeman(requesterPIN, requesterName);

      li.appendChild(btnTerima);
      list.appendChild(li);
    }
  });
}

// Terima permintaan pertemanan
function terimaTeman(friendPIN, friendName) {
  // Tambahkan ke friends kedua pengguna
  db.ref("users/" + pin + "/friends/" + friendPIN).set(friendName);
  db.ref("users/" + friendPIN + "/friends/" + pin).set(nama);

  // Hapus permintaan yang sudah diterima
  db.ref("users/" + pin + "/requests/" + friendPIN).remove();
}

// Muat daftar teman
function loadTeman() {
  db.ref("users/" + pin + "/friends").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const list = document.getElementById("temanList");
    list.innerHTML = "";

    for (const friendPIN in data) {
      const friendName = data[friendPIN];
      const li = document.createElement("li");
      const btnChat = document.createElement("button");
      btnChat.textContent = `Chat dengan ${friendName} (PIN: ${friendPIN})`;
      btnChat.onclick = () => bukaChat(friendPIN, friendName);

      li.appendChild(btnChat);
      list.appendChild(li);
    }
  });
}

// Buka jendela chat dengan teman
function bukaChat(friendPIN, friendName) {
  chatWithPIN = friendPIN;
  chatWithName = friendName;

  document.getElementById("chatWithName").textContent = friendName;
  document.getElementById("chatWithPIN").textContent = friendPIN;
  document.getElementById("chatBox").style.display = "block";

  // Tampilkan chat messages
  const chatID = [pin, friendPIN].sort().join("_");
  db.ref("chats/" + chatID).on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const box = document.getElementById("chatMessages");
    box.innerHTML = "";

    for (const key in data) {
      const msg = data[key];
      const msgDiv = document.createElement("div");
      msgDiv.textContent = `${msg.from === pin ? "Kamu" : chatWithName}: ${msg.text}`;
      box.appendChild(msgDiv);
    }
    box.scrollTop = box.scrollHeight;
  });
}

// Kirim pesan chat
function kirimPesan() {
  const pesanInput = document.getElementById("chatInput");
  const text = pesanInput.value.trim();
  if (!text) return;

  const chatID = [pin, chatWithPIN].sort().join("_");
  db.ref("chats/" + chatID).push({
    from: pin,
    text: text,
    time: Date.now(),
  });

  pesanInput.value = "";
}

// Tutup chat
function tutupChat() {
  document.getElementById("chatBox").style.display = "none";
  chatWithPIN = "";
  chatWithName = "";
}

// Saat halaman dimuat, cek data login tersimpan
window.onload = () => {
  const savedPin = localStorage.getItem("pin");
  const savedNama = localStorage.getItem("nama");

  if (savedPin && savedNama) {
    pin = savedPin;
    nama = savedNama;

    document.getElementById("loginSection").style.display = "none";
    document.getElementById("chatSection").style.display = "block";

    document.getElementById("userName").textContent = nama;
    document.getElementById("userPIN").textContent = pin;

    // Set status online
    db.ref("users/" + pin + "/online").set(true);

    listenPermintaan();
    loadTeman();
  }
};
