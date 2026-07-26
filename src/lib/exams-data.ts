export interface ExamSubject {
  name: string;
  chapters: string[];
}

export interface ExamDiscipline {
  id: string;
  name: string;
  subjects: ExamSubject[];
}

export interface ExamCategory {
  id: string;
  name: string;
  stage: string;
  description: string;
  disciplines: ExamDiscipline[];
}

// Target Role definitions with their associated exam categories
export const TARGET_ROLES = [
  { value: 'Engineering Admission', label: 'Engineering Admission (JEE / CET Aspirant)' },
  { value: 'Engineering Student', label: 'Engineering Student (Sem / Viva / Internals)' },
  { value: 'Software Engineer', label: 'Software Engineer' },
  { value: 'Web Developer', label: 'Web Developer' },
  { value: 'Android Developer', label: 'Android Developer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'Data Scientist', label: 'Data Scientist' },
  { value: 'AI/ML Engineer', label: 'AI/ML Engineer' },
  { value: 'Cloud Engineer', label: 'Cloud Engineer' },
  { value: 'Cybersecurity Engineer', label: 'Cybersecurity Engineer' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: 'Full Stack Developer', label: 'Full Stack Developer' },
];

// Map each target role to its relevant exam categories (by id)
export const ROLE_TO_CATEGORIES: Record<string, string[]> = {
  'Engineering Admission': ['pre-eng'],
  'Engineering Student':   ['eng-student'],
  'Software Engineer':     ['campus-placement', 'gate-eng', 'tech-roles'],
  'Web Developer':         ['campus-placement', 'tech-roles'],
  'Android Developer':     ['campus-placement', 'tech-roles'],
  'Data Analyst':          ['campus-placement', 'gate-eng', 'cat-mba', 'tech-roles'],
  'Data Scientist':        ['campus-placement', 'gate-eng', 'tech-roles'],
  'AI/ML Engineer':        ['campus-placement', 'gate-eng', 'tech-roles'],
  'Cloud Engineer':        ['campus-placement', 'cloud-cert', 'tech-roles'],
  'Cybersecurity Engineer':['campus-placement', 'security-cert', 'tech-roles'],
  'DevOps Engineer':       ['campus-placement', 'devops-cert', 'tech-roles'],
  'Full Stack Developer':  ['campus-placement', 'tech-roles'],
};

// ─── Full Exam Hierarchy ────────────────────────────────────────────────────
export const ALL_EXAM_CATEGORIES: ExamCategory[] = [
  // ────────────────────────────────────────────────────────
  // 1. PRE-ENGINEERING — JEE, MHT CET, BITSAT, COMEDK
  // ────────────────────────────────────────────────────────
  {
    id: 'pre-eng',
    name: 'Engineering Admission Exams',
    stage: 'Pre-Engineering',
    description: 'JEE Main, JEE Advanced, MHT CET, BITSAT, COMEDK entrance exams.',
    disciplines: [
      {
        id: 'jee-main',
        name: 'JEE Main',
        subjects: [
          {
            name: 'Physics',
            chapters: [
              'Kinematics & Laws of Motion',
              'Work, Power & Energy',
              'Rotational Motion & Gravitation',
              'Thermodynamics & Kinetic Theory',
              'Electrostatics & Capacitance',
              'Current Electricity & Circuits',
              'Magnetism & Electromagnetic Induction',
              'Optics (Ray & Wave)',
              'Modern Physics & Semiconductors',
            ],
          },
          {
            name: 'Chemistry',
            chapters: [
              'Atomic Structure & Chemical Bonding',
              'States of Matter & Thermodynamics',
              'Electrochemistry & Chemical Kinetics',
              'General Organic Chemistry (GOC)',
              'Hydrocarbons & Functional Groups',
              'Coordination Compounds & Metallurgy',
              'p-Block & d-Block Elements',
            ],
          },
          {
            name: 'Mathematics',
            chapters: [
              'Sets, Relations & Complex Numbers',
              'Quadratic Equations & Inequalities',
              'Matrices, Determinants & Mathematical Induction',
              'Differential Calculus (Limits & Derivatives)',
              'Integral Calculus (Definite & Indefinite)',
              'Coordinate Geometry (Circles & Conics)',
              'Vectors & 3D Geometry',
              'Probability & Statistics',
            ],
          },
        ],
      },
      {
        id: 'jee-advanced',
        name: 'JEE Advanced',
        subjects: [
          {
            name: 'Physics',
            chapters: [
              'Mechanics — Rigid Body & Fluid',
              'Waves & Superposition',
              'Electromagnetic Waves & Optics',
              'Modern Physics & Nuclear Physics',
            ],
          },
          {
            name: 'Chemistry',
            chapters: [
              'Advanced Organic Reaction Mechanisms',
              'Qualitative Analysis & Volumetric Analysis',
              'Electrochemistry & Solid State',
            ],
          },
          {
            name: 'Mathematics',
            chapters: [
              'Differential Equations',
              'Complex Number Geometry',
              'Permutations & Combinations (Advanced)',
              'Conic Sections — Parametric & Polar Forms',
            ],
          },
        ],
      },
      {
        id: 'mht-cet',
        name: 'MHT CET',
        subjects: [
          {
            name: 'Physics',
            chapters: [
              'Rotational Dynamics & Oscillations',
              'Mechanical Properties of Fluids',
              'Wave Optics & Electrostatics',
              'Current Electricity & Magnetic Fields',
              'Semiconductors & Structure of Atoms',
            ],
          },
          {
            name: 'Chemistry',
            chapters: [
              'Solid State & Solutions',
              'Chemical Thermodynamics & Electrochemistry',
              'Coordination Compounds & Transition Elements',
              'Halogen Derivatives, Alcohols & Amines',
              'Biomolecules & Polymers',
            ],
          },
          {
            name: 'Mathematics',
            chapters: [
              'Mathematical Logic & Matrices',
              'Trigonometric Functions & Pair of Lines',
              'Vectors, 3D Line & Plane',
              'Differentiation & Applications',
              'Integration & Differential Equations',
              'Probability Distributions',
            ],
          },
        ],
      },
      {
        id: 'bitsat',
        name: 'BITSAT',
        subjects: [
          {
            name: 'Physics',
            chapters: ['Mechanics', 'Thermodynamics', 'Electrodynamics', 'Optics & Modern Physics'],
          },
          {
            name: 'Chemistry',
            chapters: ['Physical Chemistry', 'Inorganic Chemistry', 'Organic Chemistry'],
          },
          {
            name: 'Mathematics',
            chapters: ['Algebra', 'Calculus', 'Coordinate Geometry', 'Probability'],
          },
          {
            name: 'English Proficiency & Logical Reasoning',
            chapters: ['Reading Comprehension', 'Grammar', 'Logical Deduction', 'Data Sufficiency'],
          },
        ],
      },
      {
        id: 'comedk',
        name: 'COMEDK UGET',
        subjects: [
          {
            name: 'Physics',
            chapters: ['Mechanics & Oscillations', 'Optics & Modern Physics', 'Electromagnetism'],
          },
          {
            name: 'Chemistry',
            chapters: ['Physical & Inorganic Chemistry', 'Organic Chemistry Reactions'],
          },
          {
            name: 'Mathematics',
            chapters: ['Calculus', 'Algebra', 'Trigonometry', 'Statistics'],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 2. ENGINEERING STUDENT — Semester / Viva / Internals
  // ────────────────────────────────────────────────────────
  {
    id: 'eng-student',
    name: 'Engineering Academic Exams',
    stage: 'Engineering Student',
    description: 'Semester Exams, University Exams, Practical/Viva, Internal Assessments.',
    disciplines: [
      {
        id: 'sem-cs',
        name: 'Computer Science & Engineering (Semester)',
        subjects: [
          {
            name: 'Data Structures',
            chapters: ['Arrays & Linked Lists', 'Stacks & Queues', 'Trees & Graphs', 'Hashing & Sorting'],
          },
          {
            name: 'Operating Systems',
            chapters: ['Process Management & Scheduling', 'Memory Management', 'File Systems', 'Deadlocks & Synchronization'],
          },
          {
            name: 'Database Management Systems',
            chapters: ['ER Diagrams & Relational Algebra', 'SQL & Normalization', 'Transactions & Concurrency Control', 'Indexing & B-Trees'],
          },
          {
            name: 'Computer Networks',
            chapters: ['OSI & TCP/IP Model', 'Routing & Switching', 'IP Addressing & Subnetting', 'HTTP, DNS & Transport Layer'],
          },
          {
            name: 'Object Oriented Programming (OOP)',
            chapters: ['Classes, Objects & Inheritance', 'Polymorphism & Encapsulation', 'Abstraction & Interfaces', 'Design Patterns Basics'],
          },
        ],
      },
      {
        id: 'viva-practicals',
        name: 'Practical / Viva Voce',
        subjects: [
          {
            name: 'Lab Programs & Viva',
            chapters: [
              'C / C++ Programming Lab',
              'Java / Python Programming Lab',
              'Data Structures Lab',
              'DBMS Lab (MySQL / Oracle)',
              'Web Technology Lab (HTML, CSS, JS)',
              'Computer Networks Lab',
              'Machine Learning Lab',
            ],
          },
        ],
      },
      {
        id: 'internal-assessments',
        name: 'Internal Assessment & Unit Tests',
        subjects: [
          {
            name: 'Engineering Mathematics',
            chapters: ['Linear Algebra & Calculus', 'Probability & Statistics', 'Numerical Methods', 'Discrete Mathematics'],
          },
          {
            name: 'Engineering Physics & Chemistry',
            chapters: ['Semiconductor Physics', 'Laser & Fiber Optics', 'Engineering Materials'],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 3. CAMPUS PLACEMENTS — Common to most tech roles
  // ────────────────────────────────────────────────────────
  {
    id: 'campus-placement',
    name: 'Campus Placement & Technical Interview',
    stage: 'Campus Placement',
    description: 'Campus Placement, Technical Interview, Coding Assessment.',
    disciplines: [
      {
        id: 'aptitude',
        name: 'Aptitude & Reasoning',
        subjects: [
          {
            name: 'Quantitative Aptitude',
            chapters: [
              'Number Systems & Divisibility',
              'Percentages, Profit & Loss',
              'Time, Speed & Distance',
              'Permutations, Combinations & Probability',
              'Data Interpretation (Tables, Graphs)',
            ],
          },
          {
            name: 'Logical & Verbal Reasoning',
            chapters: [
              'Seating Arrangements & Puzzles',
              'Blood Relations & Directions',
              'Syllogisms & Statements',
              'Reading Comprehension & Para-Jumbles',
            ],
          },
        ],
      },
      {
        id: 'coding-round',
        name: 'Coding Assessment',
        subjects: [
          {
            name: 'Data Structures & Algorithms (DSA)',
            chapters: [
              'Arrays, Strings & Hashing',
              'Linked Lists, Stacks & Queues',
              'Binary Trees & BST',
              'Graphs (BFS, DFS, Dijkstra)',
              'Dynamic Programming',
              'Greedy Algorithms & Recursion',
            ],
          },
        ],
      },
      {
        id: 'tech-interview',
        name: 'Technical Interview',
        subjects: [
          {
            name: 'Core CS Concepts',
            chapters: [
              'OOP Concepts & Design Patterns',
              'OS Concepts (Process, Threads, Memory)',
              'DBMS & SQL Queries',
              'Computer Networks & REST APIs',
            ],
          },
          {
            name: 'System Design (Beginner)',
            chapters: [
              'Load Balancers & CDN',
              'Databases (SQL vs NoSQL)',
              'Caching (Redis, Memcached)',
              'Microservices & API Gateway Basics',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 4. GATE (Multiple Disciplines)
  // ────────────────────────────────────────────────────────
  {
    id: 'gate-eng',
    name: 'GATE (Graduate Aptitude Test in Engineering)',
    stage: 'GATE Preparation',
    description: 'Postgraduate entrance & PSU recruitment across engineering disciplines.',
    disciplines: [
      {
        id: 'gate-cs',
        name: 'GATE — Computer Science & IT (CS)',
        subjects: [
          {
            name: 'Data Structures & Algorithms',
            chapters: [
              'Arrays, Stacks, Queues & Linked Lists',
              'Trees, BST, Heaps & Graphs',
              'Sorting, Searching & Hashing',
              'Dynamic Programming & Greedy',
              'Asymptotic Analysis (Big-O, Omega, Theta)',
            ],
          },
          {
            name: 'Operating Systems & Computer Networks',
            chapters: [
              'CPU Scheduling & Synchronization (Mutex, Semaphore)',
              'Memory Management & Virtual Memory (Paging, Segmentation)',
              'File Systems & I/O Management',
              'TCP/IP Stack, Routing (OSPF, BGP) & Subnetting',
              'Congestion Control & Socket Programming',
            ],
          },
          {
            name: 'DBMS & Software Engineering',
            chapters: [
              'ER Model, Relational Algebra & SQL',
              'Normalization (1NF–BCNF)',
              'Transaction Processing & ACID Properties',
              'Indexing, B/B+ Trees & File Organization',
            ],
          },
          {
            name: 'Theory of Computation & Compiler Design',
            chapters: [
              'DFA, NFA & Regular Expressions',
              'Context-Free Grammar & Pushdown Automata',
              'Turing Machines & Computability',
              'Lexical Analysis & Parsing (LL, LR)',
              'Intermediate Code & Code Optimization',
            ],
          },
          {
            name: 'General Aptitude',
            chapters: [
              'Verbal Ability & Sentence Correction',
              'Numerical Computation & Data Interpretation',
              'Logical Reasoning & Analytical Puzzles',
            ],
          },
        ],
      },
      {
        id: 'gate-da',
        name: 'GATE — Data Science & Artificial Intelligence (DA)',
        subjects: [
          {
            name: 'Linear Algebra & Calculus',
            chapters: [
              'Vector Spaces, Matrices & Eigenvalues',
              'SVD & Principal Component Analysis (PCA)',
              'Differential Calculus & Gradient Descent',
            ],
          },
          {
            name: 'Probability & Statistics',
            chapters: [
              'Probability Distributions (Gaussian, Binomial, Poisson)',
              'Conditional Probability & Bayes Theorem',
              'Hypothesis Testing & Confidence Intervals',
              'Regression & Correlation Analysis',
            ],
          },
          {
            name: 'Machine Learning & AI',
            chapters: [
              'Supervised Learning (Regression, SVM, Decision Trees)',
              'Unsupervised Learning (K-Means, Hierarchical Clustering)',
              'Neural Networks, Deep Learning & CNNs',
              'Search Algorithms, BFS/DFS & Heuristic Search',
              'Reinforcement Learning Basics',
            ],
          },
        ],
      },
      {
        id: 'gate-ece',
        name: 'GATE — Electronics & Communication (ECE)',
        subjects: [
          {
            name: 'Signals & Digital Circuits',
            chapters: [
              'Continuous & Discrete-Time Signals (Fourier, Laplace, Z-Transform)',
              'Combinational & Sequential Logic Circuits',
              'Microprocessors (8085/8086) & Memory Interfacing',
            ],
          },
          {
            name: 'Analog Electronics & Electromagnetics',
            chapters: [
              'Op-Amp Applications & Small Signal Amplifiers',
              "Maxwell's Equations & Transmission Lines",
              'Antennas & Electromagnetic Wave Propagation',
            ],
          },
        ],
      },
      {
        id: 'gate-ee',
        name: 'GATE — Electrical Engineering (EE)',
        subjects: [
          {
            name: 'Power Systems & Electrical Machines',
            chapters: [
              'Transformers, Induction & Synchronous Machines',
              'Power Generation, Transmission & Distribution',
              'Fault Analysis & System Protection',
            ],
          },
          {
            name: 'Control Systems & Power Electronics',
            chapters: [
              'Transfer Functions, Routh-Hurwitz & Nyquist Stability',
              'Thyristors, Inverters & DC-DC Converters',
            ],
          },
        ],
      },
      {
        id: 'gate-me',
        name: 'GATE — Mechanical Engineering (ME)',
        subjects: [
          {
            name: 'Applied Mechanics & Thermodynamics',
            chapters: [
              'Engineering Mechanics & Strength of Materials',
              'Laws of Thermodynamics & Cycles (Otto, Diesel, Rankine)',
              'Fluid Dynamics, Heat & Mass Transfer',
            ],
          },
          {
            name: 'Manufacturing & Industrial Engineering',
            chapters: [
              'Casting, Forming & Welding Processes',
              'Inventory Control, Operations Research & PERT/CPM',
            ],
          },
        ],
      },
      {
        id: 'gate-ce',
        name: 'GATE — Civil Engineering (CE)',
        subjects: [
          {
            name: 'Structural & Geotechnical Engineering',
            chapters: [
              'Trusses, Beams & Bending Moment Analysis',
              'Soil Mechanics, Permeability & Foundation Design',
            ],
          },
          {
            name: 'Water Resources & Environmental Engineering',
            chapters: [
              'Fluid Mechanics & Open Channel Flow',
              'Water Treatment, Sewage & Environmental Standards',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 5. CAT (Multiple Sections)
  // ────────────────────────────────────────────────────────
  {
    id: 'cat-mba',
    name: 'CAT (Common Admission Test for MBA)',
    stage: 'Post-Engineering / MBA',
    description: 'Premier management aptitude test for IIMs & top B-schools.',
    disciplines: [
      {
        id: 'cat-qa',
        name: 'Quantitative Aptitude (QA)',
        subjects: [
          {
            name: 'Arithmetic & Algebra',
            chapters: [
              'Percentages, Profit & Loss, Ratios & Averages',
              'Time, Speed, Distance & Work Problems',
              'Linear & Quadratic Equations, Logarithms',
            ],
          },
          {
            name: 'Geometry & Number Systems',
            chapters: [
              'Triangles, Circles, Polygons & Coordinate Geometry',
              'Surface Area & Volumes of 3D Solids',
              'Divisibility, LCM/HCF & Base Systems',
              'Permutations, Combinations & Probability',
            ],
          },
        ],
      },
      {
        id: 'cat-dilr',
        name: 'Data Interpretation & Logical Reasoning (DILR)',
        subjects: [
          {
            name: 'Data Interpretation (DI)',
            chapters: [
              'Data Tables, Line Graphs & Bar Charts',
              'Pie Charts, Caselets & Multi-Chart Analysis',
              'Venn Diagrams & Set Theory Problems',
            ],
          },
          {
            name: 'Logical Reasoning (LR)',
            chapters: [
              'Seating Arrangements & Linear Ordering',
              'Matrix Grids & Complex Puzzles',
              'Binary Logic & Truth-Teller Statements',
            ],
          },
        ],
      },
      {
        id: 'cat-varc',
        name: 'Verbal Ability & Reading Comprehension (VARC)',
        subjects: [
          {
            name: 'Reading Comprehension (RC)',
            chapters: [
              'Main Idea & Inference-Based Questions',
              'Author Tone, Purpose & Critical Reading',
              'Philosophy, Technology & Economics Passages',
            ],
          },
          {
            name: 'Verbal Ability (VA)',
            chapters: [
              'Para Jumbles (Sentence Rearrangement)',
              'Para Summary & Key Takeaways',
              'Odd Sentence Out & Contextual Vocabulary',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 6. TECH INDUSTRY — Core interviews & assessments
  // ────────────────────────────────────────────────────────
  {
    id: 'tech-roles',
    name: 'Tech Industry Role Interviews',
    stage: 'Industry Interview',
    description: 'Role-specific technical interviews, coding assessments, and system design rounds.',
    disciplines: [
      {
        id: 'swe-backend',
        name: 'Software / Backend Engineering',
        subjects: [
          {
            name: 'Backend Systems & Microservices',
            chapters: [
              'Java & Spring Boot (REST APIs, JPA)',
              'Node.js & Express — Async I/O & Event Loop',
              'Database Design & SQL Query Optimization',
              'System Design — Caching (Redis) & Message Queues (Kafka)',
            ],
          },
        ],
      },
      {
        id: 'web-frontend',
        name: 'Web / Frontend Development',
        subjects: [
          {
            name: 'Frontend & Web Technologies',
            chapters: [
              'HTML5, CSS3 & Responsive Design',
              'JavaScript — ES6+, DOM & Event Handling',
              'React.js — Hooks, State Management & Virtual DOM',
              'Next.js — SSR, SSG & App Router',
              'TypeScript & Frontend Testing',
            ],
          },
        ],
      },
      {
        id: 'android-dev',
        name: 'Android Development',
        subjects: [
          {
            name: 'Android & Mobile Engineering',
            chapters: [
              'Kotlin Basics & Coroutines',
              'Android Architecture (MVVM, Jetpack Compose)',
              'Room Database, Retrofit & Networking',
              'Firebase & Push Notifications',
            ],
          },
        ],
      },
      {
        id: 'ai-ml-engineer',
        name: 'AI / ML Engineering',
        subjects: [
          {
            name: 'AI & Machine Learning Systems',
            chapters: [
              'Model Training, Evaluation & Hyperparameter Tuning',
              'LLM Fine-Tuning & RAG Architecture',
              'Python Data Science (NumPy, Pandas, Matplotlib)',
              'MLOps & Model Deployment (FastAPI, Docker)',
            ],
          },
        ],
      },
      {
        id: 'cloud-devops',
        name: 'Cloud / DevOps Engineering',
        subjects: [
          {
            name: 'Cloud & Infrastructure',
            chapters: [
              'AWS / GCP / Azure Core Services',
              'Docker Containers & Kubernetes Orchestration',
              'CI/CD Pipelines (GitHub Actions, Jenkins)',
              'Infrastructure as Code (Terraform)',
            ],
          },
        ],
      },
      {
        id: 'data-analytics',
        name: 'Data Analytics',
        subjects: [
          {
            name: 'Analytics & Business Intelligence',
            chapters: [
              'SQL for Analytics & Window Functions',
              'Python (Pandas, NumPy) for Data Wrangling',
              'Data Visualization (Power BI, Tableau, Matplotlib)',
              'Statistical Analysis & A/B Testing',
            ],
          },
        ],
      },
      {
        id: 'cybersecurity',
        name: 'Cybersecurity Engineering',
        subjects: [
          {
            name: 'Security Fundamentals & Threats',
            chapters: [
              'Network Security & Firewalls',
              'OWASP Top 10 Web Vulnerabilities',
              'Encryption, PKI & TLS/SSL',
              'Ethical Hacking & Penetration Testing',
              'Security Information & Event Management (SIEM)',
            ],
          },
        ],
      },
      {
        id: 'fullstack',
        name: 'Full Stack Development',
        subjects: [
          {
            name: 'Full Stack — End-to-End Systems',
            chapters: [
              'Frontend: React / Next.js & TypeScript',
              'Backend: Node.js or Django REST Framework',
              'Database: PostgreSQL / MongoDB Schema Design',
              'Authentication: JWT, OAuth2 & Session Management',
              'Deployment: Vercel, Docker & Cloud Hosting',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 7. CLOUD CERTIFICATION
  // ────────────────────────────────────────────────────────
  {
    id: 'cloud-cert',
    name: 'Cloud Certification',
    stage: 'Cloud Certification',
    description: 'AWS, GCP, Azure certification preparation.',
    disciplines: [
      {
        id: 'aws-cert',
        name: 'AWS Solutions Architect / Cloud Practitioner',
        subjects: [
          {
            name: 'AWS Core Services',
            chapters: [
              'EC2, S3, RDS & VPC Fundamentals',
              'IAM Roles, Policies & Security Groups',
              'Lambda, API Gateway & Serverless Architecture',
              'CloudWatch, CloudTrail & Cost Optimization',
            ],
          },
        ],
      },
      {
        id: 'azure-cert',
        name: 'Microsoft Azure Fundamentals (AZ-900)',
        subjects: [
          {
            name: 'Azure Services',
            chapters: [
              'Azure Virtual Machines & App Services',
              'Azure Storage, SQL & Cosmos DB',
              'Azure Active Directory & Security',
              'Azure DevOps & Monitoring',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 8. SECURITY CERTIFICATION
  // ────────────────────────────────────────────────────────
  {
    id: 'security-cert',
    name: 'Security Certification',
    stage: 'Security Certification',
    description: 'CEH, CompTIA Security+, OSCP preparation.',
    disciplines: [
      {
        id: 'ceh',
        name: 'CEH / CompTIA Security+',
        subjects: [
          {
            name: 'Ethical Hacking & Security Fundamentals',
            chapters: [
              'Footprinting & Reconnaissance',
              'Network Scanning & Enumeration',
              'Exploitation Techniques & Post-Exploitation',
              'Social Engineering & Phishing',
              'Cryptography & Network Defense',
            ],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────
  // 9. DEVOPS CERTIFICATION
  // ────────────────────────────────────────────────────────
  {
    id: 'devops-cert',
    name: 'DevOps Certification',
    stage: 'DevOps Certification',
    description: 'Docker, Kubernetes, Jenkins, Terraform certification prep.',
    disciplines: [
      {
        id: 'k8s-cert',
        name: 'CKA / CKAD (Kubernetes Certification)',
        subjects: [
          {
            name: 'Kubernetes Concepts & Administration',
            chapters: [
              'Pods, Deployments & Services',
              'Persistent Volumes & ConfigMaps',
              'Networking, Ingress & Network Policies',
              'RBAC, Security Context & Cluster Administration',
            ],
          },
        ],
      },
    ],
  },
];

// Helper: Get filtered exam categories for a given target role
export function getExamCategoriesForRole(targetRole: string): ExamCategory[] {
  const allowedIds = ROLE_TO_CATEGORIES[targetRole];
  if (!allowedIds) return ALL_EXAM_CATEGORIES;
  return ALL_EXAM_CATEGORIES.filter(cat => allowedIds.includes(cat.id));
}

// Default export (used when no role is specified — show all)
export const EXAMS_HIERARCHY = ALL_EXAM_CATEGORIES;
