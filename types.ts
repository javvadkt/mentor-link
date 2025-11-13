
export enum UserRole {
  ADMIN = 'ADMIN',
  MENTOR = 'MENTOR',
  MENTEE = 'MENTEE',
}

export interface User {
  id: string;
  username: string;
  password?: string; // Should not be sent to client, but needed for mock DB
  role: UserRole;
  name: string;
}

export interface Mentee extends User {
  role: UserRole.MENTEE;
  mentorId: string;
  mentor?: Mentor;
  adno: string;
  class: string;
  photo: string;
  points: number;
  isCoordinator: boolean;
  personalDetails: {
    dob: string;
    bloodGroup: string;
    address?: string;
    parentContact?: string;
    hobbies?: string;
  };
  academicDetails: {
    gpa: number;
    major: string;
    strengths?: string;
    weaknesses?: string;
  };
  mentorshipDetails?: {
    shortTermGoals?: string;
    longTermGoals?: string;
    motivations?: string;
    challenges?: string;
    communicationStyle?: string;
    learningPreference?: string;
  };
}

export interface Mentor extends User {
  role: UserRole.MENTOR;
  mentees: string[]; // array of mentee ids
  photo?: string;
}

export interface Admin extends User {
  role: UserRole.ADMIN;
}

export type AppUser = Admin | Mentor | Mentee;

export interface InvitationCode {
  code: string;
  isActive: boolean;
}

export enum AssignmentStatus {
  PENDING = 'Pending',
  SUBMITTED = 'Submitted',
  COMPLETED = 'Completed',
}

export interface Assignment {
  id: string;
  mentorId: string;
  menteeIds: string[];
  title: string;
  instructions: string;
  dueDate: string;
}

export interface Submission {
  assignmentId: string;
  menteeId: string;
  fileUrl: string | null;
  submittedAt: string;
  status: AssignmentStatus;
}

export enum MeetingType {
  PERSONAL = 'Personal',
  GENERAL = 'General',
}

export interface Meeting {
  id: string;
  mentorId: string;
  menteeIds: string[];
  type: MeetingType;
  date: string;
  notes: string;
}

export interface ScheduledMeeting {
  id: string;
  mentorId: string;
  menteeIds: string[];
  type: MeetingType;
  date: string;
  time: string;
  agenda: string;
  status: 'Planned' | 'Completed' | 'Cancelled';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string; // Can be a user ID or 'group-[mentorId]'
  content: string;
  timestamp: string;
}

export interface Warning {
    mentorId: string;
    menteeId: string;
    menteeName: string;
    reason: string;
}

export interface ProgressRecord {
  id: string;
  mentorId: string;
  menteeId: string;
  meetingDate: string;
  keyTopicsDiscussed: string;
  menteeActionItems: string;
  mentorActionItems: string;
  milestonesWins: string;
  keyInsights: string;
}

export interface PointsLog {
  id: string;
  menteeId: string;
  points: number;
  reason: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  user_role: UserRole;
  user_name: string;
  content: string;
  created_at: string;
  is_actioned: boolean;
}