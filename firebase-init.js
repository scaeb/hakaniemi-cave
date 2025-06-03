// firebase-init.js

// Your web app's Firebase configuration (from Firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyAH6BthVj3tfNSJKArf5Hku0d6K_JkywVw", 
    authDomain: "luola-reservation.firebaseapp.com",
    projectId: "luola-reservation",
    storageBucket: "luola-reservation.firebasestorage.app",
    databaseURL: "https://luola-reservation-default-rtdb.europe-west1.firebasedatabase.app",
    messagingSenderId: "79746628180",
    appId: "1:79746628180:web:1c4347fd18aa17b9668bc1",
    measurementId: "G-M84G9ZSERV" // Analytics
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make database and firestore references globally available for other scripts
const database = firebase.database(); // For Realtime Database
const firestore = firebase.firestore(); // For Firestore

console.log("Firebase Initialized");
