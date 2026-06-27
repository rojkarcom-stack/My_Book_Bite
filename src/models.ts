
export type Language = 'en' | 'ar' | 'ku_sorani' | 'ku_badini';

export type QuizView =
  | 'language_select'
  | 'landing'
  | 'auth'
  | 'role_select'
  | 'admin'
  | 'admin_login'
  | 'student_grade_select'
  | 'student_branch_select'
  | 'student_subject_select'
  | 'student_topic_selector'
  | 'student_quiz'
  | 'student_results'
  | 'student_dashboard'
  | 'student_study_guide_browse'
  | 'student_study_guide'
  | 'student_billing'
  | 'teacher_exam_generator'
  | 'teacher_exam_preview'
  | 'subscription_success';

export interface UserPermissions {
  user_id: string;
  allowed_languages: Language[];
  allowed_grades: number[];
  subject_access: { [subjectId: string]: string } | null;
  is_premium?: boolean;
  role?: string;
}

export interface UserProfile {
  id: string;
  email: string;
}

export interface Subject {
  id: string;
  name: string;
  grade: number;
  branch: 'scientific' | 'literary' | null;
  language: Language;
  isPublished?: boolean;
}

export interface Chapter {
  id: string;
  name:string;
  subject_id: string;
  language: Language;
}

export interface Subchapter {
  id: string;
  name: string;
  chapter_id: string;
  language: Language;
  isPublished?: boolean;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string | null;
  language: Language;
  grade: number;
  branch: 'scientific' | 'literary' | null;
  subject_id: string;
  chapter_id: string;
  subchapter_id: string;
  isPublished?: boolean;
}

export interface QuizResult {
  question: Question;
  userAnswerIndex: number | null;
  isCorrect: boolean;
}

export interface PastQuiz {
    id: string;
    subjectName: string;
    topicName: string;
    date: string;
    score: number;
    totalQuestions: number;
    results: QuizResult[];
}

// This is the lean result object for DB persistence
export interface QuizAttemptResult {
  questionId: string;
  userAnswerIndex: number | null;
  isCorrect: boolean;
}

export interface QuizAttempt {
  id?: string;
  created_at?: string;
  user_id?: string;
  subject_id: string;
  chapter_id: string;
  subchapter_id: string;
  grade: number;
  branch: 'scientific' | 'literary' | null;
  language: Language;
  score: number;
  total_questions: number;
  results: QuizAttemptResult[];
}

export interface StudyGuide {
  id: string;
  content?: string;
  source_text?: string;
  subchapter_id: string;
  language: Language;
  animation_html?: string | null;
  page_images?: { url: string; pageNumber: number }[];
  isPublished?: boolean;
}

export interface StudyGuideImage {
  id: string;
  guide_id: string;
  base64: string;
}

export interface Badge {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string; // SVG path or icon identifier
}

export interface UserAchievement {
  id?: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface FocusArea {
  subchapter: Subchapter;
  subject: Subject;
  chapter: Chapter;
  averageScore: number;
  attempts: number;
}