/* patients.js
   Drives the Patients tab: list, search, filter, and detail panel.
   All data is retrieved from and stored in persistent storage (localStorage).
*/
(function () {
  'use strict';

  var STORAGE_KEY = 'dental_patients';

  // ---------- 1. STORAGE FUNCTIONS ----------
  function getStoredPatients() {
    if (window.DentalStorage && typeof window.DentalStorage.getPatients === 'function') {
      return window.DentalStorage.getPatients();
    }
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading patients from localStorage:', e);
      return [];
    }
  }

  function saveStoredPatients(list) {
    if (window.DentalStorage && typeof window.DentalStorage.savePatients === 'function') {
      return window.DentalStorage.savePatients(list);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Error saving patients to localStorage:', e);
      return false;
    }
  }

  function addPatientRecord(patientData) {
    var id = patientData.id || Date.now();
    var newPatient = Object.assign({}, patientData, { id: id });
    patients.push(newPatient);
    saveStoredPatients(patients);
    return newPatient;
  }

  function updatePatientRecord(id, updates) {
    for (var i = 0; i < patients.length; i++) {
      if (patients[i].id === id || String(patients[i].id) === String(id)) {
        Object.assign(patients[i], updates);
        saveStoredPatients(patients);
        return patients[i];
      }
    }
    return null;
  }

  function deletePatientRecord(id) {
    patients = patients.filter(function (p) {
      return p.id !== id && String(p.id) !== String(id);
    });
    saveStoredPatients(patients);
    return patients;
  }

  // Load patients from storage (no hardcoded sample data)
  var patients = getStoredPatients();

  // ---------- 2. STATE ----------
  var state = {
    selectedId: patients.length > 0 ? patients[0].id : null,
    filter: 'all',
    search: ''
  };

  // ---------- 3. ELEMENTS ----------
  var tbodyEl = document.getElementById('patient-tbody');
  var panelEl = document.getElementById('detail-panel');
  var searchInput = document.getElementById('patient-search');
  var filterChipsEl = document.getElementById('filter-chips');
  var countAll = document.getElementById('count-all');
  var countToday = document.getElementById('count-today');
  var countReply = document.getElementById('count-reply');
  var countNew = document.getElementById('count-new');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  // ---------- 4. HELPERS ----------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function initials(p) {
    var f = (p.firstName && p.firstName[0]) || '';
    var l = (p.lastName && p.lastName[0]) || '';
    return (f + l).toUpperCase() || 'PT';
  }

  function fullName(p) {
    return (p.firstName || '') + (p.lastName ? ' ' + p.lastName : '');
  }

  function getPatient(id) {
    if (id === null || id === undefined) return null;
    for (var i = 0; i < patients.length; i++) {
      if (patients[i].id === id || String(patients[i].id) === String(id)) {
        return patients[i];
      }
    }
    return null;
  }

  function pillClass(status) {
    switch (status) {
      case 'checked-in': return 'pill pill--violet';
      case 'confirmed': return 'pill pill--green';
      case 'emergency': return 'pill pill--red';
      case 'needs-reply': return 'pill pill--orange';
      default: return 'pill';
    }
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  // ---------- 5. FILTERING ----------
  function filteredPatients() {
    return patients.filter(function (p) {
      // Search filter
      if (state.search) {
        var q = state.search.toLowerCase();
        var nameMatch = fullName(p).toLowerCase().indexOf(q) >= 0;
        var phoneMatch = (p.phone || '').toLowerCase().indexOf(q) >= 0;
        if (!nameMatch && !phoneMatch) return false;
      }
      // Category filter
      switch (state.filter) {
        case 'today': return Boolean(p.visitingToday);
        case 'reply': return Boolean(p.needsReply);
        case 'new': return Boolean(p.isNew);
        default: return true;
      }
    });
  }

  // ---------- 6. RENDER TABLE ----------
  function renderCounts() {
    if (countAll) countAll.textContent = patients.length;
    if (countToday) countToday.textContent = patients.filter(function (p) { return p.visitingToday; }).length;
    if (countReply) countReply.textContent = patients.filter(function (p) { return p.needsReply; }).length;
    if (countNew) countNew.textContent = patients.filter(function (p) { return p.isNew; }).length;
  }

  function renderTable() {
    tbodyEl.textContent = '';
    var list = filteredPatients();

    if (list.length === 0) {
      var row = el('tr');
      var td = el('td');
      td.setAttribute('colspan', '4');
      td.style.textAlign = 'center';
      td.style.padding = '48px 20px';
      td.style.color = 'var(--muted)';
      if (state.search) {
        td.textContent = 'No patients match your search "' + state.search + '".';
      } else if (patients.length === 0) {
        td.textContent = 'No patients registered yet. Click "Add patient" to create your first record.';
      } else {
        td.textContent = 'No patients found for this filter.';
      }
      row.appendChild(td);
      tbodyEl.appendChild(row);
      return;
    }

    list.forEach(function (p) {
      var tr = document.createElement('tr');
      if (p.id === state.selectedId || String(p.id) === String(state.selectedId)) {
        tr.className = 'is-selected';
      }
      tr.addEventListener('click', function () {
        state.selectedId = p.id;
        render();
      });

      // Patient cell
      var td1 = el('td');
      var cell = el('div', 'patient-cell');
      var av = el('span', 'patient-avatar', initials(p));
      var nm = el('span', 'patient-name', fullName(p));
      cell.appendChild(av);
      cell.appendChild(nm);
      td1.appendChild(cell);
      tr.appendChild(td1);

      // Last visit
      tr.appendChild(el('td', '', p.lastVisit || 'None yet'));

      // Next visit
      tr.appendChild(el('td', '', p.nextVisit || 'None scheduled'));

      // Status
      var td4 = el('td');
      var statusTag = p.statusLabel || (p.status ? p.status.replace('-', ' ') : 'Registered');
      td4.appendChild(el('span', pillClass(p.status), statusTag));
      tr.appendChild(td4);

      tbodyEl.appendChild(tr);
    });
  }

  // ---------- 7. RENDER DETAIL PANEL ----------
  function renderPanel() {
    var p = getPatient(state.selectedId);
    if (!p) {
      if (patients.length > 0) {
        state.selectedId = patients[0].id;
        p = patients[0];
      } else {
        panelEl.hidden = false;
        panelEl.textContent = '';
        var emptyWrap = el('div');
        emptyWrap.style.padding = '48px 24px';
        emptyWrap.style.textAlign = 'center';
        emptyWrap.style.color = 'var(--muted)';
        emptyWrap.appendChild(el('h3', '', 'No patient selected'));
        emptyWrap.appendChild(el('p', '', 'Add a patient or select one from the list to view their details.'));
        panelEl.appendChild(emptyWrap);
        return;
      }
    }

    panelEl.hidden = false;
    panelEl.textContent = '';

    // Header
    var header = el('div', 'detail-header');
    header.appendChild(el('div', 'detail-header__avatar', initials(p)));
    var info = el('div', 'detail-header__info');
    info.appendChild(el('div', 'detail-header__name', fullName(p)));
    info.appendChild(el('span', 'detail-header__pill', p.statusLabel || p.status || 'Registered'));
    header.appendChild(info);
    panelEl.appendChild(header);

    // Body
    var body = el('div', 'detail-body');

    // Next visit box
    var nvBox = el('div', 'next-visit-box');
    nvBox.appendChild(el('div', 'next-visit-box__label', 'Next visit'));
    nvBox.appendChild(el('div', 'next-visit-box__time', p.nextVisit || 'No upcoming visit'));
    if (p.nextVisitDetail) {
      nvBox.appendChild(el('div', 'next-visit-box__detail', p.nextVisitDetail));
    }
    var nvActions = el('div', 'next-visit-box__actions');
    var startBtn = el('button', 'btn btn--green', 'Start visit');
    startBtn.type = 'button';
    startBtn.style.minHeight = '40px';
    startBtn.style.padding = '0 20px';
    startBtn.style.fontSize = '14px';
    startBtn.addEventListener('click', function () {
      p.status = 'checked-in';
      p.statusLabel = 'Checked in';
      p.visitingToday = true;
      updatePatientRecord(p.id, {
        status: 'checked-in',
        statusLabel: 'Checked in',
        visitingToday: true
      });
      if (window.DentalStorage && typeof window.DentalStorage.syncPatientCheckIn === 'function') {
        window.DentalStorage.syncPatientCheckIn(fullName(p));
      }
      showToast('Visit started for ' + fullName(p));
      render();
    });
    nvActions.appendChild(startBtn);

    var reschedBtn = el('button', 'btn btn--outline', 'Reschedule');
    reschedBtn.type = 'button';
    reschedBtn.style.minHeight = '40px';
    reschedBtn.style.padding = '0 20px';
    reschedBtn.style.fontSize = '14px';
    reschedBtn.addEventListener('click', function () {
      showToast('Reschedule requested for ' + fullName(p));
    });
    nvActions.appendChild(reschedBtn);
    nvBox.appendChild(nvActions);
    body.appendChild(nvBox);

    // Info grid
    var grid = el('dl', 'info-grid');
    var infoItems = [
      ['Phone', p.phone || 'None provided'],
      ['Email', p.email || 'None provided'],
      ['Dentist', p.dentist || 'Not assigned'],
      ['Patient since', p.patientSince || 'Recent']
    ];
    infoItems.forEach(function (pair) {
      grid.appendChild(el('dt', '', pair[0]));
      grid.appendChild(el('dd', '', pair[1]));
    });
    body.appendChild(grid);

    // Visit history
    if (p.history && p.history.length > 0) {
      body.appendChild(el('h3', 'detail-section-title', 'Visit history'));
      var historyList = el('div', 'visit-history');
      p.history.forEach(function (v) {
        var item = el('div', 'visit-item');
        var left = el('div');
        left.appendChild(el('div', 'visit-item__type', v.type));
        left.appendChild(el('div', 'visit-item__doc', v.doc));
        item.appendChild(left);
        item.appendChild(el('div', 'visit-item__date', v.date));
        historyList.appendChild(item);
      });
      body.appendChild(historyList);
    }

    // Front desk note
    body.appendChild(el('label', 'note-label', 'Front desk note'));
    var noteArea = document.createElement('textarea');
    noteArea.className = 'note-box';
    noteArea.value = p.note || '';
    noteArea.placeholder = 'Add a note…';
    noteArea.addEventListener('change', function () {
      p.note = noteArea.value;
      updatePatientRecord(p.id, { note: noteArea.value });
    });
    body.appendChild(noteArea);

    panelEl.appendChild(body);
  }

  // ---------- 8. RENDER ----------
  function render() {
    renderCounts();
    renderTable();
    renderPanel();
  }

  // ---------- 9. EVENT LISTENERS ----------
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.search = searchInput.value.trim();
      render();
    });
  }

  if (filterChipsEl) {
    filterChipsEl.addEventListener('click', function (e) {
      var chip = e.target.closest('.fchip');
      if (!chip) return;
      var btns = filterChipsEl.querySelectorAll('.fchip');
      btns.forEach(function (b) { b.classList.remove('is-active'); });
      chip.classList.add('is-active');
      state.filter = chip.getAttribute('data-filter');
      render();
    });
  }

  // ---------- 10. ADD-PATIENT MODAL ----------
  var overlayEl = document.getElementById('modal-overlay');
  var addBtn = document.getElementById('add-patient-btn');
  var closeBtnModal = document.getElementById('modal-close-btn');
  var cancelBtnModal = document.getElementById('modal-cancel-btn');
  var addForm = document.getElementById('add-patient-form');
  var errorEl = document.getElementById('ap-error');
  var dayChips = document.querySelectorAll('#ap-day-chips .modal__chip');

  function openModal() {
    if (!overlayEl) return;
    overlayEl.hidden = false;
    document.body.classList.add('modal-open');
    setTimeout(function () {
      var fname = document.getElementById('ap-fname');
      if (fname) fname.focus();
    }, 60);
  }

  function closeModal() {
    if (!overlayEl) return;
    overlayEl.hidden = true;
    document.body.classList.remove('modal-open');
    if (addForm) addForm.reset();
    if (errorEl) errorEl.hidden = true;
    dayChips.forEach(function (c, i) {
      c.setAttribute('aria-pressed', i === 1 ? 'true' : 'false');
    });
    if (addForm) {
      addForm.querySelectorAll('.is-invalid').forEach(function (inp) {
        inp.classList.remove('is-invalid');
      });
    }
  }

  if (addBtn) addBtn.addEventListener('click', openModal);
  if (closeBtnModal) closeBtnModal.addEventListener('click', closeModal);
  if (cancelBtnModal) cancelBtnModal.addEventListener('click', closeModal);

  if (overlayEl) {
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) closeModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlayEl && !overlayEl.hidden) closeModal();
  });

  dayChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      dayChips.forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
    });
  });

  function getSelectedDay() {
    var picked = document.querySelector('#ap-day-chips .modal__chip[aria-pressed="true"]');
    return picked ? picked.textContent.trim() : 'Tue';
  }

  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fnameInp = document.getElementById('ap-fname');
      var lnameInp = document.getElementById('ap-lname');
      var fname = fnameInp ? fnameInp.value.trim() : '';
      var lname = lnameInp ? lnameInp.value.trim() : '';
      var phone = document.getElementById('ap-phone') ? document.getElementById('ap-phone').value.trim() : '';
      var email = document.getElementById('ap-email') ? document.getElementById('ap-email').value.trim() : '';
      var service = document.getElementById('ap-service') ? document.getElementById('ap-service').value : 'Check-up and cleaning';
      var dentist = document.getElementById('ap-dentist') ? document.getElementById('ap-dentist').value : 'Dr. Mora';
      var day = getSelectedDay();
      var time = document.getElementById('ap-time') ? document.getElementById('ap-time').value : '9:00 am';
      var chair = document.getElementById('ap-chair') ? document.getElementById('ap-chair').value : 'Chair 1';
      var note = document.getElementById('ap-note') ? document.getElementById('ap-note').value.trim() : '';

      addForm.querySelectorAll('.is-invalid').forEach(function (inp) {
        inp.classList.remove('is-invalid');
      });
      if (errorEl) errorEl.hidden = true;

      if (!fname) {
        if (fnameInp) fnameInp.classList.add('is-invalid');
        if (errorEl) {
          errorEl.textContent = 'First name is required.';
          errorEl.hidden = false;
        }
        if (fnameInp) fnameInp.focus();
        return;
      }
      if (!lname) {
        if (lnameInp) lnameInp.classList.add('is-invalid');
        if (errorEl) {
          errorEl.textContent = 'Last name is required.';
          errorEl.hidden = false;
        }
        if (lnameInp) lnameInp.focus();
        return;
      }

      var now = new Date();
      var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var sinceStr = monthNames[now.getMonth()] + ' ' + now.getFullYear();
      var nextVisitStr = day + ', ' + time;
      var detailStr = service + ' with ' + dentist + ', ' + chair;

      var newPatient = {
        firstName: fname,
        lastName: lname,
        lastVisit: 'None yet',
        nextVisit: nextVisitStr,
        nextVisitDetail: detailStr,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        phone: phone || '',
        email: email || '',
        dentist: dentist,
        patientSince: sinceStr,
        isNew: true,
        visitingToday: false,
        needsReply: false,
        note: note,
        history: []
      };

      var saved = addPatientRecord(newPatient);
      state.selectedId = saved.id;
      closeModal();
      render();
      showToast(fname + ' ' + lname + ' added as a new patient.');
    });
  }

  ['ap-fname', 'ap-lname', 'ap-phone', 'ap-email'].forEach(function (id) {
    var inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('input', function () {
        inp.classList.remove('is-invalid');
      });
    }
  });

  // ---------- 11. EXPOSE API FOR EXTERNAL INTEGRATION ----------
  window.DentalPatients = {
    getPatients: function () { return patients; },
    reload: function () {
      patients = getStoredPatients();
      render();
    },
    addPatient: addPatientRecord,
    updatePatient: updatePatientRecord,
    deletePatient: deletePatientRecord
  };

  // ---------- 12. INITIAL RENDER ----------
  render();
})();
