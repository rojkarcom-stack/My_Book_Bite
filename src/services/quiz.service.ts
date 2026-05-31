
import { Injectable, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { QuizView, Language, Subject, Chapter, Subchapter, Question, QuizResult, UserPermissions, StudyGuide } from '../models';
import { SupabaseService } from './supabase.service';
import { TranslationService } from './translation.service';

@Injectable({
  providedIn: 'root',
})
export class QuizService implements OnDestroy {
  private supabase = inject(SupabaseService);
  private t = inject(TranslationService);

  // App state
  view = signal<QuizView>('language_select');
  isLoading = signal<boolean>(false);
  coreDataLoadError = signal<string|null>(null);
  theme = signal<'light' | 'dark' | 'system'>('system');
  isQuotaExceeded = signal<boolean>(false); // Supabase doesn't have the same quota limits

  // Core Data - now centralized here
  allSubjects = signal<Subject[]>([]);
  allManagedUsers = signal<any[]>([]);
  allChapters = signal<Chapter[]>([]);
  allSubchapters = signal<Subchapter[]>([]);
  allQuestions = signal<Question[]>([]);
  allStudyGuides = signal<StudyGuide[]>([]);
  
  // Computed Maps for efficient lookups
  subjectsMap = computed(() => new Map(this.allSubjects().map(s => [s.id, s])));
  chaptersMap = computed(() => new Map(this.allChapters().map(c => [c.id, c])));
  subchaptersMap = computed(() => new Map(this.allSubchapters().map(sc => [sc.id, sc])));

  // User selections
  selectedLanguage = signal<Language | null>(null);
  selectedGrade = signal<number | null>(null);
  selectedBranch = signal<'scientific' | 'literary' | null>(null);
  selectedSubject = signal<Subject | null>(null);
  selectedChapter = signal<Chapter | null>(null);
  selectedSubchapter = signal<Subchapter | null>(null);
  userPermissions = signal<UserPermissions | null>(null);

  // Data for selectors
  subjectsForSelectedGrade = signal<Subject[]>([]);
  chaptersForSelectedSubject = signal<Chapter[]>([]);
  subchaptersForSelectedChapter = signal<Subchapter[]>([]);
  
  // Quiz state
  questionsForSelectedSubchapter = signal<Question[]>([]);
  isLoadingQuestions = signal<boolean>(false);
  isLoadingStudyGuide = signal<boolean>(false);
  currentQuestionIndex = signal<number>(0);
  quizResults = signal<QuizResult[]>([]);
  quizMode = signal<'test' | 'practice'>('test');
  selectedQuestionCount = signal<number>(10);

  // Timer state
  selectedQuizDuration = signal<number | null>(30); // 30s default, null for untimed
  timerValue = signal<number>(30);
  private timerInterval: any = null;

  // Exam Generator state
  examQuestions = signal<Question[]>([]);
  examConfig = signal<{title: string, instructions: string, grade: string, subject: string}>({title: '', instructions: '', grade: '', subject: ''});

  // Computed state
  currentQuestion = computed(() => this.questionsForSelectedSubchapter()[this.currentQuestionIndex()]);
  score = computed(() => this.quizResults().filter(r => r.isCorrect).length);
  selectedStudyGuide = computed(() => {
    const sub = this.selectedSubchapter();
    if (!sub) return null;
    return this.allStudyGuides().find(g => g.subchapter_id === sub.id) || null;
  });

  isAdmin = computed(() => {
    const user = this.supabase.currentUser();
    const permissions = this.userPermissions();
    return user?.email === 'rojkarcom@gmail.com' || user?.email === 'wlat.ibrahim@gmail.com' || permissions?.role === 'admin';
  });

  hasActiveSubscription = computed(() => {
    if (this.isAdmin()) {
      return true;
    }

    const permissions = this.userPermissions();
    if (!permissions?.subject_access) {
      return false;
    }
    const now = new Date();
    for (const subjectId in permissions.subject_access) {
      const expiry = new Date(permissions.subject_access[subjectId]);
      if (expiry > now) {
        return true; // Found at least one active subscription
      }
    }
    return false;
  });

  allowedSubjectIds = computed(() => {
    if (this.isAdmin()) {
      return new Set(this.allSubjects().map(s => s.id));
    }
      
    const permissions = this.userPermissions();
    const allowed = new Set<string>();
    if (!permissions?.subject_access) {
        return allowed;
    }
    const now = new Date();
    for (const subjectId in permissions.subject_access) {
        const expiryDateString = permissions.subject_access[subjectId];
        if (expiryDateString && new Date(expiryDateString) > now) {
            allowed.add(subjectId);
        }
    }
    return allowed;
  });
  
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.loadTheme();
    this.updateThemeClass(); // Apply theme immediately on startup
    
    // This new effect will notify TranslationService of language changes
    effect(() => {
        this.t.setLanguage(this.selectedLanguage());
    });
    
    effect(() => {
        // This effect re-applies the theme whenever the signal changes.
        this.updateThemeClass();
    });

    // Listen for OS-level changes
    this.mediaQuery.addEventListener('change', this.updateThemeClass);

    effect(() => {
        const chapter = this.selectedChapter();
        if (chapter) {
            this.fetchSubchapters();
        } else {
            // Clear subchapters if no chapter is selected
            this.subchaptersForSelectedChapter.set([]);
        }
    });
    
    // Auth guard effect - only handles redirection
    effect(() => {
      const user = this.supabase.currentUser();
      const currentView = this.view();
      const protectedViews: QuizView[] = [
        'role_select', 'admin', 'student_grade_select', 
        'student_branch_select', 'student_subject_select', 
        'student_topic_selector', 'student_quiz',
        'student_results', 'student_dashboard',
        'student_study_guide_browse', 'student_study_guide',
        'teacher_exam_generator', 'teacher_exam_preview'
      ];

      if (!user && protectedViews.includes(currentView)) {
        this.view.set('auth');
      }
    });

    // Data loading effect - only handles fetching when user changes
    effect(() => {
      const user = this.supabase.currentUser();
      
      if (user) {
        // Only fetch if not already loaded for this user
        if (!this.userPermissions() || this.userPermissions()?.user_id !== user.id) {
          this.fetchUserPermissions(user.id).then(() => {
            if (this.allSubjects().length === 0) {
              this.loadCoreData();
            }
          });
        }
      } else {
        this.userPermissions.set(null);
        this.clearCoreData();
      }
    });
  }

  ngOnDestroy() {
    this.mediaQuery.removeEventListener('change', this.updateThemeClass);
  }

  private updateThemeClass = () => {
    const currentTheme = this.theme();
    const isDark = currentTheme === 'dark' || (currentTheme === 'system' && this.mediaQuery.matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  };

  private loadTheme() {
    const storedTheme = localStorage.getItem('quizAppTheme') as 'light' | 'dark' | 'system' | null;
    this.theme.set(storedTheme || 'system');
  }

  async loadManagedUsers(limitCount: number = 50) {
    if (this.allManagedUsers().length > 0) return;
    try {
      const users = await this.supabase.getAllUsers(limitCount);
      const managedUsers = users.map(user => ({
        id: user.id,
        email: user.email || user.id,
        totalQuizzes: 0,
        averageScore: 0,
        lastActivity: null
      }));
      this.allManagedUsers.set(managedUsers);
    } catch (error) {
      console.error("Failed to load managed users", error);
    }
  }

  async searchManagedUsers(email: string) {
    if (!email || email.length < 3) {
      // If search is cleared, reload initial list
      this.allManagedUsers.set([]);
      await this.loadManagedUsers();
      return;
    }

    try {
      const users = await this.supabase.searchUsersByEmail(email);
      const managedUsers = users.map(user => ({
        id: user.id,
        email: user.email || user.id,
        totalQuizzes: 0,
        averageScore: 0,
        lastActivity: null
      }));
      
      this.allManagedUsers.update(all => {
        const existingIds = new Set(all.map(u => u.id));
        const newOnes = managedUsers.filter(u => !existingIds.has(u.id));
        return [...all, ...newOnes];
      });
    } catch (error) {
      console.error("Failed to search managed users", error);
    }
  }

  async fetchUserPermissions(userId: string) {
    try {
        const permissions = await this.supabase.getUserPermissions(userId);
        this.userPermissions.set(permissions);
    } catch (error) {
        console.error("Failed to fetch user permissions", error);
        this.userPermissions.set(null);
    }
  }

  async refreshPermissions() {
    const user = this.supabase.currentUser();
    if (user) {
      await this.fetchUserPermissions(user.id);
    }
  }

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.theme.set(theme);
    localStorage.setItem('quizAppTheme', theme);
  }

  // --- Methods to change state ---

  setQuizMode(mode: 'test' | 'practice') {
    this.quizMode.set(mode);
  }

  setQuestionCount(count: number) {
    this.selectedQuestionCount.set(count);
  }

  selectLanguage(language: Language) {
    this.selectedLanguage.set(language);
    this.view.set('landing');
  }

  proceedToAuth() {
    this.view.set('auth');
  }

  selectRole(role: 'student' | 'admin' | 'teacher') {
    if (role === 'student') {
      this.view.set('student_dashboard');
    } else if (role === 'teacher') {
      this.view.set('teacher_exam_generator');
    } else { // admin
      if (this.isAdmin()) {
        this.view.set('admin');
      } else {
        // FIX: Navigate to admin login screen instead of silently failing.
        this.view.set('admin_login');
      }
    }
  }

  showDashboard() {
    this.view.set('student_dashboard');
  }

  async browseStudyGuides() {
    this.isLoading.set(true);
    try {
      // Ensure we have all the necessary data loaded for the browse view
      // We only fetch metadata for study guides here to avoid timeouts
      const [guidesMetadata, subchapters, chapters, subjects] = await Promise.all([
        this.supabase.getStudyGuideMetadata(true), // true for published only
        this.supabase.getAllSubchapters(true),
        this.supabase.getAllChapters(),
        this.supabase.getAllSubjects()
      ]);
      
      this.allStudyGuides.set(guidesMetadata as StudyGuide[]);
      this.allSubchapters.set(subchapters);
      this.allChapters.set(chapters);
      this.allSubjects.set(subjects);
      
      this.view.set('student_study_guide_browse');
    } catch (error) {
      console.error('Error loading study guides:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  goToStudyGuide(chapter: Chapter, subchapter: Subchapter) {
    const subject = this.subjectsMap().get(chapter.subject_id);
    if (!subject) {
      console.error("Could not find subject for chapter:", chapter);
      this.goBack();
      return;
    }
    
    // Set the full context for the study guide view
    this.selectedGrade.set(subject.grade);
    this.selectedLanguage.set(subject.language);
    this.selectedBranch.set(subject.branch);
    this.selectedSubject.set(subject);
    this.selectedChapter.set(chapter);
    this.selectedSubchapter.set(subchapter);

    this.view.set('student_study_guide');
  }

  async selectGrade(grade: number) {
    this.selectedGrade.set(grade);
    // For grades 10, 11, 12, students must choose a branch.
    if ([10, 11, 12].includes(grade)) {
      this.view.set('student_branch_select');
    } else {
      this.selectedBranch.set(null);
      await this.fetchSubjects();
      this.view.set('student_subject_select');
    }
  }

  async selectBranch(branch: 'scientific' | 'literary') {
    this.selectedBranch.set(branch);
    await this.fetchSubjects();
    this.view.set('student_subject_select');
  }

  async selectSubject(subject: Subject) {
    this.selectedSubject.set(subject);
    await this.fetchChapters();
    this.view.set('student_topic_selector');
  }

  async selectTopic(chapter: Chapter, subchapter: Subchapter) {
    this.selectedChapter.set(chapter);
    this.selectedSubchapter.set(subchapter);
    await this.fetchQuestions();
    this.startQuiz();
  }
  
  async startPracticeQuizFor(subchapter: Subchapter, chapter: Chapter, subject: Subject) {
    this.isLoading.set(true);
    this.selectedGrade.set(subject.grade);
    this.selectedBranch.set(subject.branch);
    this.selectedSubject.set(subject);
    this.selectedChapter.set(chapter);
    this.selectedSubchapter.set(subchapter);
    this.setQuizMode('practice');
    await this.fetchQuestions();
    this.isLoading.set(false);
    this.startQuiz();
  }
  
  startQuiz() {
    this.currentQuestionIndex.set(0);
    this.quizResults.set([]);
    if (this.questionsForSelectedSubchapter().length > 0) {
      this.view.set('student_quiz');
      this.startTimer();
    } else {
      // Handle case with no questions
      console.warn("No questions found for this topic.");
    }
  }

  submitAnswer(userAnswerIndex: number | null) {
    this.stopTimer();
    const question = this.currentQuestion();
    if (!question) return;

    const result: QuizResult = {
      question,
      userAnswerIndex,
      isCorrect: userAnswerIndex !== null && question.correctAnswerIndex === userAnswerIndex,
    };
    this.quizResults.update(results => [...results, result]);

    if (this.currentQuestionIndex() < this.questionsForSelectedSubchapter().length - 1) {
      this.currentQuestionIndex.update(i => i + 1);
      this.startTimer();
    } else {
      this.view.set('student_results');
    }
  }

  restartQuiz() {
      if (this.selectedChapter() && this.selectedSubchapter()) {
        this.selectTopic(this.selectedChapter()!, this.selectedSubchapter()!);
      }
  }
  
  changeGrade() {
      this.resetStudentSelections();
      this.view.set('student_grade_select');
  }

  // --- Exam Generator Method ---
  generateExam(questions: Question[], config: {title: string, instructions: string, grade: string, subject: string}) {
    this.examQuestions.set(questions);
    this.examConfig.set(config);
    this.view.set('teacher_exam_preview');
  }

  // --- Data fetching methods ---
  async loadCoreData() {
    if (this.allSubjects().length > 0) return;
    this.isLoading.set(true);
    this.coreDataLoadError.set(null);
    try {
        // Only fetch subjects initially to save reads
        const subjects = await this.supabase.getAllSubjects();
        this.allSubjects.set(subjects);
        
        // If admin, we might want to load more, but let's keep it lazy for now
        // Chapters and Subchapters will be loaded on demand
    } catch (error: any) {
        const errorMessage = this.t.translate('errors.networkError');
        this.coreDataLoadError.set(errorMessage);
        console.error('Error loading core data:', error);
    } finally {
        this.isLoading.set(false);
    }
  }

  async fetchChaptersForSubject(subjectId: string) {
    // Check if we already have chapters for this subject
    const existing = this.allChapters().filter(c => c.subject_id === subjectId);
    if (existing.length > 0) return;

    try {
      const chapters = await this.supabase.getChapters(subjectId, this.selectedLanguage() || 'en');
      this.allChapters.update(all => {
        const existingIds = new Set(all.map(c => c.id));
        const newOnes = chapters.filter(c => !existingIds.has(c.id));
        return [...all, ...newOnes];
      });
    } catch (error) {
      console.error('Error fetching chapters for subject:', error);
    }
  }

  async fetchSubchaptersForChapter(chapterId: string) {
    // Check if we already have subchapters for this chapter
    const existing = this.allSubchapters().filter(sc => sc.chapter_id === chapterId);
    if (existing.length > 0) return;

    try {
      const publishedOnly = !this.isAdmin();
      const subchapters = await this.supabase.getSubchapters(chapterId, this.selectedLanguage() || 'en', publishedOnly);
      this.allSubchapters.update(all => {
        const existingIds = new Set(all.map(sc => sc.id));
        const newOnes = subchapters.filter(sc => !existingIds.has(sc.id));
        return [...all, ...newOnes];
      });
    } catch (error) {
      console.error('Error fetching subchapters for chapter:', error);
    }
  }

  clearCoreData() {
    this.allSubjects.set([]);
    this.allChapters.set([]);
    this.allSubchapters.set([]);
    this.allQuestions.set([]);
    this.allStudyGuides.set([]);
  }

  private async fetchSubjects() {
    const grade = this.selectedGrade();
    const lang = this.selectedLanguage();
    const branch = this.selectedBranch();
    if (!grade || !lang) return;

    // If we have all subjects loaded, just filter them
    if (this.allSubjects().length > 0) {
      const filtered = this.allSubjects().filter(s => 
        s.grade === grade && 
        s.language === lang && 
        (branch ? s.branch === branch : s.branch === null)
      );
      this.subjectsForSelectedGrade.set(filtered);
      return;
    }

    this.isLoading.set(true);
    try {
      const subjects = await this.supabase.getSubjects(grade, lang, branch || undefined);
      this.subjectsForSelectedGrade.set(subjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      this.subjectsForSelectedGrade.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchChapters() {
    const subject = this.selectedSubject();
    const lang = this.selectedLanguage();
    if (!subject || !lang) return;

    this.isLoading.set(true);
    try {
      await this.fetchChaptersForSubject(subject.id);
      const chapters = this.allChapters().filter(c => c.subject_id === subject.id && c.language === lang);
      chapters.sort((a, b) => a.name.localeCompare(b.name));
      this.chaptersForSelectedSubject.set(chapters);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      this.chaptersForSelectedSubject.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private async fetchSubchapters() {
      const chapter = this.selectedChapter();
      const lang = this.selectedLanguage();
      if (!chapter || !lang) return;

      this.isLoading.set(true);
      try {
        await this.fetchSubchaptersForChapter(chapter.id);
        const subchapters = this.allSubchapters().filter(sc => sc.chapter_id === chapter.id && sc.language === lang);
        subchapters.sort((a, b) => a.name.localeCompare(b.name));
        this.subchaptersForSelectedChapter.set(subchapters);
      } catch (error) {
        console.error('Error fetching subchapters:', error);
        this.subchaptersForSelectedChapter.set([]);
      } finally {
        this.isLoading.set(false);
      }
  }

  async fetchQuestionsForSubchapter(subchapterId: string) {
    // Check if we already have questions for this subchapter
    const existing = this.allQuestions().filter(q => q.subchapter_id === subchapterId);
    if (existing.length > 0) return;

    this.isLoadingQuestions.set(true);
    try {
      const fetchedQuestions = await this.supabase.getQuestions(subchapterId);
      this.allQuestions.update(all => {
        const existingIds = new Set(all.map(q => q.id));
        const newOnes = fetchedQuestions.filter(q => !existingIds.has(q.id));
        return [...all, ...newOnes];
      });
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      this.isLoadingQuestions.set(false);
    }
  }

  async fetchQuestions() {
    const subchapter = this.selectedSubchapter();
    if (!subchapter) {
      this.questionsForSelectedSubchapter.set([]);
      return;
    }

    await this.fetchQuestionsForSubchapter(subchapter.id);
    
    const questionsForSubchapter = this.allQuestions().filter(q => q.subchapter_id === subchapter.id);
    const filtered = questionsForSubchapter.filter(q => q.isPublished !== false);
    // Simple shuffle
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    
    const count = this.selectedQuestionCount();
    const finalQuestions = (count === Infinity ? shuffled : shuffled.slice(0, count)).map(q => this.shuffleOptions(q));
    
    this.questionsForSelectedSubchapter.set(finalQuestions);

    // Also trigger study guide fetch if not present
    this.fetchStudyGuideForSubchapter(subchapter.id);
  }

  async fetchStudyGuideForSubchapter(subchapterId: string) {
    const existing = this.allStudyGuides().find(g => g.subchapter_id === subchapterId);
    if (existing) return;

    this.isLoadingStudyGuide.set(true);
    try {
      const guide = await this.supabase.getStudyGuideBySubchapterId(subchapterId);
      if (guide) {
        this.allStudyGuides.update(all => [...all, guide]);
      }
    } catch (error) {
      console.error('Error fetching study guide:', error);
    } finally {
      this.isLoadingStudyGuide.set(false);
    }
  }

  private shuffleOptions(question: Question): Question {
    const options = [...question.options];
    const correctOption = options[question.correctAnswerIndex];
    
    // Fisher-Yates shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    const newCorrectIndex = options.indexOf(correctOption);
    
    return {
      ...question,
      options,
      correctAnswerIndex: newCorrectIndex
    };
  }

  // --- Navigation/reset methods ---

  goBack() {
    const currentView = this.view();
    switch (currentView) {
        case 'landing':
            this.view.set('language_select');
            break;
        case 'auth':
            this.view.set('landing');
            break;
        case 'role_select':
            this.view.set('landing');
            break;
        case 'teacher_exam_generator':
        case 'admin':
        case 'admin_login':
        case 'student_grade_select':
        case 'student_dashboard':
        case 'student_study_guide_browse':
            this.view.set('role_select');
            break;
        case 'teacher_exam_preview':
            this.view.set('teacher_exam_generator');
            break;
        case 'student_study_guide':
            this.view.set('student_study_guide_browse');
            break;
        case 'student_branch_select':
            this.view.set('student_grade_select');
            break;
        case 'student_subject_select':
            if (this.selectedGrade()! >= 10) {
                this.view.set('student_branch_select');
            } else {
                this.view.set('student_grade_select');
            }
            break;
        case 'student_topic_selector':
            this.view.set('student_subject_select');
            break;
        case 'student_quiz':
             this.stopTimer();
             this.quizMode.set('test'); // Reset quiz mode
             this.view.set('student_topic_selector');
            break;
        case 'student_results':
             this.view.set('student_topic_selector');
             break;
    }
  }
  
  async signOut() {
    this.isLoading.set(true);
    try {
      await this.supabase.signOut();
      // The auth guard effect will automatically change the view.
    } catch (error: any) {
      console.error('Error signing out:', error);
    } finally {
        this.isLoading.set(false);
    }
  }

  resetToHome() {
    const lang = this.selectedLanguage();
    this.resetStudentSelections();
    this.selectedLanguage.set(lang); // Keep language
    this.view.set('language_select');
  }
  
  backToTopicSelect() {
    this.stopTimer();
    this.quizMode.set('test'); // Reset quiz mode
    this.view.set('student_topic_selector');
  }

  backToSubjectSelect() {
    this.view.set('student_subject_select');
  }

  private resetStudentSelections() {
    this.selectedLanguage.set(null);
    this.selectedGrade.set(null);
    this.selectedBranch.set(null);
    this.selectedSubject.set(null);
    this.selectedChapter.set(null);
    this.selectedSubchapter.set(null);
    this.subjectsForSelectedGrade.set([]);
    this.chaptersForSelectedSubject.set([]);
    this.subchaptersForSelectedChapter.set([]);
    this.questionsForSelectedSubchapter.set([]);
    this.quizResults.set([]);
    this.currentQuestionIndex.set(0);
    this.selectedQuizDuration.set(30);
    this.selectedQuestionCount.set(10);
  }

  // --- Timer Methods ---
  private startTimer() {
    this.stopTimer(); // Ensure no multiple intervals are running
    const duration = this.selectedQuizDuration();
    
    if (duration === null || this.quizMode() === 'practice') {
      return; // Untimed quiz or practice mode, don't start the timer.
    }

    this.timerValue.set(duration);
    this.timerInterval = setInterval(() => {
      this.timerValue.update(v => v - 1);
      if (this.timerValue() <= 0) {
        this.submitAnswer(null); // Auto-submit with no answer
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
