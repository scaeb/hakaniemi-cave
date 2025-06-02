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

let currentUsersInSpace = {}; // To keep track locally
let isConfirmingPresence = false;

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
const displayNameInput = document.getElementById('displayNameInput');
const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
const userDisplayNameWelcomeSpan = document.getElementById('userDisplayNameWelcome');
const userEmailInfoSpan = document.getElementById('userEmailInfo'); // New span for email
const authSectionTitle = document.getElementById('authSectionTitle');
const userInfoMinimized = document.getElementById('userInfoMinimized');
const userInfoExpanded = document.getElementById('userInfoExpanded');
const manageAccountBtn = document.getElementById('manageAccountBtn');
const presenceActivityInput = document.getElementById('presenceActivityInput');
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

manageAccountBtn.addEventListener('click', () => {
  const isExpanded = userInfoExpanded.style.display === 'block';
  if (isExpanded) {
      userInfoExpanded.style.display = 'none';
      manageAccountBtn.textContent = 'Manage Account';
      if (authSectionTitle) authSectionTitle.classList.remove('minimized-title'); // Optional: Revert title style
  } else {
      userInfoExpanded.style.display = 'block';
      manageAccountBtn.textContent = 'Hide Settings';
      if (authSectionTitle) authSectionTitle.classList.add('minimized-title'); // Optional: Change title style
  }
});

// --- Auth State Listener ---
firebase.auth().onAuthStateChanged((user) => {
  console.log("onAuthStateChanged triggered. User object:", user);
  authErrorP.textContent = '';

  if (user) {
      // User is signed in
      console.log('onAuthStateChanged: User IS signed in.', user.email);
      if (authForm) authForm.style.display = 'none';
      if (userInfoDiv) userInfoDiv.style.display = 'block'; // Main userInfo container is visible

      if (userInfoMinimized) userInfoMinimized.style.display = 'flex'; // Show minimized view (use flex for alignment)
      if (userInfoExpanded) userInfoExpanded.style.display = 'none'; // Ensure expanded details are hidden initially
      if (manageAccountBtn) manageAccountBtn.textContent = 'Manage Account'; // Reset button text

      if (authSectionTitle) {
           authSectionTitle.textContent = "welcome to the cave zone"; // Or just "Account" or hide it.
           // authSectionTitle.style.display = 'none'; // To hide H2 completely when signed in
           authSectionTitle.classList.add('minimized-title'); // Or just style it smaller
      }

      if (userEmailInfoSpan) userEmailInfoSpan.textContent = user.email;

      database.ref('users/' + user.uid + '/displayName').once('value')
          .then((snapshot) => {
              const displayName = snapshot.val();
              if (userDisplayNameWelcomeSpan) {
                  userDisplayNameWelcomeSpan.textContent = displayName || user.email;
              }
              if (displayNameInput) {
                  displayNameInput.value = displayName || '';
              }
          })
          .catch(error => { /* ... your existing error handling ... */ });

      if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = false;
      loadCurrentPresence();

  } else {
      // User is signed out
      console.log('onAuthStateChanged: User IS NOT signed in or is signed out.');
      if (authForm) authForm.style.display = 'block';
      if (userInfoDiv) userInfoDiv.style.display = 'none'; // Hide whole userInfo block

      if (authSectionTitle) {
          authSectionTitle.textContent = "who are you?";
          // authSectionTitle.style.display = 'block'; // Ensure H2 is visible
          authSectionTitle.classList.remove('minimized-title');
      }

      // ... rest of your sign out UI updates ...
      if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = true;
      if (whosHereList) whosHereList.innerHTML = '<li>sign in to see whos dwelling in the cave</li>';
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
          listItem.textContent = 'the cave is currently empty.';
          whosHereList.appendChild(listItem);
      } else {
          console.log("Users currently in cave:", currentUsersInSpace);
          Object.keys(currentUsersInSpace).forEach(uidInSpace => {
              if (currentUsersInSpace.hasOwnProperty(uidInSpace)) {
                  const presenceData = currentUsersInSpace[uidInSpace]; // This is now an object
                  const listItem = document.createElement('li');
                  listItem.id = 'presence-user-' + uidInSpace;

                  let mainText = '';
                  // Fetch display name for this UID
                  database.ref('users/' + uidInSpace + '/displayName').once('value')
                      .then(nameSnapshot => {
                          const displayName = nameSnapshot.val();
                          const userIdentifier = displayName || (currentUser && uidInSpace === currentUser.uid ? currentUser.email : `user (${uidInSpace.substring(0, 6)}...)`);

                          if (currentUser && uidInSpace === currentUser.uid) {
                              mainText = `you (${userIdentifier})`;
                          } else {
                              mainText = userIdentifier;
                          }

                          let fullText = mainText;
                          if (presenceData && presenceData.activity) {
                              fullText += ` - ${presenceData.activity}`;
                          }

                          const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                          if(existingListItem) { // Check if element still exists (it should, we just created it)
                              existingListItem.textContent = fullText;
                          } else { // Fallback if ID somehow was lost before name fetch completed
                              listItem.textContent = fullText; // Set text on originally created item
                              whosHereList.appendChild(listItem); // Append if it wasn't (shouldn't happen often)
                          }
                      })
                      .catch(error => { /* ... your error handling ... */ 
                          // Fallback if display name fetch fails
                          let fallbackText = (currentUser && uidInSpace === currentUser.uid) ? `you (uid: ${uidInSpace.substring(0,6)})` : `user (${uidInSpace.substring(0, 6)}...)`;
                          if (presenceData && presenceData.activity) {
                              fallbackText += ` - ${presenceData.activity}`;
                          }
                          const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                          if(existingListItem) existingListItem.textContent = fallbackText;
                          else {listItem.textContent = fallbackText; whosHereList.appendChild(listItem);}
                      });
                  // Append the list item with placeholder text immediately
                  // The actual text will be filled when the displayName promise resolves
                  listItem.textContent = `loading ${uidInSpace.substring(0,6)}...`;
                  whosHereList.appendChild(listItem);
              }
          });
      }
      // If a user just left, isConfirmingPresence should be reset if it was true for them
      if (currentUser && !currentUsersInSpace[currentUser.uid] && isConfirmingPresence) {
          isConfirmingPresence = false;
          presenceActivityInput.style.display = 'none';
      }
      updateButtonText();
  }, (error) => { /* ... your error handling ... */ });
}


// --- Update Toggle Status Button Logic ---
toggleSpaceStatusBtn.addEventListener('click', () => {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
      alert('sign in first, interloper!');
      return;
  }
  const userUid = currentUser.uid;
  const userPresenceRef = database.ref('current_presence/' + userUid);

  // Check if user is currently marked as in space (based on our local copy)
  if (currentUsersInSpace[userUid]) { // User wants to leave
      userPresenceRef.remove()
          .then(() => {
              console.log(currentUser.email + ' left the cave.');
              presenceActivityInput.value = ''; // Clear activity field
              presenceActivityInput.style.display = 'none';
              isConfirmingPresence = false;
              // updateButtonText will be called by onValue listener for current_presence
          })
          .catch(error => console.error('error leaving cave:', error));
  } else { // User wants to enter or confirm entry
      if (isConfirmingPresence) { // User is confirming their presence with activity
          const activityText = presenceActivityInput.value.trim();
          const presenceData = {
              enteredAt: firebase.database.ServerValue.TIMESTAMP, // Good to have a timestamp
              activity: activityText || "" // Store empty string if no activity
          };
          userPresenceRef.set(presenceData)
              .then(() => {
                  console.log(currentUser.email + ' entered the cave. activity: ' + activityText);
                  presenceActivityInput.style.display = 'none';
                  isConfirmingPresence = false;
                  // updateButtonText will be called by onValue listener
              })
              .catch(error => console.error('error entering cave:', error));
      } else { // User clicked "i'm here" for the first time, show activity input
          presenceActivityInput.style.display = 'block';
          presenceActivityInput.focus();
          isConfirmingPresence = true;
          updateButtonText(); // Update button text immediately to "confirm"
      }
  }
});

// --- Update `updateButtonText` function ---
function updateButtonText() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
      toggleSpaceStatusBtn.textContent = 'i\'m entering the cave'; // Or "sign in to enter"
      toggleSpaceStatusBtn.disabled = true;
      presenceActivityInput.style.display = 'none'; // Hide if logged out
      isConfirmingPresence = false; // Reset state
      return;
  }

  toggleSpaceStatusBtn.disabled = false; // Enable if logged in

  if (currentUsersInSpace[currentUser.uid]) { // User is in the space
      toggleSpaceStatusBtn.textContent = 'i\'ve left the cave';
      presenceActivityInput.style.display = 'none'; // Hide if in space
      isConfirmingPresence = false; // Reset state
  } else { // User is not in the space
      if (isConfirmingPresence) {
          toggleSpaceStatusBtn.textContent = 'confirm i\'m here';
          // presenceActivityInput should already be visible
      } else {
          toggleSpaceStatusBtn.textContent = 'i\'m entering the cave';
          presenceActivityInput.style.display = 'none'; // Hide if not confirming
      }
  }
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