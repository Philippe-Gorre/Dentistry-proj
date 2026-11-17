/* storage.js
   Central storage layer using browser localStorage.
   Handles persistent saving, retrieval, and updating of:
   - Patients (list, history, notes, statuses)
*/
(function (global) {
  'use strict';

  var PATIENTS_KEY = 'dental_patients';
  var DATED_SCHEDULES_KEY = 'dental_schedules_by_date';

  function localDateKey(date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  }

  function isValidDateKey(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(date));
  }

  function sortSchedule(schedule) {
    function minutes(time) {
      var match = String(time).match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
      if (!match) return Infinity;
      var hour = Number(match[1]) % 12;
      if (match[3].toLowerCase() === 'pm') hour += 12;
      return hour * 60 + Number(match[2]);
    }

    return schedule.sort(function (a, b) {
      return minutes(a.time) - minutes(b.time);
    });
  }

  function normalizePatientName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function getPatientName(patient) {
    return normalizePatientName((patient.firstName || '') + ' ' + (patient.lastName || ''));
  }

  function isValidPhoneNumber(value) {
    var phone = String(value || '').trim();
    var digits = phone.replace(/\D/g, '');
    return phone.length <= 20 && /^\+?[\d\s().-]+$/.test(phone) &&
      digits.length >= 7 && digits.length <= 15;
  }

  function isValidEmailAddress(value) {
    var email = String(value || '').trim();
    return email.length <= 254 && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }

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

    findPatientByName: function (name) {
      var target = normalizePatientName(name);
      if (!target) return null;

      var patients = this.getPatients();
      for (var i = 0; i < patients.length; i++) {
        if (getPatientName(patients[i]) === target) return patients[i];
      }
      return null;
    },

    isValidPhoneNumber: isValidPhoneNumber,
    isValidEmailAddress: isValidEmailAddress,

    hasPatientAtTime: function (schedule, patientName, time) {
      var targetName = normalizePatientName(patientName);
      var targetTime = String(time || '').trim().toLowerCase();
      if (!targetName || !targetTime) return false;

      return schedule.some(function (row) {
        if (String(row.time || '').trim().toLowerCase() !== targetTime) return false;
        return [row.chair1, row.chair2].some(function (slot) {
          return slot && normalizePatientName(slot.patientName) === targetName;
        });
      });
    },

    addPatient: function (patientData) {
      var patients = this.getPatients();
      var firstName = String(patientData.firstName || '').trim().replace(/\s+/g, ' ');
      var lastName = String(patientData.lastName || '').trim().replace(/\s+/g, ' ');
      if (!firstName || !lastName) throw new Error('First and last names are required.');
      if (this.findPatientByName(firstName + ' ' + lastName)) {
        throw new Error('A patient with this name already exists.');
      }

      var id = patientData.id || Date.now();
      var newPatient = Object.assign({}, patientData, {
        id: id,
        firstName: firstName,
        lastName: lastName
      });
      patients.push(newPatient);
      if (!this.savePatients(patients)) throw new Error('The patient record could not be saved.');
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

    getScheduleForDate: function (date) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.getSchedule();

      try {
        var schedules = JSON.parse(localStorage.getItem(DATED_SCHEDULES_KEY) || '{}');
        return schedules[date] || this.getDefaultSchedule();
      } catch (e) {
        console.error('Failed to load dated schedule from storage:', e);
        return this.getDefaultSchedule();
      }
    },

    saveScheduleForDate: function (date, schedule) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.saveSchedule(schedule);

      try {
        var schedules = JSON.parse(localStorage.getItem(DATED_SCHEDULES_KEY) || '{}');
        schedules[date] = schedule;
        localStorage.setItem(DATED_SCHEDULES_KEY, JSON.stringify(schedules));
        return true;
      } catch (e) {
        console.error('Failed to save dated schedule to storage:', e);
        return false;
      }
    },

    setSlotForDate: function (date, time, chairNum, slotData) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.setSlot(time, chairNum, slotData);

      var schedule = this.getScheduleForDate(date);
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
        schedule.push({
          time: time,
          chair1: isChair1 ? slotData : null,
          chair2: isChair1 ? null : slotData
        });
      }

      sortSchedule(schedule);
      this.saveScheduleForDate(date, schedule);
      return schedule;
    },

    checkInSlotForDate: function (date, time, chairNum) {
      if (!isValidDateKey(date)) throw new Error('A valid YYYY-MM-DD date is required.');
      if (date === localDateKey(new Date())) return this.checkInSlot(time, chairNum);

      var schedule = this.getScheduleForDate(date);
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
      this.saveScheduleForDate(date, schedule);
      return schedule;
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

      sortSchedule(schedule);
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
      localStorage.removeItem('dental_requests');
      localStorage.removeItem('dental_schedule');
      localStorage.removeItem(DATED_SCHEDULES_KEY);
    }
  };

  global.DentalStorage = DentalStorage;
})(typeof window !== 'undefined' ? window : this);
