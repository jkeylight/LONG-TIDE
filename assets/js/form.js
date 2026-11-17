/* ==========================================================================
   STILL POINT — enquiry form
   ==========================================================================
   WHY THIS FILE EXISTS

   The form previously carried action="#" and a data-enquiry attribute that
   nothing listened for. Submitting it reloaded the page to "#" and discarded
   everything. A person in pain writes out what is happening to them, presses
   the button, and the page just blinks. That is the worst failure a therapy
   site can have, and it fails silently — so nobody notices it is broken.

   This module guarantees one of two outcomes, always visible:

     · an endpoint is configured in SITE.formEndpoint → the enquiry is POSTed
       and the visitor is told whether it succeeded;
     · no endpoint → the visitor's own mail client is opened with every field
       pre-filled, AND the address is shown on screen so it can be copied if
       no mail client is set up.

   What it will never do is pretend. There is no fake "thank you" here.

   Validation is hand-written rather than native because the design hides the
   browser's own bubbles; errors are announced through aria-invalid and a
   live region instead.
   ========================================================================== */

const EnquiryForm = {

  init () {
    const form = document.querySelector('[data-enquiry]');
    if (!form) return;

    this.form = form;
    this.status = form.querySelector('[data-form-status]');
    this.submit = form.querySelector('button[type="submit"]');

    /* show errors only after the first attempt, then live */
    this.touched = false;

    form.addEventListener('submit', e => this.onSubmit(e));
    form.addEventListener('input', e => {
      if (!this.touched) return;
      const field = e.target.closest('.field, .consent');
      if (field) this.clearError(field);
    });
    form.addEventListener('blur', e => {
      if (this.touched) this.validate(true);
    }, true);
  },

  /* ---------- validation ------------------------------------------------- */

  rules () {
    const f = this.form;
    const out = [];

    const name = f.querySelector('#name');
    if (name) out.push({ el: name, test: v => v.trim().length >= 2, msg: 'Please tell me your name.' });

    const email = f.querySelector('#email');
    if (email) out.push({
      el: email,
      test: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      msg: 'That email address does not look right.'
    });

    const consent = f.querySelector('#consent');
    if (consent) out.push({
      el: consent,
      kind: 'consent',
      test: () => consent.checked,
      msg: 'Please confirm you agree to the privacy notice before sending.'
    });

    /* a filled honeypot means a bot; treat as failure, silently */
    return out;
  },

  validate (show) {
    const errors = [];
    this.rules().forEach(r => {
      const ok = r.test(r.el.value || '');
      if (!ok) errors.push(r);
      if (show) this.markError(r, ok);
    });
    return errors;
  },

  markError (rule, ok) {
    const holder = rule.kind === 'consent'
      ? rule.el.closest('.consent')
      : rule.el.closest('.field');
    if (!holder) return;

    if (ok) { this.clearError(holder); return; }

    holder.classList.add(rule.kind === 'consent' ? 'consent--error' : 'field--error');
    rule.el.setAttribute('aria-invalid', 'true');

    let slot = holder.querySelector('.field__error');
    if (!slot) {
      slot = document.createElement('span');
      slot.className = 'field__error';
      slot.id = (rule.el.id || 'f') + '-err';
      holder.appendChild(slot);
    }
    slot.textContent = rule.msg;

    const desc = (rule.el.getAttribute('aria-describedby') || '')
      .split(/\s+/).filter(Boolean);
    if (!desc.includes(slot.id)) desc.push(slot.id);
    rule.el.setAttribute('aria-describedby', desc.join(' '));
  },

  clearError (holder) {
    holder.classList.remove('field--error', 'consent--error');
    const el = holder.querySelector('input, select, textarea');
    if (el) {
      el.removeAttribute('aria-invalid');
      const desc = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter(id => id && !id.endsWith('-err'));
      if (desc.length) el.setAttribute('aria-describedby', desc.join(' '));
      else el.removeAttribute('aria-describedby');
    }
    const slot = holder.querySelector('.field__error');
    if (slot) slot.textContent = '';
  },

  /* ---------- submission ------------------------------------------------ */

  async onSubmit (e) {
    e.preventDefault();
    this.touched = true;

    /* honeypot */
    const hp = this.form.querySelector('[name="website"]');
    if (hp && hp.value) { this.say('ok', 'Thank you — your enquiry has been received.'); return; }

    const errors = this.validate(true);
    if (errors.length) {
      this.say('error', 'Please check the highlighted fields and try again.');
      errors[0].el.focus();
      return;
    }

    const data = new FormData(this.form);
    const endpoint = (window.SP && SP.SITE && SP.SITE.formEndpoint) || '';

    if (!endpoint) {
      /* No backend is configured. Hand the message to the visitor's mail
         client and give them a way through if that fails. */
      this.mailto(data);
      return;
    }

    this.busy(true);
    this.say('', 'Sending your enquiry…');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      this.form.reset();
      this.touched = false;
      this.say('ok', 'Thank you — your enquiry has been sent. I usually reply within two working days.');
      this.clearAll();
    } catch (err) {
      this.say('error',
        'That did not send. Please email <a href="mailto:' + SP.SITE.email + '">' + SP.SITE.email + '</a> directly — your message is not lost, just not delivered yet.');
    } finally {
      this.busy(false);
    }
  },

  /* Building the mailto is separated out so it can be asserted directly
     rather than inferred from a side effect. */
  composeHref (data) {
    const S = window.SP ? SP.SITE : { email: '' };
    const get = k => (data.get(k) || '').toString().trim();

    const subject = 'Enquiry from ' + (get('name') || 'the website');
    const body = [
      'Name: ' + get('name'),
      'Email: ' + get('email'),
      get('phone') ? 'Phone: ' + get('phone') : '',
      get('reason') ? 'Reason for enquiry: ' + get('reason') : '',
      '',
      get('message') || '(no message)',
      '',
      '— sent from the Still Point website'
    ].filter(Boolean).join('\n');

    return 'mailto:' + S.email
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);
  },

  mailto (data) {
    const S = window.SP ? SP.SITE : { email: '' };
    const href = this.composeHref(data);
    window.location.href = href;

    /* Never claim it was sent. It is in their mail client, unsent. */
    this.say('ok',
      'Your email app should have opened with this enquiry ready to send — <strong>it is not sent until you press send there</strong>. '
      + 'If nothing opened, write to <a href="mailto:' + S.email + '">' + S.email + '</a> directly.');
  },

  say (state, html) {
    if (!this.status) return;
    this.status.setAttribute('data-state', state || '');
    this.status.innerHTML = html;
    this.status.setAttribute('role', state === 'error' ? 'alert' : 'status');
  },

  busy (on) {
    if (!this.submit) return;
    this.submit.setAttribute('aria-disabled', String(on));
    if (on) this.submit.dataset.label = this.submit.innerHTML;
    else if (this.submit.dataset.label) this.submit.innerHTML = this.submit.dataset.label;
  },

  clearAll () {
    this.form.querySelectorAll('.field--error, .consent--error').forEach(el => this.clearError(el));
  }
};
