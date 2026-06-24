// ===== script.js (compressed with setup embedded) =====
const firebaseConfig = { apiKey: "AIzaSyAZhbO8wqvrmL60GRHi4LVydT_59xKfEfU", authDomain: "attend-9aad5.firebaseapp.com", projectId: "attend-9aad5", storageBucket: "attend-9aad5.firebasestorage.app", messagingSenderId: "578319665823", appId: "1:578319665823:web:3c1eebaa399a5227fd70aa", measurementId: "G-0F8CJXY3TB" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(), db = firebase.firestore();
let isLoginMode = false, currentUser = null, currentUserRole = null, editingStudentId = null, classList = [], subjectsList = [], dbSubjects = [], currentTeacher = null, editingClassId = null, currentTab = 'classes', assignmentCheckboxes = {};
const divisions = ['A', 'B', 'C', 'D'];

// ===== LOADING / TOAST =====
function showLoading(m = 'Loading...') { const o = document.getElementById('loadingOverlay'), e = document.getElementById('loadingMessage'); if (e) e.textContent = m; if (o) o.classList.add('active') }
function hideLoading() { const o = document.getElementById('loadingOverlay'); if (o) o.classList.remove('active') }
function showToast(msg, type = 'info') { const c = document.getElementById('toastContainer'), t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; c.appendChild(t); setTimeout(() => t.remove(), 3000) }
function setButtonLoading(b, isLoading) { if (isLoading) { b.classList.add('loading'); b.disabled = true; b.setAttribute('data-original-text', b.textContent); b.innerHTML = '<span class="btn-text">' + b.textContent + '</span>' } else { b.classList.remove('loading'); b.disabled = false; const ot = b.getAttribute('data-original-text'); if (ot) b.textContent = ot } }
function showSkeleton(cid, count = 3) { const c = document.getElementById(cid); if (!c) return; let h = ''; for (let i = 0; i < count; i++)h += '<div class="skeleton skeleton-card"></div>'; c.innerHTML = h }
function showLoadingPlaceholder(cid, msg = 'Loading...') { const c = document.getElementById(cid); if (!c) return; c.innerHTML = '<div class="loading-placeholder"><div class="loading-spinner"></div><p>' + msg + '</p></div>' }

// ===== AUTH =====
auth.onAuthStateChanged(async (user) => { if (user) { currentUser = user; await loadClassesFromDB(); await checkUserRole(user.uid) } else showAuthContainer() });

async function checkUserRole(uid) { try { const t = await db.collection('teachers').doc(uid).get(); if (t.exists) { currentUserRole = 'teacher'; showTeacherDashboard(); return } const s = await db.collection('students').doc(uid).get(); if (s.exists) { currentUserRole = 'student'; showStudentDashboard(); await loadStudentSubjects(); return } await auth.signOut(); alert('User not registered in the system') } catch (e) { console.error(e); await auth.signOut() } }

function showAuthContainer() { document.getElementById('authContainer').style.display = 'flex'; document.getElementById('studentDashboard').style.display = 'none'; document.getElementById('teacherDashboard').style.display = 'none'; document.getElementById('setupPageContainer').style.display = 'none' }
function showStudentDashboard() { document.getElementById('authContainer').style.display = 'none'; document.getElementById('studentDashboard').style.display = 'block'; document.getElementById('teacherDashboard').style.display = 'none'; document.getElementById('setupPageContainer').style.display = 'none'; loadStudentAttendance() }
function showTeacherDashboard() { document.getElementById('authContainer').style.display = 'none'; document.getElementById('studentDashboard').style.display = 'none'; document.getElementById('teacherDashboard').style.display = 'block'; document.getElementById('setupPageContainer').style.display = 'none' }

function toggleAuthMode() { isLoginMode = !isLoginMode; const t = document.getElementById('authTitle'), b = document.getElementById('authButton'), tg = document.getElementById('toggleAuth'), sf = document.getElementById('studentFields'); if (isLoginMode) { t.textContent = 'Login'; b.textContent = 'Login'; tg.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign Up</a>'; sf.style.display = 'none' } else { t.textContent = 'Student Sign Up'; b.textContent = 'Sign Up'; tg.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>'; sf.style.display = 'block' } }

async function handleAuth() { const email = document.getElementById('email').value, pwd = document.getElementById('password').value, btn = document.getElementById('authButton'); if (!email || !pwd) { showToast('Please fill in all fields', 'error'); return } setButtonLoading(btn, true); try { if (isLoginMode) { showLoading('Logging in...'); await auth.signInWithEmailAndPassword(email, pwd); showToast('Login successful!', 'success') } else { const name = document.getElementById('fullName').value, roll = document.getElementById('rollNumber').value, cls = document.getElementById('classSelect').value, div = document.getElementById('divisionSelect').value; if (!name || !roll || !cls || !div) { showToast('Please fill in all fields', 'error'); setButtonLoading(btn, false); hideLoading(); return } showLoading('Creating your account...'); const uc = await auth.createUserWithEmailAndPassword(email, pwd), user = uc.user; await db.collection('students').doc(user.uid).set({ name, rollNumber: roll, class: cls, division: div, email, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast('Account created successfully!', 'success') } } catch (e) { console.error(e); showToast(e.message, 'error') } finally { setButtonLoading(btn, false); hideLoading() } }

async function logout() { try { await auth.signOut(); currentUserRole = null; classList = []; document.getElementById('setupPageContainer').style.display = 'none' } catch (e) { console.error(e) } }

// ===== CLASSES =====
async function loadClassesFromDB() { try { const snap = await db.collection('classes').orderBy('createdAt').get(); classList = []; snap.forEach(d => classList.push({ id: d.id, ...d.data() })); if (classList.length === 0) { await createDefaultClasses(); return } populateClassDropdowns() } catch (e) { console.error(e) } }

async function createDefaultClasses() { const defs = [{ name: 'FY BSC CS', fullName: 'FY BSC Computer Science' }, { name: 'FY BSC IT', fullName: 'FY BSC Information Technology' }, { name: 'FY BSC CYBER SECURITY', fullName: 'FY BSC Cyber Security' }, { name: 'FY BSC DATA SCIENCE', fullName: 'FY BSC Data Science' }, { name: 'FY BSC SOFTWARE ENGINEERING', fullName: 'FY BSC Software Engineering' }]; try { const batch = db.batch(); defs.forEach(c => { const ref = db.collection('classes').doc(); batch.set(ref, { name: c.name, fullName: c.fullName, createdBy: 'system', createdAt: firebase.firestore.FieldValue.serverTimestamp() }) }); await batch.commit(); await loadClassesFromDB() } catch (e) { console.error(e) } }

function populateClassDropdowns() { ['classSelect', 'teacherClassSelect', 'modalClass'].forEach(id => { const s = document.getElementById(id); if (s) { s.innerHTML = '<option value="">Select Class</option>'; classList.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; s.appendChild(o) }) } });['filterAssignClass'].forEach(id => { const s = document.getElementById(id); if (s) { s.innerHTML = '<option value="">All Classes</option>'; classList.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; s.appendChild(o) }) } }) }

function getClassNameById(id) { const c = classList.find(x => x.id === id); return c ? c.name : 'Class ' + id }

// ===== TEACHER FUNCTIONS =====
async function onClassDivisionChange() { const cls = document.getElementById('teacherClassSelect').value, div = document.getElementById('teacherDivisionSelect').value; await updateSubjectDropdowns(cls, div); if (cls && div) loadStudents() }

async function updateSubjectDropdowns(cls, div) { const ss = document.getElementById('subjectSelect'); ss.innerHTML = '<option value="">Select Subject</option>'; if (!cls || !div) return; try { const snap = await db.collection('classSubjects').where('class', '==', cls).where('division', '==', div).get(); if (snap.empty) return; const ids = []; snap.forEach(d => { const data = d.data(); if (data.subjectIds && Array.isArray(data.subjectIds)) ids.push(...data.subjectIds) }); const unique = [...new Set(ids)]; for (const sid of unique) { const doc = await db.collection('subjects').doc(sid).get(); if (doc.exists) { const sub = doc.data(); const o = document.createElement('option'); o.value = sid; o.textContent = sub.name; ss.appendChild(o) } } } catch (e) { console.error(e) } }

async function loadStudents() { const cls = document.getElementById('teacherClassSelect').value, div = document.getElementById('teacherDivisionSelect').value; if (!cls || !div) { document.getElementById('studentList').innerHTML = '<p>Please select class and division</p>'; return } showSkeleton('studentList', 5); try { const ref = db.collection('students'); let snap; try { snap = await ref.where('class', '==', cls).where('division', '==', div).orderBy('rollNumber').get() } catch (ie) { snap = await ref.where('class', '==', cls).where('division', '==', div).get(); const sorted = snap.docs.sort((a, b) => (parseInt(a.data().rollNumber) || 0) - (parseInt(b.data().rollNumber) || 0)); snap = { empty: sorted.length === 0, docs: sorted, forEach: function (cb) { sorted.forEach(cb) } } } const list = document.getElementById('studentList'); list.innerHTML = '<h3>Students List - ' + getClassNameById(cls) + ' Division ' + div + '</h3>'; if (snap.empty) { list.innerHTML += '<p>No students found in this class</p>'; return } snap.forEach((doc, i) => { const s = doc.data(); const card = document.createElement('div'); card.className = 'student-card'; card.style.animation = 'fadeInUp 0.3s ease ' + (i * 0.05) + 's both'; card.innerHTML = '<div class="student-info-display"><strong>' + s.rollNumber + '. ' + s.name + '</strong><br>Email: ' + (s.email || 'N/A') + '<br>Class: ' + getClassNameById(s.class) + ' | Division: ' + s.division + '</div><div class="student-actions"><button onclick="editStudent(\'' + doc.id + '\')" class="btn-edit">Edit</button><button onclick="viewStudentAttendanceModal(\'' + doc.id + '\')" class="btn-print">View Attendance</button></div>'; list.appendChild(card) }); window.currentClass = cls; window.currentDivision = div } catch (e) { console.error(e); document.getElementById('studentList').innerHTML = '<p style="color:red;">Error loading students: ' + e.message + '</p>'; showToast('Error loading students', 'error') } }

function showAddStudentForm() { editingStudentId = null; document.getElementById('modalTitle').textContent = 'Add Student'; document.getElementById('modalName').value = ''; document.getElementById('modalRoll').value = ''; document.getElementById('modalEmail').value = ''; document.getElementById('modalPassword').value = ''; document.getElementById('modalPassword').placeholder = 'Password'; document.getElementById('modalClass').value = document.getElementById('teacherClassSelect').value || ''; document.getElementById('modalDivision').value = document.getElementById('teacherDivisionSelect').value || ''; document.getElementById('studentModal').style.display = 'flex' }

async function editStudent(id) { try { const doc = await db.collection('students').doc(id).get(); if (!doc.exists) { alert('Student not found'); return } const s = doc.data(); editingStudentId = id; document.getElementById('modalTitle').textContent = 'Edit Student'; document.getElementById('modalName').value = s.name || ''; document.getElementById('modalRoll').value = s.rollNumber || ''; document.getElementById('modalEmail').value = s.email || ''; document.getElementById('modalPassword').value = ''; document.getElementById('modalPassword').placeholder = 'Leave blank to keep current password'; document.getElementById('modalClass').value = s.class || ''; document.getElementById('modalDivision').value = s.division || ''; document.getElementById('studentModal').style.display = 'flex' } catch (e) { console.error(e); alert('Error loading student data: ' + e.message) } }

async function saveStudent() { const name = document.getElementById('modalName').value, roll = document.getElementById('modalRoll').value, email = document.getElementById('modalEmail').value, pwd = document.getElementById('modalPassword').value, cls = document.getElementById('modalClass').value, div = document.getElementById('modalDivision').value, btn = document.querySelector('#studentModal .btn-primary'); if (!name || !roll || !email || !cls || !div) { showToast('Please fill in all fields', 'error'); return } setButtonLoading(btn, true); try { if (editingStudentId) { showLoading('Updating student...'); await db.collection('students').doc(editingStudentId).update({ name, rollNumber: roll, email, class: cls, division: div, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast('Student updated successfully!', 'success') } else { if (!pwd || pwd.length < 6) { showToast('Please enter a password (minimum 6 characters)', 'error'); setButtonLoading(btn, false); hideLoading(); return } showLoading('Creating student account...'); const existing = await db.collection('students').where('email', '==', email).get(); if (!existing.empty) { showToast('A student with this email already exists', 'error'); setButtonLoading(btn, false); hideLoading(); return } const uc = await auth.createUserWithEmailAndPassword(email, pwd); await db.collection('students').doc(uc.user.uid).set({ name, rollNumber: roll, email, class: cls, division: div, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); showToast('Student added successfully!', 'success') } closeModal(); loadStudents() } catch (e) { if (e.code === 'auth/email-already-in-use') showToast('This email is already registered', 'error'); else showToast('Error: ' + e.message, 'error') } finally { setButtonLoading(btn, false); hideLoading() } }

function closeModal() { document.getElementById('studentModal').style.display = 'none'; editingStudentId = null }

// ===== ATTENDANCE =====
async function openAttendancePage() { const cls = document.getElementById('teacherClassSelect').value, div = document.getElementById('teacherDivisionSelect').value, sub = document.getElementById('subjectSelect').value; if (!cls || !div) { showToast('Please select class and division first', 'error'); return } if (!sub) { showToast('Please select a subject', 'error'); return } document.getElementById('attendanceModal').style.display = 'flex'; document.getElementById('attendanceList').innerHTML = '<div class="attendance-loading"><div class="loading-spinner"></div><p>Loading students...</p></div>'; const subDoc = await db.collection('subjects').doc(sub).get(); const subName = subDoc.exists ? subDoc.data().name : 'Unknown Subject'; try { const ref = db.collection('students'); let snap; try { snap = await ref.where('class', '==', cls).where('division', '==', div).orderBy('rollNumber').get() } catch (ie) { snap = await ref.where('class', '==', cls).where('division', '==', div).get(); const sorted = snap.docs.sort((a, b) => (parseInt(a.data().rollNumber) || 0) - (parseInt(b.data().rollNumber) || 0)); snap = { empty: sorted.length === 0, docs: sorted, forEach: function (cb) { sorted.forEach(cb) } } } if (snap.empty) { document.getElementById('attendanceList').innerHTML = '<p>No students found in this class</p>'; return } const today = new Date().toISOString().split('T')[0]; document.getElementById('attendanceDate').textContent = today; document.getElementById('attendanceClass').textContent = getClassNameById(cls); document.getElementById('attendanceDivision').textContent = 'Division ' + div; document.getElementById('attendanceSubject').textContent = subName; const list = document.getElementById('attendanceList'); list.innerHTML = ''; snap.forEach((doc, i) => { const s = doc.data(); const item = document.createElement('div'); item.className = 'attendance-item'; item.style.animation = 'fadeInUp 0.2s ease ' + (i * 0.03) + 's both'; item.innerHTML = '<span>' + s.rollNumber + '. ' + s.name + '</span><button onclick="togglePresent(this,\'' + doc.id + '\')" class="btn-present" data-present="false">Mark Present</button>'; list.appendChild(item) }) } catch (e) { console.error(e); document.getElementById('attendanceList').innerHTML = '<p style="color:red;">Error: ' + e.message + '</p>'; showToast('Error loading students', 'error') } }

function togglePresent(btn, sid) { const isPresent = btn.getAttribute('data-present') === 'true'; if (isPresent) { btn.textContent = 'Mark Present'; btn.classList.remove('marked'); btn.setAttribute('data-present', 'false') } else { btn.textContent = 'Mark Absent'; btn.classList.add('marked'); btn.setAttribute('data-present', 'true') } }

async function markAttendance() { const cls = document.getElementById('teacherClassSelect').value, div = document.getElementById('teacherDivisionSelect').value, sub = document.getElementById('subjectSelect').value, today = new Date().toISOString().split('T')[0], btn = document.querySelector('#attendanceModal .btn-success'); if (!sub) { showToast('Please select a subject', 'error'); return } const btns = document.querySelectorAll('#attendanceList .btn-present'); const data = []; btns.forEach(b => { const attr = b.getAttribute('onclick'); const m = attr.match(/'([^']+)'/); if (m) { const sid = m[1]; const isPresent = b.getAttribute('data-present') === 'true'; data.push({ studentId: sid, isPresent }) } }); if (data.length === 0) { showToast('No students to mark attendance for', 'error'); return } setButtonLoading(btn, true); showLoading('Saving attendance...'); try { const existing = await db.collection('attendance').where('class', '==', cls).where('division', '==', div).where('subjectId', '==', sub).where('date', '==', today).get(); if (!existing.empty) { hideLoading(); if (!confirm('Attendance for this subject has already been marked today. Do you want to overwrite it?')) { setButtonLoading(btn, false); return } showLoading('Overwriting attendance...'); const batch = db.batch(); existing.forEach(d => batch.delete(d.ref)); await batch.commit() } const batch = db.batch(); data.forEach(({ studentId, isPresent }) => { const ref = db.collection('attendance').doc(); batch.set(ref, { studentId, date: today, class: cls, division: div, subjectId: sub, present: isPresent, markedBy: currentUser.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp() }) }); await batch.commit(); showToast('Attendance marked successfully!', 'success'); closeAttendanceModal(); loadStudents() } catch (e) { console.error(e); showToast('Error marking attendance: ' + e.message, 'error') } finally { setButtonLoading(btn, false); hideLoading() } }

function closeAttendanceModal() { document.getElementById('attendanceModal').style.display = 'none' }

// ===== VIEW STUDENT ATTENDANCE =====
async function viewStudentAttendanceModal(sid) { document.getElementById('viewStudentModal').style.display = 'flex'; document.getElementById('viewStudentContent').innerHTML = '<div class="modal-loading"><div class="loading-spinner"></div><p>Loading attendance records...</p></div>'; try { const sDoc = await db.collection('students').doc(sid).get(); if (!sDoc.exists) { document.getElementById('viewStudentContent').innerHTML = '<p>Student not found</p>'; return } const s = sDoc.data(); document.getElementById('viewStudentTitle').textContent = 'Attendance - ' + s.name; const snap = await db.collection('attendance').where('studentId', '==', sid).orderBy('date', 'desc').get(); let html = '<div style="margin-bottom:20px;background:#f8f9fa;padding:15px;border-radius:8px;"><p><strong>Name:</strong> ' + s.name + '</p><p><strong>Roll Number:</strong> ' + s.rollNumber + '</p><p><strong>Class:</strong> ' + getClassNameById(s.class) + ' | <strong>Division:</strong> ' + s.division + '</p></div>'; if (snap.empty) { html += '<p style="text-align:center;padding:40px;color:#666;">No attendance records found</p>' } else { let totalPresent = 0, totalDays = 0, records = []; for (const doc of snap.docs) { const r = doc.data(); let subName = 'Unknown Subject'; if (r.subjectId) { const subDoc = await db.collection('subjects').doc(r.subjectId).get(); subName = subDoc.exists ? subDoc.data().name : 'Unknown Subject' } if (r.present) totalPresent++; totalDays++; records.push({ date: r.date, subject: subName, present: r.present }) } records.sort((a, b) => b.date.localeCompare(a.date)); const pct = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0; const absent = totalDays - totalPresent; html += '<div class="attendance-percentage-card" style="animation:fadeInUp 0.5s ease;"><div class="percentage-label">Overall Attendance</div><div class="percentage-value">' + pct + '%</div><div style="margin-top:15px;display:flex;justify-content:center;gap:30px;flex-wrap:wrap;"><span>✅ Present: ' + totalPresent + '</span><span>❌ Absent: ' + absent + '</span><span>📅 Total Days: ' + totalDays + '</span></div></div>'; html += '<h3 style="margin:25px 0 15px;">Attendance Records</h3><div style="overflow-x:auto;"><table class="attendance-table"><thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Status</th></tr></thead><tbody>'; records.forEach((r, i) => { html += '<tr style="animation:fadeInUp 0.3s ease ' + (i * 0.02) + 's both;"><td>' + (i + 1) + '</td><td>' + r.date + '</td><td>' + r.subject + '</td><td class="' + (r.present ? 'status-present' : 'status-absent') + '">' + (r.present ? '✅ Present' : '❌ Absent') + '</td></tr>' }); html += '</tbody></table></div>' } document.getElementById('viewStudentContent').innerHTML = html } catch (e) { console.error(e); document.getElementById('viewStudentContent').innerHTML = '<p style="color:red;text-align:center;padding:40px;">Error loading attendance: ' + e.message + '</p>'; showToast('Error loading attendance', 'error') } }

function closeViewStudentModal() { document.getElementById('viewStudentModal').style.display = 'none' }

// ===== STUDENT ATTENDANCE VIEW =====
async function loadStudentAttendance() { if (!currentUser) return; showLoadingPlaceholder('studentAttendanceList', 'Loading your attendance...'); const selectedSubject = document.getElementById('studentSubjectFilter').value; try { let q = db.collection('attendance').where('studentId', '==', currentUser.uid); if (selectedSubject) q = q.where('subjectId', '==', selectedSubject); q = q.orderBy('date', 'desc').limit(100); const snap = await q.get(); const list = document.getElementById('studentAttendanceList'); list.innerHTML = ''; if (snap.empty) { list.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">No attendance records found</p>'; return } let totalPresent = 0, totalDays = 0, records = []; for (const doc of snap.docs) { const r = doc.data(); let subName = 'Unknown Subject'; if (r.subjectId) { const subDoc = await db.collection('subjects').doc(r.subjectId).get(); subName = subDoc.exists ? subDoc.data().name : 'Unknown Subject' } if (r.present) totalPresent++; totalDays++; records.push({ date: r.date, subject: subName, present: r.present }) } records.sort((a, b) => b.date.localeCompare(a.date)); const pct = totalDays > 0 ? ((totalPresent / totalDays) * 100).toFixed(1) : 0; const absent = totalDays - totalPresent; const card = document.createElement('div'); card.className = 'attendance-percentage-card'; card.innerHTML = '<div class="percentage-label">Overall Attendance</div><div class="percentage-value">' + pct + '%</div><div style="margin-top:15px;display:flex;justify-content:center;gap:30px;flex-wrap:wrap;"><span>✅ Present: ' + totalPresent + '</span><span>❌ Absent: ' + absent + '</span><span>📅 Total Days: ' + totalDays + '</span></div>'; list.appendChild(card); const hdr = document.createElement('h3'); hdr.textContent = 'Attendance Records'; hdr.style.margin = '25px 0 15px'; list.appendChild(hdr); const tc = document.createElement('div'); tc.style.overflowX = 'auto'; const table = document.createElement('table'); table.className = 'attendance-table'; table.innerHTML = '<thead><tr><th>#</th><th>Date</th><th>Subject</th><th>Status</th></tr></thead><tbody></tbody>'; const tbody = table.querySelector('tbody'); records.forEach((r, i) => { const row = document.createElement('tr'); row.innerHTML = '<td>' + (i + 1) + '</td><td>' + r.date + '</td><td>' + r.subject + '</td><td class="' + (r.present ? 'status-present' : 'status-absent') + '">' + (r.present ? '✅ Present' : '❌ Absent') + '</td>'; tbody.appendChild(row) }); tc.appendChild(table); list.appendChild(tc) } catch (e) { console.error(e); document.getElementById('studentAttendanceList').innerHTML = '<p style="color:red;">Error loading attendance: ' + e.message + '</p>'; showToast('Error loading attendance', 'error') } }

async function loadStudentSubjects() { try { const doc = await db.collection('students').doc(currentUser.uid).get(); if (!doc.exists) return; const data = doc.data(); const q = await db.collection('classSubjects').where('class', '==', data.class).where('division', '==', data.division).get(); const filter = document.getElementById('studentSubjectFilter'); filter.innerHTML = '<option value="">All Subjects</option>'; if (q.empty) return; const subjectIds = q.docs[0].data().subjectIds || []; for (const sid of subjectIds) { const subDoc = await db.collection('subjects').doc(sid).get(); if (subDoc.exists) { const o = document.createElement('option'); o.value = sid; o.textContent = subDoc.data().name; filter.appendChild(o) } } } catch (e) { console.error(e) } }

// ===== SETUP FUNCTIONS (embedded) =====
function openSetupPage() { document.getElementById('authContainer').style.display = 'none'; document.getElementById('studentDashboard').style.display = 'none'; document.getElementById('teacherDashboard').style.display = 'none'; document.getElementById('setupPageContainer').style.display = 'block'; if (auth.currentUser) { document.getElementById('loginSection').style.display = 'none'; document.getElementById('setupContent').style.display = 'block'; document.getElementById('userEmail').textContent = auth.currentUser.email; loadAllData() } else { document.getElementById('loginSection').style.display = 'block'; document.getElementById('setupContent').style.display = 'none' } }

function goToDashboard() { document.getElementById('setupPageContainer').style.display = 'none'; if (currentUserRole === 'teacher') showTeacherDashboard(); else if (currentUserRole === 'student') showStudentDashboard(); else showAuthContainer() }

async function loadAllData() { await loadClassesFromDB(); await loadSubjectsFromDB(); await loadAssignmentsFromDB(); populateFilterDropdowns() }

function switchTab(tab) { currentTab = tab; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById(tab + 'Tab').classList.add('active'); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById(tab + 'Content').classList.add('active'); if (tab === 'classes') renderClassList(); if (tab === 'subjects') renderDbSubjects(); if (tab === 'assign') renderAssignmentGrid(); if (tab === 'view') viewExistingData() }

async function loadSubjectsFromDB() { try { const snap = await db.collection('subjects').orderBy('name').get(); dbSubjects = []; snap.forEach(d => dbSubjects.push({ id: d.id, ...d.data() })); renderDbSubjects() } catch (e) { console.error(e) } }

function renderDbSubjects() { const div = document.getElementById('dbSubjectList'); if (dbSubjects.length === 0) { div.innerHTML = '<p style="color:#666;">No subjects in database</p>'; return } div.innerHTML = dbSubjects.map(s => '<span class="subject-tag">' + s.name + ' <button onclick="deleteDbSubject(\'' + s.id + '\',\'' + s.name + '\')">×</button></span>').join('') }

function renderClassList() { const div = document.getElementById('classList'); if (classList.length === 0) { div.innerHTML = '<p class="no-data">No classes yet. Add your first class above.</p>'; return } div.innerHTML = classList.map(c => '<div class="class-card ' + (editingClassId === c.id ? 'editing-highlight' : '') + '"><div class="class-info"><strong>' + c.name + '</strong><small>' + (c.fullName || '') + '</small></div><div class="class-actions"><button onclick="editClass(\'' + c.id + '\')" class="btn-edit-class">✏️</button><button onclick="deleteClass(\'' + c.id + '\')" class="btn-delete-class">🗑️</button></div></div>').join(''); if (editingClassId) div.innerHTML += '<button onclick="cancelEditing()" class="btn-cancel" style="margin-top:10px;">Cancel Editing</button>' }

function populateFilterDropdowns() { const s = document.getElementById('filterAssignClass'); if (s) { s.innerHTML = '<option value="">All Classes</option>'; classList.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; s.appendChild(o) }) } }

async function addNewClass() {
    const name = document.getElementById('newClassName').value.trim();
    const full = document.getElementById('newClassFullName').value.trim();
    const user = auth.currentUser;

    if (!user) {
        showStatus('Please login first', 'error');
        return;
    }
    if (!name) {
        showStatus('Please enter a class name', 'error');
        return;
    }
    // ... rest of the function
}

function editClass(id) { const c = classList.find(x => x.id === id); if (!c) return; editingClassId = id; document.getElementById('newClassName').value = c.name; document.getElementById('newClassFullName').value = c.fullName || ''; document.getElementById('newClassName').focus(); renderClassList() }

function cancelEditing() { editingClassId = null; document.getElementById('newClassName').value = ''; document.getElementById('newClassFullName').value = ''; renderClassList() }

async function deleteClass(id) { const c = classList.find(x => x.id === id); if (!c) return; if (!confirm('Delete "' + c.name + '" and all its subject assignments?')) return; try { await db.collection('classes').doc(id).delete(); const snap = await db.collection('classSubjects').where('class', '==', id).get(); const batch = db.batch(); snap.forEach(d => batch.delete(d.ref)); await batch.commit(); showStatus('Class deleted!', 'success'); await loadClassesFromDB(); await loadAssignmentsFromDB() } catch (e) { showStatus('Error: ' + e.message, 'error') } }

function addSubjectToList() { const inp = document.getElementById('subjectInput'), name = inp.value.trim(); if (!name) { showStatus('Please enter a subject name', 'error'); return } if (subjectsList.includes(name)) { showStatus('Subject already in list', 'error'); return } subjectsList.push(name); inp.value = ''; renderSubjectList() }

function removeSubjectFromList(name) { subjectsList = subjectsList.filter(s => s !== name); renderSubjectList() }

function renderSubjectList() { const div = document.getElementById('subjectList'); if (subjectsList.length === 0) { div.innerHTML = '<p style="color:#666;">No subjects added yet</p>'; return } div.innerHTML = subjectsList.map(s => '<span class="subject-tag">' + s + ' <button onclick="removeSubjectFromList(\'' + s + '\')">×</button></span>').join('') }

async function saveAllSubjects() {
    if (subjectsList.length === 0) {
        showStatus('Add subjects to the list first', 'error');
        return;
    }

    // Use auth.currentUser instead of currentTeacher
    const user = auth.currentUser;
    if (!user) {
        showStatus('Please login first', 'error');
        return;
    }

    let added = 0;
    for (const name of subjectsList) {
        const q = await db.collection('subjects').where('name', '==', name).get();
        if (q.empty) {
            await db.collection('subjects').add({
                name,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            added++;
        }
    }
    subjectsList = [];
    renderSubjectList();
    await loadSubjectsFromDB();
    showStatus('✅ ' + added + ' subjects saved!', 'success');
}

async function deleteDbSubject(id, name) { if (!confirm('Delete "' + name + '"? It will be removed from all class assignments.')) return; await db.collection('subjects').doc(id).delete(); const snap = await db.collection('classSubjects').get(); const batch = db.batch(); snap.forEach(d => { const data = d.data(); if (data.subjectIds && data.subjectIds.includes(id)) { batch.update(d.ref, { subjectIds: data.subjectIds.filter(x => x !== id) }) } }); await batch.commit(); await loadSubjectsFromDB(); await loadAssignmentsFromDB(); showStatus('Subject deleted!', 'success') }

async function loadAssignmentsFromDB() { try { const snap = await db.collection('classSubjects').get(); assignmentCheckboxes = {}; classList.forEach(c => { divisions.forEach(d => { const key = c.id + '-' + d; assignmentCheckboxes[key] = {}; dbSubjects.forEach(s => { assignmentCheckboxes[key][s.id] = false }) }) }); snap.forEach(d => { const data = d.data(); const key = data.class + '-' + data.division; if (!assignmentCheckboxes[key]) assignmentCheckboxes[key] = {}; if (data.subjectIds) data.subjectIds.forEach(sid => { assignmentCheckboxes[key][sid] = true }) }); renderAssignmentGrid() } catch (e) { console.error(e) } }

function renderAssignmentGrid() { const grid = document.getElementById('assignmentGrid'); const filterClass = document.getElementById('filterAssignClass')?.value || ''; const filterDiv = document.getElementById('filterAssignDivision')?.value || ''; if (classList.length === 0 || dbSubjects.length === 0) { grid.innerHTML = '<p class="no-data">Please add classes and subjects first.</p>'; return } let html = ''; classList.forEach(c => { divisions.forEach(d => { if (filterClass && c.id !== filterClass) return; if (filterDiv && d !== filterDiv) return; const key = c.id + '-' + d; const checks = assignmentCheckboxes[key] || {}; const count = Object.values(checks).filter(v => v).length; html += '<div class="assignment-card"><h3>' + c.name + ' - Division ' + d + ' <span style="font-size:14px;color:#666;font-weight:normal;">(' + count + '/' + dbSubjects.length + ' subjects)</span></h3><div class="subject-checkbox-grid">'; dbSubjects.forEach(s => { const checked = checks[s.id] || false; html += '<div class="subject-checkbox-item" onclick="toggleSubjectCheckbox(\'' + key + '\',\'' + s.id + '\',event)"><input type="checkbox" id="cb-' + key + '-' + s.id + '" ' + (checked ? 'checked' : '') + ' onchange="updateCheckboxState(\'' + key + '\',\'' + s.id + '\',this.checked)"><label for="cb-' + key + '-' + s.id + '">' + s.name + '</label></div>' }); html += '</div><div class="assigned-subjects">' + (count === 0 ? '<span class="no-subjects">No subjects assigned</span>' : dbSubjects.filter(s => checks[s.id]).map(s => '<span class="assigned-subject-tag">' + s.name + '</span>').join('')) + '</div></div>' }) }); if (!html) html = '<p class="no-data">No class-division combinations match the filter.</p>'; grid.innerHTML = html }

function toggleSubjectCheckbox(key, sid, e) { if (e.target.tagName === 'INPUT') return; const cb = document.getElementById('cb-' + key + '-' + sid); if (cb) { cb.checked = !cb.checked; updateCheckboxState(key, sid, cb.checked) } }

function updateCheckboxState(key, sid, checked) { if (!assignmentCheckboxes[key]) assignmentCheckboxes[key] = {}; assignmentCheckboxes[key][sid] = checked; renderAssignmentGrid() }

function selectAllSubjectsForVisible() { const grid = document.getElementById('assignmentGrid'); const cbs = grid.querySelectorAll('input[type="checkbox"]'); cbs.forEach(cb => { cb.checked = true; const full = cb.id.replace('cb-', ''); const last = full.lastIndexOf('-'); const key = full.substring(0, last); const sid = full.substring(last + 1); if (!assignmentCheckboxes[key]) assignmentCheckboxes[key] = {}; assignmentCheckboxes[key][sid] = true }); renderAssignmentGrid() }

function deselectAllSubjectsForVisible() { const grid = document.getElementById('assignmentGrid'); const cbs = grid.querySelectorAll('input[type="checkbox"]'); cbs.forEach(cb => { cb.checked = false; const full = cb.id.replace('cb-', ''); const last = full.lastIndexOf('-'); const key = full.substring(0, last); const sid = full.substring(last + 1); if (!assignmentCheckboxes[key]) assignmentCheckboxes[key] = {}; assignmentCheckboxes[key][sid] = false }); renderAssignmentGrid() }

async function saveAllAssignments() {
    const user = auth.currentUser;
    if (!user) {
        showStatus('Please login first', 'error');
        return;
    }
    if (classList.length === 0 || dbSubjects.length === 0) {
        showStatus('Please add classes and subjects first', 'error');
        return;
    }
    try {
        showStatus('Saving assignments...', 'success');
        const batch = db.batch();
        let count = 0;
        for (const [key, checks] of Object.entries(assignmentCheckboxes)) {
            const [classId, division] = key.split('-');
            const selected = Object.entries(checks).filter(([_, ch]) => ch).map(([sid, _]) => sid);
            const existing = await db.collection('classSubjects').where('class', '==', classId).where('division', '==', division).get();
            if (existing.empty) {
                if (selected.length > 0) {
                    const ref = db.collection('classSubjects').doc();
                    batch.set(ref, {
                        class: classId,
                        division,
                        subjectIds: selected,
                        updatedBy: user.uid,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    count++;
                }
            } else {
                const doc = existing.docs[0];
                if (selected.length > 0) {
                    batch.update(doc.ref, {
                        subjectIds: selected,
                        updatedBy: user.uid,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    batch.delete(doc.ref);
                }
                count++;
            }
        }
        await batch.commit();
        showStatus('✅ Assignments saved! ' + count + ' class-divisions updated.', 'success');
    } catch (e) {
        console.error(e);
        showStatus('Error: ' + e.message, 'error');
    }
}

async function viewExistingData() { const div = document.getElementById('existingData'); div.innerHTML = '<p>Loading...</p>'; try { let html = '<h3>🏫 Classes (' + classList.length + '):</h3>'; classList.forEach(c => html += '<p>• ' + c.name + ' (' + (c.fullName || '') + ')</p>'); html += '<h3>📖 Subjects (' + dbSubjects.length + '):</h3>'; dbSubjects.forEach(s => html += '<p>• ' + s.name + '</p>'); const snap = await db.collection('classSubjects').get(); html += '<h3>📋 Assignments (' + snap.size + '):</h3>'; if (snap.empty) { html += '<p>No assignments yet</p>' } else { for (const doc of snap.docs) { const data = doc.data(); const cls = classList.find(c => c.id === data.class); const cname = cls ? cls.name : data.class; html += '<p><strong>' + cname + ' - Div ' + data.division + ':</strong>'; if (data.subjectIds && data.subjectIds.length > 0) { const names = data.subjectIds.map(sid => { const s = dbSubjects.find(x => x.id === sid); return s ? s.name : '?' }).join(', '); html += ' <span style="color:#666;">(' + names + ')</span>' } html += '</p>' } } div.innerHTML = html } catch (e) { div.innerHTML = '<p style="color:red;">Error: ' + e.message + '</p>' } }

async function clearAllData() { if (!confirm('⚠️ Delete ALL classes, subjects, and assignments? This cannot be undone!')) return; try { const batch = db.batch(); (await db.collection('classes').get()).forEach(d => batch.delete(d.ref)); (await db.collection('subjects').get()).forEach(d => batch.delete(d.ref)); (await db.collection('classSubjects').get()).forEach(d => batch.delete(d.ref)); await batch.commit(); classList = []; dbSubjects = []; subjectsList = []; assignmentCheckboxes = {}; renderClassList(); renderSubjectList(); renderDbSubjects(); document.getElementById('assignmentGrid').innerHTML = '<p class="no-data">No data</p>'; showStatus('All data cleared!', 'success') } catch (e) { showStatus('Error: ' + e.message, 'error') } }

async function loginTeacher() { const email = document.getElementById('loginEmail').value, pwd = document.getElementById('loginPassword').value; if (!email || !pwd) { showStatus('Please enter email and password', 'error'); return } try { await auth.signInWithEmailAndPassword(email, pwd); showStatus('Login successful!', 'success'); currentTeacher = auth.currentUser; document.getElementById('loginSection').style.display = 'none'; document.getElementById('setupContent').style.display = 'block'; document.getElementById('userEmail').textContent = auth.currentUser.email; await loadAllData() } catch (e) { showStatus('Login failed: ' + e.message, 'error') } }

async function logoutTeacher() { await auth.signOut(); currentTeacher = null; classList = []; dbSubjects = []; subjectsList = []; assignmentCheckboxes = {}; document.getElementById('loginSection').style.display = 'block'; document.getElementById('setupContent').style.display = 'none' }

function showStatus(msg, type) { const div = document.getElementById('statusMessage'); div.textContent = msg; div.className = 'status-message ' + type; div.style.display = 'block'; setTimeout(() => { div.style.display = 'none' }, 5000) }

// ===== MODAL CLOSE HANDLERS =====
window.onclick = function (e) { const sm = document.getElementById('studentModal'), am = document.getElementById('attendanceModal'), vm = document.getElementById('viewStudentModal'); if (e.target == sm) closeModal(); if (e.target == am) closeAttendanceModal(); if (e.target == vm) closeViewStudentModal() }
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeAttendanceModal(); closeViewStudentModal() } });

// ===== INIT =====
showAuthContainer();