/* dashboard.js
   Drives the "booking requests" column of the dashboard.
   The page shows ONE open request at a time. The others are collapsed rows.
   Everything is rebuilt from the `requests` array, so the data is the single
   source of truth.
*/
(function () {
  'use strict';

  // ---------- 1. DATA ----------
  // Later this array will come from your server instead of being typed here.
  var requests = [
    {
      id: 1,
      name: 'Marcus Webb',
      reason: 'Toothache or something broken',
      askedFor: 'Tuesday, 9:00 am',
      phone: '[PATIENT PHONE]',
      received: 'Received 9:12 am',
      slots: ['Tue 9:00 am, Chair 1', 'Tue 10:00 am, Chair 2', 'Wed 11:00 am, Chair 1']
    },
    {
      id: 2,
      name: 'Sofia Alvarez',
      reason: 'Check-up and cleaning',
      askedFor: 'Wednesday, 2:00 pm',
      phone: '[PATIENT PHONE]',
      received: 'Received 10:40 am',
      slots: ['Wed 2:00 pm, Chair 2', 'Wed 3:00 pm, Chair 1', 'Thu 9:00 am, Chair 1']
    },
    {
      id: 3,
      name: 'Ben Okafor',
      reason: 'Braces or aligners',
      askedFor: 'Saturday, 10:00 am',
      phone: '[PATIENT PHONE]',
      received: 'Received 11:05 am',
      slots: ['Sat 10:00 am, Chair 1', 'Sat 11:00 am, Chair 2']
    }
  ];

  // ---------- 2. STATE ----------
  // Two things change while the page is used: which request is open,
  // and which time slot is picked for it.
  var state = {
    openId: requests[0].id,
    chosenSlot: 0
  };

  // ---------- 3. PAGE ELEMENTS ----------
  var listEl = document.getElementById('request-list');
  var headlineEl = document.getElementById('headline');
  var toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.setAttribute('role', 'status');
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
  var toastTimer = null;

  // ---------- 4. SMALL HELPERS ----------

  // Make an element in one line: tag, class, and optional text.
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getOpenRequest() {
    for (var i = 0; i < requests.length; i++) {
      if (requests[i].id === state.openId) return requests[i];
    }
    return null;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }

  // ---------- 5. ACTIONS ----------
  // Each action changes the data or the state, then calls render() once.

  function openRequest(id) {
    state.openId = id;
    state.chosenSlot = 0;
    render();
  }

  function pickSlot(index) {
    state.chosenSlot = index;
    render();
  }

  function removeOpenRequest(message) {
    requests = requests.filter(function (r) { return r.id !== state.openId; });
    state.openId = requests.length ? requests[0].id : null;
    state.chosenSlot = 0;
    showToast(message);
    render();
  }

  function confirmRequest() {
    var req = getOpenRequest();
    if (!req) return;
    removeOpenRequest('Confirmed ' + req.name + ' for ' + req.slots[state.chosenSlot] + '.');
  }

  function declineRequest() {
    var req = getOpenRequest();
    if (!req) return;
    removeOpenRequest('Declined the request from ' + req.name + '.');
  }

  // ---------- 6. RENDER ----------
  // Wipes the list and rebuilds it from `requests` and `state`.

  function renderHeadline() {
    var n = requests.length;
    if (n === 0) headlineEl.textContent = 'All requests answered';
    else if (n === 1) headlineEl.textContent = '1 booking request needs a reply';
    else headlineEl.textContent = n + ' booking requests need a reply';
  }

  function buildOpenCard(req) {
    var card = el('article', 'request-open');

    var head = el('div', 'request-open__head');
    head.appendChild(el('h2', '', req.name));
    head.appendChild(el('span', '', req.received));
    card.appendChild(head);

    var details = el('dl', 'details');
    [['Reason', req.reason], ['Asked for', req.askedFor], ['Phone', req.phone]].forEach(function (pair) {
      details.appendChild(el('dt', '', pair[0]));
      details.appendChild(el('dd', '', pair[1]));
    });
    card.appendChild(details);

    var fieldset = el('fieldset', 'slots');
    fieldset.appendChild(el('legend', '', 'Slots that are free'));
    var chips = el('div', 'slots__chips');
    req.slots.forEach(function (label, i) {
      var chip = el('button', 'chip', label);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', i === state.chosenSlot ? 'true' : 'false');
      chip.addEventListener('click', function () { pickSlot(i); });
      chips.appendChild(chip);
    });
    fieldset.appendChild(chips);
    card.appendChild(fieldset);

    var actions = el('div', 'actions');

    var confirmBtn = el('button', 'btn btn--primary', 'Confirm ' + req.slots[state.chosenSlot]);
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', confirmRequest);
    actions.appendChild(confirmBtn);

    var callBtn = el('a', 'btn btn--outline', 'Call patient');
    callBtn.href = 'tel:' + req.phone.replace(/[^\d+]/g, '');
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
    who.appendChild(el('span', '', req.reason + ', asked for ' + req.askedFor));
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

  function render() {
    renderHeadline();
    listEl.textContent = '';

    if (requests.length === 0) {
      listEl.appendChild(buildEmptyState());
      return;
    }

    requests.forEach(function (req) {
      if (req.id === state.openId) listEl.appendChild(buildOpenCard(req));
      else listEl.appendChild(buildRow(req));
    });
  }

  // ---------- 7. START ----------
  render();
})();