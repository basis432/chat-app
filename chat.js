const pin = localStorage.getItem('pin');
if (!pin) window.location.href = 'index.html';
document.getElementById('userPin').innerText = 'PIN Anda: ' + pin;

const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const friendPinInput = document.getElementById('friendPin');
const onlineListDiv = document.getElementById('onlineList');

// Tampilkan user online
db.ref('users').on('value', snap => {
  const users = snap.val();
  onlineListDiv.innerHTML = '<h4>Online:</h4>';
  for (let key in users) {
    if (users[key].online) {
      onlineListDiv.innerHTML += '<div>' + key + '</div>';
    }
  }
});

// Tambah teman
function addFriend() {
  const friendPin = friendPinInput.value.trim();
  if (!friendPin || friendPin === pin) return;
  db.ref('users/' + pin + '/friends/' + friendPin).set(true);
  db.ref('users/' + friendPin + '/friends/' + pin).set(true);
  alert('Teman ditambahkan');
}

// Kirim pesan
function sendMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;
  db.ref('chats/' + pin).push({ from: pin, msg: msg });
  messageInput.value = '';
}

// Tampilkan pesan
db.ref('chats/' + pin).on('child_added', snap => {
  const data = snap.val();
  const div = document.createElement('div');
  div.textContent = data.from + ': ' + data.msg;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Logout
function logout() {
  db.ref('users/' + pin + '/online').set(false);
  localStorage.removeItem('pin');
  window.location.href = 'index.html';
}
