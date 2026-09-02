/* =============================================================================
   Medici Museum of Art — behaviour layer
   Everything here is progressive enhancement. With JavaScript switched off the
   pages still carry the address, the phone number, the hours and the full list
   of events as ordinary HTML; this file only adds convenience on top.
   ============================================================================= */

(function () {
  'use strict';

  var data = window.MEDICI || { events: [], hours: null };
  var TZ = 'America/New_York';

  /* ---------------------------------------------------------------------------
     Navigation
     Folders are real disclosure buttons: aria-expanded, Escape closes and
     returns focus, outside clicks close, and the mobile menu is the same
     markup rather than a second copy of every link.
     --------------------------------------------------------------------------- */

  function initNav() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var toggle = header.querySelector('.nav-toggle');
    var nav = header.querySelector('.nav');

    // Visibility is owned entirely by CSS, keyed off aria-expanded on the
    // toggle (`.nav-toggle[aria-expanded='true'] + .nav`). JavaScript only
    // records the state.
    //
    // An earlier version toggled the `hidden` attribute and reconciled it on
    // media-query change. That could desynchronise: at desktop width the
    // stylesheet's `display: flex` beat the attribute, so a stale `hidden`
    // left the menu on screen but missing from the accessibility tree —
    // sighted users saw a nav that a screen reader was told did not exist.
    // Letting one system own visibility removes the failure mode rather than
    // patching it, and the breakpoint needs no resize listener at all.
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
      });
    }

    var folders = header.querySelectorAll('.nav__folder');

    function closeAll(except) {
      Array.prototype.forEach.call(folders, function (folder) {
        if (folder === except) return;
        var btn = folder.querySelector('button');
        var panel = folder.querySelector('.nav__panel');
        if (btn && panel) {
          btn.setAttribute('aria-expanded', 'false');
          panel.hidden = true;
        }
      });
    }

    Array.prototype.forEach.call(folders, function (folder) {
      var btn = folder.querySelector('button');
      var panel = folder.querySelector('.nav__panel');
      if (!btn || !panel) return;

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(folder);
        btn.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });

      folder.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
          btn.setAttribute('aria-expanded', 'false');
          panel.hidden = true;
          btn.focus();
        }
      });
    });

    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) closeAll(null);
    });
  }

  /* ---------------------------------------------------------------------------
     Opening hours
     The "open now / closed" line is generated from the single hours record in
     site.config.js, so the footer, the Visit page and the calendar can never
     disagree with one another again.
     --------------------------------------------------------------------------- */

  function museumNow() {
    // Reads the clock in the museum's timezone, not the visitor's.
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    var bag = {};
    parts.forEach(function (p) {
      bag[p.type] = p.value;
    });

    var weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: weekdays[bag.weekday],
      minutes: parseInt(bag.hour, 10) * 60 + parseInt(bag.minute, 10),
      iso: bag.year + '-' + bag.month + '-' + bag.day,
    };
  }

  function toMinutes(hhmm) {
    var bits = hhmm.split(':');
    return parseInt(bits[0], 10) * 60 + parseInt(bits[1], 10);
  }

  function initHours() {
    var target = document.querySelector('[data-open-status]');
    if (!target || !data.hours) return;

    var now = museumNow();
    var opens = toMinutes(data.hours.opens);
    var closes = toMinutes(data.hours.closes);
    var openToday = data.hours.days.indexOf(now.day) !== -1;
    var openNow = openToday && now.minutes >= opens && now.minutes < closes;

    target.textContent = openNow
      ? 'Open now until ' + data.hours.time.split('–')[1].trim()
      : 'Closed right now';
    target.hidden = false;

    // Mark today's row in the hours table so the answer is scannable.
    var row = document.querySelector('.hours-table tr[data-day="' + now.day + '"]');
    if (row) {
      row.setAttribute('data-today', '');
      var marker = row.querySelector('[data-today-label]');
      if (marker) marker.textContent = ' (today)';
    }
  }

  /* ---------------------------------------------------------------------------
     Calendar
     A replacement for the Squarespace YUI grid, which shipped every cell with
     tabindex="-1" (no keyboard access at all), no accessible date names, no
     aria-current on today, href-less anchors for month navigation, and no
     announcement when the month changed.
     --------------------------------------------------------------------------- */

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function localDateKey(iso) {
    // Event start strings carry their own offset; bucket them by the calendar
    // day they fall on in the museum's timezone.
    var d = new Date(iso);
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    return parts;
  }

  function keyOf(year, month, day) {
    return (
      year +
      '-' +
      String(month + 1).padStart(2, '0') +
      '-' +
      String(day).padStart(2, '0')
    );
  }

  function formatTime(iso) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
    })
      .format(new Date(iso))
      .replace(':00', '')
      .toLowerCase()
      .replace(' ', '');
  }

  function eventsByDay() {
    var map = {};
    (data.events || []).forEach(function (ev) {
      // Multi-day events appear on every day they run.
      var start = new Date(ev.start);
      var end = new Date(ev.end || ev.start);
      var cursor = new Date(start.getTime());
      var guard = 0;
      while (cursor <= end && guard < 60) {
        var key = localDateKey(cursor.toISOString());
        (map[key] = map[key] || []).push(ev);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        guard += 1;
      }
    });
    return map;
  }

  function initCalendar() {
    var root = document.querySelector('[data-calendar]');
    if (!root) return;

    var byDay = eventsByDay();
    var today = museumNow().iso;
    var view = new Date();

    // Land on a month that actually has something in it. The old calendar
    // always opened on the current month, which — with no event published
    // since January — meant visitors met a blank grid headed "Upcoming Events".
    var sorted = (data.events || []).slice().sort(function (a, b) {
      return new Date(a.start) - new Date(b.start);
    });
    var upcoming = sorted.filter(function (ev) {
      return localDateKey(ev.start) >= today;
    })[0];
    var latest = sorted[sorted.length - 1];

    var seed = new Date();
    var backdated = false;
    if (upcoming) {
      seed = new Date(upcoming.start);
    } else if (latest) {
      seed = new Date(latest.start);
      backdated = true;
    }

    var year = seed.getFullYear();
    var month = seed.getMonth();

    var monthHeading = root.querySelector('[data-calendar-month]');
    var grid = root.querySelector('[data-calendar-grid]');
    var status = root.querySelector('[data-calendar-status]');
    var prev = root.querySelector('[data-calendar-prev]');
    var next = root.querySelector('[data-calendar-next]');
    var table = root.querySelector('table');

    function monthName(y, m) {
      return MONTHS[m] + ' ' + y;
    }

    function render(focusDay) {
      var first = new Date(year, month, 1);
      var startWeekday = first.getDay();
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var label = monthName(year, month);

      monthHeading.textContent = label;
      if (table) table.setAttribute('aria-label', 'Events in ' + label);
      prev.setAttribute(
        'aria-label',
        'Previous month, ' + monthName(month === 0 ? year - 1 : year, (month + 11) % 12)
      );
      next.setAttribute(
        'aria-label',
        'Next month, ' + monthName(month === 11 ? year + 1 : year, (month + 1) % 12)
      );

      var html = '';
      var day = 1;
      var eventCount = 0;

      for (var week = 0; week < 6 && day <= daysInMonth; week++) {
        html += '<tr>';
        for (var col = 0; col < 7; col++) {
          if ((week === 0 && col < startWeekday) || day > daysInMonth) {
            html += '<td class="is-empty"></td>';
            continue;
          }

          var key = keyOf(year, month, day);
          var dayEvents = byDay[key] || [];
          eventCount += dayEvents.length;
          var isToday = key === today;
          var isOpen = data.hours && data.hours.days.indexOf(new Date(year, month, day).getDay()) !== -1;

          // The accessible name spells the whole date out, then states what is
          // on. A screen reader used to hear only "Tue 1".
          var name = DAYS_LONG[new Date(year, month, day).getDay()] + ', ' + MONTHS[month] + ' ' + day + ', ' + year;
          if (isToday) name += ', today';
          name += isOpen ? '. Museum open ' + data.hours.time : '. Museum closed';
          if (dayEvents.length) {
            name +=
              '. ' +
              dayEvents.length +
              (dayEvents.length === 1 ? ' event: ' : ' events: ') +
              dayEvents
                .map(function (e) {
                  return e.title + ' at ' + formatTime(e.start);
                })
                .join(', ');
          }

          html +=
            '<td role="gridcell" tabindex="-1" data-day="' + day + '" data-key="' + key + '"' +
            (isToday ? ' aria-current="date"' : '') +
            (dayEvents.length ? ' data-has-events="' + dayEvents.length + '"' : '') +
            ' aria-label="' + name.replace(/"/g, '&quot;') + '">' +
            '<div class="calendar__day">' +
            '<span class="calendar__daynum" aria-hidden="true">' + day + '</span>' +
            (isOpen ? '<span class="calendar__open" aria-hidden="true">Open</span>' : '') +
            // A dot carries the "something is on" signal where the cell is too
            // small for titles; the titles themselves are still rendered for
            // wider screens and are hidden by CSS below the breakpoint.
            (dayEvents.length
              ? '<span class="calendar__dot" aria-hidden="true"></span>'
              : '') +
            dayEvents
              .map(function (e) {
                return (
                  '<a class="calendar__event" tabindex="-1" href="' + e.url + '">' +
                  escapeHtml(e.title) +
                  '</a>'
                );
              })
              .join('') +
            '</div></td>';

          day += 1;
        }
        html += '</tr>';
      }

      grid.innerHTML = html;

      // Roving tabindex: exactly one cell is in the tab order.
      var cells = grid.querySelectorAll('td[data-day]');
      var target =
        (focusDay && grid.querySelector('td[data-day="' + focusDay + '"]')) ||
        grid.querySelector('td[aria-current="date"]') ||
        cells[0];
      if (target) target.setAttribute('tabindex', '0');

      status.textContent =
        label + '. ' + (eventCount === 0 ? 'No events scheduled.' : eventCount + (eventCount === 1 ? ' event.' : ' events.'));

      return target;
    }

    function move(delta, focusDay) {
      month += delta;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      // The open detail belongs to a day in the month we just left.
      var panel = root.querySelector('[data-calendar-detail]');
      if (panel) panel.hidden = true;
      return render(focusDay);
    }

    /* ----- Day detail -------------------------------------------------------
       On a phone a 44px cell cannot hold an event title. Rather than shrink the
       text or push it behind a horizontal scroll, selecting a day writes its
       details here: full date, open/closed, and every event as a real link with
       a proper tap target. It works the same on desktop, so there is only one
       behaviour to reason about.
       --------------------------------------------------------------------- */

    var detail = root.querySelector('[data-calendar-detail]');
    var detailDate = root.querySelector('[data-calendar-detail-date]');
    var detailBody = root.querySelector('[data-calendar-detail-body]');

    function showDetail(cell) {
      if (!detail || !cell) return;

      var key = cell.getAttribute('data-key');
      var dayEvents = byDay[key] || [];
      var parts = key.split('-').map(Number);
      var dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      var isOpen = data.hours && data.hours.days.indexOf(dateObj.getDay()) !== -1;

      detailDate.textContent =
        DAYS_LONG[dateObj.getDay()] + ', ' + MONTHS[parts[1] - 1] + ' ' + parts[2] + ', ' + parts[0] +
        (key === today ? ' (today)' : '');

      var html = '<p class="calendar__detail-hours">' +
        (isOpen ? 'Museum open ' + data.hours.time : 'Museum closed') +
        '</p>';

      if (dayEvents.length) {
        html += '<ul class="calendar__detail-events">' +
          dayEvents
            .map(function (e) {
              return (
                '<li><a href="' + e.url + '">' + escapeHtml(e.title) + '</a>' +
                '<span class="calendar__detail-time">' + formatTime(e.start) +
                (e.end ? '–' + formatTime(e.end) : '') + '</span></li>'
              );
            })
            .join('') +
          '</ul>';
      } else {
        html += '<p class="calendar__detail-empty">No events on this day.</p>';
      }

      detailBody.innerHTML = html;
      detail.hidden = false;
    }

    // Focus follows arrow-key navigation, so this covers keyboard users too.
    grid.addEventListener('focusin', function (event) {
      var cell = event.target.closest('td[data-day]');
      if (cell) showDetail(cell);
    });

    grid.addEventListener('click', function (event) {
      // Let a direct click on an event link do its normal thing.
      if (event.target.closest('.calendar__event')) return;
      var cell = event.target.closest('td[data-day]');
      if (!cell) return;
      focusCell(cell);
      showDetail(cell);
    });

    prev.addEventListener('click', function () {
      move(-1);
    });
    next.addEventListener('click', function () {
      move(1);
    });

    grid.addEventListener('keydown', function (event) {
      var cell = event.target.closest('td[data-day]');
      if (!cell) return;

      var current = parseInt(cell.getAttribute('data-day'), 10);
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var wanted = null;

      switch (event.key) {
        case 'ArrowRight': wanted = current + 1; break;
        case 'ArrowLeft': wanted = current - 1; break;
        case 'ArrowDown': wanted = current + 7; break;
        case 'ArrowUp': wanted = current - 7; break;
        case 'Home': wanted = current - new Date(year, month, current).getDay(); break;
        case 'End': wanted = current + (6 - new Date(year, month, current).getDay()); break;
        case 'PageUp':
          event.preventDefault();
          focusCell(move(-1, 1));
          return;
        case 'PageDown':
          event.preventDefault();
          focusCell(move(1, 1));
          return;
        case 'Enter':
        case ' ': {
          var link = cell.querySelector('.calendar__event');
          if (link) {
            event.preventDefault();
            link.click();
          }
          return;
        }
        default:
          return;
      }

      event.preventDefault();

      if (wanted < 1) {
        var prevMonthDays = new Date(year, month, 0).getDate();
        focusCell(move(-1, prevMonthDays + wanted));
        return;
      }
      if (wanted > daysInMonth) {
        focusCell(move(1, wanted - daysInMonth));
        return;
      }

      focusCell(grid.querySelector('td[data-day="' + Math.min(Math.max(wanted, 1), daysInMonth) + '"]'));
    });

    function focusCell(cell) {
      if (!cell) return;
      grid.querySelectorAll('td[tabindex="0"]').forEach(function (c) {
        c.setAttribute('tabindex', '-1');
      });
      cell.setAttribute('tabindex', '0');
      cell.focus();
      // Updated here rather than left to the focusin handler alone: focus
      // events do not fire when the document itself is not focused, and the
      // panel must always describe the cell the user is actually on.
      showDetail(cell);
    }

    render();

    // Say plainly what is being shown, rather than leaving someone to work out
    // why the grid is not on this month.
    if (backdated) {
      var note = root.querySelector('[data-calendar-note]');
      if (note) {
        note.textContent =
          'Nothing is scheduled after ' +
          MONTHS[seed.getMonth()] +
          ' ' +
          seed.getFullYear() +
          ' yet, so the most recent listings are shown.';
        note.hidden = false;
      }
    }

    root.hidden = false;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------------------------
     Email chooser

     A bare mailto: on Windows hands the message to Outlook (or to the "choose
     an app" shell dialog) regardless of what the visitor actually uses. For
     someone on Gmail that is a dead end: Outlook opens unconfigured, asks them
     to set up an account, and the enquiry never gets sent.

     So on desktop the email link opens a small menu instead — Gmail, Outlook
     on the web, the default mail app, or copy the address. The link keeps its
     mailto: href, so with JavaScript off, or on a phone (where mailto: reliably
     opens the mail app the person actually uses), nothing changes.

     Built as a disclosure, not a dialog: aria-expanded on the trigger, arrow
     keys and Home/End inside, Escape closes and returns focus, clicking away
     closes.
     --------------------------------------------------------------------------- */

  function isDesktop() {
    // Coarse pointer or a narrow screen means a phone or tablet: leave mailto:
    // alone there, because the OS mail handler is the one the visitor chose.
    if (window.matchMedia('(pointer: coarse)').matches) return false;
    if (window.matchMedia('(max-width: 767px)').matches) return false;
    return true;
  }

  function initEmailChooser() {
    var links = document.querySelectorAll('a[data-email-link]');
    if (!links.length || !isDesktop()) return;

    var counter = 0;

    Array.prototype.forEach.call(links, function (link) {
      var mailto = link.getAttribute('href');
      var address = mailto.replace(/^mailto:/, '').split('?')[0];
      var id = 'email-chooser-' + counter++;

      var menu = document.createElement('div');
      menu.className = 'email-chooser';
      menu.id = id;
      menu.hidden = true;
      menu.innerHTML =
        '<p class="email-chooser__heading">Send an email to<br><strong>' +
        escapeHtml(address) +
        '</strong></p>' +
        '<ul>' +
        '<li><a href="https://mail.google.com/mail/?view=cm&fs=1&to=' +
        encodeURIComponent(address) +
        '" target="_blank" rel="noopener">Open in Gmail<span class="visually-hidden"> (opens in a new tab)</span></a></li>' +
        '<li><a href="https://outlook.office.com/mail/deeplink/compose?to=' +
        encodeURIComponent(address) +
        '" target="_blank" rel="noopener">Open in Outlook on the web<span class="visually-hidden"> (opens in a new tab)</span></a></li>' +
        '<li><a href="' + mailto + '">Use my default mail app</a></li>' +
        '<li><button type="button" data-copy-email>Copy address</button></li>' +
        '</ul>' +
        '<p class="email-chooser__status" role="status" aria-live="polite"></p>';

      var wrap = document.createElement('span');
      wrap.className = 'email-chooser__wrap';
      link.parentNode.insertBefore(wrap, link);
      wrap.appendChild(link);
      wrap.appendChild(menu);

      link.setAttribute('aria-expanded', 'false');
      link.setAttribute('aria-controls', id);

      function items() {
        return menu.querySelectorAll('a, button');
      }

      function open() {
        menu.hidden = false;
        link.setAttribute('aria-expanded', 'true');
        items()[0].focus();
      }

      function close(refocus) {
        menu.hidden = true;
        link.setAttribute('aria-expanded', 'false');
        if (refocus) link.focus();
      }

      link.addEventListener('click', function (event) {
        // Modified clicks keep their normal browser meaning.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (menu.hidden) open();
        else close(true);
      });

      menu.addEventListener('keydown', function (event) {
        var list = Array.prototype.slice.call(items());
        var index = list.indexOf(document.activeElement);

        if (event.key === 'Escape') {
          event.preventDefault();
          close(true);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          list[(index + 1) % list.length].focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          list[(index - 1 + list.length) % list.length].focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          list[0].focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          list[list.length - 1].focus();
        } else if (event.key === 'Tab') {
          close(false);
        }
      });

      menu.addEventListener('click', function (event) {
        var copy = event.target.closest('[data-copy-email]');
        var status = menu.querySelector('.email-chooser__status');

        if (copy) {
          event.preventDefault();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(address).then(
              function () {
                status.textContent = 'Address copied.';
              },
              function () {
                status.textContent = 'Could not copy. The address is ' + address;
              }
            );
          } else {
            status.textContent = 'The address is ' + address;
          }
          return;
        }

        if (event.target.closest('a')) close(false);
      });

      document.addEventListener('click', function (event) {
        if (!wrap.contains(event.target) && !menu.hidden) close(false);
      });
    });
  }

  /* ---------------------------------------------------------------------------
     Forms
     Errors are announced, tied to their field with aria-describedby, and focus
     lands on the first problem. Nothing relies on colour alone.
     --------------------------------------------------------------------------- */

  function initForms() {
    document.querySelectorAll('form[data-validate]').forEach(function (form) {
      var status = form.querySelector('[data-form-status]');

      form.setAttribute('novalidate', '');

      form.addEventListener('submit', function (event) {
        var invalid = [];

        form.querySelectorAll('input, select, textarea').forEach(function (field) {
          var error = document.getElementById(field.id + '-error');
          if (!error) return;

          var message = '';
          if (field.hasAttribute('required') && !field.value.trim()) {
            message = describe(field) + ' is required.';
          } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
            message = 'Enter an email address in the format name@example.com.';
          }

          error.textContent = message;
          field.setAttribute('aria-invalid', message ? 'true' : 'false');
          if (message) invalid.push(field);
        });

        if (invalid.length) {
          event.preventDefault();
          if (status) {
            status.textContent =
              invalid.length === 1
                ? 'There is 1 problem with this form.'
                : 'There are ' + invalid.length + ' problems with this form.';
          }
          invalid[0].focus();
          return;
        }

        if (status) status.textContent = '';
      });
    });
  }

  function describe(field) {
    var label = field.form.querySelector('label[for="' + field.id + '"]');
    return label ? label.textContent.replace('(required)', '').trim() : 'This field';
  }

  /* ------------------------------------------------------------------------- */

  function boot() {
    initNav();
    initHours();
    initCalendar();
    initEmailChooser();
    initForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
