const DEVELOPERS = ['禹', 'Tad', 'Liul', 'Nati', 'Bisrat', 'Simon'];
const PULSE_KEY = 'eaglepoint.dailyPulse';
const WEEKLY_KEY = 'eaglepoint.weeklySummary';

const STATUS = {
    on_track: { label: 'On track', watch: false },
    needs_clarification: { label: 'Need clarification', watch: true },
    blocked: { label: 'Blocked', watch: true },
    waiting: { label: 'Waiting', watch: true }
};

const ETA = {
    today: 'Today',
    tomorrow: 'Tomorrow',
    two_plus_days: '2+ days',
    unknown: 'Unknown'
};

const els = {};
let pulses = [];
let store = createLocalStore();
let unsubscribePulses = null;

document.addEventListener('DOMContentLoaded', async () => {
    cacheElements();
    bindEvents();
    await initializeStore();
});

function cacheElements() {
    [
        'todayCount',
        'blockerCount',
        'watchCount',
        'missingCount',
        'storageStatus',
        'pulseForm',
        'developerName',
        'taskId',
        'pulseStatus',
        'expectedFinish',
        'progressNote',
        'helpNeeded',
        'formStatus',
        'latestPulseList',
        'blockerList',
        'exportPulseBtn',
        'clearResolvedBtn',
        'aquilaCompleted',
        'weeklyTarget',
        'weeklyWins',
        'weeklyRisks',
        'weeklyNext',
        'summaryOutput',
        'copySummaryBtn'
    ].forEach(id => {
        els[id] = document.getElementById(id);
    });
}

function bindEvents() {
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', () => showTab(button.dataset.tab));
    });

    els.pulseForm.addEventListener('submit', submitPulse);
    els.exportPulseBtn.addEventListener('click', exportPulseCsv);
    els.clearResolvedBtn.addEventListener('click', clearResolvedPulses);
    els.copySummaryBtn.addEventListener('click', copySummary);

    ['aquilaCompleted', 'weeklyTarget', 'weeklyWins', 'weeklyRisks', 'weeklyNext'].forEach(id => {
        els[id].addEventListener('input', () => {
            saveWeeklyFields();
            renderSummary();
        });
    });
}

async function initializeStore() {
    store = createLocalStore();
    setStorageStatus('Local preview mode');

    const firebaseConfig = window.EAGLEPOINT_FIREBASE_CONFIG;
    if (firebaseConfig?.apiKey && firebaseConfig?.projectId) {
        try {
            store = await createFirebaseStore(firebaseConfig);
            setStorageStatus('Connected to Firebase');
        } catch (error) {
            console.error('Firebase setup failed. Falling back to local storage.', error);
            setStorageStatus('Firebase unavailable, using local preview mode');
        }
    }

    await loadWeeklyFields();
    unsubscribePulses = await store.subscribePulses(nextPulses => {
        pulses = nextPulses;
        render();
    });

    if (!unsubscribePulses) {
        pulses = await store.listPulses();
        render();
    }
}

function setStorageStatus(message) {
    els.storageStatus.textContent = message;
}

async function createFirebaseStore(config) {
    const [{ initializeApp }, firestore] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
    ]);

    const {
        getFirestore,
        collection,
        deleteDoc,
        doc,
        getDoc,
        onSnapshot,
        orderBy,
        query,
        setDoc,
        updateDoc
    } = firestore;

    const app = initializeApp(config);
    const db = getFirestore(app);
    const pulseCollection = config.pulseCollection || 'dailyPulses';
    const weeklyCollection = config.weeklyCollection || 'weeklySummaries';

    return {
        async subscribePulses(callback) {
            const pulseQuery = query(collection(db, pulseCollection), orderBy('submittedAt', 'desc'));
            return onSnapshot(pulseQuery, snapshot => {
                callback(snapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                })));
            });
        },
        async savePulse(pulse) {
            await setDoc(doc(db, pulseCollection, pulse.id), pulse);
        },
        async updatePulse(id, patch) {
            await updateDoc(doc(db, pulseCollection, id), patch);
        },
        async deleteResolvedPulses(currentPulses) {
            await Promise.all(
                currentPulses
                    .filter(pulse => pulse.resolved)
                    .map(pulse => deleteDoc(doc(db, pulseCollection, pulse.id)))
            );
        },
        async listPulses() {
            return pulses;
        },
        async getWeekly() {
            const snapshot = await getDoc(doc(db, weeklyCollection, 'current'));
            return snapshot.exists() ? snapshot.data() : {};
        },
        async saveWeekly(data) {
            await setDoc(doc(db, weeklyCollection, 'current'), data, { merge: true });
        }
    };
}

function createLocalStore() {
    return {
        async subscribePulses() {
            return null;
        },
        async savePulse(pulse) {
            const saved = readLocalPulses();
            saved.push(pulse);
            writeLocalPulses(saved);
        },
        async updatePulse(id, patch) {
            writeLocalPulses(readLocalPulses().map(pulse => (
                pulse.id === id ? { ...pulse, ...patch } : pulse
            )));
        },
        async deleteResolvedPulses() {
            writeLocalPulses(readLocalPulses().filter(pulse => !pulse.resolved));
        },
        async listPulses() {
            return readLocalPulses();
        },
        async getWeekly() {
            try {
                return JSON.parse(localStorage.getItem(WEEKLY_KEY) || '{}');
            } catch {
                localStorage.removeItem(WEEKLY_KEY);
                return {};
            }
        },
        async saveWeekly(data) {
            localStorage.setItem(WEEKLY_KEY, JSON.stringify(data));
        }
    };
}

function readLocalPulses() {
    try {
        const parsed = JSON.parse(localStorage.getItem(PULSE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeLocalPulses(nextPulses) {
    localStorage.setItem(PULSE_KEY, JSON.stringify(nextPulses));
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === tabId);
    });

    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
}

async function submitPulse(event) {
    event.preventDefault();
    els.formStatus.textContent = 'Saving...';

    const pulse = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name: els.developerName.value,
        taskId: els.taskId.value.trim(),
        status: els.pulseStatus.value,
        eta: els.expectedFinish.value,
        note: els.progressNote.value.trim(),
        help: els.helpNeeded.value.trim(),
        date: todayKey(),
        submittedAt: new Date().toISOString(),
        resolved: false,
        resolvedAt: ''
    };

    try {
        await store.savePulse(pulse);
        await refreshLocalSnapshot();
        els.pulseForm.reset();
        els.formStatus.textContent = 'Pulse submitted.';
        window.setTimeout(() => {
            els.formStatus.textContent = '';
        }, 2500);
    } catch (error) {
        console.error('Unable to save pulse.', error);
        els.formStatus.textContent = 'Could not save. Check Firebase rules/config.';
    }
}

async function refreshLocalSnapshot() {
    if (unsubscribePulses) {
        return;
    }

    pulses = await store.listPulses();
    render();
}

function getPulses() {
    return pulses;
}

function getTodayPulses() {
    return getPulses().filter(pulse => pulse.date === todayKey());
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function render() {
    renderMetrics();
    renderLatestPulses();
    renderBlockers();
    renderSummary();
}

function renderMetrics() {
    const todayPulses = getTodayPulses();
    const latestByDeveloper = getLatestByDeveloper(todayPulses);
    const openBlockers = getOpenBlockers();
    const watchCount = todayPulses.filter(pulse => STATUS[pulse.status]?.watch && !pulse.resolved).length;
    const missingCount = DEVELOPERS.filter(name => !latestByDeveloper.has(name)).length;

    els.todayCount.textContent = String(todayPulses.length);
    els.blockerCount.textContent = String(openBlockers.length);
    els.watchCount.textContent = String(watchCount);
    els.missingCount.textContent = String(missingCount);
}

function renderLatestPulses() {
    els.latestPulseList.replaceChildren();

    const latestByDeveloper = getLatestByDeveloper(getTodayPulses());
    const cards = DEVELOPERS.map(name => latestByDeveloper.get(name) || createMissingPulse(name));

    cards.forEach(pulse => {
        els.latestPulseList.append(createPulseCard(pulse));
    });
}

function renderBlockers() {
    els.blockerList.replaceChildren();

    const blockers = getOpenBlockers();
    if (blockers.length === 0) {
        els.blockerList.append(createEmptyState('No open blockers right now.'));
        return;
    }

    blockers.forEach(pulse => {
        els.blockerList.append(createPulseCard(pulse, { showResolve: true }));
    });
}

function getLatestByDeveloper(currentPulses) {
    const sorted = [...currentPulses].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    const latest = new Map();

    sorted.forEach(pulse => {
        if (!latest.has(pulse.name)) {
            latest.set(pulse.name, pulse);
        }
    });

    return latest;
}

function getOpenBlockers() {
    return getPulses()
        .filter(pulse => STATUS[pulse.status]?.watch && !pulse.resolved)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

function createMissingPulse(name) {
    return {
        name,
        taskId: 'No update',
        status: 'waiting',
        eta: 'unknown',
        note: 'No pulse submitted today.',
        help: '',
        submittedAt: '',
        isMissing: true
    };
}

function createPulseCard(pulse, options = {}) {
    const card = document.createElement('article');
    card.className = `pulse-card${pulse.resolved ? ' resolved' : ''}`;

    const header = document.createElement('div');
    header.className = 'pulse-header';

    const title = document.createElement('div');
    title.className = 'pulse-title';
    title.append(
        node('strong', pulse.name),
        node('span', pulse.taskId)
    );

    const badge = document.createElement('span');
    badge.className = `badge ${pulse.status}`;
    badge.textContent = pulse.isMissing ? 'No update' : STATUS[pulse.status]?.label || pulse.status;

    header.append(title, badge);

    const details = document.createElement('div');
    details.className = 'pulse-detail';
    details.append(
        node('span', `Expected finish: ${ETA[pulse.eta] || pulse.eta}`),
        node('span', `Progress: ${pulse.note || 'No note'}`)
    );

    if (pulse.help) {
        details.append(node('span', `Help needed: ${pulse.help}`));
    }

    const meta = node('div', pulse.submittedAt ? formatDateTime(pulse.submittedAt) : "Waiting for today's update");
    meta.className = 'pulse-meta';

    card.append(header, details, meta);

    if (options.showResolve) {
        const actions = document.createElement('div');
        actions.className = 'pulse-actions';

        const resolveButton = document.createElement('button');
        resolveButton.type = 'button';
        resolveButton.className = 'inline-btn';
        resolveButton.textContent = 'Mark Resolved';
        resolveButton.addEventListener('click', () => resolvePulse(pulse.id));

        actions.append(resolveButton);
        card.append(actions);
    }

    return card;
}

function node(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}

function createEmptyState(message) {
    const empty = document.createElement('div');
    empty.className = 'empty-state panel';
    empty.textContent = message;
    empty.style.padding = '18px';
    return empty;
}

function formatDateTime(value) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    }).format(new Date(value));
}

async function resolvePulse(id) {
    try {
        await store.updatePulse(id, {
            resolved: true,
            resolvedAt: new Date().toISOString()
        });
        await refreshLocalSnapshot();
    } catch (error) {
        console.error('Unable to resolve pulse.', error);
    }
}

async function clearResolvedPulses() {
    try {
        await store.deleteResolvedPulses(pulses);
        await refreshLocalSnapshot();
    } catch (error) {
        console.error('Unable to clear resolved pulses.', error);
    }
}

function exportPulseCsv() {
    const currentPulses = getPulses();
    if (currentPulses.length === 0) {
        els.formStatus.textContent = 'No pulse data to export.';
        return;
    }

    const rows = [
        ['Date', 'Developer', 'Aquila Task ID', 'Status', 'Expected Finish', 'Progress Note', 'Help Needed', 'Submitted At', 'Resolved'],
        ...currentPulses.map(pulse => [
            pulse.date,
            pulse.name,
            pulse.taskId,
            STATUS[pulse.status]?.label || pulse.status,
            ETA[pulse.eta] || pulse.eta,
            pulse.note,
            pulse.help,
            pulse.submittedAt,
            pulse.resolved ? 'Yes' : 'No'
        ])
    ];

    const csv = rows.map(row => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `eaglepoint-daily-pulse-${todayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function csvCell(value) {
    return `"${String(value || '').replace(/"/g, '""')}"`;
}

async function loadWeeklyFields() {
    const saved = await store.getWeekly();
    els.aquilaCompleted.value = saved.aquilaCompleted || 0;
    els.weeklyTarget.value = saved.weeklyTarget || 75;
    els.weeklyWins.value = saved.weeklyWins || '';
    els.weeklyRisks.value = saved.weeklyRisks || '';
    els.weeklyNext.value = saved.weeklyNext || '';
}

async function saveWeeklyFields() {
    try {
        await store.saveWeekly({
            aquilaCompleted: els.aquilaCompleted.value,
            weeklyTarget: els.weeklyTarget.value,
            weeklyWins: els.weeklyWins.value,
            weeklyRisks: els.weeklyRisks.value,
            weeklyNext: els.weeklyNext.value,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Unable to save weekly summary fields.', error);
    }
}

function renderSummary() {
    const completed = parsePositiveNumber(els.aquilaCompleted.value, 0);
    const target = Math.max(1, parsePositiveNumber(els.weeklyTarget.value, 1));
    const percent = Math.round((completed / target) * 100);
    const todayPulses = getTodayPulses();
    const blockers = getOpenBlockers();
    const latestByDeveloper = getLatestByDeveloper(todayPulses);
    const missing = DEVELOPERS.filter(name => !latestByDeveloper.has(name));

    els.summaryOutput.textContent = [
        `EAGLEPOINT WEEKLY PM SUMMARY - ${todayKey()}`,
        '',
        `Aquila completed tasks: ${completed} / ${target} (${percent}%)`,
        `Daily pulse submissions today: ${todayPulses.length}`,
        `Open blockers: ${blockers.length}`,
        `No update today: ${missing.length ? missing.join(', ') : 'None'}`,
        '',
        'Wins',
        els.weeklyWins.value.trim() || '-',
        '',
        'Risks',
        els.weeklyRisks.value.trim() || '-',
        '',
        'Next focus',
        els.weeklyNext.value.trim() || '-',
        '',
        'Open blocker details',
        blockers.length ? blockers.map(formatBlockerLine).join('\n') : '-'
    ].join('\n');
}

function parsePositiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function formatBlockerLine(pulse) {
    return `- ${pulse.name} / ${pulse.taskId}: ${STATUS[pulse.status]?.label || pulse.status}. ${pulse.help || pulse.note || 'Needs follow-up.'}`;
}

async function copySummary() {
    try {
        await navigator.clipboard.writeText(els.summaryOutput.textContent);
        els.copySummaryBtn.textContent = 'Copied';
        window.setTimeout(() => {
            els.copySummaryBtn.textContent = 'Copy Summary';
        }, 1600);
    } catch {
        els.copySummaryBtn.textContent = 'Copy Failed';
        window.setTimeout(() => {
            els.copySummaryBtn.textContent = 'Copy Summary';
        }, 1600);
    }
}
