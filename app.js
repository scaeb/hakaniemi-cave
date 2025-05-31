// Your web app's Firebase configuration (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyAH6BthVj3tfNSJKArf5Hku0d6K_JkywVw",
  authDomain: "luola-reservation.firebaseapp.com",
  projectId: "luola-reservation",
  storageBucket: "luola-reservation.firebasestorage.app",
  messagingSenderId: "79746628180",
  appId: "1:79746628180:web:1c4347fd18aa17b9668bc1",
  measurementId: "G-M84G9ZSERV"
};

firebase.initializeApp(firebaseConfig);
  const database = firebase.database(); // For Realtime Database
  const firestore = firebase.firestore(); // For Firestore