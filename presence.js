// presence.js

// Global variable for this module
let isConfirmingPresence = false;
let currentUsersInSpace = {}; // Keep track of users in space

document.addEventListener('DOMContentLoaded', () => {
    // Presence DOM Elements
    const whosHereList = document.getElementById('whos-here-list');
    const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
    const presenceActivityInput = document.getElementById('presenceActivityInput');
    // const userNameSelect = document.getElementById('userName'); // No longer used for presence logic

    // Function to update the presence button text and activity input visibility
    // Make it globally accessible if called from auth.js, or ensure auth.js calls its own UI updates
    // For now, keeping it local and called by loadCurrentPresence and toggleSpaceStatusBtn
    window.updateButtonText = function() { // Expose to global scope for auth.js if needed
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            if (toggleSpaceStatusBtn) {
                toggleSpaceStatusBtn.textContent = 'i\'m here';
                toggleSpaceStatusBtn.disabled = true;
            }
            if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            isConfirmingPresence = false;
            return;
        }

        if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.disabled = false;

        if (currentUsersInSpace[currentUser.uid]) {
            if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.textContent = 'i\'ve left the cave';
            if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            isConfirmingPresence = false;
        } else {
            if (isConfirmingPresence) {
                if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.textContent = 'confirm i\'m here';
                // presenceActivityInput should be visible if isConfirmingPresence is true
            } else {
                if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.textContent = 'i\'m here';
                if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            }
        }
    }

    // Function to load and display current presence
    // Make it globally accessible if called from auth.js
    window.loadCurrentPresence = function() {
        const presenceRef = database.ref('current_presence');
        presenceRef.on('value', (snapshot) => {
            if (whosHereList) whosHereList.innerHTML = ''; // Clear current list
            currentUsersInSpace = snapshot.val() || {};
            const currentUser = firebase.auth().currentUser;

            if (Object.keys(currentUsersInSpace).length === 0) {
                if (whosHereList) {
                    const listItem = document.createElement('li');
                    listItem.textContent = 'the cave is currently empty.';
                    whosHereList.appendChild(listItem);
                }
            } else {
                console.log("Users currently in cave:", currentUsersInSpace);
                Object.keys(currentUsersInSpace).forEach(uidInSpace => {
                    if (currentUsersInSpace.hasOwnProperty(uidInSpace)) {
                        const presenceData = currentUsersInSpace[uidInSpace];
                        const listItem = document.createElement('li');
                        listItem.id = 'presence-user-' + uidInSpace;
                        listItem.textContent = `loading ${uidInSpace.substring(0, 6)}...`;
                        if (whosHereList) whosHereList.appendChild(listItem);

                        database.ref('users/' + uidInSpace + '/displayName').once('value')
                            .then(nameSnapshot => {
                                const displayName = nameSnapshot.val();
                                const userIdentifier = displayName || (currentUser && uidInSpace === currentUser.uid ? currentUser.email : `user (${uidInSpace.substring(0, 6)}...)`);
                                let mainText = (currentUser && uidInSpace === currentUser.uid) ? `you (${userIdentifier})` : userIdentifier;
                                let fullText = mainText;
                                if (presenceData && typeof presenceData === 'object' && presenceData.activity) {
                                    fullText += ` - ${presenceData.activity}`;
                                }
                                
                                const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                                if (existingListItem) existingListItem.textContent = fullText;
                            })
                            .catch(error => {
                                console.error(`Error fetching display name for UID ${uidInSpace}:`, error);
                                const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                                if (existingListItem) {
                                    let fallbackText = (currentUser && uidInSpace === currentUser.uid) ? `you (uid: ${uidInSpace.substring(0,6)})` : `user (${uidInSpace.substring(0, 6)}...)`;
                                    if (presenceData && typeof presenceData === 'object' && presenceData.activity) {
                                        fallbackText += ` - ${presenceData.activity}`;
                                    }
                                    existingListItem.textContent = fallbackText;
                                }
                            });
                    }
                });
            }
            if (currentUser && !currentUsersInSpace[currentUser.uid] && isConfirmingPresence) {
                isConfirmingPresence = false;
                if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            }
            updateButtonText(); // Call local updateButtonText
        }, (error) => {
            console.error("Error loading presence data: ", error);
            if (whosHereList) whosHereList.innerHTML = '<li>error loading presence. check console and db rules.</li>';
        });
    }

    // Toggle Space Status Button Logic
    if (toggleSpaceStatusBtn) {
        toggleSpaceStatusBtn.addEventListener('click', () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                alert('sign in first, interloper!');
                return;
            }
            const userUid = currentUser.uid;
            const userPresenceRef = database.ref('current_presence/' + userUid);

            if (currentUsersInSpace[userUid]) { // User wants to leave
                userPresenceRef.remove()
                    .then(() => {
                        console.log(currentUser.email + ' left the cave.');
                        if (presenceActivityInput) {
                            presenceActivityInput.value = '';
                            presenceActivityInput.style.display = 'none';
                        }
                        isConfirmingPresence = false;
                    })
                    .catch(error => console.error('error leaving cave:', error));
            } else { // User wants to enter or confirm entry
                if (isConfirmingPresence) {
                    const activityText = presenceActivityInput.value.trim();
                    const presenceData = {
                        enteredAt: firebase.database.ServerValue.TIMESTAMP,
                        activity: activityText || ""
                    };
                    userPresenceRef.set(presenceData)
                        .then(() => {
                            console.log(currentUser.email + ' entered the cave. activity: ' + activityText);
                            if (presenceActivityInput) presenceActivityInput.style.display = 'none';
                            isConfirmingPresence = false;
                        })
                        .catch(error => console.error('error entering cave:', error));
                } else {
                    if (presenceActivityInput) {
                        presenceActivityInput.style.display = 'block';
                        presenceActivityInput.focus();
                    }
                    isConfirmingPresence = true;
                    updateButtonText(); // Call local updateButtonText
                }
            }
        });
    }

    // Initial call to set button state if a user is already logged in when script loads
    // This might be better handled by onAuthStateChanged calling updateButtonText
    // updateButtonText(); // Call local updateButtonText
});
