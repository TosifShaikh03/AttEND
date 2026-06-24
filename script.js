// Firebase Configuration - Replace with your own config
const firebaseConfig = {
    apiKey: "AIzaSyAZhbO8wqvrmL60GRHi4LVydT_59xKfEfU",
    authDomain: "attend-9aad5.firebaseapp.com",
    projectId: "attend-9aad5",
    storageBucket: "attend-9aad5.firebasestorage.app",
    messagingSenderId: "578319665823",
    appId: "1:578319665823:web:3c1eebaa399a5227fd70aa",
    measurementId: "G-0F8CJXY3TB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global Variables
let isLoginMode = false;
let currentUser = null;
let currentUserRole = null;
let editingStudentId = null;
let classList = []; // Store classes from database

// Auth State Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadClassesFromDB(); // Load classes first
        await checkUserRole(user.uid);
    } else {
        showAuthContainer();
    }
});

// ==================== LOAD CLASSES FROM DATABASE ====================

async function loadClassesFromDB() {
    try {
        const snapshot = await db.collection('classes').orderBy('createdAt').get();
        classList = [];

        snapshot.forEach(doc => {
            classList.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // If no classes exist, create default ones
        if (classList.length === 0) {
            await createDefaultClasses();
            return;
        }

        // Populate all class dropdowns
        populateClassDropdowns();

    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

async function createDefaultClasses() {
    const defaultClasses = [
        { name: 'FY BSC CS', fullName: 'FY BSC Computer Science' },
        { name: 'FY BSC IT', fullName: 'FY BSC Information Technology' },
        { name: 'FY BSC CYBER SECURITY', fullName: 'FY BSC Cyber Security' },
        { name: 'FY BSC DATA SCIENCE', fullName: 'FY BSC Data Science' },
        { name: 'FY BSC SOFTWARE ENGINEERING', fullName: 'FY BSC Software Engineering' }
    ];

    try {
        const batch = db.batch();

        defaultClasses.forEach(cls => {
            const docRef = db.collection('classes').doc();
            batch.set(docRef, {
                name: cls.name,
                fullName: cls.fullName,
                createdBy: 'system',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        await loadClassesFromDB();
    } catch (error) {
        console.error('Error creating default classes:', error);
    }
}

function populateClassDropdowns() {
    const dropdowns = [
        'classSelect',
        'teacherClassSelect',
        'modalClass'
    ];

    dropdowns.forEach(dropdownId => {
        const select = document.getElementById(dropdownId);
        if (select) {
            // Keep the first default option
            select.innerHTML = '<option value="">Select Class</option>';

            classList.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                select.appendChild(option);
            });
        }
    });
}

function getClassNameById(classId) {
    const cls = classList.find(c => c.id === classId);
    return cls ? cls.name : `Class ${classId}`;
}

// Check User Role
async function checkUserRole(uid) {
    try {
        const teacherDoc = await db.collection('teachers').doc(uid).get();

        if (teacherDoc.exists) {
            currentUserRole = 'teacher';
            showTeacherDashboard();
            return;
        }

        const studentDoc = await db.collection('students').doc(uid).get();

        if (studentDoc.exists) {
            currentUserRole = 'student';
            showStudentDashboard();
            await loadStudentSubjects();
            return;
        }

        await auth.signOut();
        alert('User not registered in the system');
    } catch (error) {
        console.error('Error checking user role:', error);
        await auth.signOut();
    }
}

// Show/Hide Containers
function showAuthContainer() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('studentDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'none';
}

function showStudentDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'block';
    document.getElementById('teacherDashboard').style.display = 'none';
    loadStudentAttendance();
}

function showTeacherDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('studentDashboard').style.display = 'none';
    document.getElementById('teacherDashboard').style.display = 'block';
}

// Toggle Auth Mode
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const button = document.getElementById('authButton');
    const toggleText = document.getElementById('toggleAuth');
    const studentFields = document.getElementById('studentFields');

    if (isLoginMode) {
        title.textContent = 'Login';
        button.textContent = 'Login';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>';
        studentFields.style.display = 'none';
    } else {
        title.textContent = 'Student Sign Up';
        button.textContent = 'Sign Up';
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
        studentFields.style.display = 'block';
    }
}

// Handle Authentication
// Handle Authentication with loading
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const authButton = document.getElementById('authButton');
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    setButtonLoading(authButton, true);
    
    try {
        if (isLoginMode) {
            showLoading('Logging in...');
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Login successful!', 'success');
        } else {
            const fullName = document.getElementById('fullName').value;
            const rollNumber = document.getElementById('rollNumber').value;
            const studentClass = document.getElementById('classSelect').value;
            const division = document.getElementById('divisionSelect').value;
            
            if (!fullName || !rollNumber || !studentClass || !division) {
                showToast('Please fill in all fields', 'error');
                setButtonLoading(authButton, false);
                hideLoading();
                return;
            }
            
            showLoading('Creating your account...');
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await db.collection('students').doc(user.uid).set({
                name: fullName,
                rollNumber: rollNumber,
                class: studentClass,
                division: division,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Account created successfully!', 'success');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showToast(error.message, 'error');
    } finally {
        setButtonLoading(authButton, false);
        hideLoading();
    }
}

// Logout
async function logout() {
    try {
        await auth.signOut();
        currentUserRole = null;
        classList = [];
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ==================== CLASS & SUBJECT HANDLING ====================

async function onClassDivisionChange() {
    const selectedClass = document.getElementById('teacherClassSelect').value;
    const selectedDivision = document.getElementById('teacherDivisionSelect').value;

    await updateSubjectDropdowns(selectedClass, selectedDivision);

    if (selectedClass && selectedDivision) {
        loadStudents();
    }
}

async function updateSubjectDropdowns(className, division) {
    const subjectSelect = document.getElementById('subjectSelect');

    subjectSelect.innerHTML = '<option value="">Select Subject</option>';

    if (!className || !division) {
        return;
    }

    try {
        const classSubjectDoc = await db.collection('classSubjects')
            .where('class', '==', className)
            .where('division', '==', division)
            .get();

        if (classSubjectDoc.empty) {
            return;
        }

        const subjectIds = [];
        classSubjectDoc.forEach(doc => {
            const data = doc.data();
            if (data.subjectIds && Array.isArray(data.subjectIds)) {
                subjectIds.push(...data.subjectIds);
            }
        });

        const uniqueSubjectIds = [...new Set(subjectIds)];

        for (const subjectId of uniqueSubjectIds) {
            const subjectDoc = await db.collection('subjects').doc(subjectId).get();
            if (subjectDoc.exists) {
                const subject = subjectDoc.data();
                const option = document.createElement('option');
                option.value = subjectId;
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            }
        }

    } catch (error) {
        console.error('Error updating subject dropdowns:', error);
    }
}

async function loadStudentSubjects() {
    try {
        const studentDoc = await db.collection('students').doc(currentUser.uid).get();
        if (!studentDoc.exists) return;

        const studentData = studentDoc.data();
        const studentClass = studentData.class;
        const studentDivision = studentData.division;

        const classSubjectQuery = await db.collection('classSubjects')
            .where('class', '==', studentClass)
            .where('division', '==', studentDivision)
            .get();

        const studentSubjectFilter = document.getElementById('studentSubjectFilter');
        studentSubjectFilter.innerHTML = '<option value="">All Subjects</option>';

        if (classSubjectQuery.empty) return;

        const classSubjectDoc = classSubjectQuery.docs[0];
        const subjectIds = classSubjectDoc.data().subjectIds || [];

        for (const subjectId of subjectIds) {
            const subjectDoc = await db.collection('subjects').doc(subjectId).get();
            if (subjectDoc.exists) {
                const option = document.createElement('option');
                option.value = subjectId;
                option.textContent = subjectDoc.data().name;
                studentSubjectFilter.appendChild(option);
            }
        }

    } catch (error) {
        console.error('Error loading student subjects:', error);
    }
}

// ==================== STUDENT MANAGEMENT ====================

// Load Students with skeleton loading
async function loadStudents() {
    const selectedClass = document.getElementById('teacherClassSelect').value;
    const selectedDivision = document.getElementById('teacherDivisionSelect').value;
    
    if (!selectedClass || !selectedDivision) {
        document.getElementById('studentList').innerHTML = '<p>Please select class and division</p>';
        return;
    }
    
    // Show skeleton loading
    showSkeleton('studentList', 5);
    
    try {
        const studentsRef = db.collection('students');
        
        let snapshot;
        try {
            snapshot = await studentsRef
                .where('class', '==', selectedClass)
                .where('division', '==', selectedDivision)
                .orderBy('rollNumber')
                .get();
        } catch (indexError) {
            console.warn('Index not found, falling back to client-side sorting:', indexError);
            
            snapshot = await studentsRef
                .where('class', '==', selectedClass)
                .where('division', '==', selectedDivision)
                .get();
            
            const sortedDocs = snapshot.docs.sort((a, b) => {
                const rollA = parseInt(a.data().rollNumber) || 0;
                const rollB = parseInt(b.data().rollNumber) || 0;
                return rollA - rollB;
            });
            
            snapshot = {
                empty: sortedDocs.length === 0,
                docs: sortedDocs,
                forEach: function(callback) {
                    sortedDocs.forEach(callback);
                }
            };
        }
        
        const studentList = document.getElementById('studentList');
        studentList.innerHTML = '<h3>Students List - ' + getClassNameById(selectedClass) + ' Division ' + selectedDivision + '</h3>';
        
        if (snapshot.empty) {
            studentList.innerHTML += '<p>No students found in this class</p>';
            return;
        }
        
        // Add students with animation delay
        snapshot.forEach((doc, index) => {
            const student = doc.data();
            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            studentCard.style.animation = `fadeInUp 0.3s ease ${index * 0.05}s both`;
            studentCard.innerHTML = `
                <div class="student-info-display">
                    <strong>${student.rollNumber}. ${student.name}</strong>
                    <br>Email: ${student.email || 'N/A'}
                    <br>Class: ${getClassNameById(student.class)} | Division: ${student.division}
                </div>
                <div class="student-actions">
                    <button onclick="editStudent('${doc.id}')" class="btn-edit">Edit</button>
                    <button onclick="viewStudentAttendanceModal('${doc.id}')" class="btn-print">View Attendance</button>
                </div>
            `;
            studentList.appendChild(studentCard);
        });
        
        window.currentClass = selectedClass;
        window.currentDivision = selectedDivision;
        
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('studentList').innerHTML = 
            `<p style="color: red;">Error loading students: ${error.message}</p>`;
        showToast('Error loading students', 'error');
    }
}

function showAddStudentForm() {
    editingStudentId = null;
    document.getElementById('modalTitle').textContent = 'Add Student';
    document.getElementById('modalName').value = '';
    document.getElementById('modalRoll').value = '';
    document.getElementById('modalEmail').value = '';
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalPassword').placeholder = 'Password';
    document.getElementById('modalClass').value = document.getElementById('teacherClassSelect').value || '';
    document.getElementById('modalDivision').value = document.getElementById('teacherDivisionSelect').value || '';
    document.getElementById('studentModal').style.display = 'flex';
}

async function editStudent(studentId) {
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();

        if (!studentDoc.exists) {
            alert('Student not found');
            return;
        }

        const student = studentDoc.data();

        editingStudentId = studentId;
        document.getElementById('modalTitle').textContent = 'Edit Student';
        document.getElementById('modalName').value = student.name || '';
        document.getElementById('modalRoll').value = student.rollNumber || '';
        document.getElementById('modalEmail').value = student.email || '';
        document.getElementById('modalPassword').value = '';
        document.getElementById('modalPassword').placeholder = 'Leave blank to keep current password';
        document.getElementById('modalClass').value = student.class || '';
        document.getElementById('modalDivision').value = student.division || '';
        document.getElementById('studentModal').style.display = 'flex';
    } catch (error) {
        console.error('Error editing student:', error);
        alert('Error loading student data: ' + error.message);
    }
}

async function saveStudent() {
    const name = document.getElementById('modalName').value;
    const rollNumber = document.getElementById('modalRoll').value;
    const email = document.getElementById('modalEmail').value;
    const password = document.getElementById('modalPassword').value;
    const studentClass = document.getElementById('modalClass').value;
    const division = document.getElementById('modalDivision').value;
    const saveButton = document.querySelector('#studentModal .btn-primary');
    
    if (!name || !rollNumber || !email || !studentClass || !division) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    setButtonLoading(saveButton, true);
    
    try {
        if (editingStudentId) {
            showLoading('Updating student...');
            await db.collection('students').doc(editingStudentId).update({
                name, rollNumber, email, class: studentClass, division,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Student updated successfully!', 'success');
        } else {
            if (!password || password.length < 6) {
                showToast('Please enter a password (minimum 6 characters)', 'error');
                setButtonLoading(saveButton, false);
                hideLoading();
                return;
            }
            
            showLoading('Creating student account...');
            
            const existingStudents = await db.collection('students').where('email', '==', email).get();
            if (!existingStudents.empty) {
                showToast('A student with this email already exists', 'error');
                setButtonLoading(saveButton, false);
                hideLoading();
                return;
            }
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('students').doc(userCredential.user.uid).set({
                name, rollNumber, email, class: studentClass, division,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast('Student added successfully!', 'success');
        }
        
        closeModal();
        loadStudents();
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            showToast('This email is already registered', 'error');
        } else {
            showToast('Error: ' + error.message, 'error');
        }
    } finally {
        setButtonLoading(saveButton, false);
        hideLoading();
    }
}

function closeModal() {
    document.getElementById('studentModal').style.display = 'none';
    editingStudentId = null;
}

// ==================== ATTENDANCE MODAL ====================

// Open Attendance Page with loading
async function openAttendancePage() {
    const selectedClass = document.getElementById('teacherClassSelect').value;
    const selectedDivision = document.getElementById('teacherDivisionSelect').value;
    const selectedSubject = document.getElementById('subjectSelect').value;
    
    if (!selectedClass || !selectedDivision) {
        showToast('Please select class and division first', 'error');
        return;
    }
    
    if (!selectedSubject) {
        showToast('Please select a subject', 'error');
        return;
    }
    
    // Show modal with loading
    document.getElementById('attendanceModal').style.display = 'flex';
    document.getElementById('attendanceList').innerHTML = `
        <div class="attendance-loading">
            <div class="loading-spinner"></div>
            <p>Loading students...</p>
        </div>
    `;
    
    const subjectDoc = await db.collection('subjects').doc(selectedSubject).get();
    const subjectName = subjectDoc.exists ? subjectDoc.data().name : 'Unknown Subject';
    
    try {
        const studentsRef = db.collection('students');
        
        let snapshot;
        try {
            snapshot = await studentsRef
                .where('class', '==', selectedClass)
                .where('division', '==', selectedDivision)
                .orderBy('rollNumber')
                .get();
        } catch (indexError) {
            snapshot = await studentsRef
                .where('class', '==', selectedClass)
                .where('division', '==', selectedDivision)
                .get();
            
            const sortedDocs = snapshot.docs.sort((a, b) => {
                const rollA = parseInt(a.data().rollNumber) || 0;
                const rollB = parseInt(b.data().rollNumber) || 0;
                return rollA - rollB;
            });
            
            snapshot = {
                empty: sortedDocs.length === 0,
                docs: sortedDocs,
                forEach: function(callback) {
                    sortedDocs.forEach(callback);
                }
            };
        }
        
        if (snapshot.empty) {
            document.getElementById('attendanceList').innerHTML = '<p>No students found in this class</p>';
            return;
        }
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').textContent = today;
        document.getElementById('attendanceClass').textContent = getClassNameById(selectedClass);
        document.getElementById('attendanceDivision').textContent = 'Division ' + selectedDivision;
        document.getElementById('attendanceSubject').textContent = subjectName;
        
        const attendanceList = document.getElementById('attendanceList');
        attendanceList.innerHTML = '';
        
        snapshot.forEach((doc, index) => {
            const student = doc.data();
            const attendanceItem = document.createElement('div');
            attendanceItem.className = 'attendance-item';
            attendanceItem.style.animation = `fadeInUp 0.2s ease ${index * 0.03}s both`;
            attendanceItem.innerHTML = `
                <span>${student.rollNumber}. ${student.name}</span>
                <button onclick="togglePresent(this, '${doc.id}')" class="btn-present" data-present="false">
                    Mark Present
                </button>
            `;
            attendanceList.appendChild(attendanceItem);
        });
        
    } catch (error) {
        console.error('Error opening attendance:', error);
        document.getElementById('attendanceList').innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
        showToast('Error loading students', 'error');
    }
}

// Mark Attendance with loading
async function markAttendance() {
    const selectedClass = document.getElementById('teacherClassSelect').value;
    const selectedDivision = document.getElementById('teacherDivisionSelect').value;
    const selectedSubject = document.getElementById('subjectSelect').value;
    const today = new Date().toISOString().split('T')[0];
    const markButton = document.querySelector('#attendanceModal .btn-success');
    
    if (!selectedSubject) {
        showToast('Please select a subject', 'error');
        return;
    }
    
    const attendanceButtons = document.querySelectorAll('#attendanceList .btn-present');
    const attendanceData = [];
    
    attendanceButtons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        const match = onclickAttr.match(/'([^']+)'/);
        if (match) {
            const studentId = match[1];
            const isPresent = button.getAttribute('data-present') === 'true';
            attendanceData.push({ studentId, isPresent });
        }
    });
    
    if (attendanceData.length === 0) {
        showToast('No students to mark attendance for', 'error');
        return;
    }
    
    setButtonLoading(markButton, true);
    showLoading('Saving attendance...');
    
    try {
        const existingAttendance = await db.collection('attendance')
            .where('class', '==', selectedClass)
            .where('division', '==', selectedDivision)
            .where('subjectId', '==', selectedSubject)
            .where('date', '==', today)
            .get();
        
        if (!existingAttendance.empty) {
            hideLoading();
            if (!confirm('Attendance for this subject has already been marked today. Do you want to overwrite it?')) {
                setButtonLoading(markButton, false);
                return;
            }
            showLoading('Overwriting attendance...');
            
            const batch = db.batch();
            existingAttendance.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
        
        const batch = db.batch();
        
        attendanceData.forEach(({ studentId, isPresent }) => {
            const attendanceRef = db.collection('attendance').doc();
            batch.set(attendanceRef, {
                studentId: studentId,
                date: today,
                class: selectedClass,
                division: selectedDivision,
                subjectId: selectedSubject,
                present: isPresent,
                markedBy: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        showToast('Attendance marked successfully!', 'success');
        closeAttendanceModal();
        loadStudents();
    } catch (error) {
        console.error('Error marking attendance:', error);
        showToast('Error marking attendance: ' + error.message, 'error');
    } finally {
        setButtonLoading(markButton, false);
        hideLoading();
    }
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
}

function togglePresent(button, studentId) {
    const isPresent = button.getAttribute('data-present') === 'true';

    if (isPresent) {
        button.textContent = 'Mark Present';
        button.classList.remove('marked');
        button.setAttribute('data-present', 'false');
    } else {
        button.textContent = 'Mark Absent';
        button.classList.add('marked');
        button.setAttribute('data-present', 'true');
    }
}

async function markAttendance() {
    const selectedClass = document.getElementById('teacherClassSelect').value;
    const selectedDivision = document.getElementById('teacherDivisionSelect').value;
    const selectedSubject = document.getElementById('subjectSelect').value;
    const today = new Date().toISOString().split('T')[0];

    if (!selectedSubject) {
        alert('Please select a subject');
        return;
    }

    const attendanceButtons = document.querySelectorAll('#attendanceList .btn-present');
    const attendanceData = [];

    attendanceButtons.forEach(button => {
        const onclickAttr = button.getAttribute('onclick');
        const match = onclickAttr.match(/'([^']+)'/);
        if (match) {
            const studentId = match[1];
            const isPresent = button.getAttribute('data-present') === 'true';
            attendanceData.push({ studentId, isPresent });
        }
    });

    if (attendanceData.length === 0) {
        alert('No students to mark attendance for');
        return;
    }

    try {
        const existingAttendance = await db.collection('attendance')
            .where('class', '==', selectedClass)
            .where('division', '==', selectedDivision)
            .where('subjectId', '==', selectedSubject)
            .where('date', '==', today)
            .get();

        if (!existingAttendance.empty) {
            if (!confirm('Attendance for this subject has already been marked today. Do you want to overwrite it?')) {
                return;
            }

            const batch = db.batch();
            existingAttendance.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        const batch = db.batch();

        attendanceData.forEach(({ studentId, isPresent }) => {
            const attendanceRef = db.collection('attendance').doc();
            batch.set(attendanceRef, {
                studentId: studentId,
                date: today,
                class: selectedClass,
                division: selectedDivision,
                subjectId: selectedSubject,
                present: isPresent,
                markedBy: currentUser.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        alert('Attendance marked successfully!');
        closeAttendanceModal();
        loadStudents();
    } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Error marking attendance: ' + error.message);
    }
}

// ==================== VIEW STUDENT ATTENDANCE MODAL ====================

// View Student Attendance with loading
async function viewStudentAttendanceModal(studentId) {
    // Show modal with loading
    document.getElementById('viewStudentModal').style.display = 'flex';
    document.getElementById('viewStudentContent').innerHTML = `
        <div class="modal-loading">
            <div class="loading-spinner"></div>
            <p>Loading attendance records...</p>
        </div>
    `;
    
    try {
        const studentDoc = await db.collection('students').doc(studentId).get();
        
        if (!studentDoc.exists) {
            document.getElementById('viewStudentContent').innerHTML = '<p>Student not found</p>';
            return;
        }
        
        const student = studentDoc.data();
        document.getElementById('viewStudentTitle').textContent = `Attendance - ${student.name}`;
        
        const snapshot = await db.collection('attendance')
            .where('studentId', '==', studentId)
            .orderBy('date', 'desc')
            .get();
        
        let contentHTML = `
            <div style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Roll Number:</strong> ${student.rollNumber}</p>
                <p><strong>Class:</strong> ${getClassNameById(student.class)} | <strong>Division:</strong> ${student.division}</p>
            </div>
        `;
        
        if (snapshot.empty) {
            contentHTML += '<p style="text-align: center; padding: 40px; color: #666;">No attendance records found</p>';
        } else {
            let totalPresent = 0;
            let totalDays = 0;
            const allRecords = [];
            
            for (const doc of snapshot.docs) {
                const record = doc.data();
                let subjectName = 'Unknown Subject';
                
                if (record.subjectId) {
                    const subjectDoc = await db.collection('subjects').doc(record.subjectId).get();
                    subjectName = subjectDoc.exists ? subjectDoc.data().name : 'Unknown Subject';
                }
                
                if (record.present) totalPresent++;
                totalDays++;
                
                allRecords.push({
                    date: record.date,
                    subject: subjectName,
                    present: record.present
                });
            }
            
            allRecords.sort((a, b) => b.date.localeCompare(a.date));
            
            const overallPercentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;
            const totalAbsent = totalDays - totalPresent;
            
            contentHTML += `
                <div class="attendance-percentage-card" style="animation: fadeInUp 0.5s ease;">
                    <div class="percentage-label">Overall Attendance</div>
                    <div class="percentage-value">${overallPercentage}%</div>
                    <div style="margin-top: 15px; display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
                        <span>✅ Present: ${totalPresent}</span>
                        <span>❌ Absent: ${totalAbsent}</span>
                        <span>📅 Total Days: ${totalDays}</span>
                    </div>
                </div>
            `;
            
            contentHTML += `
                <h3 style="margin: 25px 0 15px;">Attendance Records</h3>
                <div style="overflow-x: auto;">
                    <table class="attendance-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            allRecords.forEach((record, index) => {
                contentHTML += `
                    <tr style="animation: fadeInUp 0.3s ease ${index * 0.02}s both;">
                        <td>${index + 1}</td>
                        <td>${record.date}</td>
                        <td>${record.subject}</td>
                        <td class="${record.present ? 'status-present' : 'status-absent'}">
                            ${record.present ? '✅ Present' : '❌ Absent'}
                        </td>
                    </tr>
                `;
            });
            
            contentHTML += '</tbody></table></div>';
        }
        
        document.getElementById('viewStudentContent').innerHTML = contentHTML;
        
    } catch (error) {
        console.error('Error viewing attendance:', error);
        document.getElementById('viewStudentContent').innerHTML = 
            `<p style="color: red; text-align: center; padding: 40px;">Error loading attendance: ${error.message}</p>`;
        showToast('Error loading attendance', 'error');
    }
}

// Load Student's own attendance with loading
async function loadStudentAttendance() {
    if (!currentUser) return;
    
    showLoadingPlaceholder('studentAttendanceList', 'Loading your attendance...');
    
    const selectedSubject = document.getElementById('studentSubjectFilter').value;
    
    try {
        let query = db.collection('attendance')
            .where('studentId', '==', currentUser.uid);
        
        if (selectedSubject) {
            query = query.where('subjectId', '==', selectedSubject);
        }
        
        query = query.orderBy('date', 'desc').limit(100);
        
        const snapshot = await query.get();
        const attendanceList = document.getElementById('studentAttendanceList');
        attendanceList.innerHTML = '';
        
        if (snapshot.empty) {
            attendanceList.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No attendance records found</p>';
            return;
        }
        
        // ... rest of the function (same as before)
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('studentAttendanceList').innerHTML = 
            `<p style="color: red;">Error loading attendance: ${error.message}</p>`;
        showToast('Error loading attendance', 'error');
    }
}

function closeViewStudentModal() {
    document.getElementById('viewStudentModal').style.display = 'none';
}

// ==================== STUDENT ATTENDANCE VIEW ====================

async function loadStudentAttendance() {
    if (!currentUser) return;

    const selectedSubject = document.getElementById('studentSubjectFilter').value;

    try {
        let query = db.collection('attendance')
            .where('studentId', '==', currentUser.uid);

        if (selectedSubject) {
            query = query.where('subjectId', '==', selectedSubject);
        }

        query = query.orderBy('date', 'desc').limit(100);

        const snapshot = await query.get();
        const attendanceList = document.getElementById('studentAttendanceList');
        attendanceList.innerHTML = '';

        if (snapshot.empty) {
            attendanceList.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No attendance records found</p>';
            return;
        }

        let totalPresent = 0;
        let totalDays = 0;
        const allRecords = [];

        for (const doc of snapshot.docs) {
            const record = doc.data();

            let subjectName = 'Unknown Subject';
            if (record.subjectId) {
                const subjectDoc = await db.collection('subjects').doc(record.subjectId).get();
                subjectName = subjectDoc.exists ? subjectDoc.data().name : 'Unknown Subject';
            }

            if (record.present) {
                totalPresent++;
            }

            totalDays++;

            allRecords.push({
                date: record.date,
                subject: subjectName,
                present: record.present
            });
        }

        allRecords.sort((a, b) => b.date.localeCompare(a.date));

        const overallPercentage = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;
        const totalAbsent = totalDays - totalPresent;

        const overallCard = document.createElement('div');
        overallCard.className = 'attendance-percentage-card';
        overallCard.innerHTML = `
            <div class="percentage-label">Overall Attendance</div>
            <div class="percentage-value">${overallPercentage}%</div>
            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
                <span>✅ Present: ${totalPresent}</span>
                <span>❌ Absent: ${totalAbsent}</span>
                <span>📅 Total Days: ${totalDays}</span>
            </div>
        `;
        attendanceList.appendChild(overallCard);

        const tableHeader = document.createElement('h3');
        tableHeader.textContent = 'Attendance Records';
        tableHeader.style.margin = '25px 0 15px';
        attendanceList.appendChild(tableHeader);

        const tableContainer = document.createElement('div');
        tableContainer.style.overflowX = 'auto';

        const table = document.createElement('table');
        table.className = 'attendance-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        allRecords.forEach((record, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${record.date}</td>
                <td>${record.subject}</td>
                <td class="${record.present ? 'status-present' : 'status-absent'}">
                    ${record.present ? '✅ Present' : '❌ Absent'}
                </td>
            `;
            tbody.appendChild(row);
        });

        tableContainer.appendChild(table);
        attendanceList.appendChild(tableContainer);

    } catch (error) {
        console.error('Error loading attendance:', error);
        document.getElementById('studentAttendanceList').innerHTML =
            `<p style="color: red;">Error loading attendance: ${error.message}</p>`;
    }
}

// ==================== MODAL CLOSE HANDLERS ====================

window.onclick = function (event) {
    const studentModal = document.getElementById('studentModal');
    const attendanceModal = document.getElementById('attendanceModal');
    const viewStudentModal = document.getElementById('viewStudentModal');

    if (event.target == studentModal) {
        closeModal();
    }
    if (event.target == attendanceModal) {
        closeAttendanceModal();
    }
    if (event.target == viewStudentModal) {
        closeViewStudentModal();
    }
}

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeModal();
        closeAttendanceModal();
        closeViewStudentModal();
    }
});

// ==================== LOADING & NOTIFICATION FUNCTIONS ====================

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    if (messageEl) messageEl.textContent = message;
    if (overlay) overlay.classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
}

// Show toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Remove after animation
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Set button loading state
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        // Store original text
        button.setAttribute('data-original-text', button.textContent);
        button.innerHTML = '<span class="btn-text">' + button.textContent + '</span>';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.textContent = originalText;
        }
    }
}

// Show skeleton loading in an element
function showSkeleton(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let skeletonHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonHTML += `
            <div class="skeleton skeleton-card"></div>
        `;
    }
    container.innerHTML = skeletonHTML;
}

// Show loading placeholder
function showLoadingPlaceholder(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

// Initialize
showAuthContainer();