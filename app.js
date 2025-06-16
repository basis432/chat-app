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
}
