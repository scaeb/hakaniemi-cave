// calendar.js

// Variables global to this file's scope to be accessed by various functions
let calendar = null;
let selectedEventInfo = null; // To store info when a date is clicked for a new event
let editingEventId = null;    // To store the Firestore document ID of the event being edited
let eventDetailsForModal = null; // To store details of the event clicked for modal display

document.addEventListener('DOMContentLoaded', function() {
    // Ensure Firebase services are available (initialized in firebase-init.js)
    if (typeof firebase === 'undefined' || typeof firestore === 'undefined') {
        console.error("Firebase or Firestore is not initialized. Make sure firebase-init.js is loaded first.");
        return;
    }

    // --- DOM Element Getters ---
    const calendarEl = document.getElementById('calendar-container');
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingStartTimeInput = document.getElementById('bookingStartTime');
    const bookingEndTimeInput = document.getElementById('bookingEndTime');
    const bookingTitleInput = document.getElementById('bookingTitle');
    const saveBookingBtn = document.getElementById('saveBookingBtn');
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');

    // Modal DOM Elements
    const eventActionModal = document.getElementById('eventActionModal');
    const modalActionTitle = document.getElementById('modalActionTitle');
    const modalEventTitle = document.getElementById('modalEventTitle');
    const modalEventStart = document.getElementById('modalEventStart');
    const modalEventEnd = document.getElementById('modalEventEnd');
    const modalEventUser = document.getElementById('modalEventUser');
    const modalEditBtn = document.getElementById('modalEditBtn');
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    const modalActionCloseBtn = document.getElementById('modalActionCloseBtn');

    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const confirmDeleteDoBtn = document.getElementById('confirmDeleteDoBtn');
    const confirmDeleteCancelBtn = document.getElementById('confirmDeleteCancelBtn');
    const confirmDeleteEventDetails = document.getElementById('confirmDeleteEventDetails');


    if (!calendarEl) {
        console.error("Calendar container element not found!");
        return;
    }

    // --- FullCalendar Initialization ---
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        firstDay: 1, // Week starts on Monday
        locale: 'fi', // Finnish locale
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        selectMirror: true,
        nowIndicator: true,
        longPressDelay: 1,
        slotMinTime: "08:00:00",
        slotMaxTime: "23:00:00",
        height: 'auto',

        // --- Calendar Callbacks ---

        // Called when a date/time is clicked or a range is selected for a NEW event
        select: function(info) {
            console.log('Selected range for new event:', info.startStr, info.endStr);
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                alert("you need to be signed in to book a time!");
                if (calendar) calendar.unselect();
                return;
            }

            resetBookingForm();
            selectedEventInfo = info; // Store selection info

            if (bookingStartTimeInput) bookingStartTimeInput.value = convertToDateTimeLocalString(info.start);
            if (bookingEndTimeInput) bookingEndTimeInput.value = convertToDateTimeLocalString(info.end);
            if (bookingTitleInput) bookingTitleInput.value = '';
            if (bookingFormContainer) bookingFormContainer.style.display = 'block';
            if (saveBookingBtn) saveBookingBtn.textContent = 'save booking';
            if (bookingTitleInput) bookingTitleInput.focus();
        },

        // Called when an existing event is clicked
        eventClick: function(info) {
            console.log('Event clicked:', info.event);
            const clickedEvent = info.event;
            const currentUser = firebase.auth().currentUser;

            if (!currentUser) {
                alert("you need to be signed in to manage bookings.");
                return;
            }

            // Store details for the modal
            eventDetailsForModal = {
                id: clickedEvent.id,
                title: clickedEvent.title,
                start: clickedEvent.start,
                end: clickedEvent.end,
                userId: clickedEvent.extendedProps.userId,
                displayName: clickedEvent.extendedProps.displayName
            };

            // Populate and show the Event Action Modal
            if (modalEventTitle) modalEventTitle.textContent = eventDetailsForModal.title || '(no title)';
            if (modalEventStart) modalEventStart.textContent = eventDetailsForModal.start ? formatFinnishDateTime(eventDetailsForModal.start) : 'n/a';
            if (modalEventEnd) modalEventEnd.textContent = eventDetailsForModal.end ? formatFinnishDateTime(eventDetailsForModal.end) : 'n/a';
            if (modalEventUser) modalEventUser.textContent = eventDetailsForModal.displayName || 'unknown user';

            if (eventDetailsForModal.userId === currentUser.uid) {
                if (modalEditBtn) modalEditBtn.style.display = 'inline-block';
                if (modalDeleteBtn) modalDeleteBtn.style.display = 'inline-block';
                if (modalActionTitle) modalActionTitle.textContent = "your booking";
            } else {
                if (modalEditBtn) modalEditBtn.style.display = 'none';
                if (modalDeleteBtn) modalDeleteBtn.style.display = 'none';
                if (modalActionTitle) modalActionTitle.textContent = "booking details";
            }
            if (eventActionModal) eventActionModal.style.display = 'flex';
        },

        // Load events from Firestore
        events: function(fetchInfo, successCallback, failureCallback) {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) {
                console.log("No user logged in, not fetching events.");
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
                            extendedProps: { userId: data.userId, displayName: data.displayName },
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

    // --- Booking Form Event Listeners ---
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
                alert("please fill in both start and end times."); return;
            }
            if (new Date(startStr) >= new Date(endStr)) {
                alert("end time must be after start time."); return;
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
                        bookingData.lastUpdatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        firestore.collection('bookings').doc(editingEventId).update(bookingData)
                            .then(() => {
                                console.log("Booking updated!");
                                if (calendar) calendar.refetchEvents(); // Explicitly refetch events
                                resetBookingForm();
                            })
                            .catch(error => { console.error("Error updating booking: ", error); alert("error: " + error.message); });
                    } else {
                        bookingData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                        firestore.collection('bookings').add(bookingData)
                            .then(docRef => {
                                console.log("Booking saved with ID: ", docRef.id);
                                if (calendar) calendar.refetchEvents(); // Explicitly refetch events
                                resetBookingForm();
                            })
                            .catch(error => { console.error("Error adding booking: ", error); alert("error: " + error.message); });
                    }
                })
                .catch(error => { console.error("Error fetching display name:", error); alert("error. try again."); });
        });
    }

    if (cancelBookingBtn) {
        cancelBookingBtn.addEventListener('click', () => {
            resetBookingForm();
        });
    }

    // --- Modal Event Listeners ---
    if (modalActionCloseBtn) {
        modalActionCloseBtn.addEventListener('click', () => {
            if (eventActionModal) eventActionModal.style.display = 'none';
            eventDetailsForModal = null;
        });
    }
    if (modalEditBtn) {
        modalEditBtn.addEventListener('click', () => {
            if (eventActionModal) eventActionModal.style.display = 'none';
            if (eventDetailsForModal) {
                const mockEventToEdit = {
                    id: eventDetailsForModal.id,
                    title: eventDetailsForModal.title,
                    start: eventDetailsForModal.start,
                    end: eventDetailsForModal.end,
                    extendedProps: { userId: eventDetailsForModal.userId, displayName: eventDetailsForModal.displayName }
                };
                editBooking(mockEventToEdit);
            }
            eventDetailsForModal = null;
        });
    }
    if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', () => {
            if (eventActionModal) eventActionModal.style.display = 'none';
            if (confirmDeleteModal && eventDetailsForModal) {
                if(confirmDeleteEventDetails) confirmDeleteEventDetails.textContent = `deleting: "${eventDetailsForModal.title || 'booking'}" by ${eventDetailsForModal.displayName || 'user'}`;
                confirmDeleteModal.style.display = 'flex';
            }
        });
    }
    if (confirmDeleteDoBtn) {
        confirmDeleteDoBtn.addEventListener('click', () => {
            if (eventDetailsForModal && eventDetailsForModal.id) {
                deleteBooking(eventDetailsForModal.id);
            }
            if (confirmDeleteModal) confirmDeleteModal.style.display = 'none';
            eventDetailsForModal = null;
        });
    }
    if (confirmDeleteCancelBtn) {
        confirmDeleteCancelBtn.addEventListener('click', () => {
            if (confirmDeleteModal) confirmDeleteModal.style.display = 'none';
            eventDetailsForModal = null;
        });
    }

    // Close modals if user clicks on the dark overlay background
    window.addEventListener('click', (event) => {
        if (event.target === eventActionModal) {
            eventActionModal.style.display = 'none';
            eventDetailsForModal = null;
        }
        if (event.target === confirmDeleteModal) {
            confirmDeleteModal.style.display = 'none';
            eventDetailsForModal = null;
        }
    });

    // --- Firebase Auth State Listener for Calendar ---
    firebase.auth().onAuthStateChanged(user => {
        if (calendar) {
            if (user) {
                console.log("Calendar: User signed in, refetching events.");
                calendar.refetchEvents();
            } else {
                console.log("Calendar: User signed out, clearing events.");
                calendar.removeAllEvents();
                if (bookingFormContainer) bookingFormContainer.style.display = 'none';
                resetBookingForm();
            }
        }
    });

}); // End of DOMContentLoaded


// --- Helper Functions (Defined at the file scope) ---

function formatFinnishDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) return 'n/a';
    const options = {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        hour12: false, // Use 24-hour clock
        timeZone: 'Europe/Helsinki' // Or rely on browser's local timezone
    };
    // .replace is a simple way to get DD.MM.YYYY format
    return new Intl.DateTimeFormat('fi-FI', options).format(date).replace(/\//g, '.');
}

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
    if (calendar) calendar.unselect();
}

function convertToDateTimeLocalString(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        console.warn("convertToDateTimeLocalString invalid date:", date);
        const now = new Date();
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
    if (!bookingId) { console.error("ID missing for deletion."); alert("cannot delete."); return; }
    firestore.collection('bookings').doc(bookingId).delete()
        .then(() => {
            console.log("Booking deleted!");
            alert("booking deleted.");
            if (calendar) calendar.refetchEvents(); // Explicitly refetch events
            resetBookingForm();
        })
        .catch((error) => { console.error("Error deleting: ", error); alert("error: " + error.message); });
}

function editBooking(eventToEdit) {
    const currentUser = firebase.auth().currentUser;
    const bookingFormContainer = document.getElementById('booking-form-container');
    const bookingStartTimeInput = document.getElementById('bookingStartTime');
    const bookingEndTimeInput = document.getElementById('bookingEndTime');
    const bookingTitleInput = document.getElementById('bookingTitle');
    const saveBookingBtn = document.getElementById('saveBookingBtn');

    if (!currentUser || eventToEdit.extendedProps.userId !== currentUser.uid) {
        alert("you can only edit your own bookings."); return;
    }
    
    console.log("Editing event:", eventToEdit);
    editingEventId = eventToEdit.id;
    
    if (bookingStartTimeInput) bookingStartTimeInput.value = convertToDateTimeLocalString(eventToEdit.start);
    if (bookingEndTimeInput) bookingEndTimeInput.value = convertToDateTimeLocalString(eventToEdit.end);
    if (bookingTitleInput) bookingTitleInput.value = eventToEdit.title || '';
    if (bookingFormContainer) bookingFormContainer.style.display = 'block';
    if (saveBookingBtn) saveBookingBtn.textContent = 'update booking';
    if (bookingTitleInput) bookingTitleInput.focus();
    
    selectedEventInfo = null;
}
