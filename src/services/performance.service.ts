import { Injectable, signal, inject, effect, computed } from '@angular/core';
import { PastQuiz, QuizAttempt, Question, Subject, Subchapter, Badge, UserAchievement, FocusArea, Chapter } from '../models';
import { SupabaseService } from './supabase.service';
import { QuizService } from './quiz.service';
import { TranslationService } from './translation.service';

export const ALL_BADGES: Badge[] = [
  { id: 'first_quiz', nameKey: 'badges.first_quiz.name', descriptionKey: 'badges.first_quiz.description', icon: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16l7-3 7 3z' },
  { id: 'quiz_novice', nameKey: 'badges.quiz_novice.name', descriptionKey: 'badges.quiz_novice.description', icon: 'M9 19V5l7 3-7 11z' },
  { id: 'perfect_score', nameKey: 'badges.perfect_score.name', descriptionKey: 'badges.perfect_score.description', icon: 'M12 2L9 9l-7 2 5 5-1 7 6-3 6 3-1-7 5-5-7-2z' },
  { id: 'subject_explorer', nameKey: 'badges.subject_explorer.name', descriptionKey: 'badges.subject_explorer.description', icon: 'M14.5 14.5L19 19M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12z' },
];

@Injectable({
  providedIn: 'root',
})
export class PerformanceService {
  private supabase = inject(SupabaseService);
  private t = inject(TranslationService);
  private quizService = inject(QuizService);
  
  pastQuizzes = signal<PastQuiz[]>([]);
  userAchievements = signal<UserAchievement[]>([]);
  isLoading = signal(true);
  
  allBadges = ALL_BADGES;

  private subjectsMap = new Map<string, Subject>();
  private chaptersMap = new Map<string, Chapter>();
  private subchaptersMap = new Map<string, Subchapter>();
  private allQuestionsMap = new Map<string, Question>();

  constructor() {
    // This effect runs whenever the user's auth state changes.
    effect(async () => {
      const user = this.supabase.currentUser();
      if (user) {
        await this.loadUserHistory();
      } else {
        this.pastQuizzes.set([]);
        this.userAchievements.set([]);
        this.isLoading.set(false);
      }
    });
  }

  focusAreas = computed<FocusArea[]>(() => {
    const attempts = this.pastQuizzes();
    if (attempts.length === 0) {
      return [];
    }

    const subchapterStats = new Map<string, { totalScore: number; count: number; attempts: QuizAttempt[] }>();

    // Use the raw attempts for grouping by subchapter
    const rawAttempts = attempts.map(this.mapPastQuizToAttempt);

    for (const attempt of rawAttempts) {
      const stats = subchapterStats.get(attempt.subchapter_id) || { totalScore: 0, count: 0, attempts: [] };
      stats.totalScore += (attempt.score / attempt.total_questions);
      stats.count++;
      stats.attempts.push(attempt);
      subchapterStats.set(attempt.subchapter_id, stats);
    }

    const focus: FocusArea[] = [];
    for (const [subchapterId, stats] of subchapterStats.entries()) {
      const averageScore = (stats.totalScore / stats.count) * 100;
      // Define criteria for a focus area
      if (averageScore < 70 && stats.count >= 2) {
        const subchapter = this.subchaptersMap.get(subchapterId);
        if (subchapter) {
            const chapter = this.chaptersMap.get(subchapter.chapter_id);
            if (chapter) {
                const subject = this.subjectsMap.get(chapter.subject_id);
                if (subject) {
                    focus.push({
                        subchapter,
                        chapter,
                        subject,
                        averageScore,
                        attempts: stats.count,
                    });
                }
            }
        }
      }
    }

    // Sort by lowest score first and limit to top 3
    return focus.sort((a, b) => a.averageScore - b.averageScore).slice(0, 3);
  });

  async loadUserHistory(): Promise<void> {
    const user = this.supabase.currentUser();
    if (!user) {
      this.pastQuizzes.set([]);
      this.userAchievements.set([]);
      return;
    }
    
    this.isLoading.set(true);
    try {
      // Use subjects from QuizService if available, otherwise fetch
      const subjects = this.quizService.allSubjects();
      if (subjects.length > 0) {
        subjects.forEach(s => this.subjectsMap.set(s.id, s));
      } else if (this.subjectsMap.size === 0) {
        const fetchedSubjects = await this.supabase.getAllSubjects();
        fetchedSubjects.forEach(s => this.subjectsMap.set(s.id, s));
      }

      const [attempts, achievements] = await Promise.all([
        this.supabase.getQuizAttemptsForUser(user.id),
        this.supabase.getUserAchievements(user.id)
      ]);

      // Collect all needed chapter and subchapter IDs
      const neededChapterIds = new Set<string>();
      const neededSubchapterIds = new Set<string>();
      attempts.forEach(a => {
        neededChapterIds.add(a.chapter_id);
        neededSubchapterIds.add(a.subchapter_id);
      });

      // Fetch only needed metadata
      const missingChapterIds = Array.from(neededChapterIds).filter(id => !this.chaptersMap.has(id));
      if (missingChapterIds.length > 0) {
        const chapters = await this.supabase.getChaptersByIds(missingChapterIds);
        chapters.forEach(c => this.chaptersMap.set(c.id, c));
      }

      const missingSubchapterIds = Array.from(neededSubchapterIds).filter(id => !this.subchaptersMap.has(id));
      if (missingSubchapterIds.length > 0) {
        const subchapters = await this.supabase.getSubchaptersByIds(missingSubchapterIds);
        subchapters.forEach(sc => this.subchaptersMap.set(sc.id, sc));
      }

      // Collect all question IDs from attempts
      const questionIds = new Set<string>();
      attempts.forEach(attempt => {
        attempt.results.forEach(r => questionIds.add(r.questionId));
      });

      // Fetch only the questions we need
      const neededQuestionIds = Array.from(questionIds).filter(id => !this.allQuestionsMap.has(id));
      if (neededQuestionIds.length > 0) {
        const questions = await this.supabase.getQuestionsByIds(neededQuestionIds);
        questions.forEach(q => this.allQuestionsMap.set(q.id, q));
      }
      
      const mappedQuizzes = this.mapAttemptsToPastQuizzes(attempts);
      this.pastQuizzes.set(mappedQuizzes);
      this.userAchievements.set(achievements);
    } catch (error) {
      console.error('Error loading user performance history:', error);
      this.pastQuizzes.set([]);
      this.userAchievements.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  async checkAndAwardBadges(newAttempt: QuizAttempt): Promise<Badge[]> {
    const user = this.supabase.currentUser();
    if (!user) return [];

    const allAttempts = [newAttempt, ...this.pastQuizzes().map(this.mapPastQuizToAttempt)];
    const existingBadges = new Set(this.userAchievements().map(a => a.badge_id));
    const newlyAwardedBadges: Badge[] = [];

    for (const badge of this.allBadges) {
        if (existingBadges.has(badge.id)) continue;

        let earned = false;
        switch(badge.id) {
            case 'first_quiz':
                if (allAttempts.length >= 1) earned = true;
                break;
            case 'quiz_novice':
                if (allAttempts.length >= 5) earned = true;
                break;
            case 'perfect_score':
                if (newAttempt.score === newAttempt.total_questions) earned = true;
                break;
            case 'subject_explorer':
                const uniqueSubjects = new Set(allAttempts.map(a => a.subject_id));
                if (uniqueSubjects.size >= 3) earned = true;
                break;
        }

        if (earned) {
            newlyAwardedBadges.push(badge);
        }
    }

    if (newlyAwardedBadges.length > 0) {
        try {
            const achievementsToInsert = newlyAwardedBadges.map(b => ({ user_id: user.id, badge_id: b.id }));
            const savedAchievements = await this.supabase.addUserAchievements(achievementsToInsert);
            this.userAchievements.update(current => [...current, ...savedAchievements]);
        } catch (error) {
            console.error("Failed to save new achievements:", error);
            return []; // Return empty if saving failed
        }
    }
    
    return newlyAwardedBadges;
  }

  private mapAttemptsToPastQuizzes(attempts: QuizAttempt[]): PastQuiz[] {
    return attempts.map(attempt => {
      const subject = this.subjectsMap.get(attempt.subject_id);
      const subchapter = this.subchaptersMap.get(attempt.subchapter_id);

      return {
        id: attempt.id!,
        subjectName: subject?.name || this.t.translate('unknownSubject'),
        topicName: subchapter?.name || this.t.translate('unknownTopic'),
        date: attempt.created_at!,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        results: attempt.results.map(r => ({
            question: this.allQuestionsMap.get(r.questionId)!,
            userAnswerIndex: r.userAnswerIndex,
            isCorrect: r.isCorrect,
        })),
      };
    }).filter(quiz => quiz.results.every(r => r.question)); // Filter out quizzes with missing question data
  }

  private mapPastQuizToAttempt(quiz: PastQuiz): QuizAttempt {
    const firstResult = quiz.results[0];
    const question = firstResult?.question;
    return {
      id: quiz.id,
      created_at: quiz.date,
      subject_id: question?.subject_id || '',
      chapter_id: question?.chapter_id || '',
      subchapter_id: question?.subchapter_id || '',
      grade: question?.grade || 0,
      branch: question?.branch || null,
      language: question?.language || 'en',
      score: quiz.score,
      total_questions: quiz.totalQuestions,
      results: quiz.results.map(r => ({
        questionId: r.question.id,
        userAnswerIndex: r.userAnswerIndex,
        isCorrect: r.isCorrect,
      }))
    }
  }
}
