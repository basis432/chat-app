let currentUser = null;

// Deteksi login/logout
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    document.getElementById('user-email').innerText = user.email;

    // Cek atau buat PIN
    generateOrLoadPIN(user.uid);
  } else {
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

}
