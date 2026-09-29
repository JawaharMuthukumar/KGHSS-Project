// =====================================================================================
// CENTRAL SCHOOL DATA FILE
// -------------------------------------------------------------------------------------
// Every editable piece of content on the website lives here so it can be updated in one
// place without touching component code.
//
// Fields/records marked "DUMMY" or "PLACEHOLDER" are prototype content only and must be
// replaced with verified official information before this site is treated as final.
// Nothing here should be presented publicly as fact until confirmed by the school.
// =====================================================================================

// ---------------------------------------------------------------------------
// CORE SCHOOL INFORMATION (mix of supplied facts + placeholders — see notes)
// ---------------------------------------------------------------------------
export const schoolInfo = {
  name: "Government Higher Secondary School, Kangayampalayam",
  shortName: "GHSS Kangayampalayam",
  tamilName: "அரசு மேல்நிலைப்பள்ளி, காங்கயம்பாளையம்",
  tagline: "Learning with purpose. Growing with values.",
  supportingLine: "Nearly a century of learning, character and community.",

  // Supplied for this prototype — confirm exact founding year officially.
  foundedYear: 1927,

  headmasterName: "Martin Devasagayam",
  type: "Government Higher Secondary School",
  coEducational: true,
  mediums: ["Tamil Medium", "English Medium"],
  classesLabel: "6th to 12th Standard",
  classesRange: "6–12",

  location: {
    village: "Kangayampalayam",
    block: "Sulur",
    district: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    addressLines: [
      "Government Higher Secondary School",
      "Kangayampalayam, Sulur Block",
      "Coimbatore District, Tamil Nadu",
      "India",
    ],
    // Intentionally no precise coordinates — none were supplied.
    mapQuery: "Government Higher Secondary School Kangayampalayam Sulur Coimbatore",
  },

  // PLACEHOLDER contact details — replace with verified official details.
  contact: {
    phonePrimary: "+91 XXXXX XXXXX",
    phoneSecondary: "",
    email: "ghsskangayampalayam@example.edu",
    officeHours: "9:00 AM – 4:30 PM, Monday – Saturday",
  },

  socialMedia: {
    youtube: {
      url: "https://www.youtube.com/channel/UCfg12-MtMJtY0HlpPoWv-vA",
      handle: "@ghsskangayampalayam",
      // Provided at time of build — keep this fresh, do not treat as permanently accurate.
      subscribers: "1.05K+",
    },
    facebook: {
      // Leave empty until an official school Facebook page is confirmed.
      url: "",
    },
    instagram: {
      url: "",
    },
  },
};

// ---------------------------------------------------------------------------
// HOMEPAGE QUICK STATISTICS
// ---------------------------------------------------------------------------
// students, teachers, classesRange and libraryBooks come from supplied school
// information. boardResults is prototype content — replace "value"/"year" once
// official, year-specific board result data is confirmed.
export const quickStats = [
  { id: "students", value: 628, suffix: "+", label: "Students" },
  { id: "teachers", value: 23, suffix: "", label: "Teachers" },
  { id: "classes", value: null, display: "6–12", label: "Classes" },
  { id: "mediums", value: 2, suffix: "", label: "Mediums" },
  { id: "library", value: 500, suffix: "+", label: "Library Books" },
  {
    id: "results",
    value: 100,
    suffix: "%",
    label: "Recent Board Results",
    isDummy: true,
    note: "Sample figure — replace with official, year-specific board result data.",
  },
];

// ---------------------------------------------------------------------------
// WHY OUR SCHOOL — feature cards (lucide-react icon names, resolved in component)
// ---------------------------------------------------------------------------
export const whyUsFeatures = [
  {
    icon: "Languages",
    title: "Tamil & English Medium",
    description: "Two medium options let every student learn in the language that builds their confidence best.",
  },
  {
    icon: "GraduationCap",
    title: "Experienced Teaching Team",
    description: "23 teachers who take part in government-supported training and bring updated methods to the classroom.",
  },
  {
    icon: "TrendingUp",
    title: "Strong Board Results",
    description: "A consistent record of board performance across Secondary and Higher Secondary classes.",
  },
  {
    icon: "Sparkles",
    title: "Academic Talent Development",
    description: "Structured preparation for scholarship and talent examinations such as NMMS and CM Talent Search.",
  },
  {
    icon: "Trophy",
    title: "Sports Excellence",
    description: "Active participation in Kabaddi, Volleyball, Athletics and more at district-level competitions.",
  },
  {
    icon: "ShieldCheck",
    title: "Safe Learning Environment",
    description: "Structured supervision and CCTV monitoring across key campus areas support a secure school day.",
  },
  {
    icon: "Users",
    title: "Leadership & Clubs",
    description: "NSS, NCC and student clubs build leadership, discipline and community responsibility.",
  },
  {
    icon: "HeartHandshake",
    title: "Community Support",
    description: "An engaged Parent–Teacher Association and Alumni network stand behind every student.",
  },
];

// ---------------------------------------------------------------------------
// ACADEMICS — pathways, streams, sample subject lists
// ---------------------------------------------------------------------------
export const academicStages = [
  {
    id: "middle",
    range: "6 – 8",
    title: "Middle School",
    description: "Foundational years focused on core subjects, curiosity and study habits, available in both mediums.",
    mediums: ["Tamil Medium", "English Medium"],
  },
  {
    id: "secondary",
    range: "9 – 10",
    title: "Secondary",
    description: "Board-aligned preparation across core subjects leading up to the SSLC (10th Standard) examination.",
    mediums: ["Tamil Medium", "English Medium"],
  },
  {
    id: "higher-secondary",
    range: "11 – 12",
    title: "Higher Secondary",
    description: "Specialised streams that prepare students for higher education and competitive examinations.",
    mediums: ["Tamil Medium", "English Medium"],
  },
];

// Sample subject combinations — clearly prototype content until confirmed.
export const higherSecondaryStreams = [
  {
    id: "bio-maths",
    name: "Bio-Maths",
    subjects: ["Physics", "Chemistry", "Biology", "Mathematics"],
    isSample: true,
  },
  {
    id: "cs-maths",
    name: "Computer Science – Maths",
    subjects: ["Physics", "Chemistry", "Computer Science", "Mathematics"],
    isSample: true,
  },
];

// ---------------------------------------------------------------------------
// RESULTS — sample year-specific figures, structured for easy replacement
// ---------------------------------------------------------------------------
export const boardResults = [
  {
    year: "2024–25",
    entries: [
      { level: "10th Standard (SSLC)", passPercentage: 100, isSample: true },
      { level: "12th Standard (HSC)", passPercentage: 100, isSample: true },
    ],
  },
  {
    year: "2025–26",
    entries: [
      { level: "10th Standard (SSLC)", passPercentage: 100, isSample: true },
      { level: "12th Standard (HSC)", passPercentage: 100, isSample: true },
    ],
  },
];

// ---------------------------------------------------------------------------
// ACHIEVEMENTS — generic placeholder names only, never real student identities
// ---------------------------------------------------------------------------
export const achievementCategories = ["All", "Academic", "Scholarship", "Sports", "Cultural"];

export const achievements = [
  {
    id: "ach-1",
    category: "Scholarship",
    title: "CM Talent Search Examination",
    student: "Student A",
    classLabel: "Class 10",
    year: "2025–26",
    description: "Qualified in the Chief Minister's Talent Search Examination.",
    isSample: true,
  },
  {
    id: "ach-2",
    category: "Scholarship",
    title: "NMMS Scholarship Examination",
    student: "Student B",
    classLabel: "Class 9",
    year: "2025–26",
    description: "Qualified for the National Means-cum-Merit Scholarship.",
    isSample: true,
  },
  {
    id: "ach-3",
    category: "Sports",
    title: "District-Level Kabaddi",
    student: "Student C",
    classLabel: "Class 11",
    year: "2025–26",
    description: "Represented the school at the district-level Kabaddi tournament.",
    isSample: true,
  },
  {
    id: "ach-4",
    category: "Academic",
    title: "District Science Quiz",
    student: "Student D",
    classLabel: "Class 12",
    year: "2024–25",
    description: "Secured a top position in the district-level science quiz competition.",
    isSample: true,
  },
  {
    id: "ach-5",
    category: "Cultural",
    title: "District Cultural Meet — Classical Dance",
    student: "Student E",
    classLabel: "Class 8",
    year: "2024–25",
    description: "Recognised for a classical dance performance at the district cultural meet.",
    isSample: true,
  },
  {
    id: "ach-6",
    category: "Sports",
    title: "District-Level Athletics",
    student: "Student F",
    classLabel: "Class 10",
    year: "2025–26",
    description: "Qualified for the district-level athletics meet in the 400m event.",
    isSample: true,
  },
];

// ---------------------------------------------------------------------------
// CAMPUS & FACILITIES
// ---------------------------------------------------------------------------
export const facilities = [
  { icon: "BookOpen", title: "Library", description: "500+ books supporting curriculum and recreational reading.", image: "/images/campus-courtyard-2.webp" },
  { icon: "FlaskConical", title: "Science Laboratory", description: "Practical learning space for Physics, Chemistry and Biology.", image: null },
  { icon: "Monitor", title: "Computer Laboratory", description: "Hands-on computer education supporting the CS-Maths stream.", image: null },
  { icon: "School", title: "Classrooms", description: "Well-ventilated classrooms across the middle, secondary and higher secondary blocks.", image: "/images/hero-building.webp" },
  { icon: "Trees", title: "Sports Ground", description: "Open ground used for daily physical education and annual sports events.", image: "/images/campus-courtyard-3.webp" },
  { icon: "Droplets", title: "Drinking Water", description: "Clean drinking water access maintained across the campus.", image: null },
  { icon: "Backpack", title: "Student Amenities", description: "Facilities supporting the day-to-day comfort of students on campus.", image: null },
  { icon: "Camera", title: "CCTV Monitoring", description: "Camera coverage across key common areas of the campus.", image: null },
  { icon: "ShieldCheck", title: "Safety Systems", description: "Structured supervision protocols supporting a secure school environment.", image: null },
];

export const safetyStatement =
  "Student safety remains a core campus priority, supported by structured supervision and CCTV monitoring across key areas.";

// ---------------------------------------------------------------------------
// SPORTS
// ---------------------------------------------------------------------------
export const sportsList = [
  { name: "Kabaddi", icon: "Swords" },
  { name: "Football", icon: "CircleDot" },
  { name: "Volleyball", icon: "CircleDot" },
  { name: "Table Tennis", icon: "CircleDot" },
  { name: "Badminton", icon: "CircleDot" },
  { name: "Throwball", icon: "CircleDot" },
  { name: "Kho-Kho", icon: "Users" },
  { name: "Chess", icon: "Crown" },
  { name: "Carrom", icon: "Circle" },
  { name: "Athletics", icon: "Zap" },
];

export const sportsPhilosophy =
  "Sport at our school is treated as part of education, not separate from it — building teamwork, discipline and resilience alongside academics. Students participate in district-level competitions across multiple sports each year.";

// ---------------------------------------------------------------------------
// CLUBS — NSS, NCC, Sports Club confirmed; others are sample/editable
// ---------------------------------------------------------------------------
export const clubs = [
  { name: "NSS", fullName: "National Service Scheme", icon: "HeartHandshake", description: "Community service and social responsibility activities.", isSample: false },
  { name: "NCC", fullName: "National Cadet Corps", icon: "ShieldCheck", description: "Discipline, leadership and national service training.", isSample: false },
  { name: "Sports Club", fullName: "Sports Club", icon: "Trophy", description: "Coordinates training and participation across all school sports.", isSample: false },
  { name: "Science Club", fullName: "Experiments & Exhibitions", icon: "FlaskConical", description: "Experiments, exhibitions and scientific curiosity beyond the syllabus.", isSample: true },
  { name: "Eco Club", fullName: "Environmental Awareness", icon: "Leaf", description: "Environmental awareness and campus greening activities.", isSample: true },
  { name: "Literary Club", fullName: "Debate & Creative Writing", icon: "BookMarked", description: "Debate, creative writing and language activities in Tamil and English.", isSample: true },
];

// ---------------------------------------------------------------------------
// NEWS & EVENTS — dummy dates, replace with real events as they are scheduled
// ---------------------------------------------------------------------------
export const events = [
  {
    id: "evt-1",
    date: "2026-08-15",
    category: "Celebration",
    title: "Independence Day Celebration",
    description: "Flag hoisting, cultural programmes and patriotic performances by students.",
    image: "/images/student-assembly.webp",
    status: "past",
  },
  {
    id: "evt-2",
    date: "2026-09-05",
    category: "Sports",
    title: "Annual Sports Meet",
    description: "A full day of track, field and team sport events across all class groups.",
    image: "/images/campus-courtyard-3.webp",
    status: "past",
  },
  {
    id: "evt-3",
    date: "2026-10-10",
    category: "Academics",
    title: "Science Exhibition",
    description: "Student projects and working models showcased across Physics, Chemistry and Biology.",
    image: null,
    status: "upcoming",
  },
  {
    id: "evt-4",
    date: "2026-10-24",
    category: "Community",
    title: "Parent–Teacher Meeting",
    description: "Term progress discussion between parents and subject teachers.",
    image: null,
    status: "upcoming",
  },
  {
    id: "evt-5",
    date: "2026-11-02",
    category: "NSS",
    title: "NSS Community Activity",
    description: "A local community service drive organised by NSS volunteers.",
    image: null,
    status: "upcoming",
  },
  {
    id: "evt-6",
    date: "2026-11-20",
    category: "NCC",
    title: "NCC Training Camp",
    description: "A residential training camp for NCC cadets focused on discipline and drill.",
    image: null,
    status: "upcoming",
  },
];

// ---------------------------------------------------------------------------
// NOTICE BOARD
// ---------------------------------------------------------------------------
export const noticeCategories = ["All", "Important", "Academic", "Event", "General"];

export const notices = [
  { id: "not-1", date: "2026-09-18", category: "Important", title: "Quarterly Examination Timetable", fileUrl: null },
  { id: "not-2", date: "2026-09-15", category: "Event", title: "Parent–Teacher Meeting — Schedule", fileUrl: null },
  { id: "not-3", date: "2026-09-10", category: "Academic", title: "Scholarship Application Notice (NMMS)", fileUrl: null },
  { id: "not-4", date: "2026-09-02", category: "General", title: "Holiday Announcement", fileUrl: null },
  { id: "not-5", date: "2026-08-28", category: "Academic", title: "Higher Secondary Practical Examination Schedule", fileUrl: null },
];

// ---------------------------------------------------------------------------
// HEADMASTER
// ---------------------------------------------------------------------------
export const headmaster = {
  name: "Martin Devasagayam",
  // PLACEHOLDER — never fabricate; fill only with verified information.
  qualification: "[Add official qualification]",
  experience: "[Add official experience]",
  photo: null,
  message: {
    short:
      "Education is not only about academic achievement. It is about helping every student discover confidence, discipline, curiosity and responsibility.",
    full: [
      "Education is not only about academic achievement. It is about helping every student discover confidence, discipline, curiosity and responsibility.",
      "At Government Higher Secondary School, Kangayampalayam, our teachers work closely with every child to build strong fundamentals while encouraging participation in sports, clubs and community activities.",
      "We are grateful to our parents, alumni and the local community for their continued trust, and we remain committed to preparing every student for the opportunities ahead.",
    ],
    isSample: true,
  },
  focusAreas: [
    { icon: "GraduationCap", title: "Academic Excellence", description: "Consistent focus on strong fundamentals and board performance." },
    { icon: "ShieldCheck", title: "Student Discipline", description: "A structured, respectful daily routine that supports learning." },
    { icon: "Users", title: "Teacher Development", description: "Encouraging continuous, government-supported professional growth." },
    { icon: "Trophy", title: "Sports Participation", description: "Active encouragement of district-level sporting opportunities." },
    { icon: "Camera", title: "Safe Campus", description: "Supervision and monitoring systems across the school day." },
    { icon: "Sparkles", title: "Student Confidence", description: "Building self-belief through academics, sports and the arts." },
    { icon: "HeartHandshake", title: "Community Involvement", description: "Strong ties with parents, alumni and the local community." },
  ],
};

// ---------------------------------------------------------------------------
// GALLERY — using available local photographs; categories map to real images
// where present. Add more entries as official photos are supplied.
// ---------------------------------------------------------------------------
export const galleryCategories = ["All", "Campus", "Academics", "Sports", "Events", "NCC", "NSS", "Historic"];

export const galleryImages = [
  { id: "g1", src: "/images/hero-building.webp", category: "Campus", caption: "Main academic block" },
  { id: "g2", src: "/images/school-signboard.webp", category: "Campus", caption: "School entrance building" },
  { id: "g3", src: "/images/school-gate.webp", category: "Campus", caption: "School gate and signage" },
  { id: "g4", src: "/images/campus-courtyard-1.webp", category: "Campus", caption: "School courtyard" },
  { id: "g5", src: "/images/campus-courtyard-2.webp", category: "Campus", caption: "Classroom block" },
  { id: "g6", src: "/images/campus-courtyard-3.webp", category: "Sports", caption: "Sports ground and courtyard" },
  { id: "g7", src: "/images/campus-old-block.webp", category: "Historic", caption: "Older classroom block" },
  { id: "g8", src: "/images/student-assembly.webp", category: "Events", caption: "Morning assembly" },
  { id: "g9", src: "/images/campus-green-block.webp", category: "Academics", caption: "Higher secondary block" },
];

// ---------------------------------------------------------------------------
// LEGACY / 100 YEARS TIMELINE
// ---------------------------------------------------------------------------
// Only 1927 (founding year, per project brief) and 2026 figures reflect
// supplied information. All intermediate milestones are DUMMY placeholder
// content until the school supplies verified historical events.
export const legacyTimeline = [
  {
    year: 1927,
    title: "The Beginning",
    description: "The school opens its doors to the Kangayampalayam community, offering education to the region's first generations of students.",
    image: "/images/school-gate.webp",
    isDummy: false,
  },
  {
    year: 1945,
    title: "Growing With the Community",
    description: "Student enrolment grows steadily as the school becomes a trusted part of local life.",
    image: null,
    isDummy: true,
  },
  {
    year: 1965,
    title: "Expanding Access to Education",
    description: "Additional classes and facilities widen access to education for the surrounding villages.",
    image: null,
    isDummy: true,
  },
  {
    year: 1985,
    title: "Campus Development",
    description: "New classroom blocks and campus infrastructure are added to support a growing student body.",
    image: "/images/campus-old-block.webp",
    isDummy: true,
  },
  {
    year: 2000,
    title: "A New Academic Era",
    description: "Updated academic streams and teaching approaches mark a new chapter for the school.",
    image: null,
    isDummy: true,
  },
  {
    year: 2010,
    title: "Technology in Education",
    description: "Computer education is introduced, supporting new academic pathways for students.",
    image: null,
    isDummy: true,
  },
  {
    year: 2020,
    title: "Strengthening Digital Learning",
    description: "The school continues to adapt teaching methods to changing academic and technological needs.",
    image: null,
    isDummy: true,
  },
  {
    year: 2026,
    title: "628+ Students & 23 Teachers",
    description: "Today, the school supports 628+ students across Classes 6–12 with a team of 23 teachers, in Tamil and English medium.",
    image: "/images/hero-building.webp",
    isDummy: false,
  },
  {
    year: 2027,
    title: "100 Years",
    description: "The school approaches its centenary — a milestone in a century of learning, character and community.",
    image: null,
    isDummy: true,
  },
];

export const centenaryBlocks = [
  { icon: "Users", title: "Alumni Memories", description: "Stories and reflections from former students across the decades.", isSample: true },
  { icon: "ImageIcon", title: "Historic Photographs", description: "A growing archive of photographs from across the school's history.", isSample: true },
  { icon: "Milestone", title: "School Milestones", description: "Key moments and achievements that shaped the institution.", isSample: true },
  { icon: "MessageCircleHeart", title: "Messages From Former Students", description: "Reflections from alumni on what the school meant to them.", isSample: true },
];

// ---------------------------------------------------------------------------
// ABOUT — mission, vision, values
// ---------------------------------------------------------------------------
export const missionStatement =
  "To provide every student in our community with quality, values-based education that builds academic confidence, character and readiness for the future — regardless of background.";

export const visionStatement =
  "To be a school that generations of families continue to trust — one that develops capable, confident and responsible citizens through education, sports and community life.";

export const coreValues = [
  { icon: "ShieldCheck", title: "Integrity" },
  { icon: "HeartHandshake", title: "Respect" },
  { icon: "Target", title: "Discipline" },
  { icon: "Sparkles", title: "Curiosity" },
  { icon: "Users", title: "Responsibility" },
  { icon: "Trophy", title: "Excellence" },
  { icon: "Home", title: "Community" },
];

// ---------------------------------------------------------------------------
// ALUMNI & PTA
// ---------------------------------------------------------------------------
export const alumniInfo = {
  title: "Old Students Association",
  description:
    "Connecting generations of students and strengthening the relationship between our school's past, present and future.",
  stories: [
    {
      id: "story-1",
      name: "Alumni Name",
      passingYear: "20XX",
      profession: "[Add profession]",
      message: "Sample alumni reflection — replace with a real memory shared by a former student.",
      isSample: true,
    },
    {
      id: "story-2",
      name: "Alumni Name",
      passingYear: "20XX",
      profession: "[Add profession]",
      message: "Sample alumni reflection — replace with a real memory shared by a former student.",
      isSample: true,
    },
    {
      id: "story-3",
      name: "Alumni Name",
      passingYear: "20XX",
      profession: "[Add profession]",
      message: "Sample alumni reflection — replace with a real memory shared by a former student.",
      isSample: true,
    },
  ],
};

export const ptaInfo = {
  title: "Parent–Teacher Association",
  description:
    "Building stronger communication between families, teachers and the school community.",
  purpose: [
    "Strengthen the partnership between home and school in supporting student growth.",
    "Provide a regular channel for parent feedback and school updates.",
    "Support school initiatives, events and campus improvement efforts.",
  ],
  // Sample structure — replace with the real, current PTA committee.
  committee: [
    { role: "President", name: "[Add name]" },
    { role: "Secretary", name: "[Add name]" },
    { role: "Treasurer", name: "[Add name]" },
  ],
  meetingCadence: "Quarterly, aligned with the academic calendar (sample schedule — confirm exact dates each term).",
};

// ---------------------------------------------------------------------------
// YOUTUBE VIDEOS — keep empty URLs until real videos are supplied
// ---------------------------------------------------------------------------
export const youtubeVideos = [
  {
    title: "School Event Highlights",
    thumbnail: null,
    url: "",
    category: "School Event",
    date: "",
  },
  {
    title: "Annual Day Celebrations",
    thumbnail: null,
    url: "",
    category: "Celebration",
    date: "",
  },
  {
    title: "Sports Meet Moments",
    thumbnail: null,
    url: "",
    category: "Sports",
    date: "",
  },
];

// ---------------------------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------------------------
export const navigation = [
  { label: "Home", tamil: "முகப்பு", path: "/" },
  {
    label: "About",
    tamil: "எங்களைப் பற்றி",
    path: "/about",
    children: [
      { label: "Our Story", path: "/about" },
      { label: "Headmaster's Profile", path: "/about/headmaster" },
      { label: "Facilities & Safety", path: "/about/facilities" },
    ],
  },
  {
    label: "Academics",
    tamil: "கல்வி",
    path: "/academics",
    children: [
      { label: "Classes & Streams", path: "/academics" },
      { label: "Achievements & Results", path: "/achievements" },
    ],
  },
  {
    label: "School Life",
    tamil: "பள்ளி வாழ்க்கை",
    path: "/school-life",
    children: [
      { label: "Events", path: "/events" },
      { label: "Student Council", path: "/school-life#council" },
      { label: "Clubs & Activities", path: "/school-life#clubs" },
      { label: "Sports", path: "/sports" },
      { label: "Notices", path: "/notices" },
    ],
  },
  { label: "Gallery", tamil: "புகைப்படத் தொகுப்பு", path: "/gallery" },
  {
    label: "Alumni & PTA",
    path: "/alumni",
    children: [
      { label: "Alumni", path: "/alumni" },
      { label: "PTA", path: "/pta" },
    ],
  },
  { label: "Contact", tamil: "தொடர்பு", path: "/contact" },
];

export const centenaryCta = { label: "Towards 100 Years", path: "/legacy" };

export const loginRoles = [
  { label: "Admin", path: "/login/admin", icon: "UserCog" },
  { label: "Teacher", path: "/login/teacher", icon: "Users" },
  { label: "Student", path: "/login/student", icon: "GraduationCap" },
];

export const studentClasses = [
  {
    title: "Classes 6 – 10 · Section A / B",
    items: [
      { id: "6A", grade: "6", section: "A", label: "Class 6 · Section A", students: 46 },
      { id: "6B", grade: "6", section: "B", label: "Class 6 · Section B", students: 46 },
      { id: "7A", grade: "7", section: "A", label: "Class 7 · Section A", students: 46 },
      { id: "7B", grade: "7", section: "B", label: "Class 7 · Section B", students: 46 },
      { id: "8A", grade: "8", section: "A", label: "Class 8 · Section A", students: 46 },
      { id: "8B", grade: "8", section: "B", label: "Class 8 · Section B", students: 46 },
      { id: "9A", grade: "9", section: "A", label: "Class 9 · Section A", students: 46 },
      { id: "9B", grade: "9", section: "B", label: "Class 9 · Section B", students: 46 },
      { id: "10A", grade: "10", section: "A", label: "Class 10 · Section A", students: 46 },
      { id: "10B", grade: "10", section: "B", label: "Class 10 · Section B", students: 46 },
    ],
  },
  {
    title: "Classes 11 & 12 · Groups",
    items: [
      { id: "11-1", grade: "11", group: "Group I", stream: "Maths", label: "Class 11 · Group I", students: 45 },
      { id: "11-2", grade: "11", group: "Group II", stream: "Biology", label: "Class 11 · Group II", students: 45 },
      { id: "12-1", grade: "12", group: "Group I", stream: "Maths", label: "Class 12 · Group I", students: 45 },
      { id: "12-2", grade: "12", group: "Group II", stream: "Biology", label: "Class 12 · Group II", students: 45 },
    ],
  },
];
