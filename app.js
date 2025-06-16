function generatePIN() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return chars.charAt(Math.floor(Math.random() * 26)) +
         chars.charAt(Math.floor(Math.random() * 26)) +
         Math.floor(1000 + Math.random() * 9000);
}

function registerUser() {
  const name = document.getElementById('nameInput').value.trim();
  if (!name) return alert('Isi nama dulu!');
  const pin = generatePIN();

  db.ref('users/' + pin).set({
    name: name,
    pin: pin,
    friends: {},
    requests: { from: {}, to: {} }
  }).then(() => {
    localStorage.setItem('pin', pin);
    localStorage.setItem('name', name);
    showDashboard();
  }).catch(err => {
    alert('Gagal menyimpan ke Firebase: ' + err.message);
  });
}

function showDashboard() {
  const name = localStorage.getItem('name');
  const pin = localStorage.getItem('pin');
  document.getElementById('login').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('displayName').innerText = name;
  document.getElementById('userPIN').innerText = pin;

  listenPermintaanMasuk();
  loadTeman();
}

function kirimPermintaan() {
  const targetPIN = document.getElementById('targetPIN').value.trim();
  const userPIN = localStorage.getItem('pin');
  if (targetPIN === userPIN) return alert("Tidak bisa kirim ke diri sendiri.");
  if (!targetPIN) return alert("PIN tujuan kosong.");

  db.ref('users/' + targetPIN).get().then(snap => {
    if (!snap.exists()) return alert("PIN tidak ditemukan.");
    // simpan permintaan
    db.ref('users/' + targetPIN + '/requests/from/' + userPIN).set(true);
    db.ref('users/' + userPIN + '/requests/to/' + targetPIN).set(true);
    alert('Permintaan terkirim ke ' + targetPIN);
  });
}

function listenPermintaanMasuk() {
  const userPIN = localStorage.getItem('pin');
  db.ref('users/' + userPIN + '/requests/from').on('value', snapshot => {
    const data = snapshot.val() || {};
    const list = document.getElementById('daftarPermintaanMasuk');
    list.innerHTML = '';
    for (let fromPIN in data) {
      const li = document.createElement('li');
      li.innerHTML = `${fromPIN} 
        <button onclick="terimaTeman('${fromPIN}')">Terima</button>`;
      list.appendChild(li);
    }
  });
}

function terimaTeman(otherPIN) {
  const userPIN = localStorage.getItem('pin');

  db.ref('users/' + userPIN + '/friends/' + otherPIN).set(true);
  db.ref('users/' + otherPIN + '/friends/' + userPIN).set(true);

  db.ref('users/' + userPIN + '/requests/from/' + otherPIN).remove();
  db.ref('users/' + otherPIN + '/requests/to/' + userPIN).remove();
}

function loadTeman() {
  const userPIN = localStorage.getItem('pin');
  db.ref('users/' + userPIN + '/friends').on('value', snapshot => {
    const data = snapshot.val() || {};
    const list = document.getElementById('daftarTeman');
    list.innerHTML = '';
    for (let pin in data) {
      const li = document.createElement('li');
      li.textContent = pin;
      list.appendChild(li);
    }
  });
}

if (localStorage.getItem('pin')) {
  showDashboard();
}

document.getElementById('masukBtn').addEventListener('click', registerUser);

// 👉 ENTER support
document.getElementById('nameInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    registerUser();
  }
});
