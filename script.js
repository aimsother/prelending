(function() {
    const COOKIE_NAME = 'application_submitted';
    const COOKIE_DAYS = 365;

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
            input.value = data[input.name] || '';
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
        if (result.success !== 'true' || !result.uuid || !result.url) {
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

        if (data && data.submitted) {
            showSubmittedState(data);
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                await submitToApi(firstName, lastName, email, phone);
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
