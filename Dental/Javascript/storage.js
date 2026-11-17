/* storage.js
   Central storage layer using browser localStorage.
   Handles persistent saving, retrieval, and updating of:
   - Patients (list, history, notes, statuses)
   - Booking requests (from web form or dashboard)
*/
(function (global) {
  'use strict';

  var PATIENTS_KEY = 'dental_patients';
  var REQUESTS_KEY = 'dental_requests';

  var DentalStorage = {
    // ---------- PATIENTS STORAGE ----------
    getPatients: function () {
      try {
        var raw = localStorage.getItem(PATIENTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to load patients from storage:', e);
        return [];
      }
    },

    savePatients: function (patients) {
      try {
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
        return true;
      } catch (e) {
        console.error('Failed to save patients to storage:', e);
        return false;
      }
    },

    getPatientById: function (id) {
      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].id === id || String(patients[i].id) === String(id)) {
          return patients[i];
        }
      }
      return null;
    },

    addPatient: function (patientData) {
      var patients = this.getPatients();
      var id = patientData.id || Date.now();
      var newPatient = Object.assign({}, patientData, { id: id });
      patients.push(newPatient);
      this.savePatients(patients);
      return newPatient;
    },

    updatePatient: function (id, updates) {
      var patients = this.getPatients();
      var found = null;
      for (var i = 0; i < patients.length; i++) {
        if (patients[i].id === id || String(patients[i].id) === String(id)) {
          Object.assign(patients[i], updates);
          found = patients[i];
          break;
        }
      }
      if (found) {
        this.savePatients(patients);
      }
      return found;
    },

    deletePatient: function (id) {
      var patients = this.getPatients();
      var filtered = patients.filter(function (p) {
        return p.id !== id && String(p.id) !== String(id);
      });
      this.savePatients(filtered);
      return filtered;
    },

    // ---------- BOOKING REQUESTS STORAGE ----------
    getRequests: function () {
      try {
        var raw = localStorage.getItem(REQUESTS_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.error('Failed to load booking requests from storage:', e);
        return [];
      }
    },

    saveRequests: function (requests) {
      try {
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
        return true;
      } catch (e) {
        console.error('Failed to save booking requests to storage:', e);
        return false;
      }
    },

    addRequest: function (requestData) {
      var requests = this.getRequests();
      var id = requestData.id || Date.now();
      var newReq = Object.assign({}, requestData, { id: id });
      requests.push(newReq);
      this.saveRequests(requests);
      return newReq;
    },

    removeRequest: function (id) {
      var requests = this.getRequests();
      var filtered = requests.filter(function (r) {
        return r.id !== id && String(r.id) !== String(id);
      });
      this.saveRequests(filtered);
      return filtered;
    },

    // ---------- SCHEDULE / CHAIR GRID STORAGE ----------
    getDefaultSchedule: function () {
      return [
        {
          time: '11:00 am',
          chair1: null,
          chair2: { type: 'break', label: 'Lunch break' }
        },
        {
          time: '12:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '1:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '2:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '3:00 pm',
          chair1: null,
          chair2: null
        },
        {
          time: '4:00 pm',
          chair1: null,
          chair2: null
        }
      ];
    },

    getSchedule: function () {
      var SCHEDULE_KEY = 'dental_schedule';
      try {
        var raw = localStorage.getItem(SCHEDULE_KEY);
        if (raw) return JSON.parse(raw);
        var def = this.getDefaultSchedule();
        this.saveSchedule(def);
        return def;
      } catch (e) {
        console.error('Failed to load schedule from storage:', e);
        return this.getDefaultSchedule();
      }
    },

    saveSchedule: function (schedule) {
      var SCHEDULE_KEY = 'dental_schedule';
      try {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
        return true;
      } catch (e) {
        console.error('Failed to save schedule to storage:', e);
        return false;
      }
    },

    setSlot: function (time, chairNum, slotData) {
      var schedule = this.getSchedule();
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;
      var found = false;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          if (isChair1) {
            schedule[i].chair1 = slotData;
          } else {
            schedule[i].chair2 = slotData;
          }
          found = true;
          break;
        }
      }

      if (!found && time) {
        var newRow = {
          time: time,
          chair1: isChair1 ? slotData : null,
          chair2: isChair1 ? null : slotData
        };
        schedule.push(newRow);
      }

      this.saveSchedule(schedule);
      return schedule;
    },

    clearSlot: function (time, chairNum) {
      return this.setSlot(time, chairNum, null);
    },

    checkInSlot: function (time, chairNum) {
      var schedule = this.getSchedule();
      var isChair1 = chairNum === 1 || chairNum === '1' || String(chairNum).indexOf('1') >= 0;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].time.toLowerCase().trim() === String(time).toLowerCase().trim()) {
          var target = isChair1 ? schedule[i].chair1 : schedule[i].chair2;
          if (target && target.type !== 'break') {
            target.status = 'checked-in';
            target.statusLabel = 'Checked in';
          }
          break;
        }
      }
      this.saveSchedule(schedule);
      return schedule;
    },

    syncPatientCheckIn: function (patientName) {
      if (!patientName) return;
      var schedule = this.getSchedule();
      var lowerName = patientName.toLowerCase().trim();
      var changed = false;

      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].chair1 && schedule[i].chair1.patientName && schedule[i].chair1.patientName.toLowerCase().trim() === lowerName) {
          schedule[i].chair1.status = 'checked-in';
          schedule[i].chair1.statusLabel = 'Checked in';
          changed = true;
        }
        if (schedule[i].chair2 && schedule[i].chair2.patientName && schedule[i].chair2.patientName.toLowerCase().trim() === lowerName) {
          schedule[i].chair2.status = 'checked-in';
          schedule[i].chair2.statusLabel = 'Checked in';
          changed = true;
        }
      }
      if (changed) {
        this.saveSchedule(schedule);
      }
    },

    clearAll: function () {
      localStorage.removeItem(PATIENTS_KEY);
      localStorage.removeItem(REQUESTS_KEY);
      localStorage.removeItem('dental_schedule');
    }
  };

  global.DentalStorage = DentalStorage;
})(typeof window !== 'undefined' ? window : this);
