/* Booking.js
   Handles the "Request an appointment" form on index.html.

   SETUP: fill in CONFIG below, then pick ONE way to receive requests:
   1. endpoint: a form service URL (Formspree, Getform, your own server).
      The form is sent there as JSON.
   2. clinicEmail: leave endpoint empty and requests open the visitor's
      email app, pre-filled and addressed to this address.
*/
(function () {
  'use strict';

  var CONFIG = {
    clinicName: 'Dentistry With a Smile',
    endpoint: '',                         // e.g. 'https://formspree.io/f/your-id'
    clinicEmail: 'YOUR-EMAIL@example.com' // used when endpoint is empty
  };

  var form = document.getElementById('booking-form');
  if (!form) return;

  var firstInput = document.getElementById('pt-fname');
  var lastInput = document.getElementById('pt-lname');
  var phoneInput = document.getElementById('pt-phone');
  var serviceSelect = document.getElementById('pt-service');
  var timeSelect = document.getElementById('pt-time');
  var dayChips = form.querySelectorAll('[data-chips="day"] .chip');
  var submitBtn = form.querySelector('button[type="submit"]');

  // Status line under the button. Created here if index.html does not have one.
  var statusEl = document.getElementById('booking-status');
  if (!statusEl) {
    statusEl = document.createElement('p');
    statusEl.id = 'booking-status';
    statusEl.className = 'status';
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    submitBtn.insertAdjacentElement('afterend', statusEl);
  }

  // Day chips: exactly one selected at a time.
  dayChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      dayChips.forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
    });
  });

  function selectedDay() {
    var picked = form.querySelector('[data-chips="day"] .chip[aria-pressed="true"]');
    return picked ? picked.textContent.trim() : '';
  }

  function setStatus(message, kind) {
    statusEl.textContent = message;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
    // Inline fallback so messages are visible even if style.css has no .status rules.
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

  function validate() {
    var first = firstInput.value.trim();
    var last = lastInput.value.trim();
    var phone = phoneInput.value.trim();
    var digits = phone.replace(/\D/g, '');

    var firstBad = first.length < 1;
    var lastBad = last.length < 1;
    var phoneBad = !/^[+\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 11;

    markInvalid(firstInput, firstBad);
    markInvalid(lastInput, lastBad);
    markInvalid(phoneInput, phoneBad);

    if (firstBad) {
      setStatus('Enter your first name.', 'error');
      firstInput.focus();
      return null;
    }
    if (lastBad) {
      setStatus('Enter your last name.', 'error');
      lastInput.focus();
      return null;
    }
    if (phoneBad) {
      setStatus('Enter a phone number we can call, for example +63 912 345 6789.', 'error');
      phoneInput.focus();
      return null;
    }

    return {
      firstName: first,
      lastName: last,
      name: first + ' ' + last,
      phone: phone,
      service: serviceSelect.value,
      day: selectedDay(),
      time: timeSelect.value
    };
  }

  function summaryText(data) {
    return [
      'Appointment request for ' + CONFIG.clinicName,
      '',
      'Name: ' + data.name,
      'Phone: ' + data.phone,
      'Reason: ' + data.service,
      'Preferred day: ' + data.day,
      'Preferred time: ' + data.time
    ].join('\n');
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Sending...' : 'Request appointment';
  }

  function resetForm() {
    form.reset();
    dayChips.forEach(function (c, i) {
      c.setAttribute('aria-pressed', i === 1 ? 'true' : 'false'); // back to Tue
    });
  }

  function sendToEndpoint(data) {
    setBusy(true);
    setStatus('Sending your request...', '');
    return fetch(CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed with status ' + res.status);
        resetForm();
        setStatus('Thank you, ' + data.firstName + '. We will call you on ' + data.phone + ' to confirm your visit.', 'ok');
      })
      .catch(function () {
        setStatus('We could not send your request. Please try again, or call us.', 'error');
      })
      .then(function () {
        setBusy(false);
      });
  }

  function sendByEmail(data) {
    var subject = 'Appointment request from ' + data.name;
    var href = 'mailto:' + CONFIG.clinicEmail +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(summaryText(data));
    window.location.href = href;
    setStatus('Your email app should open with the request ready to send. Press send to finish.', 'ok');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var data = validate();
    if (!data) return;

    var hasEndpoint = CONFIG.endpoint.trim() !== '';
    var hasEmail = CONFIG.clinicEmail.indexOf('@') > 0 && CONFIG.clinicEmail.indexOf('YOUR-EMAIL') === -1;

    if (hasEndpoint) {
      sendToEndpoint(data);
    } else if (hasEmail) {
      sendByEmail(data);
    } else {
      setStatus('Online requests are not set up yet. Please call us to book.', 'error');
    }
  });

  // Clear the red outline as soon as the visitor edits a field.
  [firstInput, lastInput, phoneInput].forEach(function (input) {
    input.addEventListener('input', function () {
      markInvalid(input, false);
    });
  });
})();