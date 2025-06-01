// Your web app's Firebase configuration (from Firebase console)
const firebaseConfig = {
  apiKey: "AIzaSyAH6BthVj3tfNSJKArf5Hku0d6K_JkywVw",
  authDomain: "luola-reservation.firebaseapp.com",
  projectId: "luola-reservation",
  storageBucket: "luola-reservation.firebasestorage.app",
  databaseURL: "https://luola-reservation-default-rtdb.europe-west1.firebasedatabase.app",
  messagingSenderId: "79746628180",
  appId: "1:79746628180:web:1c4347fd18aa17b9668bc1",
  measurementId: "G-M84G9ZSERV"
};

firebase.initializeApp(firebaseConfig);
  const database = firebase.database(); // For Realtime Database
  const firestore = firebase.firestore(); // For Firestore

// In app.js, after Firebase init and getting DOM elements

// Authentication DOM Elements
const authSection = document.getElementById('auth-section');
const authForm = document.getElementById('auth-form');
const userInfoDiv = document.getElementById('userInfo');
const userEmailSpan = document.getElementById('userEmail');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const signUpBtn = document.getElementById('signUpBtn');
const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const authErrorP = document.getElementById('authError');
const whosHereList = document.getElementById('whos-here-list');
const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
const userNameSelect = document.getElementById('userName');
let currentUsersInSpace = {}; // To keep track locally

// --- Authentication Functions ---

// Sign Up
signUpBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  authErrorP.textContent = ''; // Clear previous errors

  firebase.auth().createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Signed up and signed in
          const user = userCredential.user;
          console.log('Signed up and signed in:', user.email);
          // You might want to store user profile info (like a chosen display name) here
          // e.g., database.ref('users/' + user.uid).set({ email: user.email, displayName: "New User" });
      })
      .catch((error) => {
          console.error('Sign up error:', error);
          authErrorP.textContent = error.message;
      });
});

// Sign In
signInBtn.addEventListener('click', () => {
  console.log("Sign In button clicked"); // <-- ADD THIS LINE
  const email = emailInput.value;
  const password = passwordInput.value;
  authErrorP.textContent = ''; // Clear previous errors

  firebase.auth().signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
          // Signed in
          const user = userCredential.user;
          console.log('Signed in successfully via signInWithEmailAndPassword:', user.email); // Check console for this
      })
      .catch((error) => {
          console.error('Sign in error in .catch:', error); // Check console for this
          authErrorP.textContent = `Sign In Error: ${error.message}`; // Display error on page
      });
});

// Sign Out
signOutBtn.addEventListener('click', () => {
  firebase.auth().signOut()
      .then(() => {
          console.log('Signed out');
      })
      .catch((error) => {
          console.error('Sign out error:', error);
          authErrorP.textContent = error.message;
      });
});

// --- Auth State Listener ---
firebase.auth().onAuthStateChanged((user) => {
  console.log("onAuthStateChanged triggered. User object:", user); // <-- ADD THIS LINE
  authErrorP.textContent = ''; // Clear errors on state change

  // Double-check these DOM elements are correctly fetched at the top of your app.js
  // const authForm = document.getElementById('auth-form');
  // const userInfoDiv = document.getElementById('userInfo');
  // const userEmailSpan = document.getElementById('userEmail');

  if (user) {
      // User is signed in
      console.log('onAuthStateChanged: User IS signed in. Updating UI to show user info.', user.email); // <-- ADD THIS
      if (authForm) authForm.style.display = 'none';
      if (userInfoDiv) userInfoDiv.style.display = 'block';
      if (userEmailSpan) userEmailSpan.textContent = user.email; // Or user.displayName if you set it

      if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = false;
      loadCurrentPresence(); // Make sure this function doesn't have errors

  } else {
      // User is signed out
      console.log('onAuthStateChanged: User IS NOT signed in or is signed out. Updating UI to show auth form.'); // <-- ADD THIS
      if (authForm) authForm.style.display = 'block';
      if (userInfoDiv) userInfoDiv.style.display = 'none';
      if (userEmailSpan) userEmailSpan.textContent = '';

      if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = true;
      if (whosHereList) whosHereList.innerHTML = '<li>Please sign in to see status.</li>';
      currentUsersInSpace = {};
      updateButtonText();
  }
});

// Keep these variables global or accessible
// let currentUsersInSpace = {}; // You already have this

// Wrap your existing presence listener in a function
function loadCurrentPresence() {
  const presenceRef = database.ref('current_presence');
  presenceRef.on('value', (snapshot) => {
      whosHereList.innerHTML = ''; // Clear current list
      currentUsersInSpace = snapshot.val() || {}; // Get users (keyed by UID) or empty object
      
      const currentUser = firebase.auth().currentUser; // Get current user for context

      if (Object.keys(currentUsersInSpace).length === 0) {
          const listItem = document.createElement('li');
          listItem.textContent = 'The space is currently empty.';
          whosHereList.appendChild(listItem);
      } else {
          console.log("Users currently in space (UIDs):", currentUsersInSpace);
          for (const uidInSpace in currentUsersInSpace) {
              if (currentUsersInSpace.hasOwnProperty(uidInSpace)) {
                  const listItem = document.createElement('li');
                  // Initially, display UID. For display names, you'll need to fetch them.
                  // For example, if you store display names in /users/<uid>/displayName
                  // You could do: database.ref('users/' + uidInSpace + '/displayName').once('value').then(nameSnap => { listItem.textContent = nameSnap.val() || uidInSpace; });
                  // For now, let's keep it simple:
                  if (currentUser && uidInSpace === currentUser.uid) {
                      listItem.textContent = `You (${currentUser.email})`; // Identify the current user
                  } else {
                      listItem.textContent = `User UID: ${uidInSpace}`; // Later, replace with fetched display name
                  }
                  whosHereList.appendChild(listItem);
              }
          }
      }
      updateButtonText(); // Update button based on current user's status
  }, (error) => {
      console.error("Error loading presence data: ", error);
      whosHereList.innerHTML = '<li>Error loading presence. Check console and DB rules.</li>';
  });
}


// --- Update Toggle Status Button Logic ---
toggleSpaceStatusBtn.addEventListener('click', () => {
  const currentUser = firebase.auth().currentUser;

  if (!currentUser) {
      alert('Please sign in to update your status!');
      return;
  }

  const userUid = currentUser.uid;
  const userPresenceRef = database.ref('current_presence/' + userUid);

  // Check against currentUsersInSpace which is keyed by UID
  if (currentUsersInSpace[userUid]) {
      // User is in, so remove them
      userPresenceRef.remove()
          .then(() => console.log(currentUser.email + ' left the space.'))
          .catch(error => console.error('Error leaving space:', error));
  } else {
      // User is not in, so add them (your rules validate boolean or null)
      userPresenceRef.set(true)
          .then(() => console.log(currentUser.email + ' entered the space.'))
          .catch(error => console.error('Error entering space:', error));
  }
});

// --- Update `updateButtonText` function ---
function updateButtonText() {
  const currentUser = firebase.auth().currentUser;
  if (currentUser && currentUsersInSpace[currentUser.uid]) {
      toggleSpaceStatusBtn.textContent = 'I\'ve left the space';
  } else {
      toggleSpaceStatusBtn.textContent = 'I\'m in the space';
  }
  // Disable button if no user is logged in (also handled by onAuthStateChanged)
  toggleSpaceStatusBtn.disabled = !currentUser;
}

// --- Remove or Re-purpose `userNameSelect` ---
// The `userNameSelect` dropdown is no longer used to determine the user for presence updates.
// You can remove its event listener or repurpose the dropdown if needed for other features.
// For now, let's comment out its direct involvement with presence updates:
// userNameSelect.removeEventListener('change', updateButtonText); // If you had this
// Or ensure it doesn't interfere with the new logic.