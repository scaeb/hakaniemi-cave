// auth.js

// Wait for the DOM to be fully loaded before trying to get elements
document.addEventListener('DOMContentLoaded', () => {
    // Authentication DOM Elements
    const authSection = document.getElementById('auth-section');
    const authForm = document.getElementById('auth-form');
    const userInfoDiv = document.getElementById('userInfo');
    // const userEmailSpan = document.getElementById('userEmail'); // Not directly used if combined in welcome
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const signUpBtn = document.getElementById('signUpBtn');
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const authErrorP = document.getElementById('authError');
    const displayNameInput = document.getElementById('displayNameInput');
    const saveDisplayNameBtn = document.getElementById('saveDisplayNameBtn');
    const userDisplayNameWelcomeSpan = document.getElementById('userDisplayNameWelcome');
    const userEmailInfoSpan = document.getElementById('userEmailInfo');
    const authSectionTitle = document.getElementById('authSectionTitle');
    const userInfoMinimized = document.getElementById('userInfoMinimized');
    const userInfoExpanded = document.getElementById('userInfoExpanded');
    const manageAccountBtn = document.getElementById('manageAccountBtn');

    // --- Authentication Functions ---

    // Sign Up
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (authErrorP) authErrorP.textContent = '';

            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('Signed up and signed in:', user.email);
                    // Set an initial display name
                    const emailPrefix = user.email.split('@')[0];
                    database.ref('users/' + user.uid + '/displayName').set(emailPrefix)
                        .then(() => console.log("Initial display name set for new user."))
                        .catch(err => console.error("Error setting initial display name:", err));
                    if (displayNameInput) displayNameInput.value = emailPrefix;
                })
                .catch((error) => {
                    console.error('Sign up error:', error);
                    if (authErrorP) authErrorP.textContent = error.message;
                });
        });
    }

    // Sign In
    if (signInBtn) {
        signInBtn.addEventListener('click', () => {
            console.log("Sign In button clicked");
            const email = emailInput.value;
            const password = passwordInput.value;
            if (authErrorP) authErrorP.textContent = '';

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('Signed in successfully via signInWithEmailAndPassword:', user.email);
                })
                .catch((error) => {
                    console.error('Sign in error in .catch:', error);
                    if (authErrorP) authErrorP.textContent = `sign in error: ${error.message}`;
                });
        });
    }

    // Sign Out
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            firebase.auth().signOut()
                .then(() => {
                    console.log('Signed out');
                })
                .catch((error) => {
                    console.error('Sign out error:', error);
                    if (authErrorP) authErrorP.textContent = error.message;
                });
        });
    }

    // Manage Account Button (Expand/Collapse)
    if (manageAccountBtn) {
        manageAccountBtn.addEventListener('click', () => {
            const isExpanded = userInfoExpanded.style.display === 'block';
            if (isExpanded) {
                userInfoExpanded.style.display = 'none';
                manageAccountBtn.textContent = 'manage account'; // Ensure text case matches global style
                if (authSectionTitle) authSectionTitle.classList.remove('minimized-title');
            } else {
                userInfoExpanded.style.display = 'block';
                manageAccountBtn.textContent = 'hide settings'; // Ensure text case
                if (authSectionTitle) authSectionTitle.classList.add('minimized-title');
            }
        });
    }

    // Save Display Name
    if (saveDisplayNameBtn) {
        saveDisplayNameBtn.addEventListener('click', () => {
            const currentUser = firebase.auth().currentUser;
            const newDisplayName = displayNameInput.value.trim();

            if (!currentUser) {
                if (authErrorP) authErrorP.textContent = "you must be signed in to save a display name.";
                return;
            }
            if (!newDisplayName) {
                if (authErrorP) authErrorP.textContent = "display name cannot be empty.";
                return;
            }
            if (newDisplayName.length > 50) {
                if (authErrorP) authErrorP.textContent = "display name is too long (max 50 characters).";
                return;
            }

            database.ref('users/' + currentUser.uid + '/displayName').set(newDisplayName)
                .then(() => {
                    console.log("Display name updated successfully!");
                    if (authErrorP) authErrorP.textContent = "display name saved!";
                    if (userDisplayNameWelcomeSpan) userDisplayNameWelcomeSpan.textContent = newDisplayName;
                })
                .catch((error) => {
                    console.error("Error saving display name:", error);
                    if (authErrorP) authErrorP.textContent = "error saving display name: " + error.message;
                });
        });
    }


    // --- Auth State Listener ---
    firebase.auth().onAuthStateChanged((user) => {
        console.log("onAuthStateChanged triggered. User object:", user);
        if (authErrorP) authErrorP.textContent = '';

        if (user) {
            console.log('onAuthStateChanged: User IS signed in.', user.email);
            if (authForm) authForm.style.display = 'none';
            if (userInfoDiv) userInfoDiv.style.display = 'block';
            if (userInfoMinimized) userInfoMinimized.style.display = 'flex';
            if (userInfoExpanded) userInfoExpanded.style.display = 'none';
            if (manageAccountBtn) manageAccountBtn.textContent = 'manage account';

            if (authSectionTitle) {
                authSectionTitle.textContent = "welcome to the cave zone"; // Your desired "signed in" title
                authSectionTitle.classList.add('minimized-title');
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
                .catch(error => {
                    console.error("Error fetching display name for welcome message:", error);
                    if (userDisplayNameWelcomeSpan) userDisplayNameWelcomeSpan.textContent = user.email;
                });

            // Enable presence button (presence.js will handle its text)
            const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
            if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = false;
            
            // If loadCurrentPresence is defined in presence.js and that script is loaded,
            // it will be called. If not, this might cause an error or do nothing.
            // Consider a more robust way to call functions across files if needed (e.g., custom events).
            if (typeof loadCurrentPresence === 'function') {
                loadCurrentPresence();
            }


        } else {
            console.log('onAuthStateChanged: User IS NOT signed in or is signed out.');
            if (authForm) authForm.style.display = 'block';
            if (userInfoDiv) userInfoDiv.style.display = 'none';

            if (authSectionTitle) {
                authSectionTitle.textContent = "who are you?"; // Your desired "signed out" title
                authSectionTitle.classList.remove('minimized-title');
            }
            
            // Reset presence UI elements (presence.js will also handle some of this)
            const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
            const whosHereList = document.getElementById('whos-here-list');
            const presenceActivityInput = document.getElementById('presenceActivityInput');

            if (toggleSpaceStatusBtn) {
                 toggleSpaceStatusBtn.disabled = true;
                 // updateButtonText() in presence.js should handle the text
            }
            if (whosHereList) whosHereList.innerHTML = '<li>sign in to see whos dwelling in the cave</li>';
            if (presenceActivityInput) presenceActivityInput.style.display = 'none';

            // If updateButtonText is defined in presence.js
            if (typeof updateButtonText === 'function') {
                updateButtonText(); // To reset presence button text
            }
            // If currentUsersInSpace is defined in presence.js
            if (typeof currentUsersInSpace !== 'undefined') {
                 // currentUsersInSpace = {}; // This would need to be managed within presence.js or globally
            }
        }
    });
});
