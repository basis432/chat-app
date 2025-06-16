const firebaseConfig = {
  apiKey: "ISI_DENGAN_API_KEY_KAMU",
  authDomain: "xxxxx.firebaseapp.com",
  projectId: "xxxxx",
  databaseURL: "https://xxxxx.firebaseio.com",
  storageBucket: "xxxxx.appspot.com",
  messagingSenderId: "xxxxx",
  appId: "xxxxx"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
