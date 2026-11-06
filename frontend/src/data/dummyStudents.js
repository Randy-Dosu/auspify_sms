/**
 * STEP 1 - Dummy data.
 *
 * The UI in this step is completely STATIC: it does not talk to the backend.
 * These hard-coded rows exist only so we can see what the layout looks like
 * with realistic content. In Step 4 this file is no longer imported and the
 * table is filled from GET /api/students instead.
 *
 * The field names match the `students` table we will create in Step 2 so no
 * renaming is needed later.
 */
export const dummyStudents = [
  {
    id: 1,
    student_id: 'AUS-2024-001',
    full_name: 'Ama Serwaa Mensah',
    age: 20,
    gender: 'Female',
    email: 'ama.mensah@example.com',
    phone: '+233 24 111 2233',
    course: 'Computer Science',
    year: 2,
    created_at: '2024-09-02 09:15:00',
  },
  {
    id: 2,
    student_id: 'AUS-2024-002',
    full_name: 'Kwame Osei Boateng',
    age: 22,
    gender: 'Male',
    email: 'kwame.boateng@example.com',
    phone: '+233 20 445 8890',
    course: 'Information Technology',
    year: 3,
    created_at: '2024-09-02 10:02:00',
  },
  {
    id: 3,
    student_id: 'AUS-2024-003',
    full_name: 'Akosua Adjei',
    age: 19,
    gender: 'Female',
    email: 'akosua.adjei@example.com',
    phone: '+233 27 332 7761',
    course: 'Business Administration',
    year: 1,
    created_at: '2024-09-03 08:40:00',
  },
  {
    id: 4,
    student_id: 'AUS-2023-014',
    full_name: 'Yaw Nkrumah Asare',
    age: 24,
    gender: 'Male',
    email: 'yaw.asare@example.com',
    phone: '+233 55 908 1145',
    course: 'Mathematics',
    year: 4,
    created_at: '2023-09-11 14:25:00',
  },
  {
    id: 5,
    student_id: 'AUS-2024-021',
    full_name: 'Efua Abena Owusu',
    age: 21,
    gender: 'Female',
    email: 'efua.owusu@example.com',
    phone: '+233 26 774 3320',
    course: 'Computer Science',
    year: 3,
    created_at: '2024-09-05 11:10:00',
  },
  {
    id: 6,
    student_id: 'AUS-2024-028',
    full_name: 'Kojo Mensah Dadzie',
    age: 20,
    gender: 'Male',
    email: 'kojo.dadzie@example.com',
    phone: '+233 54 220 6698',
    course: 'Economics',
    year: 2,
    created_at: '2024-09-06 16:05:00',
  },
]
