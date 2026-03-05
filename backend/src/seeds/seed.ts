// ============================================
// Database Seed Script
// ============================================
// Populates the database with realistic sample data for
// development and testing purposes. Creates:
//   - Departments (8)
//   - Users (Admin, HR, and Employee accounts)
//   - Employees (25+) with varied profiles
//   - Leave balances for all employees
//   - Attendance records for the current month
//   - Leave requests (mix of pending, approved, rejected)
//   - Performance reviews
//   - Holidays for the current year
//   - Announcements
//   - System settings
//
// Usage:
//   npx tsx src/seeds/seed.ts
//   npm run seed

import {
  PrismaClient,
  Role,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  LeaveType,
  LeaveStatus,
  AttendanceStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// Helper Functions
// ============================================

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomDecimal(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function padNumber(num: number, size: number = 4): string {
  return num.toString().padStart(size, '0');
}

// ============================================
// Seed Data Definitions
// ============================================

const DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG', description: 'Software development and engineering team' },
  { name: 'Human Resources', code: 'HR', description: 'People operations and HR management' },
  { name: 'Marketing', code: 'MKT', description: 'Marketing, branding, and communications' },
  { name: 'Sales', code: 'SALES', description: 'Sales and business development team' },
  { name: 'Finance', code: 'FIN', description: 'Financial planning, accounting, and budgeting' },
  { name: 'Design', code: 'DES', description: 'UI/UX design and creative team' },
  { name: 'Operations', code: 'OPS', description: 'Operations and logistics management' },
  { name: 'Quality Assurance', code: 'QA', description: 'Quality assurance and testing team' },
];

const EMPLOYEES_DATA = [
  // Admin user
  {
    firstName: 'Abhishek',
    lastName: 'Mishra',
    email: 'admin@hrms.com',
    password: 'admin123',
    role: 'ADMIN' as Role,
    designation: 'System Administrator',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543210',
    salary: 120000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
  },
  // HR user
  {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'hr@hrms.com',
    password: 'hr123456',
    role: 'HR' as Role,
    designation: 'HR Manager',
    gender: 'FEMALE' as Gender,
    departmentCode: 'HR',
    phone: '+919876543211',
    salary: 95000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
  },
  // Regular employees
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Senior Software Engineer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543212',
    salary: 85000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Frontend Developer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543213',
    salary: 72000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  {
    firstName: 'Amit',
    lastName: 'Patel',
    email: 'amit.patel@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Backend Developer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543214',
    salary: 78000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
  },
  {
    firstName: 'Neha',
    lastName: 'Gupta',
    email: 'neha.gupta@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'UI/UX Designer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'DES',
    phone: '+919876543215',
    salary: 70000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
  },
  {
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'vikram.singh@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Marketing Manager',
    gender: 'MALE' as Gender,
    departmentCode: 'MKT',
    phone: '+919876543216',
    salary: 88000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
  },
  {
    firstName: 'Ananya',
    lastName: 'Reddy',
    email: 'ananya.reddy@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Sales Executive',
    gender: 'FEMALE' as Gender,
    departmentCode: 'SALES',
    phone: '+919876543217',
    salary: 55000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
  },
  {
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'rahul.verma@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Financial Analyst',
    gender: 'MALE' as Gender,
    departmentCode: 'FIN',
    phone: '+919876543218',
    salary: 75000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
  },
  {
    firstName: 'Sanya',
    lastName: 'Mehta',
    email: 'sanya.mehta@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'QA Engineer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'QA',
    phone: '+919876543219',
    salary: 65000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
  },
  {
    firstName: 'Karan',
    lastName: 'Malhotra',
    email: 'karan.malhotra@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'DevOps Engineer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543220',
    salary: 82000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  {
    firstName: 'Divya',
    lastName: 'Nair',
    email: 'divya.nair@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'HR Executive',
    gender: 'FEMALE' as Gender,
    departmentCode: 'HR',
    phone: '+919876543221',
    salary: 52000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
  },
  {
    firstName: 'Arjun',
    lastName: 'Kapoor',
    email: 'arjun.kapoor@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Product Manager',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543222',
    salary: 105000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  {
    firstName: 'Meera',
    lastName: 'Joshi',
    email: 'meera.joshi@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Content Writer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'MKT',
    phone: '+919876543223',
    salary: 45000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
  },
  {
    firstName: 'Rohan',
    lastName: 'Desai',
    email: 'rohan.desai@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Business Analyst',
    gender: 'MALE' as Gender,
    departmentCode: 'OPS',
    phone: '+919876543224',
    salary: 68000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
  },
  {
    firstName: 'Pooja',
    lastName: 'Iyer',
    email: 'pooja.iyer@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Graphic Designer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'DES',
    phone: '+919876543225',
    salary: 58000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
  },
  {
    firstName: 'Suresh',
    lastName: 'Menon',
    email: 'suresh.menon@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Senior QA Lead',
    gender: 'MALE' as Gender,
    departmentCode: 'QA',
    phone: '+919876543226',
    salary: 78000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Trivandrum',
    state: 'Kerala',
    country: 'India',
  },
  {
    firstName: 'Ritu',
    lastName: 'Agarwal',
    email: 'ritu.agarwal@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Sales Manager',
    gender: 'FEMALE' as Gender,
    departmentCode: 'SALES',
    phone: '+919876543227',
    salary: 92000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Noida',
    state: 'Uttar Pradesh',
    country: 'India',
  },
  {
    firstName: 'Deepak',
    lastName: 'Chauhan',
    email: 'deepak.chauhan@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Full Stack Developer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543228',
    salary: 80000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
  },
  {
    firstName: 'Shreya',
    lastName: 'Banerjee',
    email: 'shreya.banerjee@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Finance Manager',
    gender: 'FEMALE' as Gender,
    departmentCode: 'FIN',
    phone: '+919876543229',
    salary: 98000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
  },
  // Part-time / Contract employees
  {
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Contract Developer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543230',
    salary: 60000,
    employmentType: 'Contract',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  {
    firstName: 'Lisa',
    lastName: 'Wang',
    email: 'lisa.wang@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Part-time Designer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'DES',
    phone: '+919876543231',
    salary: 35000,
    employmentType: 'Part-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
  },
  // Intern
  {
    firstName: 'Aditya',
    lastName: 'Tiwari',
    email: 'aditya.tiwari@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Engineering Intern',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543232',
    salary: 20000,
    employmentType: 'Intern',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  // Inactive employee
  {
    firstName: 'Mohan',
    lastName: 'Rao',
    email: 'mohan.rao@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Former Engineer',
    gender: 'MALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543233',
    salary: 70000,
    employmentType: 'Full-Time',
    maritalStatus: 'MARRIED' as MaritalStatus,
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    status: 'INACTIVE' as EmployeeStatus,
  },
  // Probation employee
  {
    firstName: 'Kavita',
    lastName: 'Saxena',
    email: 'kavita.saxena@hrms.com',
    password: 'employee123',
    role: 'EMPLOYEE' as Role,
    designation: 'Junior Developer',
    gender: 'FEMALE' as Gender,
    departmentCode: 'ENG',
    phone: '+919876543234',
    salary: 42000,
    employmentType: 'Full-Time',
    maritalStatus: 'SINGLE' as MaritalStatus,
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    status: 'PROBATION' as EmployeeStatus,
  },
];

const HOLIDAYS = [
  { name: 'New Year', date: '2025-01-01', description: "New Year's Day" },
  { name: 'Republic Day', date: '2025-01-26', description: 'Republic Day of India' },
  { name: 'Holi', date: '2025-03-14', description: 'Festival of Colors' },
  { name: 'Good Friday', date: '2025-04-18', description: 'Good Friday' },
  { name: 'May Day', date: '2025-05-01', description: "International Workers' Day" },
  { name: 'Independence Day', date: '2025-08-15', description: 'India Independence Day' },
  { name: 'Gandhi Jayanti', date: '2025-10-02', description: "Mahatma Gandhi's Birthday" },
  { name: 'Dussehra', date: '2025-10-02', description: 'Vijayadashami', isOptional: true },
  { name: 'Diwali', date: '2025-10-20', description: 'Festival of Lights' },
  { name: 'Christmas', date: '2025-12-25', description: 'Christmas Day' },
];

const ANNOUNCEMENTS = [
  {
    title: 'Welcome to the New HRMS Portal!',
    content:
      'We are excited to announce the launch of our new Human Resource Management System. This modern platform will streamline all your HR operations including leave management, attendance tracking, and employee records. Please take a moment to familiarize yourself with the new interface and let us know if you have any questions.',
    priority: 'high',
  },
  {
    title: 'Company Town Hall Meeting',
    content:
      'The quarterly company town hall meeting is scheduled for this Friday at 3:00 PM. All employees are encouraged to attend. We will be discussing Q3 results, upcoming projects, and team achievements. Light refreshments will be served.',
    priority: 'normal',
  },
  {
    title: 'Annual Performance Reviews',
    content:
      'Annual performance reviews will begin next month. Managers should schedule one-on-one meetings with their team members to discuss goals, achievements, and areas for improvement. Self-assessment forms have been shared via email.',
    priority: 'normal',
  },
  {
    title: 'New Health Insurance Benefits',
    content:
      'We have upgraded our health insurance plan. The new plan includes dental coverage, mental health support, and increased outpatient limits. Details have been shared with your registered email addresses. Please review and update your nominees if needed.',
    priority: 'high',
  },
  {
    title: 'Office Renovation Notice',
    content:
      'The 3rd floor will undergo renovation starting next Monday. Employees seated on the 3rd floor will be temporarily relocated to the 5th floor. Please ensure you collect all personal belongings before Friday evening.',
    priority: 'low',
  },
];

const SETTINGS = [
  // General settings
  {
    key: 'company.name',
    value: 'HRMSLite',
    group: 'general',
    description: 'Company name displayed across the application',
  },
  {
    key: 'company.email',
    value: 'info@hrms.com',
    group: 'general',
    description: 'Company contact email',
  },
  {
    key: 'company.phone',
    value: '+91-9876543210',
    group: 'general',
    description: 'Company contact phone',
  },
  {
    key: 'company.address',
    value: '123 Tech Park, Electronic City, Bangalore 560100',
    group: 'general',
    description: 'Company address',
  },
  {
    key: 'company.website',
    value: 'https://hrms.example.com',
    group: 'general',
    description: 'Company website URL',
  },
  { key: 'company.logo', value: '', group: 'general', description: 'URL to company logo' },

  // Leave settings
  {
    key: 'leave.casual.default',
    value: '12',
    group: 'leave',
    description: 'Default casual leave allocation per year',
  },
  {
    key: 'leave.sick.default',
    value: '10',
    group: 'leave',
    description: 'Default sick leave allocation per year',
  },
  {
    key: 'leave.earned.default',
    value: '15',
    group: 'leave',
    description: 'Default earned leave allocation per year',
  },
  {
    key: 'leave.carryForward.enabled',
    value: 'true',
    group: 'leave',
    description: 'Whether to carry forward unused leaves to next year',
  },
  {
    key: 'leave.carryForward.maxDays',
    value: '5',
    group: 'leave',
    description: 'Maximum number of carry-forward days',
  },
  {
    key: 'leave.approval.required',
    value: 'true',
    group: 'leave',
    description: 'Whether leave requests require approval',
  },

  // Attendance settings
  {
    key: 'attendance.clockIn.start',
    value: '08:00',
    group: 'attendance',
    description: 'Earliest allowed clock-in time',
  },
  {
    key: 'attendance.clockIn.lateThreshold',
    value: '09:30',
    group: 'attendance',
    description: 'Clock-in after this time is marked as LATE',
  },
  {
    key: 'attendance.workHours.standard',
    value: '8',
    group: 'attendance',
    description: 'Standard working hours per day',
  },
  {
    key: 'attendance.workDays',
    value: 'MON,TUE,WED,THU,FRI',
    group: 'attendance',
    description: 'Working days of the week',
  },
  {
    key: 'attendance.halfDay.threshold',
    value: '4',
    group: 'attendance',
    description: 'Minimum hours for half-day attendance',
  },

  // Email settings
  {
    key: 'email.enabled',
    value: 'false',
    group: 'email',
    description: 'Whether email notifications are enabled',
  },
  {
    key: 'email.leaveApproval',
    value: 'true',
    group: 'email',
    description: 'Send email on leave approval/rejection',
  },
  {
    key: 'email.welcomeNew',
    value: 'true',
    group: 'email',
    description: 'Send welcome email to new employees',
  },

  // UI settings
  {
    key: 'ui.theme.default',
    value: 'dark',
    group: 'ui',
    description: 'Default UI theme (light/dark)',
  },
  {
    key: 'ui.pagination.defaultSize',
    value: '10',
    group: 'ui',
    description: 'Default page size for list views',
  },
  {
    key: 'ui.dateFormat',
    value: 'DD/MM/YYYY',
    group: 'ui',
    description: 'Date display format across the application',
  },
  {
    key: 'ui.currency',
    value: 'INR',
    group: 'ui',
    description: 'Currency symbol for salary display',
  },
];

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.info('🌱 Starting database seed...\n');

  // ------------------------------------------
  // Step 1: Clean existing data (in correct order to respect FK constraints)
  // ------------------------------------------
  console.info('🗑️  Cleaning existing data...');

  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.document.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.info('   ✅ Database cleaned\n');

  // ------------------------------------------
  // Step 2: Create Departments
  // ------------------------------------------
  console.info('🏢 Creating departments...');

  const departmentMap: Record<string, string> = {};

  for (const dept of DEPARTMENTS) {
    const created = await prisma.department.create({
      data: {
        name: dept.name,
        code: dept.code,
        description: dept.description,
        isActive: true,
      },
    });
    departmentMap[dept.code] = created.id;
    console.info(`   ✅ ${dept.name} (${dept.code})`);
  }
  console.info('');

  // ------------------------------------------
  // Step 3: Create Users and Employees
  // ------------------------------------------
  console.info('👥 Creating users and employees...');

  const employeeIds: string[] = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < EMPLOYEES_DATA.length; i++) {
    const emp = EMPLOYEES_DATA[i];
    const hashedPwd = await hashPassword(emp.password);
    const employeeNumber = `EMP-${padNumber(i + 1)}`;
    const joiningDate = randomDate(
      new Date(currentYear - 3, 0, 1),
      new Date(currentYear, new Date().getMonth(), new Date().getDate()),
    );
    const dateOfBirth = randomDate(new Date(1980, 0, 1), new Date(2000, 11, 31));

    const status = (emp as any).status || 'ACTIVE';

    // Create user
    const user = await prisma.user.create({
      data: {
        email: emp.email.toLowerCase(),
        password: hashedPwd,
        role: emp.role,
        isActive: status !== 'INACTIVE' && status !== 'TERMINATED',
        lastLogin: status === 'ACTIVE' ? randomDate(new Date(currentYear, 0, 1), new Date()) : null,
      },
    });

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeId: employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email.toLowerCase(),
        phone: emp.phone,
        dateOfBirth,
        gender: emp.gender,
        maritalStatus: emp.maritalStatus,
        address: `${randomInt(1, 999)} ${randomElement(['MG Road', 'Park Street', 'Brigade Road', 'Jubilee Hills', 'Banjara Hills', 'Anna Nagar', 'Koramangala', 'Indiranagar'])}`,
        city: emp.city,
        state: emp.state,
        country: emp.country,
        zipCode: `${randomInt(100000, 999999)}`,
        designation: emp.designation,
        departmentId: departmentMap[emp.departmentCode],
        status: status as EmployeeStatus,
        joiningDate,
        salary: emp.salary,
        employmentType: emp.employmentType,
        userId: user.id,
        emergencyContactName: `${randomElement(['Parent', 'Spouse', 'Sibling'])} of ${emp.firstName}`,
        emergencyContactPhone: `+91${randomInt(7000000000, 9999999999)}`,
        emergencyContactRelation: randomElement(['Parent', 'Spouse', 'Sibling', 'Friend']),
        bankName: randomElement([
          'State Bank of India',
          'HDFC Bank',
          'ICICI Bank',
          'Axis Bank',
          'Punjab National Bank',
        ]),
        bankAccountNo: `${randomInt(1000000000, 9999999999)}${randomInt(10, 99)}`,
        bankIfscCode: `${randomElement(['SBIN', 'HDFC', 'ICIC', 'UTIB', 'PUNB'])}0${randomInt(100000, 999999)}`,
      },
    });

    employeeIds.push(employee.id);

    // Create leave balances for current year (for active employees)
    if (status === 'ACTIVE' || status === 'PROBATION' || status === 'ON_LEAVE') {
      const leaveTypes: { type: LeaveType; total: number }[] = [
        { type: 'CASUAL', total: 12 },
        { type: 'SICK', total: 10 },
        { type: 'EARNED', total: 15 },
        { type: 'MATERNITY', total: emp.gender === 'FEMALE' ? 180 : 0 },
        { type: 'PATERNITY', total: emp.gender === 'MALE' ? 15 : 0 },
      ];

      const usedCasual = randomInt(0, 6);
      const usedSick = randomInt(0, 4);
      const usedEarned = randomInt(0, 5);

      for (const lt of leaveTypes) {
        if (lt.total === 0) continue;

        let used = 0;
        if (lt.type === 'CASUAL') used = usedCasual;
        else if (lt.type === 'SICK') used = usedSick;
        else if (lt.type === 'EARNED') used = usedEarned;

        await prisma.leaveBalance.create({
          data: {
            employeeId: employee.id,
            leaveType: lt.type,
            totalLeaves: lt.total,
            usedLeaves: used,
            year: currentYear,
          },
        });
      }
    }

    console.info(
      `   ✅ ${emp.firstName} ${emp.lastName} (${employeeNumber}) — ${emp.role} — ${emp.designation}`,
    );
  }
  console.info('');

  // ------------------------------------------
  // Step 4: Create Attendance Records (current month)
  // ------------------------------------------
  console.info('⏰ Creating attendance records for the current month...');

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Only create attendance for active employees
  const activeEmployeeIds = employeeIds.filter((_id, index) => {
    const emp = EMPLOYEES_DATA[index];
    const status = (emp as any).status || 'ACTIVE';
    return status === 'ACTIVE' || status === 'PROBATION';
  });

  let attendanceCount = 0;

  for (const empId of activeEmployeeIds) {
    const currentDate = new Date(startOfMonth);

    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skip today (today's attendance is not yet recorded in seed)
      if (
        currentDate.getDate() === today.getDate() &&
        currentDate.getMonth() === today.getMonth()
      ) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Determine attendance status with realistic distribution
      let status: AttendanceStatus;
      const rand = Math.random();

      if (rand < 0.75) {
        status = 'PRESENT';
      } else if (rand < 0.85) {
        status = 'LATE';
      } else if (rand < 0.92) {
        status = 'ABSENT';
      } else if (rand < 0.96) {
        status = 'ON_LEAVE';
      } else {
        status = 'HALF_DAY';
      }

      // Generate clock in/out times based on status
      let clockIn: Date | null = null;
      let clockOut: Date | null = null;
      let totalHours: number | null = null;

      const dateOnly = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
      );

      if (status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY') {
        const clockInHour = status === 'LATE' ? randomInt(10, 11) : randomInt(8, 9);
        const clockInMinute = randomInt(0, 59);
        clockIn = new Date(dateOnly);
        clockIn.setHours(clockInHour, clockInMinute, 0, 0);

        const clockOutHour = status === 'HALF_DAY' ? randomInt(13, 14) : randomInt(17, 19);
        const clockOutMinute = randomInt(0, 59);
        clockOut = new Date(dateOnly);
        clockOut.setHours(clockOutHour, clockOutMinute, 0, 0);

        totalHours =
          Math.round(((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
      }

      try {
        await prisma.attendance.create({
          data: {
            employeeId: empId,
            date: dateOnly,
            clockIn,
            clockOut,
            totalHours,
            status,
            notes:
              status === 'ABSENT' ? 'Unplanned absence' : status === 'LATE' ? 'Late arrival' : null,
          },
        });
        attendanceCount++;
      } catch (error) {
        // Skip duplicates silently
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  console.info(`   ✅ Created ${attendanceCount} attendance records\n`);

  // ------------------------------------------
  // Step 5: Create Leave Requests
  // ------------------------------------------
  console.info('🏖️  Creating leave requests...');

  const leaveStatuses: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
  const leaveTypes: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];
  const leaveReasons = [
    'Family function to attend in my hometown.',
    'Not feeling well, need to rest and recover.',
    'Doctor appointment scheduled for routine checkup.',
    'Personal work that requires my presence.',
    'Planning a short vacation with family.',
    'Wedding ceremony in the family to attend.',
    'Home renovation work requires supervision.',
    "Parent-teacher meeting at child's school.",
    'Feeling unwell with fever and cold symptoms.',
    'Need to take care of a sick family member.',
    'Religious festival celebrations with family.',
    'Moving to a new house, need time for shifting.',
  ];

  let leaveCount = 0;

  for (let i = 0; i < activeEmployeeIds.length; i++) {
    const empId = activeEmployeeIds[i];
    const numLeaves = randomInt(1, 4);

    for (let j = 0; j < numLeaves; j++) {
      const leaveType = randomElement(leaveTypes);
      const status = randomElement(leaveStatuses);
      const startOffset = randomInt(1, 60);
      const duration = randomInt(1, 5);

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startOffset);
      const startDateOnly = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
      );

      const endDate = new Date(startDateOnly);
      endDate.setDate(endDate.getDate() + duration - 1);

      try {
        await prisma.leave.create({
          data: {
            employeeId: empId,
            leaveType,
            startDate: startDateOnly,
            endDate,
            totalDays: duration,
            reason: randomElement(leaveReasons),
            status,
            remarks:
              status === 'APPROVED'
                ? 'Approved. Enjoy your time off.'
                : status === 'REJECTED'
                  ? 'Cannot approve due to team resource constraints.'
                  : null,
            approvedBy: status !== 'PENDING' ? employeeIds[1] : null, // HR approves
            approvedOn: status !== 'PENDING' ? randomDate(startDateOnly, new Date()) : null,
          },
        });
        leaveCount++;
      } catch (error) {
        // Skip any constraint errors
      }
    }
  }

  console.info(`   ✅ Created ${leaveCount} leave requests\n`);

  // ------------------------------------------
  // Step 6: Create Performance Reviews
  // ------------------------------------------
  console.info('⭐ Creating performance reviews...');

  const reviewPeriods = [
    `Q1 ${currentYear}`,
    `Q2 ${currentYear}`,
    `H1 ${currentYear}`,
    `${currentYear - 1}`,
  ];
  const strengthsList = [
    'Excellent problem-solving skills. Consistently delivers high-quality code.',
    'Strong communication skills and team collaboration.',
    'Demonstrates leadership qualities. Mentors junior team members effectively.',
    'Very reliable and meets all deadlines consistently.',
    'Quick learner. Adapts well to new technologies and processes.',
    'Creative thinker. Brings innovative solutions to complex problems.',
    'Excellent attention to detail. Rarely makes mistakes.',
    'Strong technical expertise. Goes above and beyond requirements.',
  ];
  const improvementsList = [
    'Could improve documentation practices.',
    'Time management during meetings can be better.',
    'Should take more initiative in cross-team projects.',
    'Presentation skills could be improved.',
    'Should participate more in knowledge sharing sessions.',
    'Could be more proactive in identifying potential issues.',
    'Should work on delegating tasks more effectively.',
    'Communication with stakeholders could be more frequent.',
  ];

  let reviewCount = 0;

  for (const empId of activeEmployeeIds) {
    const numReviews = randomInt(1, 2);

    for (let j = 0; j < numReviews; j++) {
      const rating = randomDecimal(2.5, 5.0);
      const roundedRating = Math.round(rating * 10) / 10;

      try {
        await prisma.performanceReview.create({
          data: {
            employeeId: empId,
            reviewPeriod: reviewPeriods[j % reviewPeriods.length],
            rating: roundedRating,
            strengths: randomElement(strengthsList),
            areasToImprove: randomElement(improvementsList),
            goals: `Achieve ${randomInt(3, 5)} key objectives for the next quarter. Focus on ${randomElement(['performance optimization', 'team collaboration', 'skill development', 'project delivery', 'customer satisfaction'])}.`,
            comments: `Overall performance is ${roundedRating >= 4 ? 'excellent' : roundedRating >= 3 ? 'good' : 'needs improvement'}. ${roundedRating >= 4 ? 'Keep up the great work!' : 'Recommended for additional training and mentorship.'}`,
            reviewedBy: EMPLOYEES_DATA[0].firstName + ' ' + EMPLOYEES_DATA[0].lastName,
          },
        });
        reviewCount++;
      } catch (error) {
        // Skip errors
      }
    }
  }

  console.info(`   ✅ Created ${reviewCount} performance reviews\n`);

  // ------------------------------------------
  // Step 7: Create Holidays
  // ------------------------------------------
  console.info('📅 Creating holidays...');

  for (const holiday of HOLIDAYS) {
    try {
      await prisma.holiday.create({
        data: {
          name: holiday.name,
          date: new Date(holiday.date),
          description: holiday.description,
          isOptional: (holiday as any).isOptional || false,
          year: new Date(holiday.date).getFullYear(),
        },
      });
      console.info(`   ✅ ${holiday.name} (${holiday.date})`);
    } catch (error) {
      console.warn(`   ⚠️ Skipped duplicate holiday: ${holiday.name}`);
    }
  }
  console.info('');

  // ------------------------------------------
  // Step 8: Create Announcements
  // ------------------------------------------
  console.info('📢 Creating announcements...');

  for (const announcement of ANNOUNCEMENTS) {
    await prisma.announcement.create({
      data: {
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        isActive: true,
        publishedBy: `${EMPLOYEES_DATA[0].firstName} ${EMPLOYEES_DATA[0].lastName}`,
        expiresAt: new Date(currentYear, 11, 31), // End of year
      },
    });
    console.info(`   ✅ ${announcement.title}`);
  }
  console.info('');

  // ------------------------------------------
  // Step 9: Create System Settings
  // ------------------------------------------
  console.info('⚙️  Creating system settings...');

  for (const setting of SETTINGS) {
    await prisma.setting.create({
      data: {
        key: setting.key,
        value: setting.value,
        group: setting.group,
        description: setting.description,
      },
    });
  }

  console.info(`   ✅ Created ${SETTINGS.length} settings\n`);

  // ------------------------------------------
  // Step 10: Update department heads
  // ------------------------------------------
  console.info('🏗️  Assigning department heads...');

  // Engineering head = Abhishek Mishra (admin, index 0)
  await prisma.department.update({
    where: { code: 'ENG' },
    data: { headId: employeeIds[0] },
  });

  // HR head = Priya Sharma (HR, index 1)
  await prisma.department.update({
    where: { code: 'HR' },
    data: { headId: employeeIds[1] },
  });

  // Marketing head = Vikram Singh (index 6)
  await prisma.department.update({
    where: { code: 'MKT' },
    data: { headId: employeeIds[6] },
  });

  // Sales head = Ritu Agarwal (index 17)
  await prisma.department.update({
    where: { code: 'SALES' },
    data: { headId: employeeIds[17] },
  });

  console.info('   ✅ Department heads assigned\n');

  // ------------------------------------------
  // Step 11: Set up manager relationships
  // ------------------------------------------
  console.info('👔 Setting up manager relationships...');

  // Engineering employees report to Abhishek Mishra (index 0)
  const engineeringEmployeeIndices = [2, 3, 4, 10, 12, 18, 20, 22, 24];
  for (const idx of engineeringEmployeeIndices) {
    if (idx < employeeIds.length && idx !== 0) {
      await prisma.employee.update({
        where: { id: employeeIds[idx] },
        data: { managerId: employeeIds[0] },
      });
    }
  }

  // HR employees report to Priya Sharma (index 1)
  await prisma.employee.update({
    where: { id: employeeIds[11] },
    data: { managerId: employeeIds[1] },
  });

  // Marketing employees report to Vikram Singh (index 6)
  await prisma.employee.update({
    where: { id: employeeIds[13] },
    data: { managerId: employeeIds[6] },
  });

  // Sales employees report to Ritu Agarwal (index 17)
  await prisma.employee.update({
    where: { id: employeeIds[7] },
    data: { managerId: employeeIds[17] },
  });

  console.info('   ✅ Manager relationships established\n');

  // ------------------------------------------
  // Step 12: Create Audit Log Entries
  // ------------------------------------------
  console.info('📝 Creating initial audit log entries...');

  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SEED',
        entity: 'System',
        details: JSON.stringify({
          message: 'Database seeded with initial data',
          departments: DEPARTMENTS.length,
          employees: EMPLOYEES_DATA.length,
          holidays: HOLIDAYS.length,
          announcements: ANNOUNCEMENTS.length,
          settings: SETTINGS.length,
        }),
        userEmail: 'system@hrms.com',
      },
      {
        action: 'LOGIN',
        entity: 'User',
        entityId: employeeIds[0],
        details: JSON.stringify({ email: 'admin@hrms.com', role: 'ADMIN' }),
        userId: employeeIds[0],
        userEmail: 'admin@hrms.com',
      },
    ],
  });

  console.info('   ✅ Audit log entries created\n');

  // ============================================
  // Summary
  // ============================================
  console.info('============================================');
  console.info('🎉 Database seeding completed successfully!');
  console.info('============================================');
  console.info('');
  console.info('📊 Summary:');
  console.info(`   Departments     : ${DEPARTMENTS.length}`);
  console.info(`   Users/Employees : ${EMPLOYEES_DATA.length}`);
  console.info(`   Attendance      : ${attendanceCount} records`);
  console.info(`   Leave Requests  : ${leaveCount}`);
  console.info(`   Reviews         : ${reviewCount}`);
  console.info(`   Holidays        : ${HOLIDAYS.length}`);
  console.info(`   Announcements   : ${ANNOUNCEMENTS.length}`);
  console.info(`   Settings        : ${SETTINGS.length}`);
  console.info('');
  console.info('🔑 Login Credentials:');
  console.info('   ┌──────────┬────────────────────────┬──────────────┐');
  console.info('   │ Role     │ Email                  │ Password     │');
  console.info('   ├──────────┼────────────────────────┼──────────────┤');
  console.info('   │ Admin    │ admin@hrms.com         │ admin123     │');
  console.info('   │ HR       │ hr@hrms.com            │ hr123456     │');
  console.info('   │ Employee │ john.doe@hrms.com      │ employee123  │');
  console.info('   └──────────┴────────────────────────┴──────────────┘');
  console.info('');
}

// ============================================
// Execute Seed & Handle Errors
// ============================================

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('');
    console.error('❌ Seeding failed with error:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
