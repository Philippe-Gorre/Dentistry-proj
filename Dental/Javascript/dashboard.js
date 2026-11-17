/* dashboard.js
   Drives the Dashboard:
   - Live headline & current date
   - Live stats (appointments today, checked in, open slots left)
   - Booking requests column (with persistent storage)
   - Chair schedule table wrap (interactive, synced with persistent storage)
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'dental_requests';

  // ---------- 1. STORAGE HELPERS FOR REQUESTS ----------
  function getStoredRequests() {
    if (window.DentalStorage && typeof window.DentalStorage.getRequests === 'function') {
      return window.DentalStorage.getRequests();
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading requests from localStorage:', e);
      return [];
    }
  }

  function saveStoredRequests(list) {
    if (window.DentalStorage && typeof window.DentalStorage.saveRequests === 'function') {
      return window.DentalStorage.saveRequests(list);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Error saving requests to localStorage:', e);
      return false;
    }
  }

  function removeRequestRecord(id) {
    requests = requests.filter(function (r) {
      return r.id !== id && String(r.id) !== String(id);
    });
    saveStoredRequests(requests);
    return requests;
  }

  // Load requests
  var requests = getStoredRequests();

  // ---------- 2. STATE ----------
  var state = {
    openId: requests.length > 0 ? requests[0].id : null,
    chosenSlot: 0,
    activeSlotModal: null // { time, chair, data }
  };

  // ---------- 3. ELEMENTS ----------
  var listEl = document.getElementById('request-list');
  var headlineEl = document.getElementById('headline');
  var todayEl = document.getElementById('today');
  var chairGridEl = document.getElementById('chair-grid');

  var statApptsEl = document.getElementById('stat-appointments');
  var statCheckedInEl = document.getElementById('stat-checkedin');
  var statOpenSlotsEl = document.getElementById('stat-openslots');

  // Modals
  var bookModalOverlay = document.getElementById('modal-book-slot');
  var bookForm = document.getElementById('form-book-slot');
  var bookModalTitle = document.getElementById('book-slot-title');
  var closeBookModalBtn = document.getElementById('close-book-modal');
  var cancelBookModalBtn = document.getElementById('cancel-book-modal');
  var patientsDatalist = document.getElementById('registered-patients-list');

  var manageModalOverlay = document.getElementById('modal-manage-slot');
  var closeManageModalBtn = document.getElementById('close-manage-modal');
  var closeManageBtn = document.getElementById('btn-close-manage');
  var btnCheckinSlot = document.getElementById('btn-checkin-slot');
  var btnCancelSlot = document.getElementById('btn-cancel-slot');
  var managePatientName = document.getElementById('manage-patient-name');
  var managePatientStatus = document.getElementById('manage-patient-status');
  var manageSlotInfo = document.getElementById('manage-slot-info');
  var manageServiceName = document.getElementById('manage-service-name');

  // Toast
  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
  var toastTimer = null;

  // ---------- 4. UTILITIES ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  function getOpenRequest() {
    if (!state.openId) return null;
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id === state.openId || String(requests[i].id) === String(state.openId)) {
        return requests[i];
      }
    }
    return null;
  }

  // ---------- 5. HEADLINE & TODAY DATE ----------
  function renderTodayDate() {
    if (!todayEl) return;
    var d = new Date();
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    todayEl.textContent = days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderHeadline() {
    if (!headlineEl) return;
    var n = requests.length;
    if (n === 0) headlineEl.textContent = 'All booking requests answered';
    else if (n === 1) headlineEl.textContent = '1 booking request needs a reply';
    else headlineEl.textContent = n + ' booking requests need a reply';
  }

  // ---------- 6. STATS CALCULATION ----------
  function renderStats() {
    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    var totalAppts = 0;
    var checkedInCount = 0;
    var openCount = 0;

    schedule.forEach(function (row) {
      [row.chair1, row.chair2].forEach(function (slot) {
        if (!slot) {
          openCount++;
        } else if (slot.type === 'break') {
          // Breaks do not count towards open slots or appointments
        } else if (slot.patientName) {
          totalAppts++;
          if (slot.status === 'checked-in') {
            checkedInCount++;
          }
        }
      });
    });

    if (statApptsEl) statApptsEl.textContent = totalAppts;
    if (statCheckedInEl) statCheckedInEl.textContent = checkedInCount;
    if (statOpenSlotsEl) statOpenSlotsEl.textContent = openCount;
  }

  // ---------- 7. TABLE WRAP (CHAIR GRID) ----------
  function pillStatusHtml(status, label) {
    if (status === 'checked-in') {
      return '<span class="pill pill--violet">' + (label || 'Checked in') + '</span>';
    }
    if (status === 'emergency') {
      return '<span class="pill pill--white-red">' + (label || 'Emergency') + '</span>';
    }
    return '<span class="pill pill--green">' + (label || 'Confirmed') + '</span>';
  }

  function buildChairSlot(time, chairNum, slot) {
    // 1. Break slot
    if (slot && slot.type === 'break') {
      var breakBox = el('div', 'slot slot--break', slot.label || 'Lunch break');
      return breakBox;
    }

    // 2. Open slot
    if (!slot || !slot.patientName) {
      var openBox = el('div', 'slot slot--open');
      openBox.appendChild(el('span', '', 'Open'));

      var addBtn = el('button', 'link btn-add-slot', 'Add');
      addBtn.type = 'button';
      addBtn.setAttribute('data-time', time);
      addBtn.setAttribute('data-chair', chairNum);
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openBookModal(time, chairNum);
      });
      openBox.appendChild(addBtn);
      return openBox;
    }

    // 3. Booked slot
    var slotClass = 'slot';
    if (slot.status === 'checked-in') {
      slotClass += ' slot--checkedin';
    } else if (slot.status === 'emergency') {
      slotClass += ' slot--emergency';
    } else {
      slotClass += ' slot--appt';
    }

    var bookedBox = el('div', slotClass);
    bookedBox.setAttribute('data-has-appt', 'true');
    bookedBox.setAttribute('title', 'Click to manage appointment');

    var row = el('div', 'slot__row');
    row.appendChild(el('strong', '', slot.patientName));
    row.insertAdjacentHTML('beforeend', pillStatusHtml(slot.status, slot.statusLabel));
    bookedBox.appendChild(row);

    if (slot.service) {
      bookedBox.appendChild(el('span', 'slot__sub', slot.service));
    }

    bookedBox.addEventListener('click', function () {
      openManageModal(time, chairNum, slot);
    });

    return bookedBox;
  }

  function renderSchedule() {
    if (!chairGridEl) return;
    chairGridEl.textContent = '';

    var schedule = (window.DentalStorage && typeof window.DentalStorage.getSchedule === 'function')
      ? window.DentalStorage.getSchedule()
      : [];

    // Header cells
    chairGridEl.appendChild(el('div')); // Empty corner

    var chair1Head = el('div', 'chair-head');
    chair1Head.appendChild(el('strong', '', 'Chair 1'));
    chair1Head.appendChild(el('span', 'muted', 'Dr. Mora'));
    chairGridEl.appendChild(chair1Head);

    var chair2Head = el('div', 'chair-head');
    chair2Head.appendChild(el('strong', '', 'Chair 2'));
    chair2Head.appendChild(el('span', 'muted', 'Dr. Silva'));
    chairGridEl.appendChild(chair2Head);

    // Rows
    schedule.forEach(function (row) {
      // Time label
      chairGridEl.appendChild(el('div', 'time', row.time));

      // Chair 1
      chairGridEl.appendChild(buildChairSlot(row.time, 1, row.chair1));

      // Chair 2
      chairGridEl.appendChild(buildChairSlot(row.time, 2, row.chair2));
    });
  }

  // ---------- 8. MODAL ACTIONS (SLOT BOOKING & MANAGING) ----------
  function openBookModal(time, chairNum) {
    if (!bookModalOverlay) return;
    state.activeSlotModal = { time: time, chair: chairNum };
    var chairName = chairNum === 1 ? 'Chair 1 (Dr. Mora)' : 'Chair 2 (Dr. Silva)';
    if (bookModalTitle) bookModalTitle.textContent = 'Book ' + chairName + ' at ' + time;

    // Populate registered patients datalist
    if (patientsDatalist && window.DentalStorage) {
      patientsDatalist.textContent = '';
      var patients = window.DentalStorage.getPatients();
      patients.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = (p.firstName || '') + (p.lastName ? ' ' + p.lastName : '');
        patientsDatalist.appendChild(opt);
      });
    }

    if (bookForm) bookForm.reset();
    bookModalOverlay.hidden = false;
    setTimeout(function () {
      var nameInp = document.getElementById('slot-patient-name');
      if (nameInp) nameInp.focus();
    }, 60);
  }

  function closeBookModal() {
    if (bookModalOverlay) bookModalOverlay.hidden = true;
    state.activeSlotModal = null;
  }

  if (closeBookModalBtn) closeBookModalBtn.addEventListener('click', closeBookModal);
  if (cancelBookModalBtn) cancelBookModalBtn.addEventListener('click', closeBookModal);

  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!state.activeSlotModal) return;

      var name = document.getElementById('slot-patient-name').value.trim();
      var service = document.getElementById('slot-service').value;
      var status = document.getElementById('slot-status').value;
      var statusLabel = status === 'emergency' ? 'Emergency' : status === 'checked-in' ? 'Checked in' : 'Confirmed';

      if (!name) return;

      var slotData = {
        patientName: name,
        service: service,
        status: status,
        statusLabel: statusLabel
      };

      if (window.DentalStorage && typeof window.DentalStorage.setSlot === 'function') {
        window.DentalStorage.setSlot(state.activeSlotModal.time, state.activeSlotModal.chair, slotData);
      }

      closeBookModal();
      renderSchedule();
      renderStats();
      showToast('Booked ' + name + ' for ' + state.activeSlotModal.time);
    });
  }

  function openManageModal(time, chairNum, slot) {
    if (!manageModalOverlay) return;
    state.activeSlotModal = { time: time, chair: chairNum, slot: slot };

    if (managePatientName) managePatientName.textContent = slot.patientName;
    if (managePatientStatus) {
      managePatientStatus.textContent = slot.statusLabel || (slot.status === 'checked-in' ? 'Checked in' : 'Confirmed');
      managePatientStatus.className = slot.status === 'checked-in'
        ? 'pill pill--violet'
        : slot.status === 'emergency'
          ? 'pill pill--white-red'
          : 'pill pill--green';
    }
    if (manageSlotInfo) {
      var doc = chairNum === 1 ? 'Dr. Mora' : 'Dr. Silva';
      manageSlotInfo.textContent = time + ' • Chair ' + chairNum + ' (' + doc + ')';
    }
    if (manageServiceName) {
      manageServiceName.textContent = slot.service || 'Appointment';
    }

    if (btnCheckinSlot) {
      btnCheckinSlot.style.display = slot.status === 'checked-in' ? 'none' : 'inline-flex';
    }

    manageModalOverlay.hidden = false;
  }

  function closeManageModal() {
    if (manageModalOverlay) manageModalOverlay.hidden = true;
    state.activeSlotModal = null;
  }

  if (closeManageModalBtn) closeManageModalBtn.addEventListener('click', closeManageModal);
  if (closeManageBtn) closeManageBtn.addEventListener('click', closeManageModal);

  if (btnCheckinSlot) {
    btnCheckinSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      if (window.DentalStorage && typeof window.DentalStorage.checkInSlot === 'function') {
        window.DentalStorage.checkInSlot(state.activeSlotModal.time, state.activeSlotModal.chair);
      }
      var pName = state.activeSlotModal.slot ? state.activeSlotModal.slot.patientName : 'Patient';
      closeManageModal();
      renderSchedule();
      renderStats();
      showToast('Checked in ' + pName);
    });
  }

  if (btnCancelSlot) {
    btnCancelSlot.addEventListener('click', function () {
      if (!state.activeSlotModal) return;
      if (window.DentalStorage && typeof window.DentalStorage.clearSlot === 'function') {
        window.DentalStorage.clearSlot(state.activeSlotModal.time, state.activeSlotModal.chair);
      }
      var pName = state.activeSlotModal.slot ? state.activeSlotModal.slot.patientName : 'Patient';
      closeManageModal();
      renderSchedule();
      renderStats();
      showToast('Cancelled appointment for ' + pName);
    });
  }

  // Close modals on overlay click or Escape
  [bookModalOverlay, manageModalOverlay].forEach(function (overlay) {
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.hidden = true;
          state.activeSlotModal = null;
        }
      });
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (bookModalOverlay) bookModalOverlay.hidden = true;
      if (manageModalOverlay) manageModalOverlay.hidden = true;
      state.activeSlotModal = null;
    }
  });

  // ---------- 9. BOOKING REQUESTS COLUMN ----------
  function openRequest(id) {
    state.openId = id;
    state.chosenSlot = 0;
    renderRequests();
  }

  function pickSlot(index) {
    state.chosenSlot = index;
    renderRequests();
  }

  function removeOpenRequest(message) {
    var targetId = state.openId;
    removeRequestRecord(targetId);
    state.openId = requests.length > 0 ? requests[0].id : null;
    state.chosenSlot = 0;
    showToast(message);
    renderAll();
  }

  function confirmRequest() {
    var req = getOpenRequest();
    if (!req) return;

    var chosenSlotLabel = (req.slots && req.slots[state.chosenSlot]) || '12:00 pm, Chair 1';

    // Parse time and chair from chosenSlotLabel
    var isChair2 = chosenSlotLabel.indexOf('Chair 2') >= 0;
    var chairNum = isChair2 ? 2 : 1;
    var dentistName = isChair2 ? 'Dr. Silva' : 'Dr. Mora';

    // Extract time (e.g. "11:00 am", "12:00 pm", etc.)
    var timeMatch = chosenSlotLabel.match(/\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i);
    var slotTime = timeMatch ? timeMatch[0] : '12:00 pm';

    // 1. Book on the chair schedule table wrap
    if (window.DentalStorage && typeof window.DentalStorage.setSlot === 'function') {
      window.DentalStorage.setSlot(slotTime, chairNum, {
        patientName: req.name,
        service: req.reason || 'Check-up',
        status: 'confirmed',
        statusLabel: 'Confirmed'
      });
    }

    // 2. Also register in Patients tab
    try {
      var parts = (req.name || 'New Patient').trim().split(/\s+/);
      var fname = parts[0] || 'Patient';
      var lname = parts.slice(1).join(' ') || '';

      var patientRecord = {
        id: Date.now(),
        firstName: fname,
        lastName: lname,
        lastVisit: 'None yet',
        nextVisit: 'Today, ' + slotTime,
        nextVisitDetail: (req.reason || 'Dental care') + ' with ' + dentistName + ', Chair ' + chairNum,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        phone: req.phone || '',
        email: req.email || '',
        dentist: dentistName,
        patientSince: 'Recent',
        isNew: true,
        visitingToday: true,
        needsReply: false,
        note: req.reason ? 'Booking reason: ' + req.reason : '',
        history: []
      };

      if (window.DentalStorage && typeof window.DentalStorage.addPatient === 'function') {
        window.DentalStorage.addPatient(patientRecord);
      }
    } catch (err) {
      console.warn('Could not auto-add confirmed patient:', err);
    }

    removeOpenRequest('Confirmed ' + req.name + ' for ' + slotTime + ' (Chair ' + chairNum + '). Scheduled for today!');
  }

  function declineRequest() {
    var req = getOpenRequest();
    if (!req) return;
    removeOpenRequest('Declined the request from ' + req.name + '.');
  }

  function buildOpenCard(req) {
    var card = el('article', 'request-open');

    var head = el('div', 'request-open__head');
    head.appendChild(el('h2', '', req.name));
    head.appendChild(el('span', '', req.received || 'Received recently'));
    card.appendChild(head);

    var details = el('dl', 'details');
    [
      ['Reason', req.reason || 'Check-up'],
      ['Asked for', req.askedFor || 'Preferred time'],
      ['Phone', req.phone || 'None provided']
    ].forEach(function (pair) {
      details.appendChild(el('dt', '', pair[0]));
      details.appendChild(el('dd', '', pair[1]));
    });
    card.appendChild(details);

    var slots = (req.slots && req.slots.length > 0)
      ? req.slots
      : ['12:00 pm, Chair 1', '1:00 pm, Chair 2'];

    var fieldset = el('fieldset', 'slots');
    fieldset.appendChild(el('legend', '', 'Slots that are free'));
    var chips = el('div', 'slots__chips');
    slots.forEach(function (label, i) {
      var chip = el('button', 'chip', label);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', i === state.chosenSlot ? 'true' : 'false');
      chip.addEventListener('click', function () { pickSlot(i); });
      chips.appendChild(chip);
    });
    fieldset.appendChild(chips);
    card.appendChild(fieldset);

    var actions = el('div', 'actions');

    var chosenLabel = slots[state.chosenSlot] || slots[0];
    var confirmBtn = el('button', 'btn btn--primary', 'Confirm ' + chosenLabel);
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', confirmRequest);
    actions.appendChild(confirmBtn);

    var callBtn = el('a', 'btn btn--outline', 'Call patient');
    callBtn.href = 'tel:' + (req.phone ? req.phone.replace(/[^\d+]/g, '') : '');
    actions.appendChild(callBtn);

    var declineBtn = el('button', 'btn btn--danger', 'Decline');
    declineBtn.type = 'button';
    declineBtn.addEventListener('click', declineRequest);
    actions.appendChild(declineBtn);

    card.appendChild(actions);
    return card;
  }

  function buildRow(req) {
    var row = el('button', 'request-row');
    row.type = 'button';

    var who = el('div', 'request-row__who');
    who.appendChild(el('strong', '', req.name));
    who.appendChild(el('span', '', (req.reason || 'Visit') + ', asked for ' + (req.askedFor || 'upcoming')));
    row.appendChild(who);

    row.insertAdjacentHTML('beforeend',
      '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="#5B5476" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M7 4l6 6-6 6"></path></svg>');

    row.addEventListener('click', function () { openRequest(req.id); });
    return row;
  }

  function buildEmptyState() {
    var box = el('div', 'empty');
    box.appendChild(el('strong', '', 'No requests waiting'));
    box.appendChild(el('span', '', 'New requests from the website form will appear here.'));
    return box;
  }

  function renderRequests() {
    renderHeadline();
    if (!listEl) return;
    listEl.textContent = '';

    if (requests.length === 0) {
      listEl.appendChild(buildEmptyState());
      return;
    }

    if (!getOpenRequest()) {
      state.openId = requests[0].id;
    }

    requests.forEach(function (req) {
      if (req.id === state.openId || String(req.id) === String(state.openId)) {
        listEl.appendChild(buildOpenCard(req));
      } else {
        listEl.appendChild(buildRow(req));
      }
    });
  }

  // ---------- 10. COMBINED RENDER FUNCTION ----------
  function renderAll() {
    renderTodayDate();
    renderHeadline();
    renderStats();
    renderRequests();
    renderSchedule();
  }

  // ---------- 11. PUBLIC API FOR EXTERNAL CALLS ----------
  window.DentalDashboard = {
    getRequests: function () { return requests; },
    reload: function () {
      requests = getStoredRequests();
      renderAll();
    },
    renderStats: renderStats,
    renderSchedule: renderSchedule,
    addRequest: function (req) {
      requests.push(req);
      saveStoredRequests(requests);
      renderAll();
    }
  };

  // ---------- 12. INITIAL START ----------
  renderAll();
})();
