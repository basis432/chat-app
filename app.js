let currentUser = null;
let currentChatFriendId = null;

// Deteksi login/logout
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    document.getElementById('user-email').innerText = user.email;

    // Cek atau buat PIN
    generateOrLoadPIN(user.uid);

    // Load permintaan teman dan daftar teman
    loadFriendRequests();
    loadFriendsList();

  } else {
    currentUser = null;
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('chat-container').style.display = 'none';
  }
});

// Fungsi Login
function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .catch((error) => {
      alert("Gagal login: " + error.message);
    });
}

// Fungsi Register
function register() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((cred) => {
      // Setelah register, langsung buat PIN
      const uid = cred.user.uid;
      const newPin = generatePIN();
      firebase.database().ref('users/' + uid).set({
        pin: newPin,
        email: email,
        friends: {},  // untuk daftar teman nanti
        requests: {}  // untuk permintaan teman
      });
    })
    .catch((error) => {
      alert("Gagal daftar: " + error.message);
    });
}

// Fungsi Logout
function logout() {
  firebase.auth().signOut();
}

// Fungsi membuat atau mengambil PIN
function generateOrLoadPIN(uid) {
  const userRef = firebase.database().ref('users/' + uid);
  userRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (data && data.pin) {
      document.getElementById('user-pin').innerText = data.pin;
    } else {
      const newPin = generatePIN();
      userRef.update({ pin: newPin });
      document.getElementById('user-pin').innerText = newPin;
    }
  });
}

// Fungsi pembuat PIN BBM unik 6 digit
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------
// Permintaan Teman
// ------------------

function sendFriendRequest() {
  const pin = document.getElementById('friend-pin').value.trim();

  // Cek apakah PIN valid dan bukan milik sendiri
  if (pin === "" || currentUser == null) return alert("PIN tidak boleh kosong.");

  firebase.database().ref('users').once('value').then(snapshot => {
    let found = false;
    snapshot.forEach(child => {
      const data = child.val();
      if (data.pin === pin && child.key !== currentUser.uid) {
        found = true;

        // Tambahkan permintaan ke user target
        firebase.database().ref(`users/${child.key}/requests/${currentUser.uid}`).set({
          email: currentUser.email
        });

        alert("Permintaan terkirim ke " + data.email);
      }
    });

    if (!found) alert("PIN tidak ditemukan.");
  });
}

function loadFriendRequests() {
  const reqRef = firebase.database().ref(`users/${currentUser.uid}/requests`);
  reqRef.on('value', (snapshot) => {
    const container = document.getElementById('requests-container');
    container.innerHTML = "<h4>Permintaan Masuk:</h4>";

    if (!snapshot.exists()) {
      container.innerHTML += "<p>Tidak ada permintaan teman.</p>";
      return;
    }

    snapshot.forEach(child => {
      const fromId = child.key;
      const email = child.val().email;
      const el = document.createElement('div');
      el.innerHTML = `
        <p>${email} <button onclick="acceptRequest('${fromId}', '${email}')">Terima</button></p>
      `;
      container.appendChild(el);
    });
  });
}

function acceptRequest(fromId, email) {
  const uid = currentUser.uid;

  // Tambahkan ke daftar teman masing-masing
  firebase.database().ref(`users/${uid}/friends/${fromId}`).set({ email: email });
  firebase.database().ref(`users/${fromId}/friends/${uid}`).set({ email: currentUser.email });

  // Hapus permintaan
  firebase.database().ref(`users/${uid}/requests/${fromId}`).remove();
  alert("Sekarang kamu dan " + email + " sudah berteman!");
}

// ------------------
// Daftar Teman & Chat
// ------------------

function loadFriendsList() {
  const friendsRef = firebase.database().ref(`users/${currentUser.uid}/friends`);
  friendsRef.on('value', snapshot => {
    const friendsListEl = document.getElementById('friends-list');
    friendsListEl.innerHTML = '';

    if (!snapshot.exists()) {
      friendsListEl.innerHTML = '<p>Tidak ada teman.</p>';
      return;
    }

    snapshot.forEach(child => {
      const friendId = child.key;
      const friendEmail = child.val().email;

      const friendEl = document.createElement('div');
      friendEl.style.cursor = 'pointer';
      friendEl.style.padding = '8px';
      friendEl.style.borderBottom = '1px solid #444';
      friendEl.textContent = friendEmail;
      friendEl.onclick = () => openChat(friendId, friendEmail);

      friendsListEl.appendChild(friendEl);
    });
  });
}

function openChat(friendId, friendEmail) {
  currentChatFriendId = friendId;
  const chatRoomEl = document.getElementById('chat-room');
  chatRoomEl.innerHTML = `<b>Chat dengan ${friendEmail}</b><br><br>`;

  // Load pesan realtime
  const chatId = getChatId(currentUser.uid, friendId);
  const messagesRef = firebase.database().ref(`chats/${chatId}`);
  messagesRef.off(); // hapus listener lama
  messagesRef.on('child_added', snapshot => {
    const msg = snapshot.val();
    displayMessage(msg);
  });
}

function sendMessage() {
  const inputEl = document.getElementById('chat-input');
  const text = inputEl.value.trim();
  if (text === '' || !currentChatFriendId) return;

  const chatId = getChatId(currentUser.uid, currentChatFriendId);
  const messagesRef = firebase.database().ref(`chats/${chatId}`);

  const msgData = {
    sender: currentUser.uid,
    text: text,
    timestamp: Date.now()
  };

  messagesRef.push(msgData);
  inputEl.value = '';
}

function displayMessage(msg) {
  const chatRoomEl = document.getElementById('chat-room');
  const isSender = msg.sender === currentUser.uid;

  const msgEl = document.createElement('div');
  msgEl.style.padding = '6px 10px';
  msgEl.style.marginBottom = '6px';
  msgEl.style.maxWidth = '70%';
  msgEl.style.borderRadius = '10px';
  msgEl.style.clear = 'both';
  msgEl.style.backgroundColor = isSender ? '#00aaff' : '#444';
  msgEl.style.color = '#fff';
  msgEl.style.float = isSender ? 'right' : 'left';

  msgEl.textContent = msg.text;

  chatRoomEl.appendChild(msgEl);
  chatRoomEl.scrollTop = chatRoomEl.scrollHeight; // scroll ke bawah
}

function getChatId(uid1, uid2) {
  return uid1 < uid2 ? uid1 + '_' + uid2 : uid2 + '_' + uid1;
}
