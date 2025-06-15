let username = "", room = "umum";

function startChat() {
  username = document.getElementById("username").value.trim();
  room = document.getElementById("room").value.trim() || "umum";

  if (!username) return alert("Masukkan nama!");
  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";
  document.getElementById("roomName").innerText = "Grup: " + room;

  db.ref(`rooms/${room}/messages`).on("child_added", (snap) => {
    const data = snap.val();
    const div = document.createElement("div");
    div.innerHTML = `<b>${data.user}</b>: ${data.message}`;
    document.getElementById("messages").appendChild(div);
    document.getElementById("messages").scrollTop = 99999;
  });

  db.ref(`status/${username}`).set("online");
}

function sendMessage() {
  const text = document.getElementById("messageInput").value.trim();
  if (text) {
    db.ref(`rooms/${room}/messages`).push({
      user: username,
      message: text,
      time: Date.now()
    });
    document.getElementById("messageInput").value = "";
  }
}

function handleKey(e) {
  if (e.key === "Enter") sendMessage();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}
