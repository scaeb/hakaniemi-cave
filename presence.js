// presence.js

// --- File-scoped variables for presence logic ---
let isConfirmingPresence = false;
let currentUsersInSpace = {}; // Keep track of users in space
let presenceTimerInterval = null; // To hold the interval timer
const DURATION_UPDATE_INTERVAL_MS = 30000; // Update durations every 30 seconds

// --- Helper function to format duration from milliseconds ---
function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m`;
    }
    return `< 1m`;
}

// --- Functions to manage the duration timer ---
function updatePresenceDurations() {
    const timeElements = document.querySelectorAll('.presence-time');
    timeElements.forEach(el => {
        const timestamp = parseInt(el.dataset.timestamp, 10);
        if (!isNaN(timestamp)) {
            const durationMs = Date.now() - timestamp;
            el.textContent = `(for ${formatDuration(durationMs)})`;
        }
    });
}

function startPresenceTimer() {
    if (presenceTimerInterval) clearInterval(presenceTimerInterval); // Clear existing timer
    updatePresenceDurations(); // Update immediately
    presenceTimerInterval = setInterval(updatePresenceDurations, DURATION_UPDATE_INTERVAL_MS);
}

function stopPresenceTimer() {
    if (presenceTimerInterval) {
        clearInterval(presenceTimerInterval);
        presenceTimerInterval = null;
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Getters ---
    const whosHereList = document.getElementById('whos-here-list');
    const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
    const presenceActivityInput = document.getElementById('presenceActivityInput');

    // --- Main Presence Functions ---
    window.updateButtonText = function() {
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
            } else {
                if (toggleSpaceStatusBtn) toggleSpaceStatusBtn.textContent = 'i\'m here';
                if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            }
        }
    }

    window.loadCurrentPresence = function() {
        const presenceRef = database.ref('current_presence');
        presenceRef.on('value', (snapshot) => {
            if (whosHereList) whosHereList.innerHTML = '';
            currentUsersInSpace = snapshot.val() || {};
            const currentUser = firebase.auth().currentUser;

            if (Object.keys(currentUsersInSpace).length === 0) {
                if (whosHereList) {
                    const listItem = document.createElement('li');
                    listItem.textContent = 'the cave is currently empty.';
                    whosHereList.appendChild(listItem);
                }
                stopPresenceTimer(); // Stop timer if no one is here
            } else {
                console.log("Users currently in cave:", currentUsersInSpace);
                const userPromises = Object.keys(currentUsersInSpace).map(uidInSpace => {
                    const listItem = document.createElement('li');
                    listItem.id = 'presence-user-' + uidInSpace;
                    listItem.textContent = `loading ${uidInSpace.substring(0, 6)}...`;
                    if (whosHereList) whosHereList.appendChild(listItem);

                    // Return the promise from the database call
                    return database.ref('users/' + uidInSpace + '/displayName').once('value')
                        .then(nameSnapshot => {
                            const presenceData = currentUsersInSpace[uidInSpace];
                            const displayName = nameSnapshot.val();
                            const userIdentifier = displayName || (currentUser && uidInSpace === currentUser.uid ? currentUser.email : `user (${uidInSpace.substring(0, 6)}...)`);
                            let mainText = (currentUser && uidInSpace === currentUser.uid) ? `you (${userIdentifier})` : userIdentifier;
                            
                            let contentHTML = `<span class="presence-name">${mainText}</span>`;
                            
                            if (presenceData && typeof presenceData === 'object' && presenceData.activity) {
                                contentHTML += ` - <span class="presence-activity">${presenceData.activity}</span>`;
                            }
                            if (presenceData && typeof presenceData === 'object' && presenceData.enteredAt) {
                                contentHTML += ` <span class="presence-time" data-timestamp="${presenceData.enteredAt}"></span>`;
                            }
                            
                            const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                            if (existingListItem) existingListItem.innerHTML = contentHTML;
                        })
                        .catch(error => {
                            console.error(`Error fetching display name for UID ${uidInSpace}:`, error);
                            const existingListItem = document.getElementById('presence-user-' + uidInSpace);
                            if (existingListItem) {
                                existingListItem.textContent = `user (${uidInSpace.substring(0, 6)}...)`;
                            }
                        });
                });

                // Wait for all the displayName fetches to complete
                Promise.all(userPromises).then(() => {
                    console.log("All user display names loaded, starting presence timer.");
                    startPresenceTimer(); // Start the timer only after the DOM is fully updated
                });
            }
            
            if (currentUser && !currentUsersInSpace[currentUser.uid] && isConfirmingPresence) {
                isConfirmingPresence = false;
                if (presenceActivityInput) presenceActivityInput.style.display = 'none';
            }
            updateButtonText();
        }, (error) => {
            console.error("Error loading presence data: ", error);
            if (whosHereList) whosHereList.innerHTML = '<li>error loading presence. check console and db rules.</li>';
        });
    }

    // --- Event Listeners ---
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
                        enteredAt: firebase.database.ServerValue.TIMESTAMP, // Store timestamp
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
                    updateButtonText();
                }
            }
        });
    }
});
