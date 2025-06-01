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
const displayNameInput = document.getElementById('displayNameInput');
const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
const userDisplayNameWelcomeSpan = document.getElementById('userDisplayNameWelcome');
const userEmailInfoSpan = document.getElementById('userEmailInfo'); // New span for email
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
  console.log("onAuthStateChanged triggered. User object:", user);
  authErrorP.textContent = '';

  if (user) {
      console.log('onAuthStateChanged: User IS signed in.', user.email);
      if (authForm) authForm.style.display = 'none';
      if (userInfoDiv) userInfoDiv.style.display = 'block';
      if (userEmailInfoSpan) userEmailInfoSpan.textContent = user.email; // Display email

      // Fetch and display user's display name
      database.ref('users/' + user.uid + '/displayName').once('value')
          .then((snapshot) => {
              const displayName = snapshot.val();
              if (userDisplayNameWelcomeSpan) {
                  userDisplayNameWelcomeSpan.textContent = displayName || user.email; // Fallback to email if no display name
              }
              if (displayNameInput) {
                  displayNameInput.value = displayName || ''; // Pre-fill input
              }
          })
          .catch(error => {
              console.error("Error fetching display name for welcome message:", error);
              if (userDisplayNameWelcomeSpan) userDisplayNameWelcomeSpan.textContent = user.email; // Fallback
          });

      if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = false;
      loadCurrentPresence();

  } else {
      console.log('onAuthStateChanged: User IS NOT signed in or is signed out.');
      if (authForm) authForm.style.display = 'block';
      if (userInfoDiv) userInfoDiv.style.display = 'none';
      if (userDisplayNameWelcomeSpan) userDisplayNameWelcomeSpan.textContent = '';
      if (userEmailInfoSpan) userEmailInfoSpan.textContent = '';


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
      currentUsersInSpace = snapshot.val() || {};
      const currentUser = firebase.auth().currentUser;

      if (Object.keys(currentUsersInSpace).length === 0) {
          const listItem = document.createElement('li');
          listItem.textContent = 'The space is currently empty.';
          whosHereList.appendChild(listItem);
      } else {
          console.log("Users currently in space (UIDs):", currentUsersInSpace);
          Object.keys(currentUsersInSpace).forEach(uidInSpace => {
              if (currentUsersInSpace.hasOwnProperty(uidInSpace)) {
                  const listItem = document.createElement('li');
                  // Give it a unique ID so we can update it asynchronously
                  listItem.id = 'presence-user-' + uidInSpace;
                  listItem.textContent = `Loading user (${uidInSpace.substring(0, 6)})...`; // Placeholder
                  whosHereList.appendChild(listItem);

                  // Fetch display name for this UID
                  database.ref('users/' + uidInSpace + '/displayName').once('value')
                      .then(nameSnapshot => {
                          const displayName = nameSnapshot.val();
                          const existingListItem = document.getElementById('presence-user-' + uidInSpace);

                          if (existingListItem) { // Check if element still exists
                              if (currentUser && uidInSpace === currentUser.uid) {
                                  // It's the current logged-in user
                                  existingListItem.textContent = `You (${displayName || currentUser.email})`;
                              } else {
                                  // It's another user
                                  existingListItem.textContent = displayName || `User (${uidInSpace.substring(0, 6)}...)`; // Fallback if no display name
                              }
                          }
                      })
                      .catch(error => {
                          console.error(`Error fetching display name for UID ${uidInSpace}:`, error);
                          const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                          if (existingListItem) {
                              // Fallback display on error
                              existingListItem.textContent = `User (${uidInSpace.substring(0, 6)}...)`;
                          }
                      });
              }
          });
      }
      updateButtonText();
  }, (error) => {
      console.error("Error loading presence data: ", error);
      if (whosHereList) whosHereList.innerHTML = '<li>Error loading presence. Check console and DB rules.</li>';
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

saveDisplayNameBtn.addEventListener('click', () => {
  const currentUser = firebase.auth().currentUser;
  const newDisplayName = displayNameInput.value.trim();

  if (!currentUser) {
      authErrorP.textContent = "You must be signed in to save a display name.";
      return;
  }
  if (!newDisplayName) {
      authErrorP.textContent = "Display name cannot be empty.";
      return;
  }
  if (newDisplayName.length > 50) { // Matches rule validation
      authErrorP.textContent = "Display name is too long (max 50 characters).";
      return;
  }


  database.ref('users/' + currentUser.uid + '/displayName').set(newDisplayName)
      .then(() => {
          console.log("Display name updated successfully!");
          authErrorP.textContent = "Display name saved!";
          if (userDisplayNameWelcomeSpan) userDisplayNameWelcomeSpan.textContent = newDisplayName; // Update welcome message immediately
          // Optionally, also update Firebase Auth profile display name (doesn't sync with DB automatically)
          // currentUser.updateProfile({ displayName: newDisplayName }).catch(err => console.error("Error updating auth profile display name", err));
      })
      .catch((error) => {
          console.error("Error saving display name:", error);
          authErrorP.textContent = "Error saving display name: " + error.message;
      });
});