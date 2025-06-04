// calendar.js

// Variables global to this file's scope
let calendar = null;
let selectedEventInfo = null; // To store info when a date is clicked for a new event
let editingEventId = null;    // To store the Firestore document ID of the event being edited

document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase services are available (initialized in firebase-init.js)
    if (typeof firebase === 'undefined' || typeof firestore === 'undefined') {
        console.error("Firebase or Firestore is not initialized. Make sure firebase-init.js is loaded first.");
        return;
    }

    // DOM Element Getters
    const calendarEl = document.getElementById('calendar-container');
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingStartTimeInput = document.getElementById('bookingStartTime');
    const bookingEndTimeInput = document.getElementById('bookingEndTime');
    const bookingTitleInput = document.getElementById('bookingTitle');
    const saveBookingBtn = document.getElementById('saveBookingBtn');
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');

    if (!calendarEl) {
        console.error("Calendar container element not found!");
        return;
    }

    // Initialize FullCalendar and assign to the file-scoped 'calendar' variable
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // Default view
        firstDay: 1,              // Week starts on Monday
        locale: 'fi',             // Finnish locale
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay' // View switchers
        },
        editable: true,           // Allows dragging and resizing (if user has permission via Firestore rules)
        selectable: true,         // Allows users to click and drag to select a time range
        selectMirror: true,       // Shows a placeholder while dragging
        nowIndicator: true,       // Shows a line for the current time
        slotMinTime: "08:00:00",  // Earliest time slot visible
        slotMaxTime: "23:00:00",  // Latest time slot visible
        height: 'auto',           // Adjusts height to content, or use a fixed value like '650px'

        // Called when a date/time is clicked or a range is selected
        select: function(info) {
            console.log('Selected range:', info.startStr, info.endStr);
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                alert("you need to be signed in to book a time!");
                if (calendar) calendar.unselect();
                return;
            }

            resetBookingForm(); // Clear any previous editing state or form data
            selectedEventInfo = info; // Store the selection info for a NEW event

            if (bookingStartTimeInput) bookingStartTimeInput.value = convertToDateTimeLocalString(info.start);
            if (bookingEndTimeInput) bookingEndTimeInput.value = convertToDateTimeLocalString(info.end);
            if (bookingTitleInput) bookingTitleInput.value = ''; // Clear previous title
            if (bookingFormContainer) bookingFormContainer.style.display = 'block';
            if (saveBookingBtn) saveBookingBtn.textContent = 'save booking'; // Ensure button is for saving new
            if (bookingTitleInput) bookingTitleInput.focus();
        },

        // Called when an existing event is clicked
        eventClick: function(info) {
            console.log('Event clicked (raw info.event object):', info.event); // Existing log
            const clickedEvent = info.event;
            const currentUser = firebase.auth().currentUser;

            // --- Start of new debugging logs ---
            if (!currentUser) {
                console.log("eventClick: No currentUser found. User might be signed out.");
                alert("you need to be signed in to manage bookings.");
                return;
            }

            console.log("eventClick: currentUser.uid:", currentUser.uid);
            console.log("eventClick: clickedEvent.extendedProps.userId:", clickedEvent.extendedProps.userId);
            // --- End of new debugging logs ---

            if (clickedEvent.extendedProps.userId === currentUser.uid) {
                console.log("eventClick: User IDs match. Prompting for action."); // New log
                const action = prompt("what would you like to do with this booking? type 'edit' or 'delete'. (or cancel)");
                if (action) { // Check if prompt was not cancelled
                    const actionLower = action.toLowerCase();
                    if (actionLower === 'delete') {
                        if (confirm("are you sure you want to delete this booking?")) {
                            deleteBooking(clickedEvent.id); // Pass Firestore document ID
                        }
                    } else if (actionLower === 'edit') {
                        editBooking(clickedEvent);
                    }
                } else {
                    console.log("eventClick: Prompt was cancelled or empty."); // New log
                }
            } else {
                console.log("eventClick: User IDs DO NOT match."); // New log
                alert(`this booking belongs to ${clickedEvent.extendedProps.displayName || 'another user'} (owner UID: ${clickedEvent.extendedProps.userId}, your UID: ${currentUser.uid}). you can only manage your own bookings.`);
            }
        },

        // Load events from Firestore
        events: function(fetchInfo, successCallback, failureCallback) {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.log("No user logged in, not fetching events for calendar display.");
                successCallback([]);
                return;
            }

            firestore.collection('bookings')
                .onSnapshot(querySnapshot => {
                    const bookings = [];
                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        bookings.push({
                            id: doc.id,
                            title: data.title || (data.displayName ? `${data.displayName}'s booking` : 'booked'),
                            start: data.start,
                            end: data.end,
                            allDay: data.allDay || false,
                            // Extended properties to store original data and for checks
                            extendedProps: {
                                userId: data.userId,
                                displayName: data.displayName
                            },
                            // Custom styling based on user
                            backgroundColor: data.userId === currentUser.uid ? 'var(--color-primary-slime-darker)' : 'var(--color-text-muted)',
                            borderColor: data.userId === currentUser.uid ? 'var(--color-primary-slime)' : 'var(--color-border)'
                        });
                    });
                    successCallback(bookings);
                }, error => {
                    console.error("Error fetching bookings: ", error);
                    failureCallback(error);
                });
        }
    });

    calendar.render();

    // --- Booking Form Logic ---
    if (saveBookingBtn) {
        saveBookingBtn.addEventListener('click', () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                alert("you must be signed in to save a booking.");
                return;
            }

            const startStr = bookingStartTimeInput.value;
            const endStr = bookingEndTimeInput.value;
            const title = bookingTitleInput.value.trim();

            if (!startStr || !endStr) {
                alert("please fill in both start and end times.");
                return;
            }
            if (new Date(startStr) >= new Date(endStr)) {
                alert("end time must be after start time.");
                return;
            }

            database.ref('users/' + currentUser.uid + '/displayName').once('value')
                .then(snapshot => {
                    const userDisplayName = snapshot.val() || currentUser.email;

                    const bookingData = {
                        userId: currentUser.uid,
                        displayName: userDisplayName,
                        start: new Date(startStr).toISOString(),
                        end: new Date(endStr).toISOString(),
                        title: title
                    };

                    if (editingEventId) {
                        // Update existing booking
                        bookingData.lastUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        firestore.collection('bookings').doc(editingEventId).update(bookingData)
                            .then(() => {
                                console.log("Booking successfully updated!");
                                resetBookingForm();
                            })
                            .catch(error => {
                                console.error("Error updating booking: ", error);
                                alert("error updating booking: " + error.message);
                            });
                    } else {
                        // Create new booking
                        bookingData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                        firestore.collection('bookings').add(bookingData)
                            .then(docRef => {
                                console.log("Booking saved with ID: ", docRef.id);
                                resetBookingForm();
                            })
                            .catch(error => {
                                console.error("Error adding booking: ", error);
                                alert("error saving booking: " + error.message);
                            });
                    }
                })
                .catch(error => {
                    console.error("Error fetching display name for booking:", error);
                    alert("error fetching user details for booking. please try again.");
                });
        });
    }

    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', () => {
            resetBookingForm();
        });
    }

    // Listen for auth changes to re-render or re-fetch events if necessary
    firebase.auth().onAuthStateChanged(user => {
        if (calendar) { // Ensure calendar is initialized
            if (user) {
                console.log("Calendar: User signed in, refetching events.");
                calendar.refetchEvents();
            } else {
                console.log("Calendar: User signed out, clearing events.");
                calendar.removeAllEvents();
                if (bookingFormContainer) bookingFormContainer.style.display = 'none'; // Hide form
                resetBookingForm(); // Also reset form state
            }
        }
    });

}); // End of DOMContentLoaded


// --- Helper Functions (Defined at the file scope) ---

function resetBookingForm() {
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingStartTimeInput = document.getElementById('bookingStartTime');
    const bookingEndTimeInput = document.getElementById('bookingEndTime');
    const bookingTitleInput = document.getElementById('bookingTitle');
    const saveBookingBtn = document.getElementById('saveBookingBtn');

    if (bookingFormContainer) bookingFormContainer.style.display = 'none';
    if (bookingStartTimeInput) bookingStartTimeInput.value = '';
    if (bookingEndTimeInput) bookingEndTimeInput.value = '';
    if (bookingTitleInput) bookingTitleInput.value = '';
    if (saveBookingBtn) saveBookingBtn.textContent = 'save booking';

    selectedEventInfo = null;
    editingEventId = null;

    if (calendar) {
        calendar.unselect();
    }
}

function convertToDateTimeLocalString(date) {
    if (!(date instanceof Date) || isNaN(date)) { // Check if date is valid
        console.warn("convertToDateTimeLocalString received an invalid date:", date);
        const now = new Date(); // Fallback to current time or a sensible default
        // Or handle error appropriately, e.g., return empty string or throw error
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function deleteBooking(bookingId) {
    if (!bookingId) {
        console.error("Booking ID is missing for deletion.");
        alert("cannot delete: booking id missing.");
        return;
    }
    firestore.collection('bookings').doc(bookingId).delete()
        .then(() => {
            console.log("Booking successfully deleted!");
            alert("booking deleted.");
            resetBookingForm(); // Ensure form is hidden if it was open for this event
        })
        .catch((error) => {
            console.error("Error deleting booking: ", error);
            alert("error deleting booking: " + error.message);
        });
}

function editBooking(eventToEdit) {
    const currentUser = firebase.auth().currentUser;
    // Get DOM elements within the function as they might not be available when file-scoped vars are declared
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingStartTimeInput = document.getElementById('bookingStartTime');
    const bookingEndTimeInput = document.getElementById('bookingEndTime');
    const bookingTitleInput = document.getElementById('bookingTitle');
    const saveBookingBtn = document.getElementById('saveBookingBtn');


    if (!currentUser || eventToEdit.extendedProps.userId !== currentUser.uid) {
        alert("you can only edit your own bookings.");
        return;
    }

    console.log("Editing event:", eventToEdit);
    editingEventId = eventToEdit.id; // Set file-scoped variable

    if (bookingStartTimeInput) bookingStartTimeInput.value = convertToDateTimeLocalString(eventToEdit.start);
    if (bookingEndTimeInput) bookingEndTimeInput.value = convertToDateTimeLocalString(eventToEdit.end);
    if (bookingTitleInput) bookingTitleInput.value = eventToEdit.title || ''; // Use FullCalendar's direct title prop

    if (bookingFormContainer) bookingFormContainer.style.display = 'block';
    if (saveBookingBtn) saveBookingBtn.textContent = 'update booking';
    if (bookingTitleInput) bookingTitleInput.focus();

    selectedEventInfo = null; // Clear any previous date range selection info
}
