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

// In app.js, after Firebase init and getting DOM elements

const whosHereList = document.getElementById('whos-here-list');
const toggleSpaceStatusBtn = document.getElementById('toggleSpaceStatusBtn');
const userNameSelect = document.getElementById('userName');
let currentUsersInSpace = {}; // To keep track locally

// Listen for who is in the space
database.ref('current_presence').on('value', (snapshot) => {
    whosHereList.innerHTML = ''; // Clear current list
    currentUsersInSpace = snapshot.val() || {}; // Get users or empty object if none
    if (Object.keys(currentUsersInSpace).length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = 'The space is currently empty.';
        whosHereList.appendChild(listItem);
    } else {
        for (const user in currentUsersInSpace) {
            const listItem = document.createElement('li');
            listItem.textContent = user;
            whosHereList.appendChild(listItem);
        }
    }
    updateButtonText(); // Update button based on current user's status
});

// Toggle status
toggleSpaceStatusBtn.addEventListener('click', () => {
    const selectedUser = userNameSelect.value;
    if (!selectedUser) {
        alert('Please select your name first!');
        return;
    }

    const userRef = database.ref('current_presence/' + selectedUser);
    if (currentUsersInSpace[selectedUser]) {
        // User is in, so remove them
        userRef.remove()
            .then(() => console.log(selectedUser + ' left the space.'))
            .catch(error => console.error('Error leaving space:', error));
    } else {
        // User is not in, so add them
        userRef.set(true)
            .then(() => console.log(selectedUser + ' entered the space.'))
            .catch(error => console.error('Error entering space:', error));
    }
});

function updateButtonText() {
    const selectedUser = userNameSelect.value;
    if (selectedUser && currentUsersInSpace[selectedUser]) {
        toggleSpaceStatusBtn.textContent = 'I\'ve left the space';
    } else {
        toggleSpaceStatusBtn.textContent = 'I\'m in the space';
    }
}

// Update button if user selection changes
userNameSelect.addEventListener('change', updateButtonText);