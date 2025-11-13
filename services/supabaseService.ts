


import { supabase } from './supabaseClient';
import { 
    UserRole, AppUser, Mentee, Mentor, Admin, InvitationCode, Assignment, 
    Meeting, AssignmentStatus, Submission, Message, ScheduledMeeting, 
    Warning, ProgressRecord, PointsLog, MeetingType, Feedback 
} from '../types';

// Helper to handle Supabase errors
const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    // Check for a generic network failure
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Could not connect to the server.');
    }
    throw new Error(error.message || `An error occurred in ${context}.`);
};

// Helper to shape user data from profiles and mentees_data tables
const shapeUserData = (profile: any): AppUser => {
    const baseUser = {
        id: profile.id,
        username: profile.username,
        role: profile.role,
        name: profile.name,
    };

    if (profile.role === UserRole.MENTEE) {
        if (profile.mentees_data && profile.mentees_data.length > 0) {
            const menteeData = profile.mentees_data[0];
            return {
                ...baseUser,
                role: UserRole.MENTEE,
                mentorId: menteeData.mentor_id,
                mentor: menteeData.mentor ? {
                    id: menteeData.mentor.id,
                    name: menteeData.mentor.name,
                    username: menteeData.mentor.username,
                    role: menteeData.mentor.role,
                    mentees: [] // Add empty array to satisfy Mentor type
                } : undefined,
                adno: menteeData.adno,
                class: menteeData.class,
                photo: menteeData.photo_url,
                points: menteeData.points,
                isCoordinator: menteeData.is_coordinator,
                personalDetails: menteeData.personal_details || {},
                academicDetails: menteeData.academic_details || {},
                mentorshipDetails: menteeData.mentorship_details || {},
            } as Mentee;
        } else {
            // This is a new mentee whose mentees_data hasn't been created yet.
            // Return a 'scaffolded' Mentee object with default values to satisfy the type.
            return {
                ...baseUser,
                role: UserRole.MENTEE,
                mentorId: '',
                adno: '',
                class: '',
                photo: 'https://picsum.photos/200',
                points: 0,
                isCoordinator: false,
                personalDetails: { dob: '', bloodGroup: '' },
                academicDetails: { gpa: 0, major: '' },
                mentorshipDetails: {},
            } as Mentee;
        }
    }
    
    if (profile.role === UserRole.MENTOR) {
        return {
            ...baseUser,
            role: UserRole.MENTOR,
            mentees: [], // This would require another query if needed immediately.
            photo: profile.photo_url,
        } as Mentor;
    }

    return baseUser as Admin;
};


export class SupabaseService {

    // --- Auth ---
    static async getCurrentUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            console.error("Could not fetch profile for logged-in user", error);
            await supabase.auth.signOut();
            return null;
        }

        if (profile.role === UserRole.MENTEE) {
            const { data: menteeData, error: menteeError } = await supabase
                .from('mentees_data')
                .select(`*, mentor:profiles!mentor_id(id, name, username, role)`)
                .eq('profile_id', profile.id)
                .single();
                
            if (menteeError) {
                // This is expected during the brief moment after mentee sign-up but before mentees_data is created.
                // We only log an error if it's NOT the "0 rows found" error.
                if (menteeError.code !== 'PGRST116') {
                    console.error("Could not fetch mentee data", menteeError);
                }
                profile.mentees_data = []; // Ensure it's an empty array for shapeUserData
            } else {
                profile.mentees_data = menteeData ? [menteeData] : [];
            }
        }
        
        return shapeUserData(profile);
    }

    static onAuthStateChange(callback: (user: AppUser | null) => void) {
        return supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                const user = await this.getCurrentUser();
                callback(user);
            } else {
                callback(null);
            }
        });
    }

    static async signIn(username: string, password?: string): Promise<{ user: AppUser }> {
        // Assuming email is derived from username for Supabase Auth
        const email = `${username}@mentorlink.local`;
        
        let authData;
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: password! });
            if (error) throw error;
            authData = data;
        } catch (error: any) {
             if (error.message.includes('Invalid login credentials')) {
                throw new Error("Invalid login credentials");
            }
            handleSupabaseError(error, 'signIn');
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', authData.user!.id)
            .single();
        
        if (profileError || !profile) {
            console.error("Profile not found for signed-in user:", profileError);
            throw new Error('Profile not found');
        };

        if (profile.role === UserRole.MENTEE) {
            const { data: menteeData, error: menteeError } = await supabase
                .from('mentees_data')
                .select(`*, mentor:profiles!mentor_id(id, name, username, role)`)
                .eq('profile_id', profile.id)
                .single();
            if (menteeError) {
                console.error("Could not fetch mentee data for sign-in", menteeError);
            } else {
                profile.mentees_data = menteeData ? [menteeData] : [];
            }
        }
        
        return { user: shapeUserData(profile) };
    }
    
    static async signOut() {
        const { error } = await supabase.auth.signOut();
        // Gracefully handle the "Auth session missing!" error.
        // This can occur if a user tries to log out when they are already effectively signed out.
        // In this case, the desired outcome is achieved, so we don't need to throw an error.
        if (error && error.message !== 'Auth session missing!') {
            handleSupabaseError(error, 'signOut');
        }
    }

    static async registerMentor(username: string, password?: string, name?: string, code?: string): Promise<{ user: Mentor }> {
        const { data: invCode, error: codeError } = await supabase
            .from('invitation_codes')
            .select('is_active')
            .eq('code', code)
            .single();

        if (codeError) {
            if (codeError.code === 'PGRST116') {
                // This specific code means "0 rows found", so the invitation code is invalid.
                throw new Error('Invalid invitation code. Please check the code and try again.');
            }
            // For any other DB error, rethrow a generic one.
            handleSupabaseError(codeError, 'registerMentor');
        }

        if (!invCode) {
             // This case is a fallback, as Supabase should throw a PGRST116 error handled above.
             throw new Error('Invalid invitation code. Please check the code and try again.');
        }

        if (!invCode.is_active) {
            throw new Error('This invitation code has been deactivated. Please contact an administrator.');
        }
        
        const email = `${username}@mentorlink.local`;
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: password!,
            options: {
                data: {
                    username: username,
                    role: UserRole.MENTOR,
                }
            }
        });

        if (signUpError) {
            if (signUpError.message.includes('User already registered')) {
                throw new Error('This username is already taken. Please choose another one.');
            }
            handleSupabaseError(signUpError, 'registerMentor');
        }
        
        // The trigger `on_auth_user_created` creates the profile row.
        // We need to update it with the full name.
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ name: name })
            .eq('id', authData.user!.id)
            .select()
            .single();
            
        if (updateError || !updatedProfile) {
            handleSupabaseError(updateError || new Error('Failed to update profile with name after registration.'), 'registerMentor');
        }

        return { user: shapeUserData(updatedProfile) as Mentor };
    }

    static async registerAdmin(username: string, password: string, name: string, secretCode: string): Promise<{ user: Admin }> {
        if (secretCode !== 'SUPER_ADMIN_SETUP_2024') {
            throw new Error('Invalid Admin Secret Code.');
        }

        const email = `${username}@mentorlink.local`;
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: password!,
            options: {
                data: {
                    username: username,
                    role: UserRole.ADMIN,
                }
            }
        });

        if (signUpError) {
            if (signUpError.message.includes('User already registered')) {
                throw new Error('This username is already taken. An admin account may already exist.');
            }
            handleSupabaseError(signUpError, 'registerAdmin');
        }

        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ name: name })
            .eq('id', authData.user!.id)
            .select()
            .single();
            
        if (updateError || !updatedProfile) {
            handleSupabaseError(updateError || new Error('Failed to update admin profile with name after registration.'), 'registerAdmin');
        }

        return { user: shapeUserData(updatedProfile) as Admin };
    }

    // --- Data Fetching ---
    static async getUserById(userId: string): Promise<AppUser | undefined> {
        const { data, error } = await supabase.from('profiles').select(`*, mentees_data!profile_id(*)`).eq('id', userId).single();
        if (error) return undefined;
        return shapeUserData(data);
    }

    static async getMenteesByMentorId(mentorId: string): Promise<Mentee[]> {
        const { data, error } = await supabase
            .from('mentees_data')
            .select('*, profiles!profile_id!inner(*)')
            .eq('mentor_id', mentorId);
        if (error) handleSupabaseError(error, 'getMenteesByMentorId');
        
        return data!.map(d => shapeUserData({ ...d.profiles, mentees_data: [d] }) as Mentee);
    }

    // --- Data Manipulation ---
    private static async uploadPhoto(file: File, userId: string, bucket: 'avatars' | 'mentor_avatars'): Promise<string> {
        const filePath = `public/${userId}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
        if (uploadError) handleSupabaseError(uploadError, 'uploadPhoto');

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return data.publicUrl;
    }

    static async addMentee(mentorId: string, menteeData: Omit<Mentee, 'id' | 'role' | 'mentorId' | 'points'> & { photoFile?: File }): Promise<Mentee> {
        // Step 0: Get the current mentor's session to restore it later.
        const { data: { session: mentorSession } } = await supabase.auth.getSession();
        if (!mentorSession) {
            throw new Error("Authentication error: You must be logged in to add a mentee.");
        }

        // Step 1: Create auth user for the new mentee. This will temporarily log in as the new mentee.
        const email = `${menteeData.username}@mentorlink.local`;
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password: menteeData.password!,
            options: {
                data: {
                    username: menteeData.username,
                    role: UserRole.MENTEE,
                }
            }
        });

        // Step 2: IMPORTANT - Restore the mentor's session immediately.
        const { error: sessionError } = await supabase.auth.setSession(mentorSession);
        if (sessionError) {
            console.error("CRITICAL: Failed to restore mentor session.", sessionError);
            // If session restoration fails, the mentor is effectively logged out. Force a logout to clear state.
            await supabase.auth.signOut(); 
            throw new Error("Your session could not be restored. Please log in again.");
        }

        // Now, handle the signUp result after we've restored the session.
        if (signUpError) {
             if (signUpError.message.includes('User already registered')) {
                throw new Error('This username is already taken. Please choose another one.');
            }
            handleSupabaseError(signUpError, 'addMentee (signUp)');
        }
        const newMenteeId = authData.user!.id;

        // Step 3: Update the newly created profile with the name
        const { data: profileData, error: profileError } = await supabase.from('profiles')
            .update({ name: menteeData.name })
            .eq('id', newMenteeId)
            .select()
            .single();

        if (profileError || !profileData) {
            handleSupabaseError(profileError || new Error('Failed to update profile after mentee creation'), 'addMentee (profile)');
        }
        
        // Step 4: Handle photo upload if exists
        let photoUrl = menteeData.photo || 'https://picsum.photos/200';
        if (menteeData.photoFile) {
            photoUrl = await this.uploadPhoto(menteeData.photoFile, newMenteeId, 'avatars');
        }

        // Step 5: Create the mentee_data entry
        const { data: newMenteeData, error: menteeError } = await supabase.from('mentees_data').insert({
            profile_id: newMenteeId,
            mentor_id: mentorId,
            adno: menteeData.adno,
            class: menteeData.class,
            photo_url: photoUrl,
            is_coordinator: menteeData.isCoordinator,
            personal_details: menteeData.personalDetails,
            academic_details: menteeData.academicDetails,
            mentorship_details: menteeData.mentorshipDetails
        }).select().single();

        if (menteeError) handleSupabaseError(menteeError, 'addMentee (mentee_data)');

        return shapeUserData({ ...profileData, mentees_data: [newMenteeData] }) as Mentee;
    }

    static async updateMentee(menteeId: string, updates: Partial<Mentee> & { photoFile?: File }): Promise<Mentee> {
        // Separate updates for profiles and mentees_data tables
        const profileUpdates: { name?: string; username?: string } = {};
        if (updates.name) profileUpdates.name = updates.name;
        if (updates.username) profileUpdates.username = updates.username;

        if (Object.keys(profileUpdates).length > 0) {
            const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', menteeId);
            if (error) handleSupabaseError(error, 'updateMentee (profile)');
        }
        
        let photoUrl = updates.photo;
        if (updates.photoFile) {
            photoUrl = await this.uploadPhoto(updates.photoFile, menteeId, 'avatars');
        }

        const menteeDataUpdates = {
            adno: updates.adno,
            class: updates.class,
            photo_url: photoUrl,
            is_coordinator: updates.isCoordinator,
            personal_details: updates.personalDetails,
            academic_details: updates.academicDetails,
            mentorship_details: updates.mentorshipDetails,
        };

        const { error: menteeError } = await supabase.from('mentees_data').update(menteeDataUpdates).eq('profile_id', menteeId);
        // FIX: Used the correct `menteeError` variable instead of the out-of-scope `error` variable.
        if (menteeError) handleSupabaseError(menteeError, 'updateMentee (mentee_data)');

        const updatedMentee = await this.getUserById(menteeId) as Mentee;
        return updatedMentee;
    }

    static async removeMentee(menteeId: string): Promise<{ success: boolean }> {
        // This relies on a Postgres function with cascade deletes enabled.
        const { error } = await supabase.rpc('delete_user', { user_id_to_delete: menteeId });
        if (error) handleSupabaseError(error, 'removeMentee');
        return { success: true };
    }

    static async removeMentor(mentorId: string): Promise<{ success: boolean }> {
        const { error } = await supabase.rpc('delete_user', { user_id_to_delete: mentorId });
        if (error) handleSupabaseError(error, 'removeMentor');
        return { success: true };
    }

    static async bulkAddMentees(menteesData: any[]): Promise<{ successes: number; failures: { data: any; error: string }[] }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("Authentication error: Admin user must be logged in.");
        }

        const allMentors = await this.getAllMentors();
        const mentorUsernameToIdMap = new Map(allMentors.map(m => [m.username, m.id]));

        let successes = 0;
        const failures: { data: any; error: string }[] = [];

        for (const mentee of menteesData) {
            try {
                // Basic validation
                if (!mentee.name || !mentee.username || !mentee.password || !mentee.adno || !mentee.class || !mentee.mentor_username) {
                    throw new Error("One or more required fields are missing in a row.");
                }

                const mentorId = mentorUsernameToIdMap.get(mentee.mentor_username);
                if (!mentorId) {
                    throw new Error(`Mentor with username '${mentee.mentor_username}' not found.`);
                }
                if (mentee.password.length < 6) {
                    throw new Error(`Password for user '${mentee.username}' is too short (minimum 6 characters).`);
                }

                // The addMentee function handles session switching, so it must be awaited sequentially.
                await this.addMentee(mentorId, {
                    name: mentee.name,
                    username: mentee.username,
                    password: mentee.password,
                    adno: mentee.adno,
                    class: mentee.class,
                    photo: 'https://picsum.photos/200',
                    isCoordinator: false,
                    personalDetails: { dob: '', bloodGroup: '' },
                    academicDetails: { gpa: 0, major: '' },
                });
                successes++;
            } catch (error: any) {
                failures.push({ data: mentee, error: error.message });
            }
        }
        
        // Restore the original admin session as a final safety measure.
        const { error: sessionError } = await supabase.auth.setSession(session);
        if (sessionError) {
             console.error("CRITICAL: Failed to restore admin session after bulk add.", sessionError);
             // Don't throw here as the operation is done, but log it.
        }
        
        return { successes, failures };
    }

    // --- Assignments & Submissions ---
    static async getAssignmentsByMentor(mentorId: string): Promise<Assignment[]> {
        const { data, error } = await supabase
            .from('assignments')
            .select(`*, assignment_mentees(mentee_id)`)
            .eq('mentor_id', mentorId);
        if (error) handleSupabaseError(error, 'getAssignmentsByMentor');
        return data!.map(a => ({ ...a, dueDate: a.due_date, mentorId: a.mentor_id, menteeIds: a.assignment_mentees.map((am: any) => am.mentee_id) }));
    }

    static async createAssignment(assignmentData: Omit<Assignment, 'id'>): Promise<Assignment> {
        const { menteeIds, dueDate, mentorId, ...rest } = assignmentData;
        const dbData = { ...rest, due_date: dueDate, mentor_id: mentorId };
        const { data, error } = await supabase.from('assignments').insert(dbData).select().single();
        if (error) handleSupabaseError(error, 'createAssignment');

        const menteeLinks = menteeIds.map(mentee_id => ({ assignment_id: data.id, mentee_id }));
        const { error: linkError } = await supabase.from('assignment_mentees').insert(menteeLinks);
        if (linkError) handleSupabaseError(linkError, 'createAssignment links');
        
        return { ...data, dueDate: data.due_date, mentorId: data.mentor_id, menteeIds };
    }

    static async deleteAssignment(assignmentId: string): Promise<{ success: boolean }> {
        // Assumes ON DELETE CASCADE is set for foreign keys in assignment_mentees and submissions.
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', assignmentId);

        if (error) handleSupabaseError(error, 'deleteAssignment');
        return { success: true };
    }
    
    static async getMenteeById(menteeId: string): Promise<Mentee | undefined> {
        const mentee = await this.getUserById(menteeId);
        return mentee as Mentee;
    }
    
    static async getAssignmentsByMentee(menteeId: string): Promise<Assignment[]> {
        const { data, error } = await supabase
            .from('assignment_mentees')
            .select('assignments!inner(*, assignment_mentees(mentee_id))')
            .eq('mentee_id', menteeId);

        if (error) handleSupabaseError(error, 'getAssignmentsByMentee');
        
        return data!.map((d: any) => ({
            ...d.assignments,
            dueDate: d.assignments.due_date,
            mentorId: d.assignments.mentor_id,
            menteeIds: d.assignments.assignment_mentees.map((am: any) => am.mentee_id),
        }));
    }

    static async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignmentId);
        if (error) handleSupabaseError(error, 'getSubmissionsByAssignment');
        return data!.map(s => ({
            assignmentId: s.assignment_id,
            menteeId: s.mentee_id,
            fileUrl: s.file_url,
            submittedAt: s.submitted_at,
            status: s.status,
        }));
    }

    static async getSubmission(assignmentId: string, menteeId: string): Promise<Submission | undefined> {
        const { data, error } = await supabase
            .from('submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .eq('mentee_id', menteeId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return undefined; // Not found
            handleSupabaseError(error, 'getSubmission');
        }
        if (!data) return undefined;
        return {
            assignmentId: data.assignment_id,
            menteeId: data.mentee_id,
            fileUrl: data.file_url,
            submittedAt: data.submitted_at,
            status: data.status,
        };
    }

    static async submitAssignment(assignmentId: string, menteeId: string, fileUrl: string): Promise<Submission> {
        const submissionData = {
            assignment_id: assignmentId,
            mentee_id: menteeId,
            file_url: fileUrl,
            submitted_at: new Date().toISOString(),
            status: AssignmentStatus.SUBMITTED,
        };

        const { data, error } = await supabase
            .from('submissions')
            .upsert(submissionData)
            .select()
            .single();
        if (error) handleSupabaseError(error, 'submitAssignment');

        return {
            assignmentId: data.assignment_id,
            menteeId: data.mentee_id,
            fileUrl: data.file_url,
            submittedAt: data.submitted_at,
            status: data.status,
        };
    }

    static async updateSubmissionStatus(assignmentId: string, menteeId: string, status: AssignmentStatus): Promise<Submission> {
         const { data, error } = await supabase
            .from('submissions')
            .upsert({ 
                assignment_id: assignmentId, 
                mentee_id: menteeId, 
                status: status,
                submitted_at: new Date().toISOString(), 
            }, { onConflict: 'assignment_id, mentee_id' })
            .select()
            .single();

        if (error) handleSupabaseError(error, 'updateSubmissionStatus');
        
        return {
            assignmentId: data.assignment_id,
            menteeId: data.mentee_id,
            fileUrl: data.file_url,
            submittedAt: data.submitted_at,
            status: data.status,
        };
    }

    static async getMeetings(userId: string, role: UserRole): Promise<Meeting[]> {
        let query;
        if (role === UserRole.MENTOR) {
            query = supabase
                .from('meetings')
                .select('*')
                .eq('mentor_id', userId);
        } else { // MENTEE
            query = supabase
                .from('meetings')
                .select('*')
                .contains('mentee_ids', [userId]);
        }
    
        const { data: meetings, error } = await query;
        if (error) handleSupabaseError(error, 'getMeetings');
        if (!meetings) return [];
        
        return meetings.map(m => ({
            id: m.id,
            mentorId: m.mentor_id,
            menteeIds: m.mentee_ids || [],
            type: m.type,
            date: m.date,
            notes: m.notes,
        }));
    }

    static async getMeetingsForMentee(menteeId: string): Promise<Meeting[]> {
        const { data, error } = await supabase
            .from('meetings')
            .select('*')
            .contains('mentee_ids', [menteeId])
            .order('date', { ascending: false });
        if (error) handleSupabaseError(error, 'getMeetingsForMentee');
        if (!data) return [];
        return data.map(m => ({
            id: m.id,
            mentorId: m.mentor_id,
            menteeIds: m.mentee_ids || [],
            type: m.type,
            date: m.date,
            notes: m.notes,
        }));
    }

    static async logMeeting(meetingData: Omit<Meeting, 'id'>): Promise<Meeting> {
        const { menteeIds, mentorId, ...rest } = meetingData;
        const dbData = {
            mentor_id: mentorId,
            mentee_ids: menteeIds,
            ...rest
        };
        const { data, error } = await supabase.from('meetings').insert(dbData).select().single();
        if (error) handleSupabaseError(error, 'logMeeting');
        
        return { 
            id: data.id,
            mentorId: data.mentor_id, 
            menteeIds: data.mentee_ids,
            type: data.type,
            date: data.date,
            notes: data.notes
        };
    }

    static async getScheduledMeetings(userId: string, role: UserRole): Promise<ScheduledMeeting[]> {
        let query;
        if (role === UserRole.MENTOR) {
            query = supabase
                .from('scheduled_meetings')
                .select('*')
                .eq('mentor_id', userId);
        } else { // MENTEE
            query = supabase
                .from('scheduled_meetings')
                .select('*')
                .contains('mentee_ids', [userId]);
        }
    
        const { data: meetings, error } = await query;
        if (error) handleSupabaseError(error, 'getScheduledMeetings');
        if (!meetings) return [];
    
        return meetings.map(m => ({
            id: m.id,
            mentorId: m.mentor_id,
            menteeIds: m.mentee_ids || [],
            type: m.type,
            date: m.date,
            time: m.time,
            agenda: m.agenda,
            status: m.status,
        }));
    }

    static async scheduleMeeting(meetingData: Omit<ScheduledMeeting, 'id' | 'status'>): Promise<ScheduledMeeting> {
        const { menteeIds, mentorId, ...rest } = meetingData;
        const insertData = { 
            ...rest, 
            status: 'Planned', 
            mentor_id: mentorId,
            mentee_ids: menteeIds,
        };
        const { data, error } = await supabase.from('scheduled_meetings').insert(insertData).select().single();
        if (error) handleSupabaseError(error, 'scheduleMeeting');
        
        return { 
            id: data.id,
            mentorId: data.mentor_id, 
            menteeIds: data.mentee_ids,
            type: data.type,
            date: data.date,
            time: data.time,
            agenda: data.agenda,
            status: data.status,
        };
    }

    static async updateScheduledMeetingStatus(meetingId: string, status: 'Completed' | 'Cancelled'): Promise<ScheduledMeeting> {
        const { data, error } = await supabase
            .from('scheduled_meetings')
            .update({ status })
            .eq('id', meetingId)
            .select()
            .single();
        if (error) handleSupabaseError(error, 'updateScheduledMeetingStatus');
        
        return { 
            id: data.id,
            mentorId: data.mentor_id,
            menteeIds: data.mentee_ids,
            type: data.type,
            date: data.date,
            time: data.time,
            agenda: data.agenda,
            status: data.status,
        } as ScheduledMeeting;
    }
    static async getAllMentors(): Promise<Mentor[]> { 
         const { data, error } = await supabase
            .from('profiles')
            .select('*, mentees_data!mentor_id(profile_id)')
            .eq('role', UserRole.MENTOR);
         if(error) handleSupabaseError(error, 'getAllMentors');
         return data!.map(p => ({
            id: p.id,
            username: p.username,
            role: p.role,
            name: p.name,
            mentees: p.mentees_data.map((m: any) => m.profile_id),
         }));
    }
    static async getAllMentees(): Promise<Mentee[]> { 
        const { data, error } = await supabase
            .from('mentees_data')
            .select('*, profiles!profile_id!inner(*), mentor:profiles!mentor_id(id, name, username, role)')
            .eq('profiles.role', UserRole.MENTEE);
        if (error) handleSupabaseError(error, 'getAllMentees');
        return data!.map(d => shapeUserData({ ...d.profiles, mentees_data: [d] }) as Mentee);
    }
    static async getInvitationCodes(): Promise<InvitationCode[]> { 
        const { data, error } = await supabase.from('invitation_codes').select('*');
        if(error) handleSupabaseError(error, 'getInvitationCodes');
        return data!.map(c => ({ code: c.code, isActive: c.is_active }));
     }
    static async addInvitationCode(code: string): Promise<InvitationCode> { 
        const { data, error } = await supabase.from('invitation_codes').insert({ code, is_active: true }).select().single();
        if(error) handleSupabaseError(error, 'addInvitationCode');
        return { code: data.code, isActive: data.is_active };
    }
    static async toggleInvitationCode(code: string): Promise<InvitationCode> { 
        // Get current status first
        const { data: current } = await supabase.from('invitation_codes').select('is_active').eq('code', code).single();
        const { data, error } = await supabase.from('invitation_codes').update({ is_active: !current?.is_active }).eq('code', code).select().single();
        if(error) handleSupabaseError(error, 'toggleInvitationCode');
        return { code: data.code, isActive: data.is_active };
    }

    static async runMonthlyCheck(): Promise<Warning[]> {
        const mentees = await this.getAllMentees();
        const warnings: Warning[] = [];
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        for(const mentee of mentees) {
            const { data: meetings, error } = await supabase
                .from('meetings')
                .select('id', { count: 'exact' })
                .contains('mentee_ids', [mentee.id])
                .gte('date', oneMonthAgo.toISOString());
            
            if (error) {
                console.error(error);
                continue;
            }
            
            if (!meetings || meetings.length < 1) { // Assuming 1 meeting is the minimum
                warnings.push({
                    menteeId: mentee.id,
                    menteeName: mentee.name,
                    mentorId: mentee.mentorId,
                    reason: 'Less than 1 meeting logged in the last month.'
                });
            }
        }
        return warnings;
    }

    static async runMentorMonthlyCheck(mentorId: string): Promise<Warning[]> {
        const mentees = await this.getMenteesByMentorId(mentorId);
        const warnings: Warning[] = [];
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        for (const mentee of mentees) {
            const { data: meetings, error } = await supabase
                .from('meetings')
                .select('id', { count: 'exact' })
                .contains('mentee_ids', [mentee.id])
                .gte('date', oneMonthAgo.toISOString());
            
            if (error) {
                console.error(error);
                continue;
            }

            if (!meetings || meetings.length < 1) {
                warnings.push({
                    menteeId: mentee.id,
                    menteeName: mentee.name,
                    mentorId: mentee.mentorId,
                    reason: 'Less than 1 meeting logged in the last month.'
                });
            }
        }
        return warnings;
    }

    static async getMessages(userId1: string, userId2: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
            .order('timestamp', { ascending: true });
        
        if (error) handleSupabaseError(error, 'getMessages');
        return data!.map(m => ({...m, senderId: m.sender_id, receiverId: m.receiver_id}));
    }

    static async sendMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
        const { data, error } = await supabase
            .from('messages')
            .insert({ sender_id: senderId, receiver_id: receiverId, content })
            .select()
            .single();

        if (error) handleSupabaseError(error, 'sendMessage');
        return {...data, senderId: data.sender_id, receiverId: data.receiver_id};
    }

    static async getProgressRecordsForMentee(menteeId: string): Promise<ProgressRecord[]> {
        const { data, error } = await supabase
            .from('progress_records')
            .select('*')
            .eq('mentee_id', menteeId)
            .order('meeting_date', { ascending: false });
        if (error) handleSupabaseError(error, 'getProgressRecordsForMentee');
        return data!.map(r => ({ ...r, mentorId: r.mentor_id, menteeId: r.mentee_id, meetingDate: r.meeting_date, keyTopicsDiscussed: r.key_topics_discussed, menteeActionItems: r.mentee_action_items, mentorActionItems: r.mentor_action_items, milestonesWins: r.milestones_wins, keyInsights: r.key_insights }));
    }

    static async addProgressRecord(recordData: Omit<ProgressRecord, 'id'>): Promise<ProgressRecord> {
        const dbData = {
            mentor_id: recordData.mentorId,
            mentee_id: recordData.menteeId,
            meeting_date: recordData.meetingDate,
            key_topics_discussed: recordData.keyTopicsDiscussed,
            mentee_action_items: recordData.menteeActionItems,
            mentor_action_items: recordData.mentorActionItems,
            milestones_wins: recordData.milestonesWins,
            key_insights: recordData.keyInsights,
        };
        const { data, error } = await supabase.from('progress_records').insert(dbData).select().single();
        if (error) handleSupabaseError(error, 'addProgressRecord');
        return { ...data, mentorId: data.mentor_id, menteeId: data.mentee_id, meetingDate: data.meeting_date, keyTopicsDiscussed: data.key_topics_discussed, menteeActionItems: data.mentee_action_items, mentorActionItems: data.mentor_action_items, milestonesWins: data.milestones_wins, keyInsights: data.key_insights };
    }

    static async updateProgressRecord(recordId: string, updates: Partial<ProgressRecord>): Promise<ProgressRecord> {
        const dbUpdates: any = {};
        if (updates.meetingDate) dbUpdates.meeting_date = updates.meetingDate;
        if (updates.keyTopicsDiscussed) dbUpdates.key_topics_discussed = updates.keyTopicsDiscussed;
        if (updates.menteeActionItems) dbUpdates.mentee_action_items = updates.menteeActionItems;
        if (updates.mentorActionItems) dbUpdates.mentor_action_items = updates.mentorActionItems;
        if (updates.milestonesWins) dbUpdates.milestones_wins = updates.milestonesWins;
        if (updates.keyInsights) dbUpdates.key_insights = updates.keyInsights;
        
        const { data, error } = await supabase.from('progress_records').update(dbUpdates).eq('id', recordId).select().single();
        if (error) handleSupabaseError(error, 'updateProgressRecord');
        return { ...data, mentorId: data.mentor_id, menteeId: data.mentee_id, meetingDate: data.meeting_date, keyTopicsDiscussed: data.key_topics_discussed, menteeActionItems: data.mentee_action_items, mentorActionItems: data.mentor_action_items, milestonesWins: data.milestones_wins, keyInsights: data.key_insights };
    }

    static async deleteProgressRecord(recordId: string): Promise<{ success: boolean }> {
        const { error } = await supabase.from('progress_records').delete().eq('id', recordId);
        if (error) handleSupabaseError(error, 'deleteProgressRecord');
        return { success: true };
    }

    static async getPointsLogForMentee(menteeId: string): Promise<PointsLog[]> {
        const { data, error } = await supabase
            .from('points_log')
            .select('*')
            .eq('mentee_id', menteeId)
            .order('timestamp', { ascending: false });
        if (error) handleSupabaseError(error, 'getPointsLogForMentee');
        return data!.map(l => ({ ...l, menteeId: l.mentee_id }));
    }

    static async addPoints(menteeId: string, points: number, reason: string): Promise<{ success: boolean }> {
        // This is not atomic. An RPC function in postgres would be better.
        const { error: logError } = await supabase.from('points_log').insert({ mentee_id: menteeId, points, reason });
        if (logError) handleSupabaseError(logError, 'addPoints (log)');

        const { data: menteeData, error: fetchError } = await supabase.from('mentees_data').select('points').eq('profile_id', menteeId).single();
        if (fetchError) handleSupabaseError(fetchError, 'addPoints (fetch)');

        const newTotal = (menteeData?.points || 0) + points;

        const { error: updateError } = await supabase.from('mentees_data').update({ points: newTotal }).eq('profile_id', menteeId);
        if (updateError) handleSupabaseError(updateError, 'addPoints (update)');
        
        return { success: true };
    }

    static async updateMentorProfile(mentorId: string, updates: { name?: string; username?: string, photoFile?: File }): Promise<Mentor> { 
        const profileUpdates: { name?: string; username?: string; photo_url?: string } = {};
        if (updates.name) profileUpdates.name = updates.name;
        if (updates.username) profileUpdates.username = updates.username;

        if (updates.photoFile) {
            const photoUrl = await this.uploadPhoto(updates.photoFile, mentorId, 'mentor_avatars');
            profileUpdates.photo_url = photoUrl;
        }

        const { data, error } = await supabase.from('profiles').update(profileUpdates).eq('id', mentorId).select().single();
        if (error) handleSupabaseError(error, 'updateMentorProfile');
        return data as Mentor;
    }

    static async updateMentorPassword(mentorId: string, currentPassword?: string, newPassword?: string): Promise<{ success: boolean }> { 
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if(error) handleSupabaseError(error, 'updateMentorPassword');
        return { success: true };
    }
    static async updateAdminProfile(adminId: string, updates: { name?: string; username?: string }): Promise<Admin> { 
        const { data, error } = await supabase.from('profiles').update(updates).eq('id', adminId).select().single();
        if (error) handleSupabaseError(error, 'updateAdminProfile');
        return data as Admin;
    }
    static async updateAdminPassword(adminId: string, currentPassword?: string, newPassword?: string): Promise<{ success: boolean }> { 
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if(error) handleSupabaseError(error, 'updateAdminPassword');
        return { success: true };
    }

    static async updateUserPasswordByAdmin(userId: string, newPassword: string): Promise<{ success: boolean }> {
        // This requires a privileged RPC function 'admin_reset_user_password' to be created in the Supabase backend.
        const { error } = await supabase.rpc('admin_reset_user_password', {
            target_user_id: userId,
            new_password: newPassword
        });

        if (error) {
            // The original logic here was too broad and could mask the true nature of a password-related
            // error (e.g., strength vs. length). Propagating the raw error is more accurate.
            handleSupabaseError(error, 'updateUserPasswordByAdmin');
        }

        return { success: true };
    }

    static async getAllMeetingsForStats(): Promise<{ mentee_ids: string[] }[]> {
        const { data, error } = await supabase
            .from('meetings')
            .select('mentee_ids');
        if (error) handleSupabaseError(error, 'getAllMeetingsForStats');
        return data || [];
    }

    // --- Feedback ---
    static async submitFeedback(userId: string, userRole: UserRole, userName: string, content: string): Promise<{ success: boolean }> {
        const { error } = await supabase.from('feedback').insert({
            user_id: userId,
            user_role: userRole,
            user_name: userName,
            content: content
        });
        if (error) handleSupabaseError(error, 'submitFeedback');
        return { success: true };
    }

    static async getFeedback(): Promise<Feedback[]> {
        const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) handleSupabaseError(error, 'getFeedback');
        return data || [];
    }

    static async setFeedbackActioned(feedbackId: string, isActioned: boolean): Promise<Feedback> {
        const { data, error } = await supabase
            .from('feedback')
            .update({ is_actioned: isActioned })
            .eq('id', feedbackId)
            .select()
            .single();
        if (error) handleSupabaseError(error, 'setFeedbackActioned');
        return data;
    }
}