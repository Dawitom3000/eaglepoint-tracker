function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

let selectedDev = '';

function openCheckin(devName) {
    selectedDev = devName;
    document.getElementById('modalDevName').textContent = devName;
    document.getElementById('checkinModal').classList.add('active');
}

function closeModal() {
    document.getElementById('checkinModal').classList.remove('active');
}

function submitModalCheckin() {
    const status = document.getElementById('modalStatus').value;
    const progress = document.getElementById('modalProgress').value;
    const blocker = document.getElementById('modalBlocker').value;
    
    const statusEmoji = status === 'green' ? '✅' : status === 'yellow' ? '🟡' : '🔴';
    
    const checkinHTML = `
        <div class="checkin-card ${blocker ? 'blocker' : ''}">
            <div class="checkin-header">
                <strong>${selectedDev}</strong>
                <span class="checkin-time">Just now</span>
            </div>
            <div class="checkin-message">${progress}</div>
            ${blocker ? `<div class="checkin-response">🔴 Blocker: ${blocker}</div>` : '<div class="checkin-response">✅ No blockers reported</div>'}
        </div>
    `;
    
    document.getElementById('checkinLog').innerHTML = checkinHTML + document.getElementById('checkinLog').innerHTML;
    closeModal();
    
    document.getElementById('modalProgress').value = '';
    document.getElementById('modalBlocker').value = '';
}

function submitCheckin() {
    const dev = document.getElementById('checkinDev').value;
    const status = document.getElementById('checkinStatus').value;
    const progress = document.getElementById('checkinProgress').value;
    const blocker = document.getElementById('checkinBlocker').value;
    
    const statusEmoji = status === 'green' ? '✅' : status === 'yellow' ? '🟡' : '🔴';
    
    const checkinHTML = `
        <div class="checkin-card ${blocker && blocker !== 'No blockers' ? 'blocker' : ''}">
            <div class="checkin-header">
                <strong>${dev}</strong>
                <span class="checkin-time">Just now</span>
            </div>
            <div class="checkin-message">${progress}</div>
            ${blocker && blocker !== 'No blockers' ? `<div class="checkin-response">🔴 Blocker: ${blocker}</div>` : '<div class="checkin-response">✅ No blockers reported</div>'}
        </div>
    `;
    
    document.getElementById('checkinLog').innerHTML = checkinHTML + document.getElementById('checkinLog').innerHTML;
    
    document.getElementById('checkinProgress').value = '';
    document.getElementById('checkinBlocker').value = '';
    document.getElementById('checkinHelp').value = '';
    
    alert('Check-in submitted successfully!');
}

function generateReport() {
    const week = document.getElementById('reportWeek').value;
    const total = document.getElementById('reportTotal').value;
    const target = document.getElementById('reportTarget').value;
    const wins = document.getElementById('reportWins').value;
    const challenges = document.getElementById('reportChallenges').value;
    const risks = document.getElementById('reportRisks').value;
    const next = document.getElementById('reportNext').value;
    
    const percentage = Math.round((total / target) * 100);
    
    const report = `WEEKLY GM REPORT - Week of ${week}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PERFORMANCE SUMMARY
• Total Tasks Completed: ${total} / ${target} (${percentage}%)
• Developers On Track: 4/12 (33%)
• Developers At Risk: 8/12 (67%)

✅ KEY WINS
${wins}

⚠️ CHALLENGES & BLOCKERS
${challenges}

🚨 RISKS TO CONTRACT
${risks}

📌 NEXT WEEK PRIORITIES
${next}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: Eaglepoint.ai Tracker`;
    
    document.getElementById('reportOutput').textContent = report;
}

function exportData() {
    alert('Export functionality - would save current state to CSV/JSON');
}

let devReports = [];

function submitDevReport() {
    const name = document.getElementById('reportDevName').value;
    const date = document.getElementById('reportDate').value;
    const tasks = document.getElementById('reportTasks').value;
    const inProgress = document.getElementById('reportInProgress').value;
    const blockers = document.getElementById('reportBlockers').value;
    const help = document.getElementById('reportHelp').value;
    
    if (!name) {
        alert('Please select your name');
        return;
    }
    if (!date) {
        alert('Please select a date');
        return;
    }
    if (!tasks) {
        alert('Please list your completed tasks');
        return;
    }
    
    const report = {
        id: Date.now(),
        name: name,
        date: date,
        tasks: tasks,
        inProgress: inProgress,
        blockers: blockers,
        help: help,
        timestamp: new Date().toLocaleString()
    };
    
    let storedReports = JSON.parse(localStorage.getItem('devReports') || '[]');
    storedReports.push(report);
    localStorage.setItem('devReports', JSON.stringify(storedReports));
    
    document.getElementById('reportTasks').value = '';
    document.getElementById('reportInProgress').value = '';
    document.getElementById('reportBlockers').value = '';
    document.getElementById('reportHelp').value = '';
    
    alert('Report submitted successfully!');
    loadSubmissions();
}

function loadSubmissions() {
    let storedReports = JSON.parse(localStorage.getItem('devReports') || '[]');
    
    const filterDev = document.getElementById('filterDev').value;
    const filterDate = document.getElementById('filterDate').value;
    
    let filtered = storedReports;
    if (filterDev) {
        filtered = filtered.filter(r => r.name === filterDev);
    }
    if (filterDate) {
        filtered = filtered.filter(r => r.date === filterDate);
    }
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const container = document.getElementById('submissionsList');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="checkin-card"><div class="checkin-message">No reports found. Try adjusting filters.</div></div>';
        return;
    }
    
    container.innerHTML = filtered.map(r => `
        <div class="checkin-card ${r.blockers ? 'blocker' : ''}">
            <div class="checkin-header">
                <strong>${r.name}</strong>
                <span class="checkin-time">${r.date} - ${r.timestamp}</span>
            </div>
            <div class="checkin-message"><strong>Tasks Completed:</strong> ${r.tasks}</div>
            ${r.inProgress ? `<div class="checkin-response"><strong>In Progress:</strong> ${r.inProgress}</div>` : ''}
            ${r.blockers ? `<div class="checkin-response" style="margin-top:8px"><strong>Blockers:</strong> ${r.blockers}</div>` : '<div class="checkin-response" style="margin-top:8px"><strong>Blockers:</strong> None</div>'}
            ${r.help ? `<div class="checkin-response" style="margin-top:8px"><strong>Needs Help With:</strong> ${r.help}</div>` : ''}
        </div>
    `).join('');
}

function filterReports() {
    loadSubmissions();
}

function exportReports() {
    let storedReports = JSON.parse(localStorage.getItem('devReports') || '[]');
    
    if (storedReports.length === 0) {
        alert('No reports to export');
        return;
    }
    
    let csv = 'Date,Developer,Tasks Completed,In Progress,Blockers,Needs Help With,Submitted\n';
    
    storedReports.forEach(r => {
        csv += `"${r.date}","${r.name}","${r.tasks.replace(/"/g, '""')}","${r.inProgress || ''}","${r.blockers || ''}","${r.help || ''}","${r.timestamp}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

document.getElementById('reportDate').valueAsDate = new Date();

loadSubmissions();