import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizService } from '../../services/quiz.service';
import { TranslationService } from '../../services/translation.service';
import { StudyGuide, Subject, Chapter, Subchapter } from '../../models';

interface EnrichedStudyGuide extends StudyGuide {
    subjectName: string;
    chapterName: string;
    subchapterName: string;
    subjectId: string;
    chapterId: string;
}

interface ChapterGroup {
    chapter: Chapter;
    guides: EnrichedStudyGuide[];
}

interface SubjectGroup {
    subject: Subject;
    chapters: ChapterGroup[];
}

interface BranchGroup {
    branchName: 'scientific' | 'literary' | 'general';
    subjects: SubjectGroup[];
}

interface GradeGroup {
    grade: number;
    branches: BranchGroup[];
}

@Component({
  selector: 'app-student-study-browse',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-xl max-w-3xl mx-auto animate-fade-in-up">
  <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
        {{ t.translate('student.browseGuides') }}
      </h1>
      <p class="text-xs text-slate-500 dark:text-slate-455 mt-1">
        {{ t.translate('student.browseGuidesDesc') || 'Select a grade, expand a branch, and select a subject to browse chapters and study guides.' }}
      </p>
    </div>
    <button (click)="quizService.goBack()" class="self-start sm:self-auto text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
      <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('back') }}
    </button>
  </div>

  @if (groupedGuides().length > 0) {
    <div class="space-y-4">
      @for (gradeGroup of groupedGuides(); track gradeGroup.grade) {
        <div class="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/25 space-y-4">
          <!-- Grade Header Button (Interactive) -->
          <button (click)="toggleGrade(gradeGroup.grade)" class="w-full flex items-center justify-between text-start group">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 class="text-base sm:text-lg font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {{ t.translate('student.grade') }} {{ gradeGroup.grade }}
              </h2>
            </div>
            <svg class="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-transform duration-200" [class.rotate-180]="expandedGrades().has(gradeGroup.grade)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          @if (expandedGrades().has(gradeGroup.grade)) {
            <div class="space-y-3 pt-2">
              @for (branchGroup of gradeGroup.branches; track branchGroup.branchName) {
                <div class="space-y-2">
                  <!-- Branch Toggle Button (Interactive) -->
                  <button (click)="toggleBranch(gradeGroup.grade, branchGroup.branchName)" class="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/85 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-705/50 transition shadow-sm group">
                    <div class="flex items-center gap-2">
                      @if (branchGroup.branchName === 'scientific') {
                        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 text-sky-500"><path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM8.5 4.5a.5.5 0 0 0-1 0v3h-2a.5.5 0 0 0 0 1h2.5a.5.5 0 0 0 .5-.5v-3.5Z" clip-rule="evenodd" /></svg>
                          <span>{{ t.translate('student.scientific') }}</span>
                        </div>
                      } @else if (branchGroup.branchName === 'literary') {
                        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 text-amber-500"><path fill-rule="evenodd" d="M15 8a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-6-3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.25 12h1.5v-3h-1.5v3Z" clip-rule="evenodd" /></svg>
                          <span>{{ t.translate('student.literary') }}</span>
                        </div>
                      } @else {
                        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 text-slate-500"><path fill-rule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-5-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 9a3 3 0 0 0-3 3 .75.75 0 0 0 .15.45A5.498 5.498 0 0 0 8 13.5a5.498 5.498 0 0 0 2.85-1.05A.75.75 0 0 0 11 12a3 3 0 0 0-3-3Z" clip-rule="evenodd" /></svg>
                          <span>{{ t.translate('student.generalBranch') || 'General / No Branch' }}</span>
                        </div>
                      }
                      <span class="text-[11px] text-slate-550 dark:text-slate-400 font-medium">
                        ({{ branchGroup.subjects.length }} {{ branchGroup.subjects.length === 1 ? (t.translate('student.subject') || 'subject') : (t.translate('student.subjects') || 'subjects') }})
                      </span>
                    </div>
                    <svg class="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-transform duration-200" [class.rotate-180]="expandedBranches().has(gradeGroup.grade + '_' + branchGroup.branchName)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  <!-- Expanded Branch Content -> Subjects List -->
                  @if (expandedBranches().has(gradeGroup.grade + '_' + branchGroup.branchName)) {
                    <div class="space-y-2 ps-3 border-s border-indigo-100 dark:border-indigo-950/45 py-1">
                      @for (subjectGroup of branchGroup.subjects; track subjectGroup.subject.id) {
                        <div class="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
                          <!-- Subject Header Button (Interactive) -->
                          <button (click)="toggleSubject(subjectGroup.subject.id)" class="w-full flex items-center justify-between text-start p-3 sm:p-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition group">
                            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              {{ subjectGroup.subject.name }}
                            </h3>
                            <svg class="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-transform duration-200" [class.rotate-180]="expandedSubjects().has(subjectGroup.subject.id)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>

                          <!-- Expanded Subject Content -> Chapters & Subchapters -->
                          @if (expandedSubjects().has(subjectGroup.subject.id)) {
                            <div class="px-3 sm:px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/20 dark:bg-slate-900/10">
                              <div class="space-y-2 mt-2">
                                @for (chapterGroup of subjectGroup.chapters; track chapterGroup.chapter.id; let chapterIndex = $index) {
                                  <div class="rounded-lg border border-slate-200/60 dark:border-slate-700 bg-slate-50/55 dark:bg-slate-900/30 overflow-hidden">
                                    <!-- Chapter Header Button (Interactive) -->
                                    <button (click)="toggleChapter(chapterGroup.chapter.id)" class="w-full flex items-center justify-between text-start p-2.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition group/chapter">
                                      <div class="flex items-center gap-2">
                                        <svg class="w-4 h-4 text-slate-400 group-hover/chapter:text-indigo-500 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                                        </svg>
                                        <span class="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover/chapter:text-indigo-600 dark:group-hover/chapter:text-indigo-400">
                                          {{ chapterGroup.chapter.name }}
                                        </span>
                                        <span class="text-[10px] text-slate-400 font-medium">
                                          ({{ chapterGroup.guides.length }} {{ chapterGroup.guides.length === 1 ? (t.translate('student.guide') || 'guide') : (t.translate('student.guides') || 'guides') }})
                                        </span>
                                      </div>
                                      <svg class="w-4 h-4 text-slate-400 group-hover/chapter:text-slate-600 dark:text-slate-500 dark:group-hover/chapter:text-slate-300 transition-transform duration-200" [class.rotate-180]="expandedChapters().has(chapterGroup.chapter.id)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                      </svg>
                                    </button>

                                    <!-- Expandable Subchapters List -->
                                    @if (expandedChapters().has(chapterGroup.chapter.id)) {
                                      <div class="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/65 bg-white/50 dark:bg-slate-900/20 space-y-1.5 transition-all">
                                        @for (guide of chapterGroup.guides; track guide.id; let guideIndex = $index) {
                                          @let isAllowed = hasActiveSubscription() && allowedSubjectIds().has(subjectGroup.subject.id);
                                          @if (isAllowed || (chapterIndex === 0 && guideIndex === 0)) {
                                            <button (click)="goToGuide(guide)" class="w-full text-start p-2 rounded-md text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition duration-200 flex items-center gap-2">
                                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500"></span>
                                              <span>{{ guide.subchapterName }}</span>
                                            </button>
                                          } @else {
                                            <button (click)="goToBilling()" class="w-full text-start p-2 rounded-md text-xs flex justify-between items-center group/premium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400" [title]="t.translate('student.premiumTooltip')">
                                              <span class="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 group-hover/premium:text-indigo-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5 text-amber-500"><path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" /></svg>
                                                <span>{{ guide.subchapterName }}</span>
                                              </span>
                                              <span class="text-[9px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 group-hover/premium:bg-indigo-600 group-hover/premium:text-white group-hover/premium:border-indigo-600 transition-all">
                                                {{ t.translate('student.unlock') || 'Unlock' }}
                                              </span>
                                            </button>
                                          }
                                        }
                                      </div>
                                    }
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  } @else {
    <div class="text-center py-16">
      <svg class="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
      <h3 class="mt-2 text-lg font-medium text-slate-800 dark:text-slate-100">{{ t.translate('student.studyGuides') }}</h3>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t.translate('student.noGuidesAvailable') }}</p>
    </div>
  }
</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentStudyBrowseComponent {
  quizService = inject(QuizService);
  t = inject(TranslationService);

  hasActiveSubscription = this.quizService.hasActiveSubscription;
  allowedSubjectIds = this.quizService.allowedSubjectIds;
  allStudyGuides = this.quizService.allStudyGuides;

  expandedGrades = signal<Set<number>>(new Set());
  expandedBranches = signal<Set<string>>(new Set());
  expandedSubjects = signal<Set<string>>(new Set());
  expandedChapters = signal<Set<string>>(new Set());

  toggleGrade(grade: number) {
    this.expandedGrades.update(set => {
      const next = new Set(set);
      if (next.has(grade)) {
        next.delete(grade);
      } else {
        next.add(grade);
      }
      return next;
    });
  }

  toggleBranch(grade: number, branchName: string) {
    const key = `${grade}_${branchName}`;
    this.expandedBranches.update(set => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  toggleSubject(subjectId: string) {
    this.expandedSubjects.update(set => {
      const next = new Set(set);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  toggleChapter(chapterId: string) {
    this.expandedChapters.update(set => {
      const next = new Set(set);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  }

  groupedGuides = computed<GradeGroup[]>(() => {
    const lang = this.quizService.selectedLanguage();
    if (!lang) return [];

    const guides = this.allStudyGuides().filter(g => g.isPublished !== false);
    const subchaptersMap = this.quizService.subchaptersMap();
    const chaptersMap = this.quizService.chaptersMap();
    const subjectsMap = this.quizService.subjectsMap();
    
    // Map of Grade -> Map of Branch -> Map of Subject -> SubjectGroup
    const gradesMap: Map<number, Map<string, Map<string, SubjectGroup>>> = new Map();

    for (const guide of guides) {
        const subchapter = subchaptersMap.get(guide.subchapter_id);
        if (!subchapter) continue;

        const guideLanguage = guide.language || subchapter.language;
        if (guideLanguage !== lang) continue;

        const chapter = chaptersMap.get(subchapter.chapter_id);
        if (!chapter) continue;

        const subject = subjectsMap.get(chapter.subject_id);
        if (!subject) continue;

        const enrichedGuide: EnrichedStudyGuide = {
            ...guide,
            subjectName: subject.name,
            chapterName: chapter.name,
            subchapterName: subchapter.name,
            subjectId: subject.id,
            chapterId: chapter.id,
        };

        const gradeNum = subject.grade;
        const branchKey = subject.branch || 'general';

        if (!gradesMap.has(gradeNum)) {
            gradesMap.set(gradeNum, new Map());
        }
        const branchesMap = gradesMap.get(gradeNum)!;

        if (!branchesMap.has(branchKey)) {
            branchesMap.set(branchKey, new Map());
        }
        const subjectsOfBranchMap = branchesMap.get(branchKey)!;

        let subjectGroup = subjectsOfBranchMap.get(subject.id);
        if (!subjectGroup) {
            subjectGroup = { subject, chapters: [] };
            subjectsOfBranchMap.set(subject.id, subjectGroup);
        }

        let chapterGroup = subjectGroup.chapters.find(c => c.chapter.id === chapter.id);
        if (!chapterGroup) {
            chapterGroup = { chapter, guides: [] };
            subjectGroup.chapters.push(chapterGroup);
        }
        
        chapterGroup.guides.push(enrichedGuide);
    }

    const result: GradeGroup[] = [];

    gradesMap.forEach((branchesMap, gradeNum) => {
        const branchGroups: BranchGroup[] = [];

        branchesMap.forEach((subjectsOfBranchMap, branchKey) => {
            const subjectsList = Array.from(subjectsOfBranchMap.values());
            
            subjectsList.forEach(sg => {
                sg.chapters.sort((a, b) => a.chapter.name.localeCompare(b.chapter.name));
                sg.chapters.forEach(cg => {
                    cg.guides.sort((a, b) => a.subchapterName.localeCompare(b.subchapterName));
                });
            });

            subjectsList.sort((a, b) => a.subject.name.localeCompare(b.subject.name));

            branchGroups.push({
                branchName: branchKey as 'scientific' | 'literary' | 'general',
                subjects: subjectsList
            });
        });

        const branchOrder: Record<string, number> = { 'general': 0, 'scientific': 1, 'literary': 2 };
        branchGroups.sort((a, b) => (branchOrder[a.branchName] ?? 99) - (branchOrder[b.branchName] ?? 99));

        result.push({
            grade: gradeNum,
            branches: branchGroups
        });
    });

    result.sort((a, b) => a.grade - b.grade);

    return result;
  });

  goToGuide(guide: EnrichedStudyGuide) {
    const chapter = this.quizService.chaptersMap().get(guide.chapterId);
    const subchapter = this.quizService.subchaptersMap().get(guide.subchapter_id);

    if (chapter && subchapter) {
        this.quizService.goToStudyGuide(chapter, subchapter);
    } else {
        console.error("Could not find chapter or subchapter for guide:", guide);
    }
  }

  goToBilling() {
    this.quizService.view.set('student_billing');
  }
}
