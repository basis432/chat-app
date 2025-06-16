// app.js

// Referensi Firebase sudah dari firebase-config.js
const loginSection = document.getElementById("loginSection");
const chatSection = document.getElementById("chatSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const namaInput = document.getElementById("namaInput");
const userName = document.getElementById("userName");
const userPIN = document.getElementById("userPIN");
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser = null; // object {nama, pin}

function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simpan user baru ke Firebase
function saveUserToDB(user) {
  return db.ref("users/" + user.pin).set({
    nama: user.nama,
    online: true,
  });
}

function setOnlineStatus(pin, status) {
  return db.ref("users/" + pin + "/online").set(status);
}

function loadMessages() {
  db.ref("messages").on("value", (snapshot) => {
    chatArea.innerHTML = "";
    const messages = snapshot.val();
    if (messages) {
      Object.values(messages).forEach((msg) => {
        const div = document.createElement("div");
        div.classList.add("message");
        div.classList.add(msg.pin === currentUser.pin ? "you" : "other");
        div.textContent = `${msg.nama}: ${msg.text}`;
        chatArea.appendChild(div);
      });
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const newMsgRef = db.ref("messages").push();
  newMsgRef.set({
    pin: currentUser.pin,
    nama: currentUser.nama,
    text,
    timestamp: Date.now(),
  });

  messageInput.value = "";
}

function login() {
  const nama = namaInput.value.trim();
  if (!nama) {
    alert("Tolong isi nama kamu.");
    return;
  }

  // Cek localStorage user
  if (localStorage.getItem("pin") && localStorage.getItem("nama")) {
    currentUser = {
      pin: localStorage.getItem("pin"),
      nama: localStorage.getItem("nama"),
    };
    afterLogin();
  } else {
    const pin = generatePIN();
    currentUser = { nama, pin };

    saveUserToDB(currentUser)
      .then(() => {
        // Simpan ke localStorage
        localStorage.setItem("pin", pin);
        localStorage.setItem("nama", nama);
        afterLogin();
      })
      .catch((err) => {
        alert("Gagal menyimpan user: " + err.message);
      });
  }
}

function afterLogin() {
  userName.textContent = currentUser.nama;
  userPIN.textContent = currentUser.pin;
  loginSection.style.display = "none";
  chatSection.style.display = "block";

  setOnlineStatus(currentUser.pin, true);
  loadMessages();
}

function logout() {
  if (currentUser) {
    setOnlineStatus(currentUser.pin, false);
  }
  localStorage.clear();
  location.reload();
}

// Event listeners
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
sendBtn.addEventListener("click", sendMessage);

// Enter key untuk login
namaInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});

// Enter key untuk kirim pesan
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Auto login jika data di localStorage ada
window.onload = () => {
  if (localStorage.getItem("pin") && localStorage.getItem("nama")) {
    currentUser = {
      pin: localStorage.getItem("pin"),
      nama: localStorage.getItem("nama"),
    };
    afterLogin();
  }
};
