import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { 
  Subject, Chapter, Subchapter, Question, 
  QuizAttempt, UserPermissions, StudyGuide, 
  UserAchievement, Language 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;
  currentUser = signal<User | null>(null);

  constructor() {
    // Try to get from global variables injected by server.ts, or use hardcoded fallbacks
    let url = (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL) ? SUPABASE_URL : 'https://hgcxsbdtvkrpdjyjgwuv.supabase.co';
    const key = (typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY) ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnY3hzYmR0dmtycGRqeWpnd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MDU0ODcsImV4cCI6MjA3NjM4MTQ4N30.Wz6ho5eVeWSb8iYa0BunzghAwTGcfHVFn_rSU77yQsE';
    
    if (url && !url.startsWith('http')) {
      url = 'https://' + url;
    }

    if (!url || !key) {
      console.error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment variables.');
      // Initialize with placeholders to prevent SDK from throwing "supabaseUrl is required"
      this.supabase = createClient('https://placeholder.supabase.co', 'placeholder');
    } else {
      this.supabase = createClient(url, key);
    }
    
    // Auth state listener
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Handle signed out state or user updates
      }
      
      // If we get a session refresh failure, we should clear the session
      // Note: 'INITIAL_SESSION' is triggered when the client is initialized
      this.currentUser.set(session?.user || null);
    });

    // Explicitly check for session on init to handle unrecoverable refresh token errors
    this.supabase.auth.getSession().then(({ data, error }) => {
      if (error && (
        error.message.includes('refresh_token_not_found') ||
        error.message.toLowerCase().includes('refresh token') ||
        error.message.toLowerCase().includes('refresh_token') ||
        error.message.toLowerCase().includes('invalid_grant') ||
        error.message.toLowerCase().includes('token not found')
      )) {
        console.warn('Session refresh failed: Refresh token not found/invalid. Clearing session.', error.message);
        this.supabase.auth.signOut().catch(() => {});
        this.currentUser.set(null);
      } else if (data.session) {
        this.currentUser.set(data.session.user);
      }
    });
  }

  // --- Helper Methods for Mapping ---
  private mapSubject(data: any): Subject {
    if (!data) return data;
    return {
      ...data,
      isPublished: data.is_published ?? data.isPublished
    };
  }

  private mapSubjectToDb(data: Partial<Subject>): any {
    const { isPublished, ...rest } = data as any;
    const result = { ...rest };
    if (isPublished !== undefined) {
      result.is_published = isPublished;
    }
    return result;
  }

  private mapSubchapter(data: any): Subchapter {
    if (!data) return data;
    return {
      ...data,
      isPublished: data.is_published ?? data.isPublished
    };
  }

  private mapSubchapterToDb(data: Partial<Subchapter>): any {
    const { isPublished, ...rest } = data as any;
    const result = { ...rest };
    if (isPublished !== undefined) {
      result.is_published = isPublished;
    }
    return result;
  }

  private mapQuestion(data: any): Question {
    if (!data) return data;
    return {
      ...data,
      isPublished: data.is_published ?? data.isPublished,
      correctAnswerIndex: data.correct_answer_index ?? data.correctAnswerIndex
    };
  }

  private mapQuestionToDb(data: Partial<Question>): any {
    const { isPublished, correctAnswerIndex, ...rest } = data as any;
    const result = { ...rest };
    if (isPublished !== undefined) {
      result.is_published = isPublished;
    }
    if (correctAnswerIndex !== undefined) {
      result.correct_answer_index = correctAnswerIndex;
    }
    return result;
  }

  private mapStudyGuide(data: any): StudyGuide {
    if (!data) return data;
    return {
      ...data,
      isPublished: data.is_published ?? data.isPublished,
      page_images: data.page_images
    };
  }

  private mapStudyGuideToDb(data: Partial<StudyGuide>): any {
    const { isPublished, page_images, ...rest } = data as any;
    const result = { ...rest };
    if (isPublished !== undefined) {
      result.is_published = isPublished;
    }
    if (page_images !== undefined) {
      result.page_images = page_images;
    }
    return result;
  }

  // --- Auth Methods ---
  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    
    if (data.user) {
      await this.upsertUserPermissions({
        user_id: data.user.id,
        allowed_languages: [],
        allowed_grades: [],
        subject_access: null,
        is_premium: false
      });
    }

    return data.user;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getAccessToken(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      if (
        error.message.includes('refresh_token_not_found') ||
        error.message.toLowerCase().includes('refresh token') ||
        error.message.toLowerCase().includes('invalid_grant')
      ) {
        console.warn('Session refresh failed (invalid token). Clearing session.');
        await this.supabase.auth.signOut().catch(() => {});
        this.currentUser.set(null);
      }
      return null;
    }
    return data.session?.access_token || null;
  }

  async getProfile(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async isAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;
      const profile = await this.getProfile(user.id);
      return !!profile?.is_admin;
    } catch (e) {
      console.error('Failed to check admin status:', e);
      return false;
    }
  }

  // --- User Permissions ---
  async getUserPermissions(userId: string): Promise<UserPermissions | null> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async upsertUserPermissions(permissions: UserPermissions): Promise<UserPermissions> {
    const payload: any = { ...permissions };
    let result = await this.supabase
      .from('user_permissions')
      .upsert(payload)
      .select()
      .single();

    if (result.error && JSON.stringify(result.error).includes('is_premium')) {
      console.warn('Omit is_premium from user_permissions upsert due to schema cache restrictions.');
      delete payload.is_premium;
      result = await this.supabase
        .from('user_permissions')
        .upsert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return result.data;
  }

  // --- Subjects ---
  async getSubjects(grade: number, language: Language, branch?: 'scientific' | 'literary'): Promise<Subject[]> {
    let query = this.supabase
      .from('subjects')
      .select('*')
      .eq('grade', grade)
      .eq('language', language);
    
    if (branch) {
      query = query.eq('branch', branch);
    } else {
      query = query.is('branch', null);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(s => this.mapSubject(s));
  }

  async getAllSubjects(): Promise<Subject[]> {
    const { data, error } = await this.supabase
      .from('subjects')
      .select('*');
    if (error) throw error;
    return (data || []).map(s => this.mapSubject(s));
  }

  async addSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
    const { data, error } = await this.supabase
      .from('subjects')
      .insert(this.mapSubjectToDb(subject))
      .select()
      .single();
    if (error) throw error;
    return this.mapSubject(data);
  }

  async updateSubject(id: string, subject: Partial<Subject>): Promise<Subject | null> {
    const { data, error } = await this.supabase
      .from('subjects')
      .update(this.mapSubjectToDb(subject))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapSubject(data) : null;
  }

  async deleteSubject(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // --- Chapters ---
  async getChapters(subjectId: string, language: Language): Promise<Chapter[]> {
    const { data, error } = await this.supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('language', language);
    if (error) throw error;
    return data || [];
  }

  async getAllChapters(): Promise<Chapter[]> {
    const { data, error } = await this.supabase
      .from('chapters')
      .select('*');
    if (error) throw error;
    return data || [];
  }

  async getChaptersForSubject(subjectId: string): Promise<Chapter[]> {
    const { data, error } = await this.supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', subjectId);
    if (error) throw error;
    return data || [];
  }

  async getChaptersByIds(ids: string[]): Promise<Chapter[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from('chapters')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return data || [];
  }

  async addChapter(chapter: Omit<Chapter, 'id'>): Promise<Chapter> {
    const { data, error } = await this.supabase
      .from('chapters')
      .insert(chapter)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateChapter(id: string, chapter: Partial<Chapter>): Promise<Chapter | null> {
    const { data, error } = await this.supabase
      .from('chapters')
      .update(chapter)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async deleteChapter(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('chapters')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // --- Subchapters ---
  async getSubchapters(chapterId: string, language: Language, publishedOnly: boolean = false): Promise<Subchapter[]> {
    let query = this.supabase
      .from('subchapters')
      .select('*')
      .eq('chapter_id', chapterId)
      .eq('language', language);
    
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapSubchapter);
  }

  async getAllSubchapters(publishedOnly: boolean = false): Promise<Subchapter[]> {
    let query = this.supabase.from('subchapters').select('*');
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapSubchapter);
  }

  async getSubchaptersForChapter(chapterId: string): Promise<Subchapter[]> {
    const { data, error } = await this.supabase
      .from('subchapters')
      .select('*')
      .eq('chapter_id', chapterId);
    if (error) throw error;
    return (data || []).map(this.mapSubchapter);
  }

  async getSubchaptersByIds(ids: string[]): Promise<Subchapter[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from('subchapters')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return (data || []).map(this.mapSubchapter);
  }

  async addSubchapter(subchapter: Omit<Subchapter, 'id'>): Promise<Subchapter> {
    const { data, error } = await this.supabase
      .from('subchapters')
      .insert(this.mapSubchapterToDb(subchapter))
      .select()
      .single();
    if (error) throw error;
    return this.mapSubchapter(data);
  }

  async addManySubchapters(subchapters: Omit<Subchapter, 'id'>[]): Promise<Subchapter[]> {
    const { data, error } = await this.supabase
      .from('subchapters')
      .insert(subchapters.map(sc => this.mapSubchapterToDb(sc)))
      .select();
    if (error) throw error;
    return (data || []).map(this.mapSubchapter);
  }

  async updateSubchapter(id: string, subchapter: Partial<Subchapter>): Promise<Subchapter | null> {
    const { data, error } = await this.supabase
      .from('subchapters')
      .update(this.mapSubchapterToDb(subchapter))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapSubchapter(data) : null;
  }

  async deleteSubchapter(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('subchapters')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // --- Questions ---
  async getQuestionsForSubject(subjectId: string): Promise<Question[]> {
    const limit = 1000;
    let from = 0;
    let hasMore = true;
    let allData: any[] = [];

    while (hasMore) {
      const { data, error } = await this.supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .range(from, from + limit - 1);

      if (error) throw error;
      
      const currentBatch = data || [];
      allData = allData.concat(currentBatch);

      if (currentBatch.length < limit) {
        hasMore = false;
      } else {
        from += limit;
      }
    }

    return allData.map(q => this.mapQuestion(q));
  }

  async getQuestions(subchapterId: string): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('subchapter_id', subchapterId);
    if (error) throw error;
    return (data || []).map(this.mapQuestion);
  }

  async getAllQuestions(publishedOnly: boolean = false): Promise<Question[]> {
    let query = this.supabase.from('questions').select('*');
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapQuestion);
  }

  async getQuestionsForSubchapter(subchapterId: string): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('subchapter_id', subchapterId);
    if (error) throw error;
    return (data || []).map(this.mapQuestion);
  }

  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    return (data || []).map(this.mapQuestion);
  }

  async addQuestion(question: Omit<Question, 'id'>): Promise<Question> {
    const { data, error } = await this.supabase
      .from('questions')
      .insert(this.mapQuestionToDb(question))
      .select()
      .single();
    if (error) throw error;
    return this.mapQuestion(data);
  }

  async addManyQuestions(questions: Omit<Question, 'id'>[]): Promise<Question[]> {
    const { data, error } = await this.supabase
      .from('questions')
      .insert(questions.map(q => this.mapQuestionToDb(q)))
      .select();
    if (error) throw error;
    return (data || []).map(this.mapQuestion);
  }

  async updateQuestion(id: string, question: Partial<Question>): Promise<Question | null> {
    const { data, error } = await this.supabase
      .from('questions')
      .update(this.mapQuestionToDb(question))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapQuestion(data) : null;
  }

  async deleteQuestion(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('questions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async updateManyQuestions(questions: Partial<Question>[]): Promise<void> {
    if (questions.length === 0) return;
    const { error } = await this.supabase
      .from('questions')
      .upsert(questions.map(q => this.mapQuestionToDb(q)));
    if (error) throw error;
  }

  // --- Quiz Attempts ---
  async addQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<QuizAttempt> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .insert(attempt)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getQuizAttemptsForUser(userId: string): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getQuizAttemptsByDateRange(startDate: string, endDate: string, limitCount: number = 1000): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return data || [];
  }

  // --- Study Guides ---
  async getStudyGuideById(id: string): Promise<StudyGuide> {
    const { data, error } = await this.supabase
      .from('study_guides')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return this.mapStudyGuide(data);
  }

  async getStudyGuideBySubchapterId(subchapterId: string): Promise<StudyGuide | null> {
    const { data, error } = await this.supabase
      .from('study_guides')
      .select('*')
      .eq('subchapter_id', subchapterId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapStudyGuide(data) : null;
  }

  async getAllStudyGuides(publishedOnly: boolean = false): Promise<StudyGuide[]> {
    let query = this.supabase.from('study_guides').select('*');
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.mapStudyGuide);
  }

  async getStudyGuideMetadata(publishedOnly: boolean = false): Promise<Partial<StudyGuide>[]> {
    let query = this.supabase.from('study_guides').select('id, subchapter_id, language, is_published');
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(item => this.mapStudyGuide(item));
  }

  async upsertStudyGuide(guide: Partial<Omit<StudyGuide, 'id'>> & { subchapter_id: string }): Promise<StudyGuide> {
    const { data, error } = await this.supabase
      .from('study_guides')
      .upsert(this.mapStudyGuideToDb(guide), { onConflict: 'subchapter_id' })
      .select()
      .single();
    if (error) throw error;
    return this.mapStudyGuide(data);
  }

  async deleteManyQuestions(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.supabase
      .from('questions')
      .delete()
      .in('id', ids);
    if (error) throw error;
  }

  async updateStudyGuide(id: string, guide: Partial<StudyGuide>): Promise<StudyGuide | null> {
    const { data, error } = await this.supabase
      .from('study_guides')
      .update(this.mapStudyGuideToDb(guide))
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapStudyGuide(data) : null;
  }

  // --- User Achievements ---
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await this.supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  }

  async addUserAchievements(achievements: { user_id: string; badge_id: string }[]): Promise<UserAchievement[]> {
    const { data, error } = await this.supabase
      .from('user_achievements')
      .insert(achievements)
      .select();
    if (error) throw error;
    return data || [];
  }

  // --- Admin Methods ---
  async getAllUsers(limitCount: number = 50): Promise<any[]> {
    const { data: profiles, error: pError } = await this.supabase
      .from('profiles')
      .select('*')
      .limit(limitCount);
    
    if (pError) throw pError;
    if (!profiles || profiles.length === 0) return [];

    const userIds = profiles.map(p => p.id);
    const { data: permissions, error: permError } = await this.supabase
      .from('user_permissions')
      .select('*')
      .in('user_id', userIds);
      
    if (permError) throw permError;
    
    return profiles.map(profile => ({
      ...profile,
      user_permissions: permissions?.find(p => p.user_id === profile.id) || null
    }));
  }

  async searchUsersByEmail(email: string, limitCount: number = 20): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .ilike('email', `%${email}%`)
      .limit(limitCount);
    if (error) throw error;
    return data || [];
  }

  async getAllQuizAttempts(limitCount: number = 100): Promise<QuizAttempt[]> {
    const { data, error } = await this.supabase
      .from('quiz_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitCount);
    if (error) throw error;
    return data || [];
  }

  // --- Manually Create User inside Admin panel via Secure Node Backend ---
  async manuallyCreateUser(payload: {
    email: string;
    password?: string;
    allowedLanguages?: string[];
    allowedGrades?: number[];
    role?: 'student' | 'teacher' | 'admin';
    isAdminUser?: boolean;
  }): Promise<any> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Unauthorized: No active administrator session found.');
    }

    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to create user');
    }
    return responseData;
  }

  async manuallyUpdateUser(payload: {
    targetUserId: string;
    password?: string;
    allowedLanguages?: string[];
    allowedGrades?: number[];
    role?: 'student' | 'teacher' | 'admin';
    isAdminUser?: boolean;
    isPremium?: boolean;
  }): Promise<any> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Unauthorized: No active administrator session found.');
    }

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to update user');
    }
    return responseData;
  }

  async manuallyDeleteUser(userId: string): Promise<any> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      throw new Error('Unauthorized: No active administrator session found.');
    }

    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to delete user');
    }
    return responseData;
  }

  async deleteQuizAttempt(attemptId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_attempts')
      .delete()
      .eq('id', attemptId);
    if (error) throw error;
  }

  async clearUserQuizAttempts(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  // --- Visitor Analytics secure accessor ---
  async getVisitorStats(): Promise<{
    totalViews: number;
    uniqueCount: number;
    dailyStats: Record<string, { views: number; visitors: number }>;
    recentVisits: any[];
  }> {
    const token = await this.getAccessToken();
    if (!token) {
      throw new Error('Unauthorized: No active administrator session found.');
    }

    const response = await fetch('/api/analytics/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch visitor stats: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    return responseData;
  }

  // --- Storage ---
  async uploadFile(path: string, file: Blob | Uint8Array): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('quiz-assets')
      .upload(path, file, {
        upsert: true
      });
    if (error) throw error;
    
    const { data: publicUrlData } = this.supabase.storage
      .from('quiz-assets')
      .getPublicUrl(data.path);
    
    return publicUrlData.publicUrl;
  }
}
