(function () {
    'use strict';

    var API_BASE_URL = 'https://my-project-backend-tonf.vercel.app';

    var STORAGE_KEYS = {
        users: 'watchearn_users',
        currentUser: 'watchearn_current_user',
        pendingPayments: 'watchearn_pending_payments',
        points: 'watchearn_points', // Prefix for points
        adminSession: 'watchearn_admin_session'
    };

    var ADMIN_CREDENTIALS = {
        email: 'admin@watchearn.com',
        password: 'admin'
    };

    function getAdminUsersAsync(done) {
        if (!window.fetch) {
            done([]);
            return;
        }
        fetch(API_BASE_URL + '/api/admin/users', { method: 'GET' })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
            .then(function (data) {
                var users = (data && data.users) ? data.users : [];
                done(users);
            })
            .catch(function () {
                done([]);
            });
    }

    function getPendingPayments() {
        try {
            var raw = localStorage.getItem(STORAGE_KEYS.pendingPayments);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    var lastPendingPayments = [];

    function getPendingPaymentsAsync(done) {
        if (!window.fetch) {
            done([]);
            return;
        }
        fetch(API_BASE_URL + '/api/admin/pending', { method: 'GET' })
            .then(function (res) { return res.ok ? res.json() : Promise.reject(); })
            .then(function (data) {
                var pending = (data && data.pending) ? data.pending : [];
                lastPendingPayments = pending;
                done(pending);
            })
            .catch(function () {
                lastPendingPayments = [];
                done([]);
            });
    }

    function adminApproveAsync(email, done) {
        if (!window.fetch) {
            done(false);
            return;
        }

        fetch(API_BASE_URL + '/api/admin/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        }).then(function (res) {
            done(res.ok);
        }).catch(function () {
            done(false);
        });
    }

    function adminRejectAsync(email, done) {
        if (!window.fetch) {
            done(false);
            return;
        }

        fetch(API_BASE_URL + '/api/admin/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        }).then(function (res) {
            done(res.ok);
        }).catch(function () {
            done(false);
        });
    }

    function savePendingPayments(list) {
        localStorage.setItem(STORAGE_KEYS.pendingPayments, JSON.stringify(list));
    }

    function getStoredPoints(email) {
        var key = email ? STORAGE_KEYS.points + '_' + email.replace(/[^a-z0-9]/gi, '_') : STORAGE_KEYS.points;
        var raw = localStorage.getItem(key);
        var n = parseInt(raw, 10);
        return isNaN(n) ? 0 : Math.max(0, n);
    }

    function showScreen(id) {
        var screens = ['screen-admin-login', 'screen-admin-dashboard'];
        screens.forEach(function (sid) {
            var el = document.getElementById(sid);
            if (el) {
                el.classList.toggle('hidden', sid !== id);
            }
        });
    }

    function showAuthMessage(text, type) {
        var el = document.getElementById('admin-auth-message');
        if (!el) return;
        el.textContent = text;
        el.className = 'auth-message ' + (type || '');
        el.classList.remove('hidden');
    }

    function hideAuthMessage() {
        var el = document.getElementById('admin-auth-message');
        if (el) el.classList.add('hidden');
    }

    function handleLogin(e) {
        e.preventDefault();
        hideAuthMessage();
        var email = document.getElementById('admin-email').value.trim().toLowerCase();
        var password = document.getElementById('admin-password').value;

        // Check hardcoded credentials first
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem(STORAGE_KEYS.adminSession, 'true');
            initDashboard();
            return;
        }

        if (window.fetch) {
            fetch(API_BASE_URL + '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.ok) {
                    localStorage.setItem(STORAGE_KEYS.adminSession, 'true');
                    initDashboard();
                } else {
                    showAuthMessage(data.error || 'Invalid credentials', 'error');
                }
            })
            .catch(function() {
                // Fallback for offline/server down
                if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                    localStorage.setItem(STORAGE_KEYS.adminSession, 'true');
                    initDashboard();
                } else {
                    showAuthMessage('Invalid admin credentials', 'error');
                }
            });
        }
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.adminSession);
        showScreen('screen-admin-login');
        document.getElementById('form-admin-login').reset();
    }

    function approveUser(email) {
        if (!confirm('Are you sure you want to approve ' + email + '?')) return;

        adminApproveAsync(email, function () {
            renderDashboard();
        });
    }

    function rejectUser(email) {
        if (!confirm('Are you sure you want to reject ' + email + '?')) return;

        adminRejectAsync(email, function () {
            renderDashboard();
        });
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function showImagePreview(src) {
        var modal = document.getElementById('modal-overlay');
        var img = document.getElementById('preview-img');
        if (modal && img) {
            img.src = src;
            modal.classList.add('open');
        }
    }

    function renderDashboardWithPending(pending, serverUsers) {
        var userList = Array.isArray(serverUsers) ? serverUsers : [];

        // Stats
        document.getElementById('admin-total-users').textContent = userList.length;
        document.getElementById('admin-pending-count').textContent = pending.length;

        // Pending List
        var pendingBody = document.getElementById('admin-pending-list');
        var noPendingMsg = document.getElementById('no-pending-msg');
        
        if (pending.length === 0) {
            pendingBody.innerHTML = '';
            noPendingMsg.classList.remove('hidden');
        } else {
            noPendingMsg.classList.add('hidden');
            pendingBody.innerHTML = pending.map(function (p) {
                return (
                    '<tr>' +
                    '<td>' + escapeHtml(p.name) + '</td>' +
                    '<td>' + escapeHtml(p.email) + '</td>' +
                    '<td>' + escapeHtml(p.planId) + ' (' + p.planAmount + ')</td>' +
                    '<td>' +
                    '<div>' + escapeHtml(p.phone) + '</div>' +
                    (p.slipBase64 ? '<div class="payment-slip-link" onclick="window.previewSlip(\'' + p.email + '\')">View Slip</div>' : 'No Slip') +
                    '</td>' +
                    '<td>' +
                    '<button class="btn btn-primary btn-sm" onclick="window.approveUser(\'' + p.email + '\')">Approve</button> ' +
                    '<button class="btn btn-text btn-sm" style="color:var(--color-error)" onclick="window.rejectUser(\'' + p.email + '\')">Reject</button>' +
                    '</td>' +
                    '</tr>'
                );
            }).join('');
        }

        // All Users List
        var usersBody = document.getElementById('admin-users-list');
        usersBody.innerHTML = userList.map(function (u) {
            var points = u.points || 0;
            var statusText = u.approved ? 'Active' : (u.paymentSubmitted ? 'Pending' : 'Incomplete');
            return (
                '<tr>' +
                '<td>' + escapeHtml(u.name || '') + '</td>' +
                '<td>' + escapeHtml(u.email || '') + '</td>' +
                '<td>' + (u.planId ? escapeHtml(u.planId) : '-') + '</td>' +
                '<td><span style="color: ' + (u.approved ? 'var(--color-success)' : 'var(--color-text-muted)') + '">' + statusText + '</span></td>' +
                '<td>' + points + '</td>' +
                '</tr>'
            );
        }).join('');
    }

    function renderDashboard() {
        getPendingPaymentsAsync(function (pending) {
            getAdminUsersAsync(function (users) {
                renderDashboardWithPending(pending, users);
            });
        });
    }

    function initDashboard() {
        showScreen('screen-admin-dashboard');
        renderDashboard();
    }

    // Expose functions to window for inline onclick handlers (simplest way for dynamic content)
    window.approveUser = approveUser;
    window.rejectUser = rejectUser;
    window.previewSlip = function(email) {
        var p = (lastPendingPayments || []).find(function(x) { return x.email === email; });
        if (!p) {
            var pending = getPendingPayments();
            p = pending.find(function(x) { return x.email === email; });
        }
        if (p && p.slipBase64) {
            showImagePreview(p.slipBase64);
        }
    };

    function init() {
        var isLoggedIn = localStorage.getItem(STORAGE_KEYS.adminSession) === 'true';
        if (isLoggedIn) {
            initDashboard();
        } else {
            showScreen('screen-admin-login');
        }

        document.getElementById('form-admin-login').addEventListener('submit', handleLogin);
        document.getElementById('btn-logout-admin').addEventListener('click', logout);
        
        var modal = document.getElementById('modal-overlay');
        var closeBtn = document.getElementById('modal-close');
        
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.classList.remove('open');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.classList.remove('open');
            });
        }
    }

    document.addEventListener('DOMContentLoaded', init);

})();
