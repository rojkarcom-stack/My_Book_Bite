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

@Component({
  selector: 'app-student-study-browse',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="bg-white dark:bg-slate-800 p-4 sm:p-8 rounded-2xl shadow-xl max-w-3xl mx-auto animate-fade-in-up">
  <div class="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
    <h1 class="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
      {{ t.translate('student.browseGuides') }}
    </h1>
    <button (click)="quizService.goBack()" class="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition">
      <span>{{ t.isRtl() ? '→' : '←' }}</span> {{ t.translate('back') }}
    </button>
  </div>

  @if (groupedGuides().length > 0) {
    <div class="space-y-6">
      @for (subjectGroup of groupedGuides(); track subjectGroup.subject.id) {
        <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
          <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">{{ subjectGroup.subject.name }}</h2>
          
          <div class="mt-4 space-y-4">
            @for (chapterGroup of subjectGroup.chapters; track chapterGroup.chapter.id; let chapterIndex = $index) {
              <div>
                <h3 class="font-semibold text-slate-700 dark:text-slate-300">{{ chapterGroup.chapter.name }}</h3>
                <div class="ps-4 mt-2 space-y-2 border-s-2 border-slate-200 dark:border-slate-600">
                  @for (guide of chapterGroup.guides; track guide.id; let guideIndex = $index) {
                    @let isAllowed = hasActiveSubscription() && allowedSubjectIds().has(subjectGroup.subject.id);
                    @if (isAllowed || (chapterIndex === 0 && guideIndex === 0)) {
                      <button (click)="goToGuide(guide)" class="w-full text-start p-2 rounded-md text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 hover:scale-[1.02] active:scale-95">
                        {{ guide.subchapterName }}
                      </button>
                    } @else {
                      <button (click)="goToBilling()" class="w-full text-start p-2 rounded-md flex justify-between items-center group/premium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400" [title]="t.translate('student.premiumTooltip')">
                        <span class="text-slate-600 dark:text-slate-400 flex items-center gap-2 group-hover/premium:text-indigo-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4 text-amber-500"><path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clip-rule="evenodd" /></svg>
                          {{ guide.subchapterName }}
                        </span>
                        <span class="text-xs font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800 group-hover/premium:bg-indigo-600 group-hover/premium:text-white group-hover/premium:border-indigo-600 transition-all">
                          {{ t.translate('student.unlock') || 'Unlock' }}
                        </span>
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
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

  groupedGuides = computed<SubjectGroup[]>(() => {
    const lang = this.quizService.selectedLanguage();
    if (!lang) return [];

    const guides = this.allStudyGuides().filter(g => g.isPublished !== false);
    const subchaptersMap = this.quizService.subchaptersMap();
    const chaptersMap = this.quizService.chaptersMap();
    const subjectsMap = this.quizService.subjectsMap();
    
    const subjectGroups: Map<string, SubjectGroup> = new Map();

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

        // Get or create subject group
        let subjectGroup = subjectGroups.get(subject.id);
        if (!subjectGroup) {
            subjectGroup = { subject, chapters: [] };
            subjectGroups.set(subject.id, subjectGroup);
        }

        // Get or create chapter group
        let chapterGroup = subjectGroup.chapters.find(c => c.chapter.id === chapter.id);
        if (!chapterGroup) {
            chapterGroup = { chapter, guides: [] };
            subjectGroup.chapters.push(chapterGroup);
        }
        
        chapterGroup.guides.push(enrichedGuide);
    }
    
    // Sort chapters and subjects
    const sortedGroups = Array.from(subjectGroups.values());
    sortedGroups.forEach(sg => {
        sg.chapters.sort((a, b) => a.chapter.name.localeCompare(b.chapter.name));
        // Sort guides within each chapter by subchapter name for consistent ordering
        sg.chapters.forEach(cg => {
            cg.guides.sort((a, b) => a.subchapterName.localeCompare(b.subchapterName));
        });
    });
    sortedGroups.sort((a, b) => a.subject.name.localeCompare(b.subject.name));

    return sortedGroups;
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
