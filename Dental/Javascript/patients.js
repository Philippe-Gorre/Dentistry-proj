/* patients.js
   Drives the Patients tab: list, search, filter, and detail panel.
   All data lives in the `patients` array – later this comes from a server.
*/
(function () {
  'use strict';

  // ---------- 1. DATA ----------
  var patients = [
    {
      id: 1,
      firstName: 'Priya',
      lastName: 'Nair',
      lastVisit: '2 Aug 2026',
      nextVisit: 'Today, 11:00 am',
      nextVisitDetail: 'Whitening with Dr. Mora, Chair 1',
      status: 'checked-in',
      statusLabel: 'Checked in',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Mora',
      patientSince: 'March 2024',
      isNew: false,
      visitingToday: true,
      needsReply: false,
      note: 'Prefers morning appointments.',
      history: [
        { type: 'Check-up and cleaning', doc: 'Dr. Mora', date: '2 Aug 2026' },
        { type: 'Filling', doc: 'Dr. Silva', date: '11 Feb 2026' },
        { type: 'Check-up and cleaning', doc: 'Dr. Mora', date: '29 Jul 2025' }
      ]
    },
    {
      id: 2,
      firstName: 'Tomas',
      lastName: 'Lee',
      lastVisit: '3 Jun 2026',
      nextVisit: 'Today, 12:00 pm',
      nextVisitDetail: 'Broken tooth with Dr. Silva, Chair 2',
      status: 'emergency',
      statusLabel: 'Emergency',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Silva',
      patientSince: 'June 2025',
      isNew: false,
      visitingToday: true,
      needsReply: false,
      note: '',
      history: [
        { type: 'Check-up and cleaning', doc: 'Dr. Silva', date: '3 Jun 2026' },
        { type: 'Filling', doc: 'Dr. Silva', date: '20 Jan 2026' }
      ]
    },
    {
      id: 3,
      firstName: 'Hannah',
      lastName: 'Brooks',
      lastVisit: '20 Oct 2026',
      nextVisit: 'Today, 2:00 pm',
      nextVisitDetail: 'Aligner check with Dr. Mora, Chair 1',
      status: 'confirmed',
      statusLabel: 'Confirmed',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Mora',
      patientSince: 'October 2023',
      isNew: false,
      visitingToday: true,
      needsReply: false,
      note: '',
      history: [
        { type: 'Aligner check', doc: 'Dr. Mora', date: '20 Oct 2026' },
        { type: 'Aligner fitting', doc: 'Dr. Mora', date: '15 Jul 2026' }
      ]
    },
    {
      id: 4,
      firstName: 'Jun',
      lastName: 'Park',
      lastVisit: 'None yet',
      nextVisit: 'Today, 3:00 pm',
      nextVisitDetail: "Child's first visit with Dr. Silva, Chair 2",
      status: 'confirmed',
      statusLabel: 'Confirmed',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Silva',
      patientSince: 'November 2026',
      isNew: true,
      visitingToday: true,
      needsReply: false,
      note: '',
      history: []
    },
    {
      id: 5,
      firstName: 'Leila',
      lastName: 'Haddad',
      lastVisit: '9 Nov 2026',
      nextVisit: 'Today, 4:00 pm',
      nextVisitDetail: 'Crown fitting with Dr. Mora, Chair 1',
      status: 'confirmed',
      statusLabel: 'Confirmed',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Mora',
      patientSince: 'May 2024',
      isNew: false,
      visitingToday: true,
      needsReply: false,
      note: '',
      history: [
        { type: 'Crown prep', doc: 'Dr. Mora', date: '9 Nov 2026' },
        { type: 'Check-up and cleaning', doc: 'Dr. Mora', date: '12 May 2026' }
      ]
    },
    {
      id: 6,
      firstName: 'Marcus',
      lastName: 'Webb',
      lastVisit: 'None yet',
      nextVisit: 'Tue, 9:00 am',
      nextVisitDetail: 'Toothache with Dr. Mora, Chair 1',
      status: 'needs-reply',
      statusLabel: 'Needs a reply',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Mora',
      patientSince: 'November 2026',
      isNew: true,
      visitingToday: false,
      needsReply: true,
      note: '',
      history: []
    },
    {
      id: 7,
      firstName: 'Sofia',
      lastName: 'Alvarez',
      lastVisit: '14 Feb 2026',
      nextVisit: 'Wed, 2:00 pm',
      nextVisitDetail: 'Check-up and cleaning with Dr. Silva, Chair 2',
      status: 'needs-reply',
      statusLabel: 'Needs a reply',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Silva',
      patientSince: 'February 2025',
      isNew: false,
      visitingToday: false,
      needsReply: true,
      note: '',
      history: [
        { type: 'Check-up and cleaning', doc: 'Dr. Silva', date: '14 Feb 2026' },
        { type: 'Whitening', doc: 'Dr. Silva', date: '20 Aug 2025' }
      ]
    },
    {
      id: 8,
      firstName: 'Ben',
      lastName: 'Okafor',
      lastVisit: 'None yet',
      nextVisit: 'Sat, 10:00 am',
      nextVisitDetail: 'Braces consultation with Dr. Mora, Chair 1',
      status: 'needs-reply',
      statusLabel: 'Needs a reply',
      phone: '[PATIENT PHONE]',
      email: '[PATIENT EMAIL]',
      dentist: 'Dr. Mora',
      patientSince: 'November 2026',
      isNew: false,
      visitingToday: false,
      needsReply: true,
      note: '',
      history: []
    }
  ];

  // ---------- 2. STATE ----------
  var state = {
    selectedId: patients[0].id,
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
    return (p.firstName[0] + p.lastName[0]).toUpperCase();
  }

  function fullName(p) {
    return p.firstName + ' ' + p.lastName;
  }

  function getPatient(id) {
    for (var i = 0; i < patients.length; i++) {
      if (patients[i].id === id) return patients[i];
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
        var phoneMatch = p.phone.toLowerCase().indexOf(q) >= 0;
        if (!nameMatch && !phoneMatch) return false;
      }
      // Category filter
      switch (state.filter) {
        case 'today': return p.visitingToday;
        case 'reply': return p.needsReply;
        case 'new': return p.isNew;
        default: return true;
      }
    });
  }

  // ---------- 6. RENDER TABLE ----------
  function renderCounts() {
    countAll.textContent = patients.length;
    countToday.textContent = patients.filter(function (p) { return p.visitingToday; }).length;
    countReply.textContent = patients.filter(function (p) { return p.needsReply; }).length;
    countNew.textContent = patients.filter(function (p) { return p.isNew; }).length;
  }

  function renderTable() {
    tbodyEl.textContent = '';
    var list = filteredPatients();

    if (list.length === 0) {
      var row = el('tr');
      var td = el('td');
      td.setAttribute('colspan', '4');
      td.style.textAlign = 'center';
      td.style.padding = '40px 20px';
      td.style.color = 'var(--muted)';
      td.textContent = 'No patients match your search.';
      row.appendChild(td);
      tbodyEl.appendChild(row);
      return;
    }

    list.forEach(function (p) {
      var tr = document.createElement('tr');
      if (p.id === state.selectedId) tr.className = 'is-selected';
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
      tr.appendChild(el('td', '', p.lastVisit));

      // Next visit
      tr.appendChild(el('td', '', p.nextVisit));

      // Status
      var td4 = el('td');
      td4.appendChild(el('span', pillClass(p.status), p.statusLabel));
      tr.appendChild(td4);

      tbodyEl.appendChild(tr);
    });
  }

  // ---------- 7. RENDER DETAIL PANEL ----------
  function renderPanel() {
    var p = getPatient(state.selectedId);
    if (!p) {
      panelEl.hidden = true;
      return;
    }
    panelEl.hidden = false;
    panelEl.textContent = '';

    // Header
    var header = el('div', 'detail-header');
    header.appendChild(el('div', 'detail-header__avatar', initials(p)));
    var info = el('div', 'detail-header__info');
    info.appendChild(el('div', 'detail-header__name', fullName(p)));
    info.appendChild(el('span', 'detail-header__pill', p.statusLabel));
    header.appendChild(info);
    panelEl.appendChild(header);

    // Body
    var body = el('div', 'detail-body');

    // Next visit box
    var nvBox = el('div', 'next-visit-box');
    nvBox.appendChild(el('div', 'next-visit-box__label', 'Next visit'));
    nvBox.appendChild(el('div', 'next-visit-box__time', p.nextVisit));
    nvBox.appendChild(el('div', 'next-visit-box__detail', p.nextVisitDetail));
    var nvActions = el('div', 'next-visit-box__actions');
    var startBtn = el('button', 'btn btn--green', 'Start visit');
    startBtn.type = 'button';
    startBtn.style.minHeight = '40px';
    startBtn.style.padding = '0 20px';
    startBtn.style.fontSize = '14px';
    startBtn.addEventListener('click', function () { showToast('Visit started for ' + fullName(p)); });
    nvActions.appendChild(startBtn);
    var reschedBtn = el('button', 'btn btn--outline', 'Reschedule');
    reschedBtn.type = 'button';
    reschedBtn.style.minHeight = '40px';
    reschedBtn.style.padding = '0 20px';
    reschedBtn.style.fontSize = '14px';
    reschedBtn.addEventListener('click', function () { showToast('Reschedule requested for ' + fullName(p)); });
    nvActions.appendChild(reschedBtn);
    nvBox.appendChild(nvActions);
    body.appendChild(nvBox);

    // Info grid
    var grid = el('dl', 'info-grid');
    var infoItems = [
      ['Phone', p.phone],
      ['Email', p.email],
      ['Dentist', p.dentist],
      ['Patient since', p.patientSince]
    ];
    infoItems.forEach(function (pair) {
      grid.appendChild(el('dt', '', pair[0]));
      grid.appendChild(el('dd', '', pair[1]));
    });
    body.appendChild(grid);

    // Visit history
    if (p.history.length > 0) {
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
    noteArea.value = p.note;
    noteArea.placeholder = 'Add a note…';
    noteArea.addEventListener('change', function () {
      p.note = noteArea.value;
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

  // Search
  searchInput.addEventListener('input', function () {
    state.search = searchInput.value.trim();
    render();
  });

  // Filter chips
  filterChipsEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.fchip');
    if (!chip) return;
    var btns = filterChipsEl.querySelectorAll('.fchip');
    btns.forEach(function (b) { b.classList.remove('is-active'); });
    chip.classList.add('is-active');
    state.filter = chip.getAttribute('data-filter');
    render();
  });

  // ---------- 10. ADD-PATIENT MODAL ----------
  var overlayEl = document.getElementById('modal-overlay');
  var addBtn = document.getElementById('add-patient-btn');
  var closeBtnModal = document.getElementById('modal-close-btn');
  var cancelBtnModal = document.getElementById('modal-cancel-btn');
  var addForm = document.getElementById('add-patient-form');
  var errorEl = document.getElementById('ap-error');
  var dayChips = document.querySelectorAll('#ap-day-chips .modal__chip');

  function openModal() {
    overlayEl.hidden = false;
    document.body.classList.add('modal-open');
    // Auto-focus first field
    setTimeout(function () { document.getElementById('ap-fname').focus(); }, 60);
  }

  function closeModal() {
    overlayEl.hidden = true;
    document.body.classList.remove('modal-open');
    addForm.reset();
    errorEl.hidden = true;
    // Reset day chips to Tue
    dayChips.forEach(function (c, i) {
      c.setAttribute('aria-pressed', i === 1 ? 'true' : 'false');
    });
    // Clear any invalid states
    addForm.querySelectorAll('.is-invalid').forEach(function (inp) {
      inp.classList.remove('is-invalid');
    });
  }

  addBtn.addEventListener('click', openModal);
  closeBtnModal.addEventListener('click', closeModal);
  cancelBtnModal.addEventListener('click', closeModal);

  // Click backdrop to close
  overlayEl.addEventListener('click', function (e) {
    if (e.target === overlayEl) closeModal();
  });

  // Escape key to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlayEl.hidden) closeModal();
  });

  // Day chip toggling
  dayChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      dayChips.forEach(function (c) {
        c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
      });
    });
  });

  function getSelectedDay() {
    var picked = document.querySelector('#ap-day-chips .modal__chip[aria-pressed="true"]');
    return picked ? picked.textContent.trim() : '';
  }

  // Form submit — add the patient
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var fname = document.getElementById('ap-fname').value.trim();
    var lname = document.getElementById('ap-lname').value.trim();
    var phone = document.getElementById('ap-phone').value.trim();
    var email = document.getElementById('ap-email').value.trim();
    var service = document.getElementById('ap-service').value;
    var dentist = document.getElementById('ap-dentist').value;
    var day = getSelectedDay();
    var time = document.getElementById('ap-time').value;
    var chair = document.getElementById('ap-chair').value;
    var note = document.getElementById('ap-note').value.trim();

    // Reset invalid states
    addForm.querySelectorAll('.is-invalid').forEach(function (inp) {
      inp.classList.remove('is-invalid');
    });
    errorEl.hidden = true;

    // Validate
    if (!fname) {
      document.getElementById('ap-fname').classList.add('is-invalid');
      errorEl.textContent = 'First name is required.';
      errorEl.hidden = false;
      document.getElementById('ap-fname').focus();
      return;
    }
    if (!lname) {
      document.getElementById('ap-lname').classList.add('is-invalid');
      errorEl.textContent = 'Last name is required.';
      errorEl.hidden = false;
      document.getElementById('ap-lname').focus();
      return;
    }

    // Build the new patient
    var nextId = 1;
    patients.forEach(function (p) { if (p.id >= nextId) nextId = p.id + 1; });

    var now = new Date();
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var sinceStr = monthNames[now.getMonth()] + ' ' + now.getFullYear();
    var nextVisitStr = day + ', ' + time;
    var detailStr = service + ' with ' + dentist + ', ' + chair;

    var newPatient = {
      id: nextId,
      firstName: fname,
      lastName: lname,
      lastVisit: 'None yet',
      nextVisit: nextVisitStr,
      nextVisitDetail: detailStr,
      status: 'confirmed',
      statusLabel: 'Confirmed',
      phone: phone || '[PATIENT PHONE]',
      email: email || '[PATIENT EMAIL]',
      dentist: dentist,
      patientSince: sinceStr,
      isNew: true,
      visitingToday: false,
      needsReply: false,
      note: note,
      history: []
    };

    patients.push(newPatient);
    state.selectedId = newPatient.id;
    closeModal();
    render();
    showToast(fname + ' ' + lname + ' added as a new patient.');
  });

  // Clear invalid style on input
  ['ap-fname', 'ap-lname', 'ap-phone', 'ap-email'].forEach(function (id) {
    var inp = document.getElementById(id);
    if (inp) {
      inp.addEventListener('input', function () {
        inp.classList.remove('is-invalid');
      });
    }
  });

  // ---------- 11. START ----------
  render();
})();
