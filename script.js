(function() {
    const COOKIE_NAME = 'application_submitted';
    const COOKIE_DAYS = 365;

    function extractDigits(str) {
        return String(str || '').replace(/\D/g, '');
    }

    function normalizeLocalDigits(digits) {
        let d = digits.slice(0, 11);
        if (d.length === 11 && d[0] === '1') {
            d = d.slice(1);
        }
        return d.slice(0, 10);
    }

    function formatLocalPart(digits) {
        const d = digits.slice(0, 10);
        if (d.length === 0) return '';
        if (d.length <= 3) return '(' + d;
        if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
        return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    }

    function digitsFromAnyPhoneString(phone) {
        return normalizeLocalDigits(extractDigits(phone || ''));
    }

    function digitIndexBeforeCaret(value, caretPos) {
        let n = 0;
        const end = Math.min(caretPos, value.length);
        for (let i = 0; i < end; i++) {
            if (/\d/.test(value[i])) n++;
        }
        return n;
    }

    function caretAfterDigitCount(formatted, digitCount) {
        if (digitCount <= 0) return 0;
        let count = 0;
        for (let i = 0; i < formatted.length; i++) {
            if (/\d/.test(formatted[i])) {
                count++;
                if (count === digitCount) return i + 1;
            }
        }
        return formatted.length;
    }

    /** Digits only, NANP with country code 1 (e.g. 15551234567). */
    function getPhoneDigitsForSubmit(inputEl) {
        const digits = normalizeLocalDigits(extractDigits(inputEl.value));
        return digits.length === 10 ? '1' + digits : '';
    }

    function initCanadianPhoneMask() {
        const phone = document.getElementById('phone');
        if (!phone || phone.dataset.phoneMask !== 'ca') return;

        phone.addEventListener('input', function() {
            const el = phone;
            const raw = el.value;
            const caret = el.selectionStart != null ? el.selectionStart : raw.length;
            const digitBefore = digitIndexBeforeCaret(raw, caret);
            const digits = normalizeLocalDigits(extractDigits(raw));
            const formatted = formatLocalPart(digits);
            el.value = formatted;
            const targetDigit = Math.min(digitBefore, digits.length);
            const pos = caretAfterDigitCount(formatted, targetDigit);
            requestAnimationFrame(function() {
                el.setSelectionRange(pos, pos);
            });
        });

        phone.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (
                e.key === 'Backspace' ||
                e.key === 'Delete' ||
                e.key === 'Tab' ||
                e.key === 'Enter' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'ArrowUp' ||
                e.key === 'ArrowDown' ||
                e.key === 'Home' ||
                e.key === 'End'
            ) {
                return;
            }
            if (e.key.length === 1 && /\d/.test(e.key)) return;
            if (e.key.length !== 1) return;
            e.preventDefault();
        });

        phone.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text') || '';
            const digits = normalizeLocalDigits(extractDigits(text));
            phone.value = formatLocalPart(digits);
            const pos = caretAfterDigitCount(phone.value, digits.length);
            requestAnimationFrame(function() {
                phone.setSelectionRange(pos, pos);
            });
        });
    }

    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
    }

    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    function getApplicationData() {
        const data = getCookie(COOKIE_NAME);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    function saveApplicationData(firstName, lastName, email, phone) {
        const data = JSON.stringify({
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            submitted: true
        });
        setCookie(COOKIE_NAME, data, COOKIE_DAYS);
    }

    function showSubmittedState(data) {
        const form = document.getElementById('applicationForm');
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        const submitBtn = document.getElementById('submitBtn');
        const changeBtn = document.getElementById('changeBtn');

        inputs.forEach(function(input) {
            if (input.name === 'phone') {
                input.value = formatLocalPart(digitsFromAnyPhoneString(data.phone || ''));
            } else {
                input.value = data[input.name] || '';
            }
            input.readOnly = true;
        });

        submitBtn.style.display = 'none';
        changeBtn.style.display = 'block';
    }

    function showEditState() {
        const form = document.getElementById('applicationForm');
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        const submitBtn = document.getElementById('submitBtn');
        const changeBtn = document.getElementById('changeBtn');

        inputs.forEach(function(input) {
            input.readOnly = false;
        });

        submitBtn.style.display = 'block';
        changeBtn.style.display = 'none';
    }

    const API_URL = 'https://snowy-king-2ffa.aimsother.workers.dev/';

    function showModal(title, text) {
        const overlay = document.getElementById('modalOverlay');
        const modalTitleEl = document.getElementById('modalTitle');
        const modalTextEl = document.querySelector('.modal-text');
        if (title) modalTitleEl.textContent = title;
        if (text) modalTextEl.textContent = text;
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const overlay = document.getElementById('modalOverlay');
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    async function submitToApi(firstName, lastName, email, phone) {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                country: 'CA'
            })
        });
        let result;
        try {
            result = await response.json();
        } catch {
            result = {};
        }
        if (!response.ok) {
            throw new Error(result.message || result.error || 'Request failed');
        }
        const isSuccess = result.success === 'true' || result.success === true;
        if (!isSuccess) {
            throw new Error(result.message || result.error || 'Invalid response from server');
        }
        return result;
    }

    function init() {
        const form = document.getElementById('applicationForm');
        const changeBtn = document.getElementById('changeBtn');
        const submitBtn = document.getElementById('submitBtn');
        const modalOverlay = document.getElementById('modalOverlay');
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const data = getApplicationData();

        initCanadianPhoneMask();

        if (data && data.submitted) {
            showSubmittedState(data);
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = getPhoneDigitsForSubmit(document.getElementById('phone'));
            if (!phone) {
                showModal('Error', 'Please enter a complete 10-digit Canadian phone number.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                await submitToApi(firstName, lastName, email, phone);
                if (typeof fbq === 'function') fbq('track', 'Lead');
                saveApplicationData(firstName, lastName, email, phone);
                showSubmittedState({ firstName: firstName, lastName: lastName, email: email, phone: phone });
                showModal('Success', 'Application submitted successfully. Thank you!');
            } catch (err) {
                showModal('Error', err.message || 'Failed to submit. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit';
            }
        });

        changeBtn.addEventListener('click', function() {
            showEditState();
        });

        modalCloseBtn.addEventListener('click', closeModal);

        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOverlay.classList.contains('is-open')) {
                closeModal();
            }
        });
    }

    init();
})();
