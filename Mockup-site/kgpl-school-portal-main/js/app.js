/* ============================================================
   GHSS Kangayampalayam — Shared Data Layer (app.js)
   A lightweight client-side "database" backed by localStorage.
   No server required — every login, student record, mark and
   gallery photo is really saved in the browser and persists
   across page loads / logins.
   ============================================================ */

const DB_KEY = 'ghss_db_v5';
const SESSION_KEY = 'ghss_session_v2';

const SCHOOL = {
  name: "Government Higher Secondary School, Kangayampalayam",
  shortName: "GHSS Kangayampalayam",
  place: "Kangayampalayam",
  district: "Tiruppur District, Tamil Nadu",
  board: "Tamil Nadu State Board",
  medium: "Tamil & English Medium",
  established: 1926,
  phone: "+91 98421 XXXXX",
  email: "ghss.kangayampalayam@tn.gov.in",
  address: "Kangayampalayam, Tiruppur District, Tamil Nadu – 641xxx",
  emis: "33xxxx",
  logoInitials: "GS"
};

const CLASS_LIST = [
  { code:'6A', label:'6 – A', grade:6, section:'A' },
  { code:'6B', label:'6 – B', grade:6, section:'B' },
  { code:'7A', label:'7 – A', grade:7, section:'A' },
  { code:'7B', label:'7 – B', grade:7, section:'B' },
  { code:'8A', label:'8 – A', grade:8, section:'A' },
  { code:'8B', label:'8 – B', grade:8, section:'B' },
  { code:'9A', label:'9 – A', grade:9, section:'A' },
  { code:'9B', label:'9 – B', grade:9, section:'B' },
  { code:'10A', label:'10 – A', grade:10, section:'A' },
  { code:'10B', label:'10 – B', grade:10, section:'B' },
  { code:'11G1', label:'11 · Group I', grade:11, section:'Group I', sub:'Bio-Maths' },
  { code:'11G2', label:'11 · Group II', grade:11, section:'Group II', sub:'Computer Science' },
  { code:'12G1', label:'12 · Group I', grade:12, section:'Group I', sub:'Bio-Maths' },
  { code:'12G2', label:'12 · Group II', grade:12, section:'Group II', sub:'Computer Science' },
];

const SUBJECTS_FOR_CLASS = (classCode) => {
  if (classCode === '11G1' || classCode === '12G1') return ['Tamil','English','Biology','Chemistry','Physics','Maths'];
  if (classCode === '11G2' || classCode === '12G2') return ['Tamil','English','Computer Science','Chemistry','Physics','Maths'];
  return ['Tamil','English','Maths','Science','Social Science'];
};
/* Fixed column set for the printable Class Mark Report — for 11/12 this is the UNION of both groups'
   subjects (so Group I and Group II report sheets share the same columns); a subject a student doesn't
   actually study shows as "—" in that column instead of being dropped. */
const REPORT_SUBJECTS_FOR_CLASS = (classCode) => {
  const grade = CLASS_LIST.find(c=>c.code===classCode)?.grade;
  if (grade === 11 || grade === 12) return ['English','Tamil','Maths','Computer Science','Biology','Physics','Chemistry'];
  return ['Tamil','English','Maths','Science','Social Science'];
};
const SUBJECT_ABBR = {
  'Tamil':'TAM', 'English':'ENG', 'Maths':'MAT', 'Science':'SCI', 'Social Science':'SSCI',
  'Computer Science':'CS', 'Biology':'BIO', 'Physics':'PHY', 'Chemistry':'CHEM'
};

function classLabel(code){ const c = CLASS_LIST.find(x=>x.code===code); return c ? ('Class ' + c.label) : code; }

const TIMETABLE_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TIMETABLE_PERIODS = 8;

/* ---------------- Seed data ---------------- */
function svgPlaceholder(title, colorA, colorB){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}"/><stop offset="100%" stop-color="${colorB}"/>
    </linearGradient></defs>
    <rect width="640" height="420" fill="url(#g)"/>
    <text x="50%" y="52%" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="rgba(255,255,255,.92)" text-anchor="middle">${title}</text>
    <text x="50%" y="60%" font-family="Inter,Arial,sans-serif" font-size="14" fill="rgba(255,255,255,.6)" text-anchor="middle">GHSS Kangayampalayam</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const TEACHER_SEED = [
  { name:'Mrs. Kavitha Ramesh', subject:'Mathematics', initials:'KR', color:'#0F4C81' },
  { name:'Mrs. Priya S.', subject:'Mathematics', initials:'PS', color:'#2563EB' },
  { name:'Mr. Murugan K.', subject:'Science', initials:'MK', color:'#16A34A' },
  { name:'Ms. Anitha R.', subject:'English', initials:'AR', color:'#DC2626' },
  { name:'Mr. Vignesh K.', subject:'Physical Education', initials:'VK', color:'#F59E0B' },
  { name:'Mrs. Suganya P.', subject:'Tamil', initials:'SP', color:'#0F4C81' },
  { name:'Mr. Karthikeyan M.', subject:'Social Science', initials:'KM', color:'#2563EB' },
  { name:'Mrs. Deepa N.', subject:'Science', initials:'DN', color:'#16A34A' },
  { name:'Mr. Selvakumar R.', subject:'Mathematics', initials:'SR', color:'#DC2626' },
  { name:'Ms. Bhavani T.', subject:'English', initials:'BT', color:'#F59E0B' },
];

const FIRST_NAMES = ['Aravind','Deepika','Sanjay','Priyanka','Karthik','Vishnu','Meena','Gokul','Divya','Harish','Swathi','Yogesh','Anu','Ragul','Nithya','Bala','Kavya','Suresh','Lavanya','Arun'];
const LAST_INITIALS = ['S.','M.','K.','R.','V.','N.','T.','B.','P.','G.'];

function seed(){
  const db = {
    meta: { regCounter: 1, employeeCounter: 101 },
    admins: [
      { staffId:'GHSS-HM-001', password:'admin', name:'C.Martin Devesagayam', role:'Headmaster', initials:'CD' }
    ],
    teachers: [],
    students: [],
    assignments: {}, // classCode -> teacherId
    subjectTeachers: {}, // classCode -> { subject: teacherId } — set by Admin, powers the student "Subject Teachers" panel
    marks: [],        // {id, studentId, term, subject, score, max}
    events: [],       // {id, title, academicYear} — folders that group gallery items
    gallery: [],
    teacherTimetable: {}, // teacherId -> [6 days][8 periods] of "Class · Subject" strings, set by Admin
    classTimetable: {},   // classCode -> [6 days][8 periods] of "Subject — Teacher" strings, set by the Class Teacher
    attendance: [],        // {id, classCode, month:'YYYY-MM', totalDays, records:{studentId:presentDays}, locked, markedBy, markedAt} — one entry per class per month, added by the Class Teacher
    notices: [
      { id:'n1', title:'Term 1 Examinations Timetable Released', date:'2026-07-10', postedAt:'2026-07-10T00:00:00.000Z', audience:'website', body:'Term 1 examinations for classes 6-12 will commence from 3rd August 2026. The detailed timetable has been shared with class teachers.' },
      { id:'n2', title:'Independence Day Celebration', date:'2026-08-15', postedAt:'2026-08-15T00:00:00.000Z', audience:'website', body:'All students are requested to assemble at the school ground by 7:30 AM in full uniform for the flag hoisting ceremony.' },
      { id:'n3', title:'Admissions Open for 2026-27', date:'2026-06-01', postedAt:'2026-06-01T00:00:00.000Z', audience:'website', body:'Admissions for Class 6 and Class 11 are now open. Parents may contact the school office with the required documents.' },
    ],
    certificatesIssued: [],
    certificateRequests: [], // {id, studentId, classCode, teacherId, type, note, status:'pending'|'approved'|'rejected', requestDate, decisionDate, decisionBy, downloadedAt}
    complaints: [], // {id, studentId, messages:[{from:'student'|'admin', text, at}], unreadForAdmin, unreadForStudent, updatedAt} — one thread per student, admin-only
    classNotices: [] // {id, classCode, title, body, postedBy, postedAt} — homework/information the Class Teacher posts for their own class's students
  };

  // Teachers
  TEACHER_SEED.forEach((t, i) => {
    db.teachers.push({
      id: 'T' + (i+1),
      employeeId: `GHSS/T/${100+i+1}`,
      name: t.name, subject: t.subject, initials: t.initials, color: t.color,
      phone: `98${(400000000 + i*137).toString().slice(0,8)}`,
      password: 'teacher',
      assignedClass: null, photo: null
    });
  });
  db.meta.employeeCounter = 100 + TEACHER_SEED.length + 1;

  // Assignments (class teacher = auto-generates their login access)
  const assign = { '6A':'T1', '9B':'T6', '10B':'T2', '11G2':'T8' };
  Object.entries(assign).forEach(([cls, tid]) => {
    db.assignments[cls] = tid;
    const t = db.teachers.find(x=>x.id===tid);
    if (t) t.assignedClass = cls;
  });

  // Students — seed a batch in the classes above so the demo has real data
  let regCounter = 1;
  function addSeedStudent(cls, first, last, gender){
    const grade = CLASS_LIST.find(c=>c.code===cls).grade;
    const regno = `GHSS/2026/${String(regCounter).padStart(4,'0')}`;
    const phone = `9${(700000000 + regCounter*91).toString().slice(0,9)}`;
    db.students.push({
      id: 'S'+regCounter, regno, name: `${first} ${last}`, class: cls, gender,
      community:'OTH', medium:'TM', noticesLastSeenAt: null,
      dob:'', bloodGroup:'', admissionNo: String(1000+regCounter), emisNo:'', umisNo:'',
      father:'', mother:'', parentPhone: phone, password: 'student', address:'', photo:null
    });
    regCounter++;
  }
  const TOTAL_STUDENTS = 640;
  const perClassBase = Math.floor(TOTAL_STUDENTS / CLASS_LIST.length);
  const extra = TOTAL_STUDENTS - perClassBase * CLASS_LIST.length;
  CLASS_LIST.forEach((cls, ci) => {
    const count = perClassBase + (ci < extra ? 1 : 0);
    for (let i=0;i<count;i++){
      addSeedStudent(cls.code, FIRST_NAMES[(ci*7+i)%FIRST_NAMES.length], LAST_INITIALS[(ci*5+i)%LAST_INITIALS.length], i%2===0?'Male':'Female');
    }
  });
  db.meta.regCounter = regCounter;

  // Marks — term 1 for the seeded students
  let markId = 1;
  db.students.forEach(s => {
    const subs = SUBJECTS_FOR_CLASS(s.class);
    const base = 60 + Math.floor(Math.random()*35);
    subs.forEach((sub, i) => {
      const score = Math.max(35, Math.min(100, base + Math.floor(Math.random()*15) - 7 - i));
      db.marks.push({ id:'M'+(markId++), studentId:s.id, term:'Term 1', subject:sub, score, max:100 });
    });
  });

  // Gallery seed (generated placeholder art — replace by uploading real photos)
  const galSeed = [
    ['Annual Day Celebration 2025', '#0F4C81', '#2563EB'],
    ['Science Exhibition', '#16A34A', '#0F4C81'],
    ['Sports Day', '#F59E0B', '#DC2626'],
    ['Independence Day', '#DC2626', '#0F4C81'],
    ['Republic Day Parade', '#2563EB', '#16A34A'],
    ['Cultural Fest', '#F59E0B', '#2563EB'],
  ];
  galSeed.forEach(([title,a,b], i) => {
    const eventId = 'E'+(i+1);
    db.events.push({ id: eventId, title, academicYear:'2025-2026' });
    db.gallery.push({ id:'G'+(i+1), title, category:'Events', date:'2025-2026', image: svgPlaceholder(title, a, b), type:'image', videoUrl:null, eventId });
  });

  return db;
}

const SchoolDB = {
  init(){ if(!localStorage.getItem(DB_KEY)) localStorage.setItem(DB_KEY, JSON.stringify(seed())); },
  get(){
    this.init();
    const db = JSON.parse(localStorage.getItem(DB_KEY));
    // migration: older saved DBs may pre-date the certificateRequests table
    if (!Array.isArray(db.certificateRequests)){ db.certificateRequests = []; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!Array.isArray(db.events)){ db.events = []; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!db.teacherTimetable){ db.teacherTimetable = {}; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!db.classTimetable){ db.classTimetable = {}; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!Array.isArray(db.attendance)){ db.attendance = []; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!Array.isArray(db.complaints)){ db.complaints = []; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!Array.isArray(db.classNotices)){ db.classNotices = []; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (!db.subjectTeachers){ db.subjectTeachers = {}; localStorage.setItem(DB_KEY, JSON.stringify(db)); }
    if (Array.isArray(db.notices)){
      let noticesMigrated = false;
      const SEED_NOTICE_IDS = ['n1','n2','n3']; // these are public/website announcements by design
      db.notices.forEach(n => {
        if (!n.postedAt){ n.postedAt = n.date ? n.date+'T00:00:00.000Z' : new Date().toISOString(); noticesMigrated = true; }
        if (!n.audience){ n.audience = SEED_NOTICE_IDS.includes(n.id) ? 'website' : 'all'; noticesMigrated = true; }
        else if (SEED_NOTICE_IDS.includes(n.id) && n.audience === 'all'){ n.audience = 'website'; noticesMigrated = true; }
      });
      if (noticesMigrated) localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
    return db;
  },
  save(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); },
  reset(){ localStorage.setItem(DB_KEY, JSON.stringify(seed())); }
};

/* ---------------- Session ---------------- */
const Session = {
  set(obj){ sessionStorage.setItem(SESSION_KEY, JSON.stringify(obj)); },
  get(){ try{ return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }catch(e){ return null; } },
  clear(){ sessionStorage.removeItem(SESSION_KEY); },
  requireRole(role){
    const s = this.get();
    if (!s || s.role !== role){ window.location.href = 'gateway.html'; return null; }
    return s;
  }
};

/* ---------------- Auth ---------------- */
function adminLogin(staffId, password){
  const db = SchoolDB.get();
  const a = db.admins.find(x => x.staffId.toLowerCase() === (staffId||'').trim().toLowerCase() && x.password === password);
  if (a){ Session.set({ role:'admin', id:a.staffId, name:a.name, initials:a.initials }); return true; }
  return false;
}
function teacherLogin(employeeId, password){
  const db = SchoolDB.get();
  const t = db.teachers.find(x => x.employeeId.toLowerCase() === (employeeId||'').trim().toLowerCase() && x.password === password);
  if (t){ Session.set({ role:'teacher', id:t.id, name:t.name, initials:t.initials, assignedClass:t.assignedClass }); return true; }
  return false;
}
function studentLogin(regno, password, classCode){
  const db = SchoolDB.get();
  const s = db.students.find(x => x.regno.toLowerCase() === (regno||'').trim().toLowerCase() && x.password === password);
  if (s){ Session.set({ role:'student', id:s.id, name:s.name, class:s.class, regno:s.regno }); return true; }
  return false;
}
function logout(){ Session.clear(); window.location.href = 'gateway.html'; }

/* ---------------- Classes / counts ---------------- */
function getClassesWithCounts(){
  const db = SchoolDB.get();
  return CLASS_LIST.map(c => ({ ...c, total: db.students.filter(s=>s.class===c.code).length }));
}

/* ---------------- Teachers ---------------- */
function addTeacher({ name, subject, phone, photo }){
  const db = SchoolDB.get();
  const n = db.meta.employeeCounter++;
  const employeeId = `GHSS/T/${n}`;
  const password = 'teacher';
  const palette = ['#0F4C81','#2563EB','#16A34A','#DC2626','#F59E0B'];
  const initials = name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const teacher = { id:'T'+Date.now(), employeeId, name, subject, phone, initials, color: palette[db.teachers.length % palette.length], password, assignedClass:null, photo: photo||null };
  db.teachers.push(teacher);
  SchoolDB.save(db);
  return teacher;
}
function updateTeacher(teacherId, { name, subject, phone, photo }){
  const db = SchoolDB.get();
  const t = db.teachers.find(x=>x.id===teacherId);
  if (!t) return null;
  t.name = name;
  t.subject = subject;
  t.phone = phone;
  t.initials = name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  if (photo !== undefined) t.photo = photo;
  SchoolDB.save(db);
  return t;
}
/* Removes the teacher record and unwinds anything that pointed at them — the class they were Class
   Teacher of, any Subject Teacher assignments, and their saved timetable — so nothing is left dangling. */
function deleteTeacher(teacherId){
  const db = SchoolDB.get();
  db.teachers = db.teachers.filter(t => t.id !== teacherId);
  Object.keys(db.assignments).forEach(cls => { if (db.assignments[cls] === teacherId) delete db.assignments[cls]; });
  Object.keys(db.subjectTeachers||{}).forEach(cls => {
    Object.keys(db.subjectTeachers[cls]).forEach(sub => { if (db.subjectTeachers[cls][sub] === teacherId) delete db.subjectTeachers[cls][sub]; });
  });
  if (db.teacherTimetable) delete db.teacherTimetable[teacherId];
  SchoolDB.save(db);
}
function assignClassTeacher(classCode, teacherId){
  const db = SchoolDB.get();
  // free up any class currently held by this teacher
  db.teachers.forEach(t => { if (t.id === teacherId) t.assignedClass = classCode; });
  db.assignments[classCode] = teacherId;
  SchoolDB.save(db);
  return db.teachers.find(t=>t.id===teacherId);
}
/* ---- Subject Teacher Assignment (which teacher teaches which subject, per class) ---- */
function assignSubjectTeacher(classCode, subject, teacherId){
  const db = SchoolDB.get();
  db.subjectTeachers[classCode] = db.subjectTeachers[classCode] || {};
  if (teacherId) db.subjectTeachers[classCode][subject] = teacherId;
  else delete db.subjectTeachers[classCode][subject];
  SchoolDB.save(db);
}
function getSubjectTeachersForClass(classCode){
  const db = SchoolDB.get();
  const map = db.subjectTeachers[classCode] || {};
  return SUBJECTS_FOR_CLASS(classCode).map(subject => ({
    subject,
    teacher: map[subject] ? (db.teachers.find(t=>t.id===map[subject]) || null) : null
  }));
}

/* ---------------- Students ---------------- */
function addStudent(data){
  const db = SchoolDB.get();
  const n = db.meta.regCounter++;
  const regno = `GHSS/2026/${String(n).padStart(4,'0')}`;
  const student = {
    id: 'S'+Date.now(), regno,
    name: data.name, class: data.classCode, gender: data.gender||'', dob: data.dob||'',
    community: data.community||'OTH', medium: data.medium||'TM', noticesLastSeenAt: null,
    bloodGroup: data.bloodGroup||'', admissionNo: data.admissionNo||String(1000+n),
    emisNo: data.emisNo||'', umisNo: data.umisNo||'',
    father: data.father||'', mother: data.mother||'', parentPhone: data.parentPhone||'',
    password: 'student', address: data.address||'', photo: data.photo||null
  };
  db.students.push(student);
  SchoolDB.save(db);
  return student;
}
function getStudentsByClass(classCode){
  const db = SchoolDB.get();
  return db.students.filter(s=>s.class===classCode).sort((a,b)=>a.name.localeCompare(b.name));
}
function getTeachers(){
  return SchoolDB.get().teachers.slice().sort((a,b)=>a.name.localeCompare(b.name));
}
function getStudent(id){ return SchoolDB.get().students.find(s=>s.id===id); }

/* ---------------- Marks / scorecards ---------------- */
function setMarks(studentId, term, subjectData){
  // subjectData: {Subject: {score, absent}} — an absent subject is stored as score 0 with absent:true,
  // so totals/averages/ranks keep working unchanged; only the report layer needs to read the absent flag.
  const db = SchoolDB.get();
  db.marks = db.marks.filter(m => !(m.studentId===studentId && m.term===term));
  Object.entries(subjectData).forEach(([subject, data]) => {
    const absent = !!data.absent;
    db.marks.push({ id:'M'+Date.now()+Math.random().toString(36).slice(2,6), studentId, term, subject, score: absent ? 0 : Number(data.score), max:100, absent });
  });
  SchoolDB.save(db);
}
function getMarksForStudent(studentId, term){
  const db = SchoolDB.get();
  return db.marks.filter(m => m.studentId===studentId && (!term || m.term===term));
}
function studentAverage(studentId, term){
  const marks = getMarksForStudent(studentId, term);
  if (!marks.length) return null;
  return marks.reduce((a,m)=>a+m.score,0)/marks.length;
}
function classScorecard(classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const rows = students.map(s => ({ student:s, avg: studentAverage(s.id, term) })).filter(r=>r.avg!==null);
  rows.sort((a,b)=>b.avg-a.avg);
  const passCount = rows.filter(r=>r.avg>=35).length;
  const classAvg = rows.length ? rows.reduce((a,r)=>a+r.avg,0)/rows.length : 0;
  const passPct = rows.length ? (passCount/rows.length*100) : 0;
  return {
    total: students.length,
    graded: rows.length,
    avg: classAvg,
    passPct,
    failPct: rows.length ? (100 - passPct) : 0,
    top5: rows.slice(0,5),
    all: rows
  };
}
/* Every class in CLASS_LIST with its avg/pass%/fail%/topper for a given exam — powers the school-wide report. */
function schoolWideReport(term){
  return CLASS_LIST.map(c => {
    const sc = classScorecard(c.code, term);
    return {
      code: c.code, label: c.label, grade: c.grade, section: c.section,
      total: sc.total, graded: sc.graded, avg: sc.avg, passPct: sc.passPct, failPct: sc.failPct,
      topper: sc.top5[0] ? sc.top5[0].student : null
    };
  });
}
/* Pairs same-grade sections (A vs B, or Group I vs Group II) and flags which scored higher, for a given exam. */
function sectionComparison(term){
  const report = schoolWideReport(term);
  const byGrade = {};
  report.forEach(r => { (byGrade[r.grade] = byGrade[r.grade] || []).push(r); });
  return Object.keys(byGrade).sort((a,b)=>a-b).map(grade => {
    const sections = byGrade[grade];
    const graded = sections.filter(s=>s.graded>0);
    let higher = null;
    if (graded.length >= 2){
      higher = graded.reduce((best, s) => (s.avg > best.avg ? s : best), graded[0]);
    } else if (graded.length === 1){
      higher = graded[0];
    }
    return { grade: Number(grade), sections, higher: higher ? higher.code : null };
  });
}
/* One shared definition of "graded" (every subject in the class has a mark row for this term) and
   "pass" (graded, nobody absent, no subject below 35) — reused by every consolidated-report stat below
   so the sections never disagree with each other about who appeared / passed. */
function gradedStudentRecords(classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const subjects = SUBJECTS_FOR_CLASS(classCode);
  return students.map(student => {
    const marks = subjects.map(subject => db.marks.find(m=>m.studentId===student.id && m.term===term && m.subject===subject));
    if (!marks.every(m=>m)) return { student, graded:false };
    const failedSubjects = marks.filter(m => !m.absent && m.score < 35).map(m=>m.subject);
    const absentSubjects = marks.filter(m => m.absent).map(m=>m.subject);
    return {
      student, graded:true, marks,
      total: marks.reduce((a,m)=>a+m.score,0),
      failedSubjects, absentSubjects,
      pass: failedSubjects.length===0 && absentSubjects.length===0
    };
  });
}
/* Per-subject max/min/avg/pass% for a class+term, plus the class total row and topper — mirrors a
   school's printed "Exam Analysis" sheet (School Result table + toppers). */
function subjectWiseStats(classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const subjects = SUBJECTS_FOR_CLASS(classCode);

  const bySubject = subjects.map(subject => {
    const scores = students
      .map(s => db.marks.find(m=>m.studentId===s.id && m.term===term && m.subject===subject))
      .filter(m => m && !m.absent)
      .map(m => m.score);
    const appeared = scores.length;
    const passed = scores.filter(sc=>sc>=35).length;
    return {
      subject, abbr: SUBJECT_ABBR[subject] || subject,
      max: appeared ? Math.max(...scores) : null,
      min: appeared ? Math.min(...scores) : null,
      avg: appeared ? scores.reduce((a,b)=>a+b,0)/appeared : null,
      appeared, passed,
      passPct: appeared ? (passed/appeared*100) : null
    };
  });

  const studentTotals = gradedStudentRecords(classCode, term).filter(r=>r.graded);
  const totals = studentTotals.map(r=>r.total);
  const appeared = studentTotals.length;
  const passed = studentTotals.filter(r=>r.pass).length;
  const topper = appeared ? studentTotals.reduce((best,r)=> r.total>best.total?r:best, studentTotals[0]) : null;

  return {
    subjects: bySubject,
    total: {
      max: appeared ? Math.max(...totals) : null,
      min: appeared ? Math.min(...totals) : null,
      avg: appeared ? totals.reduce((a,b)=>a+b,0)/appeared : null,
      appeared, passed,
      passPct: appeared ? (passed/appeared*100) : null,
      maxMarks: subjects.length*100
    },
    topper: topper ? { student: topper.student, total: topper.total } : null,
    totalStudents: students.length
  };
}
/* Buckets every fully-graded student's total marks into 10 equal ranges — the "marks range" histogram
   schools traditionally print alongside subject-wise stats. Students missing any subject's marks are
   reported separately as not yet graded, rather than silently dropped from the total count. */
function marksDistribution(classCode, term){
  const subjects = SUBJECTS_FOR_CLASS(classCode);
  const maxTotal = subjects.length * 100;
  const binSize = maxTotal / 10;
  const bins = Array.from({length:10}, (_,i) => ({ from: i*binSize, to: (i+1)*binSize, count: 0 }));
  const records = gradedStudentRecords(classCode, term);
  let notGraded = 0;
  records.forEach(r => {
    if (!r.graded) { notGraded++; return; }
    bins[Math.min(9, Math.floor(r.total/binSize))].count++;
  });
  return { maxTotal, binSize, bins, notGraded, totalStudents: records.length };
}
/* Roll / Appeared / Passed / Pass% split by medium (Tamil/English) and gender (Male/Female/Total) —
   the "medium × gender" summary table on a school's printed consolidated result sheet. */
function enrollmentBreakdown(classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const records = gradedStudentRecords(classCode, term);
  const byId = {}; records.forEach(r => byId[r.student.id] = r);

  const cell = (group) => {
    const roll = group.length;
    const appearedList = group.filter(s => byId[s.id] && byId[s.id].graded);
    const appeared = appearedList.length;
    const passed = appearedList.filter(s => byId[s.id].pass).length;
    return { roll, appeared, passed, passPct: appeared ? (passed/appeared*100) : null };
  };

  const rows = ['TM','EM'].map(medium => {
    const inMedium = students.filter(s => s.medium === medium);
    return {
      medium,
      M: cell(inMedium.filter(s=>s.gender==='Male')),
      F: cell(inMedium.filter(s=>s.gender==='Female')),
      TOT: cell(inMedium)
    };
  });
  const total = {
    medium: 'TOTAL',
    M: cell(students.filter(s=>s.gender==='Male')),
    F: cell(students.filter(s=>s.gender==='Female')),
    TOT: cell(students)
  };
  return { rows, total };
}
/* Top N passed students by total marks, with every subject's individual score — the "School Toppers"
   rank-holder list on a school's printed consolidated result sheet. */
function classToppers(classCode, term, topN=3){
  const records = gradedStudentRecords(classCode, term).filter(r=>r.pass);
  records.sort((a,b) => b.total - a.total);
  return records.slice(0, topN).map((r, i) => ({
    rank: i+1,
    student: r.student,
    total: r.total,
    marksBySubject: Object.fromEntries(r.marks.map(m => [m.subject, m.score]))
  }));
}
/* How many students failed exactly 1..N subjects (N = subject count for this class), split by gender —
   the "No. of Subjects Failed" histogram on a school's printed consolidated result sheet. Students
   absent in any subject are reported separately rather than folded into a failed-subject count. */
function failedSubjectsHistogram(classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const subjectCount = SUBJECTS_FOR_CLASS(classCode).length;
  const records = gradedStudentRecords(classCode, term);
  const byId = {}; records.forEach(r => byId[r.student.id] = r);

  const row = (group) => {
    const failedCounts = Array.from({length: subjectCount+1}, ()=>0); // index = no. of subjects failed
    let passedCount = 0, absentCount = 0;
    group.forEach(s => {
      const r = byId[s.id];
      if (!r || !r.graded) return;
      if (r.absentSubjects.length){ absentCount++; return; }
      const failed = r.failedSubjects.length;
      failedCounts[failed]++;
      if (failed===0) passedCount++;
    });
    return { failedCounts: failedCounts.slice(1), passedCount, absentCount, roll: group.length };
  };

  return {
    subjectCount,
    Male: row(students.filter(s=>s.gender==='Male')),
    Female: row(students.filter(s=>s.gender==='Female')),
    Total: row(students)
  };
}
/* Every graded student's exact class rank (not just the top 5). Returns null if the student has no marks for this term. */
function studentRank(studentId, classCode, term){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode);
  const rows = students.map(s => ({ id:s.id, avg: studentAverage(s.id, term) })).filter(r=>r.avg!==null);
  rows.sort((a,b)=>b.avg-a.avg);
  const idx = rows.findIndex(r=>r.id===studentId);
  return idx>=0 ? { rank: idx+1, outOf: rows.length } : null;
}
/* Subjects (abbreviated) the student scored below the pass mark in, excluding any they were absent for —
   absence is reported separately via getAbsentSubjects, not double-counted as a failure. */
function getFailedSubjects(studentId, term){
  return getMarksForStudent(studentId, term)
    .filter(m => !m.absent && m.score < 35)
    .map(m => SUBJECT_ABBR[m.subject] || m.subject);
}
function getAbsentSubjects(studentId, term){
  return getMarksForStudent(studentId, term)
    .filter(m => m.absent)
    .map(m => SUBJECT_ABBR[m.subject] || m.subject);
}

/* ---------------- Gallery ---------------- */
function addGalleryItem({ title, category, image, type, videoUrl, eventId }){
  const db = SchoolDB.get();
  const item = {
    id:'G'+Date.now(), title, category: category||'Events', date: new Date().toISOString().slice(0,10),
    image, type: type === 'video' ? 'video' : 'image', videoUrl: type === 'video' ? (videoUrl||'') : null,
    eventId: eventId || null
  };
  db.gallery.unshift(item);
  SchoolDB.save(db);
  return item;
}
function getGallery(){ return SchoolDB.get().gallery; }
function deleteGalleryItem(id){
  const db = SchoolDB.get();
  db.gallery = db.gallery.filter(g=>g.id!==id);
  SchoolDB.save(db);
}

/* ---------------- Gallery Events (folders) ---------------- */
function getEvents(){ return SchoolDB.get().events; }
function getEvent(id){ return SchoolDB.get().events.find(e=>e.id===id); }
function addEvent({ title, academicYear }){
  const db = SchoolDB.get();
  const item = { id:'E'+Date.now(), title, academicYear: academicYear || '2025-2026' };
  db.events.push(item);
  SchoolDB.save(db);
  return item;
}
function deleteEvent(id){
  const db = SchoolDB.get();
  db.events = db.events.filter(e=>e.id!==id);
  db.gallery = db.gallery.filter(g=>g.eventId!==id);
  SchoolDB.save(db);
}
function getGalleryByEvent(eventId){ return SchoolDB.get().gallery.filter(g=>g.eventId===eventId); }
function eventCover(eventId){
  const items = getGalleryByEvent(eventId);
  return items.length ? items[0].image : null;
}

/* ---------------- Timetables ---------------- */
function emptyTimetableGrid(){ return TIMETABLE_DAYS.map(() => Array(TIMETABLE_PERIODS).fill('')); }
function getTeacherTimetable(teacherId){
  const db = SchoolDB.get();
  return db.teacherTimetable[teacherId] || emptyTimetableGrid();
}
function setTeacherTimetable(teacherId, grid){
  const db = SchoolDB.get();
  db.teacherTimetable[teacherId] = grid;
  SchoolDB.save(db);
}
function getClassTimetable(classCode){
  const db = SchoolDB.get();
  return db.classTimetable[classCode] || emptyTimetableGrid();
}
function setClassTimetable(classCode, grid){
  const db = SchoolDB.get();
  db.classTimetable[classCode] = grid;
  SchoolDB.save(db);
}

/* ---------------- Attendance ---------------- */
/* Monthly attendance — the Class Teacher picks a month, enters the total working days for that
   month once, then enters each student's present-day count; absent days are total - present.
   One record per class per month ('YYYY-MM'). Saving locks it; only the Admin can unlock it. */
function monthLabel(ym){
  if (!ym) return '';
  const [y,m] = ym.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleString('en-US', { month:'long', year:'numeric' });
}
function markMonthlyAttendance(classCode, month, totalDays, records, markedBy){
  const db = SchoolDB.get();
  const existing = db.attendance.find(a => a.classCode===classCode && a.month===month);
  if (existing){
    existing.totalDays = totalDays;
    existing.records = records;
    existing.markedBy = markedBy || null;
    existing.markedAt = new Date().toISOString();
    existing.locked = true;
  } else {
    db.attendance.unshift({ id:'AT'+Date.now(), classCode, month, totalDays, records, locked:true, markedBy: markedBy || null, markedAt: new Date().toISOString() });
  }
  SchoolDB.save(db);
}
function getMonthlyAttendance(classCode, month){
  return SchoolDB.get().attendance.find(a => a.classCode===classCode && a.month===month) || null;
}
/* Once a month is saved via markMonthlyAttendance it locks automatically; only unlockMonthlyAttendance (Admin) can reopen it. */
function isMonthLocked(classCode, month){
  const rec = getMonthlyAttendance(classCode, month);
  return !!(rec && rec.locked);
}
function unlockMonthlyAttendance(classCode, month){
  const db = SchoolDB.get();
  const rec = db.attendance.find(a => a.classCode===classCode && a.month===month);
  if (!rec) return;
  rec.locked = false;
  SchoolDB.save(db);
}
function getAttendanceMonthsForClass(classCode){
  return SchoolDB.get().attendance.filter(a=>a.classCode===classCode).sort((a,b)=>b.month.localeCompare(a.month));
}
function studentAttendanceStats(studentId){
  const db = SchoolDB.get();
  const s = db.students.find(x=>x.id===studentId);
  if (!s) return { totalMonths:0, totalDays:0, presentDays:0, pct:null };
  const monthRecords = db.attendance.filter(a => a.classCode===s.class && a.records && Object.prototype.hasOwnProperty.call(a.records, studentId));
  let totalDays = 0, presentDays = 0;
  monthRecords.forEach(a => { totalDays += a.totalDays; presentDays += a.records[studentId]; });
  return { totalMonths: monthRecords.length, totalDays, presentDays, pct: totalDays ? (presentDays/totalDays*100) : null };
}
function classAttendanceStats(classCode){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode).sort((a,b)=>a.name.localeCompare(b.name));
  const rows = students.map(s => ({ student:s, ...studentAttendanceStats(s.id) }));
  const graded = rows.filter(r=>r.totalDays>0);
  const avgPct = graded.length ? graded.reduce((a,r)=>a+r.pct,0)/graded.length : null;
  return { totalMonthsMarked: getAttendanceMonthsForClass(classCode).length, avgPct, rows };
}
function schoolAttendanceReport(){
  return CLASS_LIST.map(c => {
    const stats = classAttendanceStats(c.code);
    return { code:c.code, label:c.label, totalMonthsMarked: stats.totalMonthsMarked, avgPct: stats.avgPct, studentCount: stats.rows.length };
  });
}
/* Most recent month that has an attendance record — for a given class, or across the whole school when classCode is omitted. */
function getLatestAttendanceMonth(classCode){
  const db = SchoolDB.get();
  const recs = classCode ? db.attendance.filter(a=>a.classCode===classCode) : db.attendance;
  if (!recs.length) return null;
  return recs.reduce((max,a) => (!max || a.month > max) ? a.month : max, null);
}
/* Present/absent per student for one specific class+month (not cumulative) — powers the "Monthly" attendance report view. */
function classMonthlyAttendance(classCode, month){
  const db = SchoolDB.get();
  const students = db.students.filter(s=>s.class===classCode).sort((a,b)=>a.name.localeCompare(b.name));
  const rec = getMonthlyAttendance(classCode, month);
  const totalDays = rec ? rec.totalDays : null;
  const rows = students.map(s => {
    const present = rec && rec.records && rec.records[s.id]!==undefined ? rec.records[s.id] : null;
    const absent = (totalDays!=null && present!=null) ? totalDays - present : null;
    const pct = (totalDays && present!=null) ? (present/totalDays*100) : null;
    return { student:s, present, absent, pct };
  });
  const graded = rows.filter(r=>r.pct!==null);
  const avgPct = graded.length ? graded.reduce((a,r)=>a+r.pct,0)/graded.length : null;
  return { totalDays, rows, avgPct, marked: !!rec };
}
function schoolMonthlyAttendanceReport(month){
  return CLASS_LIST.map(c => {
    const stats = classMonthlyAttendance(c.code, month);
    const presentTotal = stats.rows.reduce((a,r)=>a + (r.present||0), 0);
    const absentTotal = stats.rows.reduce((a,r)=>a + (r.absent||0), 0);
    return { code:c.code, label:c.label, studentCount: stats.rows.length, totalDays: stats.totalDays, presentTotal, absentTotal, avgPct: stats.avgPct, marked: stats.marked };
  });
}

/* Converts a pasted YouTube/Vimeo link into an embeddable player URL.
   Direct video file links (.mp4/.webm/.ogg) are returned as-is for use in a <video> tag. */
function toEmbedUrl(url){
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}
function isDirectVideoFile(url){
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url||'');
}
/* Real YouTube thumbnails come free via img.youtube.com (no API key needed);
   other links fall back to a generated placeholder since we can't fetch a real frame. */
function videoThumbnail(url, title){
  const yt = (url||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  return svgPlaceholder(title, '#04344C', '#0a4a6b');
}

/* ---------------- Notices ---------------- */
/* Admin (school-wide) notices — audience is 'students', 'teachers', or 'all'. The public site
   (notices.html/home.html) shows every notice regardless of audience; only the logged-in
   Student/Teacher portals filter by it. */
function addNotice({ title, body, audience }){
  const db = SchoolDB.get();
  const n = { id:'N'+Date.now(), title, body, audience: audience||'all', date: new Date().toISOString().slice(0,10), postedAt: new Date().toISOString() };
  db.notices.unshift(n);
  SchoolDB.save(db);
  return n;
}
function getNotices(){ return SchoolDB.get().notices; }
function getNoticesForAudience(role){
  // role: 'student' or 'teacher' — internal portals; 'website' notices never appear here.
  return SchoolDB.get().notices.filter(n => n.audience==='all' || n.audience===role+'s').sort((a,b)=> b.postedAt.localeCompare(a.postedAt));
}
/* The public school website (home.html / notices.html) — only 'website' notices, never internal Students/Teachers/All ones. */
function getPublicNotices(){
  return SchoolDB.get().notices.filter(n => n.audience==='website').sort((a,b)=> b.postedAt.localeCompare(a.postedAt));
}

/* ---- Class Notices — homework/information ANY teacher posts for one class. A Class Teacher's
   notice is auto-scoped to their own class; a subject teacher picks the class when posting. ---- */
function addClassNotice({ classCode, title, body, teacherId, teacherName, subject }){
  const db = SchoolDB.get();
  const n = { id:'CN'+Date.now(), classCode, title, body, teacherId: teacherId||null, postedBy: teacherName||null, subject: subject||null, postedAt: new Date().toISOString() };
  db.classNotices.unshift(n);
  SchoolDB.save(db);
  return n;
}
function getClassNotices(classCode){
  return SchoolDB.get().classNotices.filter(n=>n.classCode===classCode).sort((a,b)=> b.postedAt.localeCompare(a.postedAt));
}
function getClassNoticesByTeacher(teacherId){
  return SchoolDB.get().classNotices.filter(n=>n.teacherId===teacherId).sort((a,b)=> b.postedAt.localeCompare(a.postedAt));
}
function markNoticesSeen(studentId){
  const db = SchoolDB.get();
  const s = db.students.find(x=>x.id===studentId);
  if (!s) return;
  s.noticesLastSeenAt = new Date().toISOString();
  SchoolDB.save(db);
}
/* True if the student has an unseen notice from either source — their Class Notices or an
   Admin notice addressed to students/all. */
function hasUnreadClassNotices(studentId){
  const db = SchoolDB.get();
  const s = db.students.find(x=>x.id===studentId);
  if (!s) return false;
  const all = [...getClassNotices(s.class), ...getNoticesForAudience('student')];
  if (!all.length) return false;
  return !s.noticesLastSeenAt || all.some(n => n.postedAt > s.noticesLastSeenAt);
}

/* ---------------- Certificates ---------------- */
function logCertificate(studentId, type){
  const db = SchoolDB.get();
  db.certificatesIssued.unshift({ id:'C'+Date.now(), studentId, type, date:new Date().toISOString().slice(0,10) });
  SchoolDB.save(db);
}

const CERT_TYPE_LABEL = { attendance:'Attendance Certificate', bonafide:'Bonafide Certificate', conduct:'Conduct Certificate' };

/* ---- Certificate Requests (student → class teacher approval → student download) ---- */
function requestCertificate(studentId, type, note){
  const db = SchoolDB.get();
  const s = db.students.find(x=>x.id===studentId);
  if (!s) return null;
  const teacherId = db.assignments[s.class] || null;
  const req = {
    id:'CR'+Date.now()+Math.random().toString(36).slice(2,5),
    studentId, classCode:s.class, teacherId, type, note: note||'',
    status:'pending', requestDate:new Date().toISOString().slice(0,10),
    decisionDate:null, decisionBy:null, downloadedAt:null
  };
  db.certificateRequests.unshift(req);
  SchoolDB.save(db);
  return req;
}
function getStudentCertificateRequests(studentId){
  return SchoolDB.get().certificateRequests.filter(r=>r.studentId===studentId);
}
function getAllRequestsForTeacher(teacherId){
  // Resolve by the CURRENT class-teacher assignment rather than the teacherId captured
  // at request time, so a request still surfaces even if it was made before the class
  // teacher was assigned, or the class teacher changed since.
  const db = SchoolDB.get();
  return db.certificateRequests.filter(r => db.assignments[r.classCode] === teacherId);
}
function getPendingRequestsForTeacher(teacherId){
  return getAllRequestsForTeacher(teacherId).filter(r=>r.status==='pending');
}
function getApprovedCertificateRequests(){
  return SchoolDB.get().certificateRequests.filter(r=>r.status==='approved').sort((a,b)=> (b.decisionDate||'').localeCompare(a.decisionDate||''));
}
function decideCertificateRequest(requestId, approve, decidedByName){
  const db = SchoolDB.get();
  const req = db.certificateRequests.find(r=>r.id===requestId);
  if (!req) return null;
  req.status = approve ? 'approved' : 'rejected';
  req.decisionDate = new Date().toISOString().slice(0,10);
  req.decisionBy = decidedByName || null;
  SchoolDB.save(db);
  return req;
}
function getCertificateRequest(requestId){
  return SchoolDB.get().certificateRequests.find(r=>r.id===requestId) || null;
}
function markCertificateDownloaded(requestId){
  const db = SchoolDB.get();
  const req = db.certificateRequests.find(r=>r.id===requestId);
  if (!req) return;
  req.downloadedAt = new Date().toISOString();
  SchoolDB.save(db);
}

/* ---- Complaints / Direct Messages (student -> Admin only; teachers never see these) ---- */
function sendComplaintMessage(studentId, from, text){
  const db = SchoolDB.get();
  let t = db.complaints.find(c=>c.studentId===studentId);
  if (!t){
    t = { id:'CX'+Date.now(), studentId, messages:[], unreadForAdmin:false, unreadForStudent:false, updatedAt:new Date().toISOString() };
    db.complaints.unshift(t);
  }
  t.messages.push({ from, text, at:new Date().toISOString() });
  t.updatedAt = new Date().toISOString();
  if (from === 'student') t.unreadForAdmin = true; else t.unreadForStudent = true;
  SchoolDB.save(db);
  return t;
}
function getComplaintThread(studentId){
  return SchoolDB.get().complaints.find(c=>c.studentId===studentId) || null;
}
function getAllComplaintThreads(){
  return SchoolDB.get().complaints.slice().sort((a,b)=> b.updatedAt.localeCompare(a.updatedAt));
}
function markComplaintRead(studentId, forRole){
  const db = SchoolDB.get();
  const t = db.complaints.find(c=>c.studentId===studentId);
  if (!t) return;
  if (forRole === 'admin') t.unreadForAdmin = false; else t.unreadForStudent = false;
  SchoolDB.save(db);
}

/* ---------------- Utility ---------------- */
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function initials(name){ return (name||'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function escapeHtml(str){ return (str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

SchoolDB.init();
