const STORAGE_KEYS = {
    STUDENTS: 'edu_students',
    ATTENDANCE: 'edu_attendance'
};

// Sample Data
const initialStudents = [
    { id: 'S101', name: 'John Doe', gender: 'Male', class: '10-A' },
    { id: 'S102', name: 'Jane Smith', gender: 'Female', class: '10-A' },
    { id: 'S103', name: 'Mike Ross', gender: 'Male', class: '10-B' },
    { id: 'S104', name: 'Rachel Zane', gender: 'Female', class: '10-B' },
    { id: 'S105', name: 'Harvey Specter', gender: 'Male', class: '10-A' },
];

// Application State
let state = {
    students: JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || initialStudents,
    attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE)) || [],
    currentView: 'dashboard'
};

// Initialize
function init() {
    if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(initialStudents));
    }
    
    setupNavigation();
    setupStudentManagement();
    setupAttendanceTaker();
    setupHistory();
    setupReports();
    updateDashboard();
    
    // Set default date to today
    document.getElementById('attendance-date').valueAsDate = new Date();
    document.getElementById('history-date').valueAsDate = new Date();
}

// --- Navigation ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            // UI update
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            document.getElementById('page-title').textContent = 
                item.textContent.trim();
            
            state.currentView = target;
            if (target === 'dashboard') updateDashboard();
        });
    });
}

// --- Student Management ---
function setupStudentManagement() {
    const modal = document.getElementById('student-modal');
    const openBtn = document.getElementById('open-student-modal');
    const closeBtn = document.getElementById('close-student-modal');
    const form = document.getElementById('student-form');
    const searchInput = document.getElementById('student-search');

    openBtn.onclick = () => {
        form.reset();
        document.getElementById('edit-student-id').value = '';
        document.getElementById('modal-title').textContent = 'Add Student';
        document.getElementById('student-id').disabled = false;
        modal.style.display = 'flex';
    };

    closeBtn.onclick = () => modal.style.display = 'none';

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('student-id').value;
        const name = document.getElementById('student-name').value;
        const gender = document.getElementById('student-gender').value;
        const className = document.getElementById('student-class').value;
        const editId = document.getElementById('edit-student-id').value;

        if (editId) {
            state.students = state.students.map(s => s.id === editId ? { id: editId, name, gender, class: className } : s);
        } else {
            if (state.students.some(s => s.id === id)) {
                alert('Student ID already exists!');
                return;
            }
            state.students.push({ id, name, gender, class: className });
        }

        saveData();
        renderStudents();
        modal.style.display = 'none';
    };

    searchInput.oninput = () => renderStudents();
    
    renderStudents();
}

function renderStudents() {
    const tbody = document.querySelector('#students-table tbody');
    const search = document.getElementById('student-search').value.toLowerCase();
    
    tbody.innerHTML = '';
    state.students
        .filter(s => s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search))
        .forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.gender}</td>
                <td>${s.class}</td>
                <td>
                    <button class="btn btn-primary" onclick="editStudent('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger" style="background:var(--danger); color:white" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
}

window.editStudent = (id) => {
    const student = state.students.find(s => s.id === id);
    document.getElementById('modal-title').textContent = 'Edit Student';
    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('student-id').value = student.id;
    document.getElementById('student-id').disabled = true;
    document.getElementById('student-name').value = student.name;
    document.getElementById('student-gender').value = student.gender;
    document.getElementById('student-class').value = student.class;
    document.getElementById('student-modal').style.display = 'flex';
};

window.deleteStudent = (id) => {
    if (confirm('Are you sure you want to delete this student? All their attendance records will be removed.')) {
        state.students = state.students.filter(s => s.id !== id);
        state.attendance = state.attendance.filter(a => a.studentId !== id);
        saveData();
        renderStudents();
    }
};

// --- Attendance Taker ---
function setupAttendanceTaker() {
    const classSelect = document.getElementById('attendance-class-select');
    const loadBtn = document.getElementById('load-attendance-list');
    const saveBtn = document.getElementById('save-attendance');

    // Fill class dropdown
    const classes = [...new Set(state.students.map(s => s.class))];
    classSelect.innerHTML = classes.map(c => `<option value="${c}">${c}</option>`).join('');

    loadBtn.onclick = () => {
        const selectedClass = classSelect.value;
        const date = document.getElementById('attendance-date').value;
        if (!date) return alert('Please select a date');

        const studentsInClass = state.students.filter(s => s.class === selectedClass);
        const tbody = document.querySelector('#attendance-table tbody');
        tbody.innerHTML = '';

        studentsInClass.forEach(s => {
            // Check if record already exists for this date
            const record = state.attendance.find(a => a.studentId === s.id && a.date === date);
            const status = record ? record.status : 'Present';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>
                    <select class="status-select" data-id="${s.id}">
                        <option value="Present" ${status === 'Present' ? 'selected' : ''}>Present</option>
                        <option value="Absent" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Late" ${status === 'Late' ? 'selected' : ''}>Late</option>
                        <option value="Excused" ${status === 'Excused' ? 'selected' : ''}>Excused</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    saveBtn.onclick = () => {
        const date = document.getElementById('attendance-date').value;
        const selectedClass = classSelect.value;
        const selects = document.querySelectorAll('.status-select');
        
        if (selects.length === 0) return alert('No students loaded to mark attendance');

        selects.forEach(select => {
            const studentId = select.getAttribute('data-id');
            const status = select.value;
            
            // Update or Add
            const idx = state.attendance.findIndex(a => a.studentId === studentId && a.date === date);
            if (idx > -1) {
                state.attendance[idx].status = status;
            } else {
                state.attendance.push({
                    studentId,
                    date,
                    status,
                    className: selectedClass
                });
            }
        });

        saveData();
        alert('Attendance saved successfully!');
    };
}

// --- History ---
function setupHistory() {
    const filterBtn = document.getElementById('filter-history');
    const classFilter = document.getElementById('history-class-filter');

    // Fill class filter
    const classes = [...new Set(state.students.map(s => s.class))];
    classFilter.innerHTML = classes.map(c => `<option value="${c}">${c}</option>`).join('');

    filterBtn.onclick = () => {
        const date = document.getElementById('history-date').value;
        const className = classFilter.value;
        
        let filtered = state.attendance;
        if (date) filtered = filtered.filter(a => a.date === date);
        if (className) filtered = filtered.filter(a => a.className === className);

        const tbody = document.querySelector('#history-table tbody');
        tbody.innerHTML = '';

        filtered.forEach(a => {
            const student = state.students.find(s => s.id === a.studentId);
            if (!student) return;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.date}</td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.class}</td>
                <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    };
}

// --- Reports ---
function setupReports() {
    const reportBtn = document.getElementById('generate-report');
    reportBtn.onclick = () => {
        const start = document.getElementById('report-start-date').value;
        const end = document.getElementById('report-end-date').value;

        if (!start || !end) return alert('Please select both start and end dates');

        const filtered = state.attendance.filter(a => a.date >= start && a.date <= end);
        const totals = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
        
        filtered.forEach(a => totals[a.status]++);

        const resultsDiv = document.getElementById('report-results');
        resultsDiv.innerHTML = `
            <div class="report-card">
                <h3>Summary (${start} to ${end})</h3>
                <p>Total Records: ${filtered.length}</p>
                <hr style="margin: 10px 0">
                <p>Present: ${totals.Present}</p>
                <p>Absent: ${totals.Absent}</p>
                <p>Late: ${totals.Late}</p>
                <p>Excused: ${totals.Excused}</p>
                <p><strong>Percentage: ${calculatePercentage(filtered)}</strong></p>
            </div>
        `;
    };
}

// --- Utilities ---
function calculatePercentage(records) {
    if (records.length === 0) return '0%';
    const present = records.filter(r => r.status === 'Present').length;
    return ((present / records.length) * 100).toFixed(1) + '%';
}

function updateDashboard() {
    // Get latest date attendance to show current stats
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = state.attendance.filter(a => a.date === today);
    
    document.getElementById('stat-total').textContent = state.students.length;
    document.getElementById('stat-present').textContent = todayRecords.filter(r => r.status === 'Present').length;
    document.getElementById('stat-absent').textContent = todayRecords.filter(r => r.status === 'Absent').length;
    document.getElementById('stat-late').textContent = todayRecords.filter(r => r.status === 'Late').length;
    document.getElementById('stat-percentage').textContent = calculatePercentage(todayRecords);
}

function saveData() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(state.attendance));
}

// Start the app
window.onload = init;
