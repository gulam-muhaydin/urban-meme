(function () {
    'use strict';

    var API_BASE_URL = 'https://my-project-backend-tonf.vercel.app';

    var STORAGE_KEYS = {
        users: 'watchearn_users',
        currentUser: 'watchearn_current_user',
        pendingPayments: 'watchearn_pending_payments',
        points: 'watchearn_points',
        videosWatched: 'watchearn_videos_watched',
        watchedVideos: 'watchearn_watched_videos',
        todayCount: 'watchearn_today_count',
        todayDate: 'watchearn_today_date',
        withdrawals: 'watchearn_withdrawals'
    };

    var POINTS_PER_PKR_BASIC = 100;
    var POINTS_PER_PKR_STANDARD = 150;
    var POINTS_PER_PKR_PREMIUM = 200;

    var PAYMENT_ACCOUNTS = {
        jazzcash: '03083869891',
        jazzcashName: 'Asam Tahira'
    };

    var plans = [
        { id: 'basic', name: 'Basic', amount: 500, rate: 10 },
        { id: 'standard', name: 'Standard', amount: 1000, rate: 15 },
        { id: 'premium', name: 'Premium', amount: 2000, rate: 20 }
    ];

    var videos = [
        { id: 1, title: 'Product Review: Tech Gadgets 2025', desc: 'Watch this short product overview to earn points.', duration: 30 },
        { id: 2, title: 'Quick Tips for Daily Productivity', desc: 'Learn productivity tips while earning rewards.', duration: 45 },
        { id: 3, title: 'Health and Wellness Basics', desc: 'A brief introduction to healthy habits.', duration: 25 },
        { id: 4, title: 'Travel Destinations Overview', desc: 'Explore popular travel spots in under a minute.', duration: 40 },
        { id: 5, title: 'Cooking Quick Recipe Guide', desc: 'Simple recipe ideas for busy weeknights.', duration: 35 },
        { id: 6, title: 'Finance Tips for Beginners', desc: 'Basic financial advice in a short format.', duration: 50 },
        { id: 7, title: 'Fitness at Home', desc: 'Short home workout introduction.', duration: 28 },
        { id: 8, title: 'Learning a New Skill', desc: 'How to start learning something new.', duration: 38 },
        { id: 9, title: 'Daily News Recap', desc: 'Catch up on the latest headlines.', duration: 30 },
        { id: 10, title: 'Funny Moments Compilation', desc: 'Start your day with a laugh.', duration: 42 },
        { id: 11, title: 'Life Hacks for Home', desc: 'Simple tricks to make life easier.', duration: 33 },
        { id: 12, title: 'Nature Sounds for Relaxation', desc: 'Take a moment to breathe.', duration: 60 },
        { id: 13, title: 'Motivation for Success', desc: 'Get inspired to achieve your goals.', duration: 45 },
        { id: 14, title: 'Top 5 Movies to Watch', desc: 'Recommendations for your weekend.', duration: 35 },
        { id: 15, title: 'Understanding Crypto Basics', desc: 'A quick look at digital currencies.', duration: 55 }
    ];

    var state = {
        currentUser: null,
        points: 0,
        videosWatchedToday: 0,
        watchedVideoIds: [],
        currentVideo: null,
        watchInterval: null,
        watchElapsed: 0
    };

    function getUsers() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.users);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveUsers(users) {
        localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    }

    function getCurrentUserEmail() {
        return localStorage.getItem(STORAGE_KEYS.currentUser) || null;
    }

    function setCurrentUserEmail(email) {
        if (email) {
            localStorage.setItem(STORAGE_KEYS.currentUser, email);
        } else {
            localStorage.removeItem(STORAGE_KEYS.currentUser);
        }
    }

    function getPendingPayments() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.pendingPayments);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function savePendingPayments(list) {
        localStorage.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(list));
    }

    function loadCurrentUser() {
        var email = getCurrentUserEmail();
        if (!email) {
            state.currentUser = null;
            return;
        }
        var users = getUsers();
        state.currentUser = users[email] || null;
    }

    function showScreen(id) {
        var screens = ['screen-welcome', 'screen-plans', 'screen-payment', 'screen-pending', 'screen-main', 'screen-admin'];
        screens.forEach(function (sid) {
            var el = document.getElementById(sid);
            if (el) {
                el.classList.toggle('hidden', sid !== id);
            }
        });
    }

    function showAuthMessage(elId, text, type) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = text;
        el.className = 'auth-message ' + (type || '');
        el.classList.remove('hidden');
    }

    function hideAuthMessage(elId) {
        var el = document.getElementById(elId);
        if (el) {
            el.classList.add('hidden');
            el.className = 'auth-message hidden';
        }
    }

    function ensurePopupContainer() {
        var existing = document.getElementById('we-popup-container');
        if (existing) return existing;
        if (!document.body) return null;
        var container = document.createElement('div');
        container.id = 'we-popup-container';
        container.className = 'we-popup-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(container);
        return container;
    }

    function showPopup(message, type, options) {
        if (!message) return;
        var container = ensurePopupContainer();
        if (!container) return;

        var popup = document.createElement('div');
        popup.className = 'we-popup' + (type ? ' we-popup-' + type : '');
        popup.setAttribute('role', type === 'error' ? 'alert' : 'status');

        var msg = document.createElement('div');
        msg.className = 'we-popup-message';
        msg.textContent = message;

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'we-popup-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '×';

        popup.appendChild(msg);
        popup.appendChild(closeBtn);
        container.appendChild(popup);

        requestAnimationFrame(function () {
            popup.classList.add('open');
        });

        var duration = (options && options.duration) ? options.duration : (type === 'error' ? 4500 : 3000);
        var timer = setTimeout(dismiss, duration);

        function dismiss() {
            clearTimeout(timer);
            popup.classList.remove('open');
            setTimeout(function () {
                if (popup.parentNode) popup.parentNode.removeChild(popup);
            }, 180);
        }

        closeBtn.addEventListener('click', dismiss);
    }

    function getBrowserInfo() {
        var ua = navigator.userAgent;
        var browser = "Unknown Browser";
        if (ua.indexOf("Chrome") > -1) browser = "Chrome";
        else if (ua.indexOf("Safari") > -1) browser = "Safari";
        else if (ua.indexOf("Firefox") > -1) browser = "Firefox";
        else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) browser = "Internet Explorer";
        else if (ua.indexOf("Edge") > -1) browser = "Edge";
        
        var os = "Unknown OS";
        if (ua.indexOf("Win") > -1) os = "Windows";
        else if (ua.indexOf("Mac") > -1) os = "MacOS";
        else if (ua.indexOf("Linux") > -1) os = "Linux";
        else if (ua.indexOf("Android") > -1) os = "Android";
        else if (ua.indexOf("like Mac") > -1) os = "iOS";

        return browser + " on " + os;
    }

    function recordLogin(email) {
        var users = getUsers();
        if (!users[email]) return;

        if (!users[email].loginHistory) {
            users[email].loginHistory = [];
        }

        var location = "Unknown Location";
        try {
            location = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            location = "Current Device";
        }

        var entry = {
            device: getBrowserInfo(),
            location: location,
            date: new Date().toLocaleString()
        };

        // Add to beginning, limit to last 10
        users[email].loginHistory.unshift(entry);
        if (users[email].loginHistory.length > 10) {
            users[email].loginHistory.pop();
        }

        saveUsers(users);
    }

    function handleLogin(e) {
        e.preventDefault();
        hideAuthMessage('auth-message');
        var email = (document.getElementById('login-email') || {}).value.trim().toLowerCase();
        var password = (document.getElementById('login-password') || {}).value;
        if (!email || !password) {
            showAuthMessage('auth-message', 'Please enter email and password.', 'error');
            return;
        }

        if (window.fetch) {
            fetch(API_BASE_URL + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    showAuthMessage('auth-message', data.error, 'error');
                } else {
                    setCurrentUserEmail(email);
                    var users = getUsers();
                    users[email] = data.user; // Update local cache
                    saveUsers(users);
                    recordLogin(email);
                    loadCurrentUser();
                    route();
                }
            })
            .catch(function() {
                // Fallback to local storage if server is down
                var users = getUsers();
                var user = users[email];
                if (!user || user.password !== password) {
                    showAuthMessage('auth-message', 'Invalid email or password (Local Fallback).', 'error');
                    return;
                }
                setCurrentUserEmail(email);
                recordLogin(email);
                loadCurrentUser();
                route();
            });
        }
    }

    function handleSignup(e) {
        e.preventDefault();
        hideAuthMessage('auth-message');
        var name = (document.getElementById('signup-name') || {}).value.trim();
        var email = (document.getElementById('signup-email') || {}).value.trim().toLowerCase();
        var phone = (document.getElementById('signup-phone') || {}).value.trim();
        var password = (document.getElementById('signup-password') || {}).value;
        if (!name || !email || !phone || !password) {
            showAuthMessage('auth-message', 'Please fill all fields.', 'error');
            return;
        }

        var userData = {
            name: name,
            email: email,
            phone: phone,
            password: password,
            planId: null,
            planAmount: null,
            paymentNumber: null,
            paymentSlip: null,
            paymentSubmitted: false,
            approved: false,
            referralCode: null,
            loginHistory: [],
            security: {
                pin: null,
                twoFactor: false
            }
        };

        if (window.fetch) {
            fetch(API_BASE_URL + '/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.error) {
                    showAuthMessage('auth-message', data.error, 'error');
                } else {
                    var users = getUsers();
                    users[email] = userData;
                    saveUsers(users);
                    setCurrentUserEmail(email);
                    recordLogin(email);
                    loadCurrentUser();
                    showAuthMessage('auth-message', 'Account created. Choose a plan.', 'success');
                    route();
                }
            })
            .catch(function() {
                // Fallback
                var users = getUsers();
                if (users[email]) {
                    showAuthMessage('auth-message', 'This email is already registered locally.', 'error');
                    return;
                }
                users[email] = userData;
                saveUsers(users);
                setCurrentUserEmail(email);
                recordLogin(email);
                loadCurrentUser();
                showAuthMessage('auth-message', 'Account created locally (Server Down).', 'success');
                route();
            });
        }
    }

    function logout() {
        setCurrentUserEmail(null);
        window.location.href = 'index.html';
    }

    function switchAuthTab(tab) {
        var loginForm = document.getElementById('form-login');
        var signupForm = document.getElementById('form-signup');
        var tabs = document.querySelectorAll('.auth-tab');
        if (!loginForm || !signupForm) return;
        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        }
        tabs.forEach(function (t) {
            t.classList.toggle('active', t.getAttribute('data-tab') === tab);
        });
        hideAuthMessage('auth-message');
    }

    function selectPlan(planId, amount) {
        var user = state.currentUser;
        if (!user) return;
        var email = getCurrentUserEmail();

        if (window.fetch) {
            fetch(API_BASE_URL + '/api/users/' + encodeURIComponent(email) + '/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planId, planAmount: amount })
            })
            .then(function(res) { return res.json(); })
            .then(function() {
                var users = getUsers();
                if (users[email]) {
                    users[email].planId = planId;
                    users[email].planAmount = amount;
                    saveUsers(users);
                }
                loadCurrentUser();
                route();
            })
            .catch(function() {
                // Fallback
                var users = getUsers();
                users[email].planId = planId;
                users[email].planAmount = amount;
                saveUsers(users);
                loadCurrentUser();
                route();
            });
        }
    }

    function handlePlanSelect(e) {
        var card = e.target.closest('.plan-option');
        if (!card) return;
        var planId = card.getAttribute('data-plan-id');
        var amount = parseInt(card.getAttribute('data-amount'), 10);
        selectPlan(planId, amount);
    }

    function showPaymentScreen() {
        showScreen('screen-payment');
        var user = state.currentUser;
        if (!user || !user.planAmount) return;
        var amountEl = document.getElementById('payment-amount-display');
        if (amountEl) amountEl.innerHTML = 'Amount to pay: <strong>PKR ' + user.planAmount.toLocaleString() + '</strong>';
        document.getElementById('jazzcash-number').textContent = PAYMENT_ACCOUNTS.jazzcash;
        var nameEl = document.getElementById('jazzcash-name');
        if (nameEl) nameEl.textContent = PAYMENT_ACCOUNTS.jazzcashName;
        
        document.getElementById('form-payment').reset();
        document.getElementById('payment-phone').value = user.phone || '';
        var slipPreview = document.getElementById('slip-preview');
        if (slipPreview) {
            slipPreview.classList.add('hidden');
            slipPreview.innerHTML = '';
        }
        var fileLabel = document.getElementById('file-label-text');
        if (fileLabel) fileLabel.textContent = 'Choose file';
        hideAuthMessage('payment-message');
    }

    function handlePaymentSubmit(e) {
        e.preventDefault();
        hideAuthMessage('payment-message');
        var user = state.currentUser;
        if (!user) return;
        var phone = (document.getElementById('payment-phone') || {}).value.trim();
        var slipInput = document.getElementById('payment-slip');
        if (!phone) {
            showAuthMessage('payment-message', 'Please enter your JazzCash number.', 'error');
            return;
        }
        if (!slipInput || !slipInput.files || !slipInput.files[0]) {
            showAuthMessage('payment-message', 'Please upload your payment slip.', 'error');
            return;
        }
        var file = slipInput.files[0];
        var reader = new FileReader();
        reader.onload = function () {
            var email = getCurrentUserEmail();
            var users = getUsers();
            users[email].paymentNumber = phone;
            users[email].paymentSlip = reader.result;
            users[email].paymentSubmitted = true;
            saveUsers(users);

            var submissionPayload = {
                email: email,
                name: users[email].name,
                phone: phone,
                planId: user.planId,
                planAmount: user.planAmount,
                slipBase64: reader.result
            };

            var pending = getPendingPayments();
            pending.push({
                email: email,
                name: users[email].name,
                phone: phone,
                planId: user.planId,
                planAmount: user.planAmount,
                slipBase64: reader.result,
                submittedAt: new Date().toISOString()
            });
            savePendingPayments(pending);

            loadCurrentUser();
            showAuthMessage('payment-message', 'Payment submitted. Waiting for approval.', 'success');

            if (window.fetch) {
                fetch(API_BASE_URL + '/api/payment-submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(submissionPayload)
                }).then(function (res) {
                    if (!res.ok) throw new Error('Request failed');
                }).catch(function () {
                    showAuthMessage('payment-message', 'Payment saved locally, but server sync failed. Please start backend server.', 'error');
                });
            }

            setTimeout(function () {
                route();
            }, 800);
        };
        reader.readAsDataURL(file);
    }

    function handleSlipChange() {
        var input = document.getElementById('payment-slip');
        var preview = document.getElementById('slip-preview');
        var labelText = document.getElementById('file-label-text');
        if (!input || !preview || !labelText) return;
        if (input.files && input.files[0]) {
            labelText.textContent = input.files[0].name;
            var reader = new FileReader();
            reader.onload = function () {
                preview.innerHTML = '<img src="' + reader.result + '" alt="Slip">';
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            preview.innerHTML = '';
            preview.classList.add('hidden');
            labelText.textContent = 'Choose file';
        }
    }

    function approveUser(email) {
        var users = getUsers();
        if (!users[email]) return;
        users[email].approved = true;
        saveUsers(users);
        var pending = getPendingPayments().filter(function (p) { return p.email !== email; });
        savePendingPayments(pending);
        renderAdminList();
    }

    function renderAdminList() {
        var listEl = document.getElementById('admin-list');
        if (!listEl) return;
        var pending = getPendingPayments();
        if (pending.length === 0) {
            listEl.innerHTML = '<p class="admin-empty">No pending approvals.</p>';
            return;
        }
        listEl.innerHTML = pending.map(function (p) {
            var slipImg = p.slipBase64
                ? '<div class="admin-item-slip"><img src="' + p.slipBase64 + '" alt="Slip"></div>'
                : '';
            return (
                '<div class="admin-item" data-email="' + escapeAttr(p.email) + '">' +
                '<div class="admin-item-info">' +
                '<div class="admin-item-name">' + escapeHtml(p.name) + '</div>' +
                '<div class="admin-item-detail">' + escapeHtml(p.email) + '</div>' +
                '<div class="admin-item-detail">' + escapeHtml(p.phone) + '</div>' +
                '<div class="admin-item-detail">Plan: ' + escapeHtml(p.planId) + ' - PKR ' + (p.planAmount || 0) + '</div>' +
                '</div>' +
                slipImg +
                '<button type="button" class="btn btn-primary btn-approve" data-email="' + escapeAttr(p.email) + '">Approve</button>' +
                '</div>'
            );
        }).join('');
        listEl.querySelectorAll('.btn-approve').forEach(function (btn) {
            btn.addEventListener('click', function () {
                approveUser(btn.getAttribute('data-email'));
            });
        });
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return String(text).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function route() {
        loadCurrentUser();
        var user = state.currentUser;
        
        var path = window.location.pathname;
        // Robust page detection
        var page = path.split('/').pop().toLowerCase();
        // Handle query strings if present (though unlikely for file protocol)
        page = page.split('?')[0];

        var isDashboard = page === 'dashboard.html' || page === 'dashboard';
        var isVideos = page === 'videos.html' || page === 'videos';
        var isHowItWorks = page === 'how-it-works.html' || page === 'how-it-works';
        var isWithdraw = page === 'withdraw.html' || page === 'withdraw';
        var isReferral = page === 'referral.html' || page === 'referral';
        var isEditProfile = page === 'edit-profile.html' || page === 'edit-profile';
        var isIndex = page === 'index.html' || page === '' || page === 'index';
        var isAppPage = isDashboard || isVideos || isHowItWorks || isWithdraw || isReferral || isEditProfile;

        // 1. Not Logged In
        if (!user) {
            if (isAppPage) {
                window.location.href = 'index.html';
                return;
            }
            // On index.html, show welcome screen
            showScreen('screen-welcome');
            return;
        }

        // 2. Plan Not Selected
        if (!user.planId || user.planAmount == null) {
            if (isAppPage) {
                window.location.href = 'index.html';
                return;
            }
            showScreen('screen-plans');
            return;
        }

        // 3. Payment Not Submitted
        if (!user.paymentSubmitted) {
            if (isAppPage) {
                window.location.href = 'index.html';
                return;
            }
            showPaymentScreen();
            return;
        }

        // 4. Not Approved
        if (!user.approved) {
            if (isAppPage) {
                window.location.href = 'index.html';
                return;
            }
            showScreen('screen-pending');
            return;
        }

        // 5. Fully Authorized
        if (isIndex) {
            // If on login page but authorized, go to dashboard
            window.location.href = 'dashboard.html';
            return;
        }
        
        // We are on an app page, show the main content
        showScreen('screen-main');

        if (path.endsWith('how-it-works.html')) {
            initMainApp(); // Initialize for how-it-works
        } else if (path.endsWith('withdraw.html')) {
             initMainApp(); // Initialize for withdraw
        } else if (path.endsWith('referral.html')) {
             initMainApp(); // Initialize for referral
        } else {
             initMainApp(); // Fallback
        }
    }

    function getPointsKey() {
        var email = getCurrentUserEmail();
        return email ? STORAGE_KEYS.points + '_' + email.replace(/[^a-z0-9]/gi, '_') : STORAGE_KEYS.points;
    }

    function getStoredPoints() {
        var raw = localStorage.getItem(getPointsKey());
        var n = parseInt(raw, 10);
        return isNaN(n) ? 0 : Math.max(0, n);
    }

    function setStoredPoints(value) {
        var n = Math.max(0, Math.floor(value));
        var email = getCurrentUserEmail();
        var current = getStoredPoints();
        var diff = n - current;
        
        localStorage.setItem(getPointsKey(), String(n));

        if (window.fetch && email && diff !== 0) {
            fetch(API_BASE_URL + '/api/users/' + encodeURIComponent(email) + '/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: diff })
            }).catch(function() {
                console.error('Failed to sync points to server');
            });
        }
        return n;
    }

    function getStoredVideosWatched() {
        var raw = localStorage.getItem(STORAGE_KEYS.videosWatched);
        var n = parseInt(raw, 10);
        return isNaN(n) ? 0 : Math.max(0, n);
    }

    function getWatchedVideosKey() {
        var email = getCurrentUserEmail();
        return email ? STORAGE_KEYS.watchedVideos + '_' + email.replace(/[^a-z0-9]/gi, '_') : STORAGE_KEYS.watchedVideos;
    }

    function loadWatchedVideosForToday() {
        var today = new Date().toDateString();
        var email = getCurrentUserEmail();
        var key = getWatchedVideosKey();
        
        // Try backend first
        if (window.fetch && email) {
            fetch(API_BASE_URL + '/api/users/' + encodeURIComponent(email) + '/video-progress')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data && data.date === today) {
                        state.watchedVideoIds = data.ids || [];
                        state.videosWatchedToday = state.watchedVideoIds.length;
                        saveWatchedVideosForToday(state.watchedVideoIds);
                        updateVideosWatchedDisplay();
                    }
                })
                .catch(function() {
                    console.warn('Failed to fetch video progress from server, using local storage');
                });
        }

        var raw = localStorage.getItem(key);
        if (!raw) {
            state.watchedVideoIds = [];
            localStorage.setItem(key, JSON.stringify({ date: today, ids: [] }));
            return;
        }
        try {
            var data = JSON.parse(raw);
            if (!data || data.date !== today || !Array.isArray(data.ids)) {
                state.watchedVideoIds = [];
                localStorage.setItem(key, JSON.stringify({ date: today, ids: [] }));
                return;
            }
            state.watchedVideoIds = data.ids;
        } catch (e) {
            state.watchedVideoIds = [];
            localStorage.setItem(key, JSON.stringify({ date: today, ids: [] }));
        }
    }

    function saveWatchedVideosForToday(ids) {
        var key = getWatchedVideosKey();
        var today = new Date().toDateString();
        localStorage.setItem(key, JSON.stringify({ date: today, ids: ids }));
    }

    function markVideoWatched(videoId) {
        var email = getCurrentUserEmail();
        if (state.watchedVideoIds.indexOf(videoId) === -1) {
            state.watchedVideoIds.push(videoId);
            saveWatchedVideosForToday(state.watchedVideoIds);

            if (window.fetch && email) {
                fetch(API_BASE_URL + '/api/users/' + encodeURIComponent(email) + '/video-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoId: videoId })
                }).catch(function() {
                    console.error('Failed to sync video progress to server');
                });
            }
        }
    }

    function getVideosWatchedToday() {
        var today = new Date().toDateString();
        var storedDate = localStorage.getItem(STORAGE_KEYS.todayDate);
        if (storedDate !== today) return 0;
        var raw = localStorage.getItem(STORAGE_KEYS.todayCount);
        var n = parseInt(raw, 10);
        return isNaN(n) ? 0 : Math.max(0, n);
    }

    function getPointsPerPkr() {
        return 1; // 1 Point = 1 PKR
    }

    function getRedeemablePkr() {
        return state.points.toLocaleString(); // 1:1 ratio
    }

    function getVideoReward() {
        var user = state.currentUser;
        if (!user || !user.planId) return 0;
        var plan = plans.filter(function(p) { return p.id === user.planId; })[0];
        return plan ? plan.rate : 0;
    }

    function loadState() {
        state.points = getStoredPoints();
        state.videosWatchedToday = getVideosWatchedToday();
        loadWatchedVideosForToday();
        var today = new Date().toDateString();
        var storedDate = localStorage.getItem(STORAGE_KEYS.todayDate);
        if (storedDate !== today) state.videosWatchedToday = 0;
    }

    function savePoints(value) {
        state.points = setStoredPoints(value);
    }

    function incrementVideosWatched() {
        var today = new Date().toDateString();
        state.videosWatchedToday += 1;
        localStorage.setItem(STORAGE_KEYS.videosWatched, String(getStoredVideosWatched() + 1));
        localStorage.setItem(STORAGE_KEYS.todayDate, today);
        localStorage.setItem(STORAGE_KEYS.todayCount, String(state.videosWatchedToday));
    }

    function updateAllPointsDisplays() {
        var els = [
            document.getElementById('header-points'),
            document.getElementById('mobile-points'),
            document.getElementById('total-points')
        ];
        els.forEach(function (el) {
            if (el) el.textContent = state.points;
        });
    }

    function updateVideosWatchedDisplay() {
        var el = document.getElementById('videos-watched');
        if (el) el.textContent = state.videosWatchedToday + ' / 15';
    }

    function updateRedeemableDisplay() {
        var el = document.getElementById('redeemable-value');
        if (el) el.textContent = 'PKR ' + getRedeemablePkr();
        var hint = document.getElementById('redeemable-hint');
        if (hint) hint.textContent = 'Minimum withdrawal: PKR 500';
    }

    function renderVideoCard(video) {
        var reward = getVideoReward();
        var card = document.createElement('div');
        card.className = 'video-card';
        card.setAttribute('data-video-id', video.id);
        card.innerHTML =
            '<div class="video-card-thumb">' +
            '<span class="video-card-thumb-icon"><i class="ph ph-play-fill"></i></span>' +
            '<span class="video-card-duration">' + video.duration + 's</span>' +
            '<span class="video-card-points">+' + reward + ' PKR</span>' +
            '</div>' +
            '<div class="video-card-body">' +
            '<h3 class="video-card-title">' + escapeHtml(video.title) + '</h3>' +
            '<p class="video-card-meta">' + video.duration + 's watch</p>' +
            '</div>';
        return card;
    }

    function renderVideosGrid() {
        var grid = document.getElementById('videos-grid');
        if (!grid) return;
        grid.innerHTML = '';
        videos.forEach(function (video) {
            if (state.watchedVideoIds.indexOf(video.id) === -1) {
                grid.appendChild(renderVideoCard(video));
            }
        });
    }

    function openModal(video) {
        state.currentVideo = video;
        state.watchElapsed = 0;

        var overlay = document.getElementById('modal-overlay');
        var placeholder = document.getElementById('video-placeholder');
        var durationEl = document.getElementById('video-duration');
        var totalTimeEl = document.getElementById('total-time');
        var elapsedTimeEl = document.getElementById('elapsed-time');
        var progressFill = document.getElementById('progress-fill');
        var earnPointsEl = document.getElementById('earn-points');
        var titleEl = document.getElementById('modal-video-title');
        var descEl = document.getElementById('modal-video-desc');

        var reward = getVideoReward();
        if (placeholder) placeholder.classList.remove('playing');
        if (durationEl) durationEl.textContent = video.duration;
        if (totalTimeEl) totalTimeEl.textContent = video.duration + 's';
        if (elapsedTimeEl) elapsedTimeEl.textContent = '0s';
        if (progressFill) progressFill.style.width = '0%';
        if (earnPointsEl) earnPointsEl.textContent = reward + ' PKR';
        if (titleEl) titleEl.textContent = video.title;
        if (descEl) descEl.textContent = video.desc;

        if (overlay) {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal() {
        if (state.watchInterval) {
            clearInterval(state.watchInterval);
            state.watchInterval = null;
        }
        state.currentVideo = null;
        var overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    function startWatchTimer() {
        if (state.watchInterval) return;
        
        if (state.videosWatchedToday >= 15) {
            showPopup('You have reached your daily limit of 15 videos. Please come back tomorrow!', 'error');
            return;
        }

        var video = state.currentVideo;
        if (!video) return;

        var placeholder = document.getElementById('video-placeholder');
        var progressFill = document.getElementById('progress-fill');
        var elapsedTimeEl = document.getElementById('elapsed-time');
        var totalTimeEl = document.getElementById('total-time');

        if (placeholder) placeholder.classList.add('playing');

        state.watchInterval = setInterval(function () {
            state.watchElapsed += 1;
            var pct = Math.min(100, (state.watchElapsed / video.duration) * 100);

            if (progressFill) progressFill.style.width = pct + '%';
            if (elapsedTimeEl) elapsedTimeEl.textContent = state.watchElapsed + 's';
            if (totalTimeEl) totalTimeEl.textContent = video.duration + 's';

            if (state.watchElapsed >= video.duration) {
                clearInterval(state.watchInterval);
                state.watchInterval = null;
                var reward = getVideoReward();
                savePoints(state.points + reward);
                incrementVideosWatched();
                markVideoWatched(video.id);
                updateAllPointsDisplays();
                updateVideosWatchedDisplay();
                updateRedeemableDisplay();
                renderVideosGrid();
                closeModal();
            }
        }, 1000);
    }

    function getWithdrawals() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.withdrawals);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveWithdrawals(list) {
        localStorage.setItem(STORAGE_KEYS.withdrawals, JSON.stringify(list));
    }

    function handleWithdrawSubmit(e) {
        e.preventDefault();
        var user = state.currentUser;
        if (!user) return;

        var nameInput = document.getElementById('withdraw-name');
        var accountInput = document.getElementById('withdraw-account');
        var amountInput = document.getElementById('withdraw-amount');
        var methodInputs = document.getElementsByName('withdraw-method');
        
        var name = nameInput.value.trim();
        var account = accountInput.value.trim();
        var amount = parseInt(amountInput.value, 10);
        var method = 'jazzcash';
        
        for (var i = 0; i < methodInputs.length; i++) {
            if (methodInputs[i].checked) {
                method = methodInputs[i].value;
                break;
            }
        }

        if (!name || !account || isNaN(amount)) {
            showPopup('Please fill all fields correctly.', 'error');
            return;
        }

        if (amount < 500) {
            showPopup('Minimum withdrawal amount is PKR 500.', 'error');
            return;
        }

        // Check Balance
        // 1 Point = 1 PKR
        var currentPoints = state.points;
        if (currentPoints < amount) {
            showPopup('Insufficient balance. You have PKR ' + currentPoints, 'error');
            return;
        }

        // Deduct Points
        savePoints(currentPoints - amount);
        updateAllPointsDisplays();
        updateRedeemableDisplay();

        var withdrawalData = {
            email: user.email,
            name: name,
            method: method,
            accountNumber: account,
            amount: amount
        };

        if (window.fetch) {
            fetch(API_BASE_URL + '/api/withdrawals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withdrawalData)
            }).catch(function() {
                console.error('Failed to sync withdrawal to server');
            });
        }

        // Save Withdrawal Request (Local Cache)
        var list = getWithdrawals();
        list.push({
            id: Date.now(),
            email: user.email,
            name: name,
            method: method,
            account: account,
            amount: amount,
            status: 'Pending',
            date: new Date().toLocaleDateString()
        });
        saveWithdrawals(list);

        // Reset Form & Update UI
        document.getElementById('form-withdraw').reset();
        renderWithdrawHistory();
        updateWithdrawBalance();
        showPopup('Withdrawal request submitted successfully!', 'success');
    }

    function renderWithdrawHistory() {
        var tbody = document.getElementById('withdraw-history-list');
        var noMsg = document.getElementById('no-history-msg');
        if (!tbody || !noMsg) return;

        var user = state.currentUser;
        if (!user) return;

        var allWithdrawals = getWithdrawals();
        var myWithdrawals = allWithdrawals.filter(function(w) { return w.email === user.email; });

        if (myWithdrawals.length === 0) {
            tbody.innerHTML = '';
            noMsg.classList.remove('hidden');
            return;
        }

        noMsg.classList.add('hidden');
        tbody.innerHTML = myWithdrawals.slice().reverse().map(function(w) {
            var statusClass = w.status === 'Paid' ? 'status-paid' : 'status-pending';
            return (
                '<tr>' +
                '<td>' + w.date + '</td>' +
                '<td style="text-transform: capitalize;">' + w.method + '</td>' +
                '<td>' + w.account + '</td>' +
                '<td>PKR ' + w.amount + '</td>' +
                '<td><span class="status-badge ' + statusClass + '">' + w.status + '</span></td>' +
                '</tr>'
            );
        }).join('');
    }

    function updateWithdrawBalance() {
        var el = document.getElementById('withdraw-balance');
        if (el) el.textContent = 'PKR ' + state.points.toLocaleString();
    }

    var REFERRAL_BASE_URL = 'https://videowatchhub.vercel.app';

    function getReferralCode(user) {
        if (user.referralCode) return user.referralCode;
        // Generate a simple code if not exists
        var code = 'WE-' + (user.name ? user.name.substring(0, 3).toUpperCase() : 'USER') + Math.floor(1000 + Math.random() * 9000);
        user.referralCode = code;
        // Save user back
        var users = getUsers();
        if (users[user.email]) {
            users[user.email].referralCode = code;
            saveUsers(users);
        }
        return code;
    }

    function buildReferralLink(code) {
        return REFERRAL_BASE_URL.replace(/\/+$/, '') + '/?ref=' + encodeURIComponent(code);
    }

    function initReferralPage() {
        var user = state.currentUser;
        if (!user) return;
        
        var code = getReferralCode(user);
        var referralLink = buildReferralLink(code);
        var codeEl = document.getElementById('referral-code');
        if (codeEl) codeEl.textContent = referralLink;

        var btnCopy = document.getElementById('btn-copy-code');
        if (btnCopy) {
            btnCopy.addEventListener('click', function() {
                navigator.clipboard.writeText(referralLink).then(function() {
                    var originalIcon = btnCopy.innerHTML;
                    btnCopy.innerHTML = '<i class="ph ph-check"></i>';
                    setTimeout(function() {
                        btnCopy.innerHTML = originalIcon;
                    }, 2000);
                });
            });
        }
        
        // Dummy stats for now, or could be stored in user object
        var totalReferralsEl = document.getElementById('total-referrals');
        var referralEarningsEl = document.getElementById('referral-earnings');
        
        // Just for display, we can assume 0 for now as we don't have full referral tracking
        if (totalReferralsEl) totalReferralsEl.textContent = user.referralsCount || '0';
        if (referralEarningsEl) referralEarningsEl.textContent = 'PKR ' + (user.referralEarnings || '0');
    }

    function renderLoginHistory(user) {
        var tbody = document.getElementById('login-history-list');
        if (!tbody) return;

        var history = user.loginHistory || [];
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--color-text-muted);">No login history found.</td></tr>';
            return;
        }

        tbody.innerHTML = history.map(function(entry) {
            return (
                '<tr>' +
                '<td>' + escapeHtml(entry.device) + '</td>' +
                '<td>' + escapeHtml(entry.location) + '</td>' +
                '<td>' + escapeHtml(entry.date) + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function initEditProfilePage() {
        var user = state.currentUser;
        if (!user) return;

        var nameInput = document.getElementById('edit-name-page');
        var emailInput = document.getElementById('edit-email-page');
        var passwordInput = document.getElementById('edit-password-page');
        
        // Sidebar elements
        var profileNameDisplay = document.getElementById('profile-name-display');
        var profileEmailDisplay = document.getElementById('profile-email-display');

        if (nameInput) nameInput.value = user.name || '';
        if (emailInput) emailInput.value = user.email || '';
        
        if (profileNameDisplay) profileNameDisplay.textContent = user.name || 'User';
        if (profileEmailDisplay) profileEmailDisplay.textContent = user.email || '';

        renderLoginHistory(user);

        // Security elements
        var pinInput = document.getElementById('security-pin');
        var toggle2fa = document.getElementById('toggle-2fa');
        var btnSavePin = document.getElementById('btn-save-pin');

        if (pinInput && user.security) {
            pinInput.value = user.security.pin || '';
        }
        if (toggle2fa && user.security) {
            toggle2fa.checked = user.security.twoFactor || false;
        }

        // Tabs Logic
        var tabButtons = document.querySelectorAll('.profile-menu-item');
        var tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var target = btn.getAttribute('data-tab');
                if (!target) return;

                // Update Buttons
                tabButtons.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');

                // Update Content
                tabContents.forEach(function(c) { 
                    c.classList.add('hidden');
                    if (c.id === 'tab-' + target) c.classList.remove('hidden');
                });
            });
        });

        // Save PIN
        if (btnSavePin) {
            btnSavePin.addEventListener('click', function() {
                var pin = pinInput.value.trim();
                if (pin.length !== 4 || isNaN(pin)) {
                    showPopup('Please enter a valid 4-digit PIN.', 'error');
                    return;
                }

                var users = getUsers();
                if (users[user.email]) {
                    if (!users[user.email].security) users[user.email].security = {};
                    users[user.email].security.pin = pin;
                    saveUsers(users);
                    loadCurrentUser();
                    showPopup('Security PIN updated successfully.', 'success');
                }
            });
        }

        // Toggle 2FA
        if (toggle2fa) {
            toggle2fa.addEventListener('change', function() {
                var users = getUsers();
                if (users[user.email]) {
                    if (!users[user.email].security) users[user.email].security = {};
                    users[user.email].security.twoFactor = toggle2fa.checked;
                    saveUsers(users);
                    loadCurrentUser();
                    // alert('2FA setting updated.'); // Optional
                }
            });
        }

        var form = document.getElementById('form-edit-profile-page');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                var newName = nameInput.value.trim();
                var newPassword = passwordInput.value;
                
                if (!newName) {
                    showPopup('Name cannot be empty.', 'error');
                    return;
                }

                var users = getUsers();
                var email = user.email;
                
                if (users[email]) {
                    users[email].name = newName;
                    if (newPassword) {
                        users[email].password = newPassword;
                    }
                    saveUsers(users);
                    loadCurrentUser();
                    
                    // Update sidebar display immediately
                    if (profileNameDisplay) profileNameDisplay.textContent = newName;
                    
                    showPopup('Profile updated successfully.', 'success');
                }
            });
        }
    }

    function initMainApp() {
        loadState();
        renderVideosGrid();
        updateAllPointsDisplays();
        updateVideosWatchedDisplay();
        updateRedeemableDisplay();
        
        // Withdraw Page Init
        if (window.location.pathname.endsWith('withdraw.html') || window.location.pathname.endsWith('withdraw')) {
            updateWithdrawBalance();
            renderWithdrawHistory();
            var withdrawForm = document.getElementById('form-withdraw');
            if (withdrawForm) {
                // Remove old listeners to prevent duplicates if init is called multiple times (though not likely here)
                withdrawForm.removeEventListener('submit', handleWithdrawSubmit);
                withdrawForm.addEventListener('submit', handleWithdrawSubmit);
            }
        }
        
        // Referral Page Init
        if (window.location.pathname.endsWith('referral.html') || window.location.pathname.endsWith('referral')) {
            initReferralPage();
        }

        // Edit Profile Page Init
        if (window.location.pathname.endsWith('edit-profile.html') || window.location.pathname.endsWith('edit-profile')) {
            initEditProfilePage();
        }

        var grid = document.getElementById('videos-grid');
        if (grid) grid.addEventListener('click', function (e) {
            var card = e.target.closest('.video-card');
            if (!card) return;
            var id = parseInt(card.getAttribute('data-video-id'), 10);
            var video = videos.filter(function (v) { return v.id === id; })[0];
            if (video) openModal(video);
        });

        var overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.addEventListener('click', function (e) {
            if (e.target.id === 'modal-overlay' || e.target.id === 'modal-close') closeModal();
        });

        var playBtn = document.getElementById('play-btn');
        var placeholder = document.getElementById('video-placeholder');
        if (playBtn) playBtn.addEventListener('click', function () { if (state.currentVideo) startWatchTimer(); });
        if (placeholder) placeholder.addEventListener('click', function () { if (state.currentVideo) startWatchTimer(); });

        var toggle = document.getElementById('menu-toggle');
        var mobileNav = document.getElementById('mobile-nav');
        if (toggle && mobileNav) {
            toggle.addEventListener('click', function () {
                toggle.classList.toggle('active');
                mobileNav.classList.toggle('open');
            });
            mobileNav.querySelectorAll('.mobile-nav-link').forEach(function (link) {
                link.addEventListener('click', function () {
                    toggle.classList.remove('active');
                    mobileNav.classList.remove('open');
                });
            });
        }

        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                var href = this.getAttribute('href');
                if (href === '#') return;
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    function openEditProfileModal() {
        var user = state.currentUser;
        if (!user) return;
        
        var overlay = document.getElementById('edit-profile-modal-overlay');
        var nameInput = document.getElementById('edit-name');
        var dropdownName = document.getElementById('dropdown-name');
        var dropdownEmail = document.getElementById('dropdown-email');

        if (nameInput) nameInput.value = user.name || '';
        if (dropdownName) dropdownName.textContent = user.name || 'User';
        if (dropdownEmail) dropdownEmail.textContent = user.email || '';

        if (overlay) {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeEditProfileModal() {
        var overlay = document.getElementById('edit-profile-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
        document.getElementById('form-edit-profile').reset();
    }

    function handleEditProfileSubmit(e) {
        e.preventDefault();
        var user = state.currentUser;
        if (!user) return;

        var nameInput = document.getElementById('edit-name');
        var passwordInput = document.getElementById('edit-password');
        
        var newName = nameInput.value.trim();
        var newPassword = passwordInput.value;

        if (!newName) {
            showPopup('Name cannot be empty.', 'error');
            return;
        }

        var users = getUsers();
        var email = user.email;
        
        if (users[email]) {
            users[email].name = newName;
            if (newPassword) {
                users[email].password = newPassword;
            }
            saveUsers(users);
            loadCurrentUser();
            closeEditProfileModal();
            showPopup('Profile updated successfully.', 'success');
        }
    }

    function init() {
        document.querySelectorAll('.auth-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                switchAuthTab(tab.getAttribute('data-tab'));
            });
        });

        var formLogin = document.getElementById('form-login');
        if (formLogin) formLogin.addEventListener('submit', handleLogin);

        var formSignup = document.getElementById('form-signup');
        if (formSignup) formSignup.addEventListener('submit', handleSignup);

        var plansGrid = document.getElementById('plans-grid');
        if (plansGrid) {
            plansGrid.addEventListener('click', function (e) {
                if (e.target.classList.contains('btn-select-plan')) handlePlanSelect(e);
            });
        }

        var formPayment = document.getElementById('form-payment');
        if (formPayment) formPayment.addEventListener('submit', handlePaymentSubmit);

        var paymentSlip = document.getElementById('payment-slip');
        if (paymentSlip) paymentSlip.addEventListener('change', handleSlipChange);

        var btnLogoutPlans = document.getElementById('btn-logout-plans');
        if (btnLogoutPlans) btnLogoutPlans.addEventListener('click', logout);

        var btnBackPlans = document.getElementById('btn-back-plans');
        if (btnBackPlans) {
            btnBackPlans.addEventListener('click', function () {
                var users = getUsers();
                var email = getCurrentUserEmail();
                if (users[email]) {
                    users[email].planId = null;
                    users[email].planAmount = null;
                    saveUsers(users);
                    loadCurrentUser();
                    route();
                }
            });
        }

        var btnLogoutPending = document.getElementById('btn-logout-pending');
        if (btnLogoutPending) btnLogoutPending.addEventListener('click', logout);

        var btnLogoutMain = document.getElementById('btn-logout-main');
        if (btnLogoutMain) btnLogoutMain.addEventListener('click', logout);

        var sidebarLogout = document.getElementById('btn-logout-sidebar');
        if (sidebarLogout) sidebarLogout.addEventListener('click', logout);

        // Edit Profile Event Listeners
        var userProfileBtn = document.getElementById('user-profile-btn');
        if (userProfileBtn) {
            // Populate dropdown info on hover/click just in case
            userProfileBtn.addEventListener('mouseenter', function() {
                var user = state.currentUser;
                if(user) {
                     var dropdownName = document.getElementById('dropdown-name');
                     var dropdownEmail = document.getElementById('dropdown-email');
                     if (dropdownName) dropdownName.textContent = user.name;
                     if (dropdownEmail) dropdownEmail.textContent = user.email;
                }
            });
        }
        
        var btnEditProfile = document.getElementById('btn-edit-profile');
        if (btnEditProfile) btnEditProfile.addEventListener('click', openEditProfileModal);

        var editProfileClose = document.getElementById('edit-profile-close');
        if (editProfileClose) editProfileClose.addEventListener('click', closeEditProfileModal);

        var editProfileOverlay = document.getElementById('edit-profile-modal-overlay');
        if (editProfileOverlay) {
            editProfileOverlay.addEventListener('click', function (e) {
                if (e.target === editProfileOverlay) closeEditProfileModal();
            });
        }

        var formEditProfile = document.getElementById('form-edit-profile');
        if (formEditProfile) formEditProfile.addEventListener('submit', handleEditProfileSubmit);

        loadCurrentUser();
        route();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
