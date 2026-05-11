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