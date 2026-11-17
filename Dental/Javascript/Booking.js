/* Handles direct appointment booking on index.html. */
(function () {
  'use strict';

  var form = document.getElementById('booking-form');
  if (!form) return;

  var firstInput = document.getElementById('pt-fname');
  var lastInput = document.getElementById('pt-lname');
  var phoneInput = document.getElementById('pt-phone');
  var emailInput = document.getElementById('pt-email');
  var dateInput = document.getElementById('pt-date');
  var serviceSelect = document.getElementById('pt-service');
  var availableSlotsEl = document.getElementById('pt-available-slots');
  var availabilityMessageEl = document.getElementById('pt-availability-message');
  var submitBtn = document.getElementById('pt-submit');
  var statusEl = document.getElementById('booking-status');
  var selectedSlot = null;
  var isSaving = false;
  var TIMES = ['9:00 am', '10:00 am', '11:00 am', '12:00 pm', '1:00 pm', '2:00 pm', '3:00 pm', '4:00 pm'];

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function timeInMinutes(time) {
    var match = String(time).match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
    if (!match) return Infinity;
    var hour = Number(match[1]) % 12;
    if (match[3].toLowerCase() === 'pm') hour += 12;
    return hour * 60 + Number(match[2]);
  }

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
    statusEl.style.display = message ? 'block' : 'none';
    statusEl.style.fontWeight = '600';
    statusEl.style.fontSize = '15px';
    statusEl.style.color = kind === 'error' ? '#B3261E' : kind === 'ok' ? '#1B6E3A' : '';
  }

  function markInvalid(input, invalid) {
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
      input.style.borderColor = '#B3261E';
    } else {
      input.removeAttribute('aria-invalid');
      input.style.borderColor = '';
    }
  }

  function getSchedule(date) {
    if (!window.DentalStorage || typeof window.DentalStorage.getScheduleForDate !== 'function') {
      throw new Error('Appointment storage is unavailable.');
    }
    return window.DentalStorage.getScheduleForDate(date);
  }

  function getSlot(schedule, time, chair) {
    for (var i = 0; i < schedule.length; i++) {
      if (String(schedule[i].time).toLowerCase().trim() === time.toLowerCase()) {
        return chair === 1 ? schedule[i].chair1 : schedule[i].chair2;
      }
    }
    return null;
  }

  function isPastToday(date, time) {
    var now = new Date();
    if (date !== localDateKey(now)) return false;
    return timeInMinutes(time) <= now.getHours() * 60 + now.getMinutes();
  }

  function createEmptyMessage(message) {
    var empty = document.createElement('p');
    empty.className = 'available-slots__empty';
    empty.textContent = message;
    availableSlotsEl.appendChild(empty);
  }

  function renderAvailableSlots() {
    selectedSlot = null;
    availableSlotsEl.textContent = '';

    if (!dateInput.value) {
      availabilityMessageEl.textContent = 'Select a date to see open appointment times.';
      createEmptyMessage('Choose a date first.');
      return;
    }

    var date = dateInput.value;
    var schedule;
    try {
      schedule = getSchedule(date);
    } catch (error) {
      console.error('Could not load appointment availability:', error);
      availabilityMessageEl.textContent = 'Availability could not be loaded.';
      createEmptyMessage('Please refresh the page or call the clinic.');
      return;
    }

    var offered = 0;
    availabilityMessageEl.textContent = 'Choose an available time and chair.';
    TIMES.forEach(function (time) {
      [1, 2].forEach(function (chair) {
        if (getSlot(schedule, time, chair) || isPastToday(date, time)) return;
        offered++;
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'available-slot';
        button.setAttribute('aria-pressed', 'false');
        button.textContent = time + ' · Chair ' + chair + (chair === 1 ? ' (Dr. Mora)' : ' (Dr. Silva)');
        button.addEventListener('click', function () {
          selectedSlot = { time: time, chair: chair };
          availableSlotsEl.querySelectorAll('.available-slot').forEach(function (slotButton) {
            slotButton.setAttribute('aria-pressed', slotButton === button ? 'true' : 'false');
          });
        });
        availableSlotsEl.appendChild(button);
      });
    });

    if (offered === 0) {
      availabilityMessageEl.textContent = 'No appointment times are available on this date.';
      createEmptyMessage('Please choose another day.');
    }
  }

  function validate() {
    var first = firstInput.value.trim().replace(/\s+/g, ' ');
    var last = lastInput.value.trim().replace(/\s+/g, ' ');
    var phone = phoneInput.value.trim();
    var email = emailInput ? emailInput.value.trim() : '';
    var firstBad = !first || first.length > 80;
    var lastBad = !last || last.length > 80;
    var phoneBad = !window.DentalStorage.isValidPhoneNumber(phone);
    var emailBad = !window.DentalStorage.isValidEmailAddress(email);
    var appointmentDate = new Date(dateInput.value + 'T00:00:00');
    var dateBad = !dateInput.value || isNaN(appointmentDate.getTime()) ||
      localDateKey(appointmentDate) !== dateInput.value ||
      dateInput.value < localDateKey(new Date());

    markInvalid(firstInput, firstBad);
    markInvalid(lastInput, lastBad);
    markInvalid(phoneInput, phoneBad);
    if (emailInput) markInvalid(emailInput, emailBad);

    if (firstBad) {
      setStatus('Enter a first name up to 80 characters.', 'error');
      firstInput.focus();
      return null;
    }
    if (lastBad) {
      setStatus('Enter a last name up to 80 characters.', 'error');
      lastInput.focus();
      return null;
    }
    if (phoneBad) {
      setStatus('Enter a valid phone number with 7 to 15 digits.', 'error');
      phoneInput.focus();
      return null;
    }
    if (emailBad) {
      setStatus('Enter a valid email address or leave the field blank.', 'error');
      emailInput.focus();
      return null;
    }
    if (dateBad) {
      setStatus('Choose today or a future appointment date.', 'error');
      dateInput.focus();
      return null;
    }
    if (!selectedSlot) {
      setStatus('Choose an available time and chair.', 'error');
      availableSlotsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    if (TIMES.indexOf(selectedSlot.time) < 0 ||
        (selectedSlot.chair !== 1 && selectedSlot.chair !== 2) ||
        !serviceSelect.value) {
      setStatus('Choose a valid service and available appointment slot.', 'error');
      return null;
    }

    return {
      firstName: first,
      lastName: last,
      name: first + ' ' + last,
      phone: phone,
      email: email,
      date: dateInput.value,
      service: serviceSelect.value,
      time: selectedSlot.time,
      chair: selectedSlot.chair
    };
  }

  function findPatient(name) {
    if (window.DentalStorage && typeof window.DentalStorage.findPatientByName === 'function') {
      return window.DentalStorage.findPatientByName(name);
    }

    var patients = window.DentalStorage.getPatients();
    var target = name.trim().replace(/\s+/g, ' ').toLowerCase();
    for (var i = 0; i < patients.length; i++) {
      var patientName = ((patients[i].firstName || '') + ' ' + (patients[i].lastName || ''))
        .trim().replace(/\s+/g, ' ').toLowerCase();
      if (patientName === target) return patients[i];
    }
    return null;
  }

  function savePatient(data) {
    var date = new Date(data.date + 'T12:00:00');
    var isToday = data.date === localDateKey(new Date());
    var dentist = data.chair === 1 ? 'Dr. Mora' : 'Dr. Silva';
    var visitDate = isToday
      ? 'Today, ' + data.time
      : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + data.time;
    var updates = {
      nextVisit: visitDate,
      nextVisitDetail: data.service + ' with ' + dentist + ', Chair ' + data.chair,
      dentist: dentist,
      status: 'confirmed',
      statusLabel: 'Confirmed',
      visitingToday: isToday
    };
    if (data.phone) updates.phone = data.phone;
    if (data.email) updates.email = data.email;

    var existing = findPatient(data.name);
    if (existing) return window.DentalStorage.updatePatient(existing.id, updates);

    var now = new Date();
    return window.DentalStorage.addPatient(Object.assign({
      firstName: data.firstName,
      lastName: data.lastName,
      lastVisit: 'None yet',
      phone: data.phone,
      email: data.email,
      dentist: dentist,
      patientSince: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isNew: true,
      note: '',
      history: []
    }, updates));
  }

  function saveBooking(data) {
    var schedule = getSchedule(data.date);
    if (getSlot(schedule, data.time, data.chair)) {
      renderAvailableSlots();
      throw new Error('That appointment was just booked. Please choose another available time.');
    }
    if (window.DentalStorage.hasPatientAtTime(schedule, data.name, data.time)) {
      throw new Error('This patient already has an appointment at that time.');
    }

    var patient = savePatient(data);
    if (!patient) throw new Error('The patient record could not be saved.');

    window.DentalStorage.setSlotForDate(data.date, data.time, data.chair, {
      patientId: patient.id,
      patientName: data.name,
      service: data.service,
      status: 'confirmed',
      statusLabel: 'Confirmed'
    });

    var savedSlot = getSlot(getSchedule(data.date), data.time, data.chair);
    if (!savedSlot || savedSlot.patientId !== patient.id) {
      throw new Error('The appointment could not be saved. Please try again.');
    }
  }

  function resetForm() {
    form.reset();
    dateInput.min = localDateKey(new Date());
    dateInput.value = localDateKey(new Date());
    renderAvailableSlots();
    [firstInput, lastInput, phoneInput, emailInput].filter(Boolean).forEach(function (input) {
      markInvalid(input, false);
    });
  }

  dateInput.min = localDateKey(new Date());
  dateInput.value = localDateKey(new Date());
  dateInput.addEventListener('change', function () {
    setStatus('', '');
    renderAvailableSlots();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isSaving) return;
    var data = validate();
    if (!data) return;

    var currentSchedule;
    try {
      currentSchedule = getSchedule(data.date);
    } catch (error) {
      console.error('Could not confirm appointment availability:', error);
      setStatus(error.message || 'Availability could not be checked. Please try again.', 'error');
      return;
    }
    if (getSlot(currentSchedule, data.time, data.chair)) {
      renderAvailableSlots();
      setStatus('That appointment was just booked. Please choose another available time.', 'error');
      return;
    }
    if (window.DentalStorage.hasPatientAtTime(currentSchedule, data.name, data.time)) {
      setStatus('This patient already has an appointment at that time.', 'error');
      return;
    }

    isSaving = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';
    try {
      saveBooking(data);
      resetForm();
      setStatus('Your appointment is booked for ' + data.time + '.', 'ok');
    } catch (error) {
      console.error('Could not complete appointment booking:', error);
      setStatus(error.message || 'The appointment could not be booked. Please try again.', 'error');
    } finally {
      isSaving = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Book appointment';
    }
  });

  [firstInput, lastInput, phoneInput, emailInput].filter(Boolean).forEach(function (input) {
    input.addEventListener('input', function () {
      markInvalid(input, false);
    });
  });

  renderAvailableSlots();
})();
