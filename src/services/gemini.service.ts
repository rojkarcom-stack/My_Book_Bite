
import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Question, Language } from '../models';
import { TranslationService } from './translation.service';

export interface QuestionGenerationParams {
    textContent: string;
    language: Language;
    grade: number;
    branch?: 'scientific' | 'literary';
    subject: string;
    chapter: string;
    subchapter: string;
    count: number;
    images?: { data: string; mimeType: string }[];
    useCheapModel?: boolean;
}

export interface VariationGenerationParams {
  question: Question;
  language: Language;
  count: number;
}

export interface ExplanationParams {
    language: Language;
    grade: number;
    question: Question;
    userAnswer: string;
}

export interface HintParams {
  question: Question;
  language: Language;
}

export interface StudyGuideGenerationParams {
    context: string;
    language: Language;
    grade: number;
    subject: string;
    chapter: string;
    subchapter: string;
    images?: { data: string; mimeType: string }[];
    skipImages?: boolean;
    useCheapModel?: boolean;
}

export interface StudyGuideContentGenerationParams {
    context: string;
    language: Language;
    grade: number;
    subject: string;
    chapter: string;
    subchapter: string;
    images?: { data: string; mimeType: string }[];
    skipImages?: boolean;
    useCheapModel?: boolean;
}

export interface AlternateExplanationParams {
  text: string;
  language: Language;
  grade: number;
  mode: 'simple' | 'analogy' | 'real-world';
}

export interface FlashcardGenerationParams {
  htmlContent: string;
  language: Language;
  grade: number;
}

export interface AskAboutGuideParams {
  htmlContent: string;
  question: string;
  language: Language;
  grade: number;
}

export interface VisualsGenerationParams {
  htmlContent: string;
  language: Language;
  grade: number;
  subject: string;
  chapter: string;
  subchapter: string;
  useCheapModel?: boolean;
}

export interface CurriculumGenerationParams {
  grade: number;
  language: Language;
  subjectDescription: string;
  branch: 'scientific' | 'literary' | null;
  useCheapModel?: boolean;
}

export interface CurriculumFromTextGenerationParams {
  grade: number;
  language: Language;
  contextText: string;
  branch: 'scientific' | 'literary' | null;
  useCheapModel?: boolean;
}

export interface AiGeneratedCurriculum {
  subjectName: string;
  chapters: {
    name: string;
    subchapters: {
      name: string;
      source_text: string;
      page_numbers: number[];
    }[];
  }[];
}


export interface Flashcard {
  term: string;
  definition: string;
}

// A stricter type for what we expect from the AI for questions
export type AiGeneratedQuestion = Pick<Question, 'text' | 'options' | 'correctAnswerIndex' | 'explanation'>;

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private t = inject(TranslationService);
  private getAI() {
    return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  async ensureApiKey(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const aistudio = (window as any).aistudio;
      if (!(await aistudio.hasSelectedApiKey())) {
        await aistudio.openSelectKey();
      }
    }
  }

  private getLanguageName(lang: Language): string {
    return this.t.translate(`languages.${lang}`);
  }

  private getKurdishBadiniInstructions(): string {
    return `
    **SPECIAL INSTRUCTIONS FOR KURDISH BADINI (DUHOK DIALECT):**
    1.  **Correct Dialect:** You MUST use the specific Duhok Kurdish (Badini) dialect. Use vocabulary, grammar, and expressions common in Duhok.
    2.  **Orthography & Letter Connection:** Pay extreme attention to letter connections. In the input text, letters may be incorrectly connected or disconnected. You must fix these errors in your output so that the Kurdish text is perfectly joined and spelled correctly according to standard Kurdish orthography.
    3.  **Linguistic Precision:** Ensure the tone is academically appropriate for the grade level while remaining faithful to the Badini dialect nuances.
    `;
  }

  private async callGeminiWithRetry<T>(operation: () => Promise<T>, maxRetries = 5): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        console.warn(`Gemini API call failed (attempt ${attempt}/${maxRetries}):`, error);
        
        let errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        
        // Unpack nested errors if they exist inside the thrown object
        let parsedMessage = '';
        try {
          if (typeof errorMessage === 'string' && errorMessage.trim().startsWith('{')) {
            const parsedErr = JSON.parse(errorMessage);
            parsedMessage = parsedErr.error?.message || parsedErr.message || '';
            if (parsedMessage) {
              errorMessage += ` (${parsedMessage})`;
            }
          }
        } catch (_) {}

        const status = error?.status || error?.code || error?.error?.status || error?.error?.code;
        const isRetryable = status === 503 || status === 429 || status === 'RESOURCE_EXHAUSTED' || status === 'UNAVAILABLE' || status === 500 || status === 'INTERNAL' ||
                            errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('500') ||
                            errorMessage.includes('UNAVAILABLE') || errorMessage.includes('RESOURCE_EXHAUSTED') ||
                            errorMessage.includes('quota') || errorMessage.includes('limit') ||
                            errorMessage.includes('high demand') || errorMessage.includes('Internal Server Error');
        
        if (isRetryable && attempt < maxRetries) {
          // Substantially increase the base delay for 429 rate limit or quota errors to allow cooldown window
          let baseDelay = 1000;
          if (errorMessage.includes('high demand') || errorMessage.includes('UNAVAILABLE')) {
            baseDelay = 3000;
          } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
            baseDelay = 5000; // 5-second base delay with exponential backoff (e.g. 10s, 20s, 40s) to survive rate limit windows
          }
          
          const delayMs = Math.pow(2, attempt) * baseDelay + Math.random() * 1000;
          console.log(`Resource exhausted / Rate limit hit. Retrying in ${Math.round(delayMs)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // Extract a cleaner error message if possible
          let finalError = error;
          if (typeof error === 'object' && error !== null) {
             const nestedMsg = (error as any).error?.message || (error as any).message;
             if (nestedMsg) {
                finalError = new Error(nestedMsg);
                (finalError as any).status = error.status;
                (finalError as any).code = error.code;
             }
          }
          throw finalError;
        }
      }
    }
    throw new Error('Max retries reached');
  }

  private shuffleQuestionOptions(question: AiGeneratedQuestion): AiGeneratedQuestion {
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

  private isValidQuestionFormat(q: any): q is AiGeneratedQuestion {
    return (
        typeof q === 'object' &&
        q !== null &&
        typeof q.text === 'string' &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.every((opt: any) => typeof opt === 'string') &&
        typeof q.correctAnswerIndex === 'number' &&
        q.correctAnswerIndex >= 0 &&
        q.correctAnswerIndex < 4 &&
        'explanation' in q && (typeof q.explanation === 'string' || q.explanation === null)
    );
  }

  private cleanJsonString(str: string): string {
    if (!str) return '';
    
    // Remove potential markdown backticks
    let cleaned = str.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }

    // Remove actual null bytes and other common non-printable characters that break JSON.parse
    cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

    // ---------------------------------------------------------
    // LaTeX & Backslash Protection Logic
    // ---------------------------------------------------------
    
    // Protect valid JSON escapes first: \", \\, \/, \b, \f, \n, \r, \t
    const protectedEscapes: { [key: string]: string } = {
      '\\"': '___ESCAPED_QUOTE___',
      '\\\\': '___ESCAPED_BACKSLASH___',
      '\\/': '___ESCAPED_SLASH___',
      '\\b': '___ESCAPED_B___',
      '\\f': '___ESCAPED_F___',
      '\\n': '___ESCAPED_N___',
      '\\r': '___ESCAPED_R___',
      '\\t': '___ESCAPED_T___'
    };

    for (const [key, placeholder] of Object.entries(protectedEscapes)) {
      const escapedKey = key.replace(/\\/g, '\\\\');
      cleaned = cleaned.replace(new RegExp(escapedKey, 'g'), placeholder);
    }
    
    // Protect valid unicode escapes (\uXXXX)
    cleaned = cleaned.replace(/\\u([0-9a-fA-F]{4})/g, '___UNICODE_$1___');

    // Any remaining single backslash is likely a missing escape (often in LaTeX)
    cleaned = cleaned.replace(/\\/g, '\\\\');

    // Restore protected escapes
    for (const [key, placeholder] of Object.entries(protectedEscapes)) {
      cleaned = cleaned.replace(new RegExp(placeholder, 'g'), key);
    }
    cleaned = cleaned.replace(/___UNICODE_([0-9a-fA-F]{4})___/g, '\\u$1');

    // ---------------------------------------------------------
    // Final Sanitization
    // ---------------------------------------------------------

    // Remove any remaining invalid unicode escapes that specifically break JSON.parse
    // JSON strictly requires \u followed by 4 hex digits.
    // 1. Fix ES6 style unicode escapes \u{XXXX} which are not valid in standard JSON
    cleaned = cleaned.replace(/\\u\{([0-9a-fA-F]+)\}/g, 'u$1');
    // 2. Fix partial/invalid \u escapes
    cleaned = cleaned.replace(/\\u(?![0-9a-fA-F]{4})/g, 'u');

    // Handle potential truncation by attempting to find the last valid object in an array
    if (cleaned.startsWith('[')) {
      // Try to parse the whole thing first
      try {
        JSON.parse(cleaned);
      } catch (e) {
        // If it fails, try to find the last } and close the array there
        let lastObjEnd = cleaned.lastIndexOf('}');
        while (lastObjEnd !== -1) {
          const trial = cleaned.substring(0, lastObjEnd + 1).trim() + ']';
          try {
            JSON.parse(trial);
            cleaned = trial;
            break;
          } catch (innerErr) {
            // Keep looking for previous object ends
            lastObjEnd = cleaned.lastIndexOf('}', lastObjEnd - 1);
          }
        }
      }
    } else if (cleaned.startsWith('{')) {
      // Handle single object truncation
      try {
        JSON.parse(cleaned);
      } catch (e) {
        let lastObjEnd = cleaned.lastIndexOf('}');
        while (lastObjEnd !== -1) {
          const trial = cleaned.substring(0, lastObjEnd + 1).trim();
          try {
            JSON.parse(trial);
            cleaned = trial;
            break;
          } catch (innerErr) {
            lastObjEnd = cleaned.lastIndexOf('}', lastObjEnd - 1);
          }
        }
      }
    }

    return cleaned;
  }

  async reviseText(text: string, language: Language): Promise<string> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(language);
    
    let prompt = `You are a meticulous proofreader specializing in educational content. Your task is to correct spelling, grammar, and punctuation errors in the following text.

**Crucial Instructions:**
1.  **Correct, Don't Rewrite:** Fix only clear errors. Do NOT change the original wording, style, or sentence structure unless it's grammatically incorrect.
2.  **Preserve Meaning:** The core meaning and all technical terms must remain exactly the same.
3.  **No Additions or Deletions:** Do not add new information or remove existing sentences.
4.  **Format:** Output only the corrected text. Do not include any explanations, apologies, or introductory phrases.
`;

    if (isRtl) {
      prompt += `5.  **Number Formatting:** For numbers with signs, ensure the sign is on the left (e.g., "-5", not "5-").\n`;
      prompt += `6.  **CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.\n`;
    }

    if (language === 'ku_badini') {
      prompt += this.getKurdishBadiniInstructions();
    }

    prompt += `
The text to be corrected is in ${languageName}.

---
Original Text:
${text}
---
Corrected Text:`;

    try {
      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      }));
      return response.text.trim();
    } catch (error) {
      console.error('Error revising text with AI:', error);
      throw new Error(this.t.translate('gemini.revisionError'));
    }
  }

  async suggestQuestionCount(textContent: string): Promise<string> {
    await this.ensureApiKey();
    const prompt = `Analyze the following text content. Based on its information density, key concepts, and overall length, suggest an optimal number of multiple-choice questions for a comprehensive quiz. Your response must be a concise string, like '8-12 questions' or 'around 20 questions'. Do not add any conversational filler or explanation.

    Text to analyze:
    ---
    ${textContent}
    ---
    `;

    try {
      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      }));
      return response.text.trim();
    } catch (error) {
      console.error('Error suggesting question count:', error);
      // Return a generic suggestion on error to avoid breaking the UI flow.
      return this.t.translate('gemini.questionSuggestionFallback'); 
    }
  }

  async generateQuestions(params: QuestionGenerationParams): Promise<AiGeneratedQuestion[]> {
    const CHUNK_SIZE = 15; // Reduced from 30 to avoid token limits and potential truncation issues.
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    const allGeneratedQuestions: AiGeneratedQuestion[] = [];
    let remainingQuestions = params.count;

    while (remainingQuestions > 0) {
        await this.ensureApiKey();
        const questionsToGenerate = Math.min(remainingQuestions, CHUNK_SIZE);
        
        let prompt = `
        Your task is to act as an expert educator.
        1. First, carefully review the following text for any spelling or grammatical errors and internally correct them. Do not output the corrected text.
        2. Using the corrected version of the text as context, generate ${questionsToGenerate} multiple-choice question(s) suitable for a grade ${params.grade} student studying the subject "${params.subject}", chapter "${params.chapter}", and specifically the topic "${params.subchapter}" in ${languageName}.
        
        CRITICAL TOPIC RELEVANCE: While you are provided with text content, you MUST ONLY generate questions that directly relate to the specific topic of the subchapter: "${params.subchapter}".
        - If the provided text contains information about other topics or subchapters, DISREGARD that information when creating questions.
        - Every question must be a perfect fit for the subchapter "${params.subchapter}".
        
        CRITICAL INSTRUCTION: You MUST adapt your writing style, formatting, and terminology to perfectly match the specific subject matter ("${params.subject}"). 
        - For example, if the subject is Chemistry, use standard chemical notation, formulas, and scientific terminology. 
        - If the subject is English Language, focus on grammar rules, linguistic nuances, vocabulary, and literary devices.
        - If the subject is Mathematics, use precise mathematical language, step-by-step proofs, and LaTeX formatting for equations.
        - If the subject is History, focus on chronological events, historical context, and primary sources.
        The questions and explanations must feel like they were written by an expert teacher of that specific subject.

        Rules for question generation:
        - The questions must be derived strictly from the provided text. Do not use any external information.
        - The input text may contain mathematical formulas in LaTeX notation and detailed descriptions of images or diagrams. Use these to generate high-quality questions that test understanding of both the text and the visual/mathematical concepts described.
        - The question text itself must NOT reference the provided text (e.g., do not say "According to the text..." or "Based on the figure...").
        - Each question must have exactly 4 options.
        - CRITICAL: Randomize the position of the correct answer among the 4 options (correctAnswerIndex should be 0, 1, 2, or 3 with equal probability).
        - For each question, provide a clear explanation. The explanation must first state why the correct answer is correct, and then briefly explain why each of the other three options is incorrect. Do NOT refer to options by their index or letter (e.g., do not say "Option A is correct") in the explanation; refer to them by their content.
        - The explanation should directly explain the concept and must NOT reference the provided text (e.g., do not say "Based on the provided text...").
        - **JSON SAFETY:** Do NOT use excessive special characters or repeating symbols. Ensure the output is a clean, valid JSON array.
        - **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau" and "\\\\sin" instead of "\\sin"). This ensures the JSON is valid and the backslash is preserved after parsing.
        - **UNICODE SAFETY:** Avoid using unicode escape sequences like "\\uXXXX" unless absolutely necessary. Prefer literal UTF-8 characters for Kurdish/Arabic text. Do NOT use the "\\u{XXXX}" format.
        `;

        if (isRtl) {
          prompt += `- CRITICAL FORMATTING RULE FOR ${languageName.toUpperCase()}: For any numbers with a sign (positive or negative), the sign MUST be placed to the left of the number. For example, write "-5" not "5-". This is essential for correct display in a right-to-left context.\n`;
          prompt += `- CRITICAL RULE FOR MATH/FORMULAS: DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.\n`;
        }

        if (params.language === 'ku_badini') {
          prompt += this.getKurdishBadiniInstructions();
        }

        if (allGeneratedQuestions.length > 0) {
            prompt += `
            IMPORTANT: You have already generated the following questions. Do not repeat them or create very similar ones.
            Previously generated questions:
            ${allGeneratedQuestions.map(q => `- "${q.text}"`).join('\n')}
            `;
        }

        prompt += `
        The final output must be only a JSON array of questions, with no other text, comments, or markdown formatting.
        
        Text to use:
        ---
        ${params.textContent}
        ---
        `;

        const imageParts = params.images?.map(img => ({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType
          }
        })) || [];

        const contents = imageParts.length > 0 
          ? { parts: [...imageParts, { text: prompt }] }
          : prompt;

        let jsonStrToParse = '';
        try {
            const useCheap = params.useCheapModel !== false; // Default to true for cost optimization
            const modelName = useCheap ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';
            const thinkingConfig = useCheap ? { thinkingLevel: ThinkingLevel.LOW } : { thinkingLevel: ThinkingLevel.HIGH };
            const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
                model: modelName,
                contents: contents,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    minItems: 4,
                                    maxItems: 4,
                                },
                                correctAnswerIndex: { type: Type.INTEGER, minimum: 0, maximum: 3 },
                                explanation: { type: Type.STRING, description: 'A brief explanation of why the correct answer is correct and why the others are wrong.' },
                            },
                            required: ['text', 'options', 'correctAnswerIndex', 'explanation'],
                        },
                    },
                    thinkingConfig
                },
            }));

            jsonStrToParse = this.cleanJsonString(response.text);

            const generatedChunk = JSON.parse(jsonStrToParse);

            if (Array.isArray(generatedChunk) && generatedChunk.every(this.isValidQuestionFormat)) {
                const shuffledChunk = generatedChunk.map(q => this.shuffleQuestionOptions(q));
                allGeneratedQuestions.push(...shuffledChunk);
                remainingQuestions -= generatedChunk.length;
                if (generatedChunk.length === 0 && remainingQuestions > 0) {
                    // Prevent infinite loop if the model stops returning questions
                    console.warn('AI returned an empty array while more questions were expected. Stopping generation.');
                    break;
                }
            } else {
                console.error('AI response chunk is not in the expected format:', generatedChunk);
                throw new Error(this.t.translate('gemini.invalidFormat'));
            }
        } catch (error) {
            console.error('Error generating a chunk of questions with AI:', error);
            if (jsonStrToParse) {
                console.error('Failed to parse JSON from the following response text chunk:', jsonStrToParse);
                // Log a snippet of the problematic area if possible
                const errorMsg = error instanceof Error ? error.message : String(error);
                if (errorMsg.includes('position')) {
                  const posMatch = errorMsg.match(/position (\d+)/);
                  if (posMatch) {
                    const pos = parseInt(posMatch[1], 10);
                    console.error('Error context around position:', jsonStrToParse.substring(Math.max(0, pos - 50), Math.min(jsonStrToParse.length, pos + 50)));
                  }
                }
            }
            // Stop on first error to avoid making more failing requests.
            const originalMessage = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
            let errorDetails = '';
            if (originalMessage) {
              try {
                if (originalMessage.startsWith('{')) {
                  const parsed = JSON.parse(originalMessage);
                  errorDetails = parsed.error?.message || parsed.message || originalMessage;
                } else {
                  errorDetails = originalMessage;
                }
              } catch (_) {
                errorDetails = originalMessage;
              }
            }
            throw new Error(`${this.t.translate('gemini.generationFailed')} ${errorDetails ? `(${errorDetails})` : ''}`);
        }
    }

    return allGeneratedQuestions.slice(0, params.count); // Ensure we don't exceed the requested count
  }

  async generateQuestionVariations(params: VariationGenerationParams): Promise<AiGeneratedQuestion[]> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const originalCorrectAnswer = params.question.options[params.question.correctAnswerIndex];
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);

    let prompt = `
    You are an expert quiz designer. Your task is to generate ${params.count} variations of the following multiple-choice question in ${languageName}.
    The variations must test the exact same concept as the original question but should be worded differently.
    
    **Original Question:**
    - Text: "${params.question.text}"
    - Options: ${JSON.stringify(params.question.options)}
    - Correct Answer: "${originalCorrectAnswer}"

    **Rules for Variations:**
    1.  Rephrase the question text.
    2.  Rephrase the options, including both correct and incorrect ones.
    3.  The conceptual correct answer must remain the same, even if the wording changes.
    4.  Each variation must have exactly 4 options.
    5.  CRITICAL: Randomize the position of the correct answer among the 4 options (correctAnswerIndex should be 0, 1, 2, or 3 with equal probability).
    6.  For each variation, provide a clear, direct explanation. The explanation must first state why the correct answer is correct, and then briefly explain why each of the other three options is incorrect. Do NOT refer to options by their index or letter (e.g., do not say "Option A is correct") in the explanation; refer to them by their content.
    7.  The explanation must not reference the original question text (e.g., do not say "As stated in the question...").
    8.  **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau" and "\\\\sin" instead of "\\sin"). This ensures the JSON is valid and the backslash is preserved after parsing.
    9.  **UNICODE SAFETY:** Avoid using unicode escape sequences like "\\uXXXX" unless absolutely necessary. Prefer literal UTF-8 characters for Kurdish/Arabic text. Do NOT use the "\\u{XXXX}" format.
    10. IMPORTANT: Ensure all double quotes within any string value (like in "text" or "explanation") are properly escaped with a backslash (e.g., "some text with a \\"quote\\"").
    `;

    if (isRtl) {
      prompt += `10. **CRITICAL FORMATTING for ${languageName.toUpperCase()}:** For any numbers with a sign (+/-), the sign MUST be placed to the left of the number (e.g., -5). Do not place it on the right (e.g., 5-). This is for correct display in right-to-left languages.\n`;
      prompt += `11. **CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.\n`;
      prompt += `12. The response must be only a JSON array of questions, with no other text or markdown formatting.\n`;
    } else {
      prompt += `10. The response must be only a JSON array of questions, with no other text or markdown formatting.\n`;
    }

    if (params.language === 'ku_badini') {
      prompt += this.getKurdishBadiniInstructions();
    }
    
    let jsonStrToParse = '';
    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            options: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                minItems: 4,
                                maxItems: 4,
                            },
                            correctAnswerIndex: { type: Type.INTEGER, minimum: 0, maximum: 3 },
                            explanation: { type: Type.STRING },
                        },
                        required: ['text', 'options', 'correctAnswerIndex', 'explanation'],
                    },
                },
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            },
        }));
        
        jsonStrToParse = this.cleanJsonString(response.text);

        const generated = JSON.parse(jsonStrToParse);

        if (Array.isArray(generated) && generated.every(this.isValidQuestionFormat)) {
            return generated.map(q => this.shuffleQuestionOptions(q));
        } else {
            console.error('AI variation response is not in the expected format:', generated);
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }

    } catch (error) {
        console.error('Error generating question variations with AI:', error);
        if (jsonStrToParse) {
          console.error('Failed to parse JSON from the following response text:', jsonStrToParse);
          // Log a snippet of the problematic area if possible
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.includes('position')) {
            const posMatch = errorMsg.match(/position (\d+)/);
            if (posMatch) {
              const pos = parseInt(posMatch[1], 10);
              console.error('Error context around position:', jsonStrToParse.substring(Math.max(0, pos - 50), Math.min(jsonStrToParse.length, pos + 50)));
            }
          }
        }
        throw new Error(this.t.translate('gemini.variationFailed'));
    }
  }

  async getExplanation(params: ExplanationParams): Promise<string> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    const correctAnswer = params.question.options[params.question.correctAnswerIndex];

    let prompt = `I am a grade ${params.grade} student studying in ${languageName}.
    For the question: "${params.question.text}"
    My answer was: "${params.userAnswer}".
    The correct answer is: "${correctAnswer}".
    
    Please explain the concept directly. Explain why "${correctAnswer}" is the right answer and why my choice, "${params.userAnswer}", was incorrect.
    Keep the explanation clear, concise, and suitable for my grade level. Do not start by saying "The correct answer is...". Instead, begin the explanation of the concept immediately.`;

    if (isRtl) {
      prompt += `\n**IMPORTANT FORMATTING:** For any numbers with a sign (e.g., -10), you MUST place the sign on the LEFT of the number. Writing "10-" is incorrect.`;
      prompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      prompt += this.getKurdishBadiniInstructions();
    }

    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        }));
        return response.text;
    } catch (error) {
        console.error('Error getting explanation from AI:', error);
        throw new Error(this.t.translate('gemini.explanationError'));
    }
  }

  async getHint(params: HintParams): Promise<string> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);

    let prompt = `You are a helpful teaching assistant. For the following multiple-choice question, provide a short, one-sentence hint that guides the student toward the correct answer without directly revealing it or mentioning the correct option letter/text. The hint should be in ${languageName}.
    
    Question: "${params.question.text}"
    Options:
    A: ${params.question.options[0]}
    B: ${params.question.options[1]}
    C: ${params.question.options[2]}
    D: ${params.question.options[3]}`;

    if (isRtl) {
      prompt += `\n**Formatting Note:** For numbers with signs, put the sign on the left (e.g., -5), not the right (5-).`;
      prompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        }));
        return response.text;
    } catch (error) {
        console.error('Error getting hint from AI:', error);
        throw new Error(this.t.translate('gemini.hintError'));
    }
  }
  
  async extractTextFromImages(imageParts: {data: string, mimeType: string}[], progressCallback?: (processed: number) => void, useCheapModel?: boolean): Promise<string> {
    const prompt = `**CRITICAL MISSION: YOU ARE A HIGH-PRECISION CONTENT EXTRACTION ENGINE.** Your task is to extract EVERYTHING from the provided image(s) with maximum fidelity.

**MANDATORY DIRECTIVES:**
1.  **TEXT EXTRACTION:** Transcribe all text *verbatim*. Maintain original structure, line breaks, and paragraphs.
2.  **MATHEMATICAL FUNCTIONS & FORMULAS:** Identify and transcribe all mathematical functions, equations, and formulas. Use LaTeX notation where appropriate for complex formulas to ensure precision.
3.  **IMAGE & DIAGRAM DESCRIPTION:** For every image, diagram, chart, or illustration, provide a detailed textual description that captures all the information it conveys. Do not skip any visual elements.
4.  **ABSOLUTELY NO SUMMARIZATION:** Do not summarize or interpret the content beyond what is necessary to describe visual elements. Your goal is to preserve all information.
5.  **EXPECT MULTIPLE LANGUAGES:** The content may be in English, Arabic, Kurdish (Sorani or Badini), or a mix. Extract all languages with high fidelity.
6.  **KURDISH BADINI (DUHOK):** If the text is in Kurdish Badini, ensure you correctly join letters that might be separated in the image or due to OCR errors. Maintain the Duhok dialect orthography.
7.  **EMPTY IMAGE PROTOCOL:** If an image contains absolutely no content, you MUST return an empty response.

Your entire output must consist **ONLY** of the extracted content (text, formulas, and descriptions). Any deviation will be considered a failure of the task.`;
    
    // Gemini has a limit on the number of image parts in a single request (usually 16).
    // Process images in chunks to be safe.
    const CHUNK_SIZE = 15;
    let processedCount = 0;
    
    const chunks = [];
    for (let i = 0; i < imageParts.length; i += CHUNK_SIZE) {
        chunks.push(imageParts.slice(i, i + CHUNK_SIZE));
    }

    const results: string[] = new Array(chunks.length).fill('');
    
    const useCheap = useCheapModel !== false; // Default to true
    const modelName = useCheap ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';
    const thinkingConfig = useCheap ? { thinkingLevel: ThinkingLevel.LOW } : { thinkingLevel: ThinkingLevel.HIGH };
    
    // Process chunks sequentially to minimize API load during high demand
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const geminiImageParts = chunk.map(part => ({
            inlineData: {
                mimeType: part.mimeType,
                data: part.data,
            },
        }));

        try {
            await this.ensureApiKey();
            const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
                model: modelName,
                contents: { parts: [{ text: prompt }, ...geminiImageParts] },
                config: { thinkingConfig }
            }), 10); // Increased retries for images
            
            results[chunkIndex] = response.text || '';
            
            processedCount += chunk.length;
            if (progressCallback) {
                progressCallback(processedCount);
            }
            
            // Small delay between chunks to be extra safe
            if (chunkIndex < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error(`Error processing image chunk starting at index ${chunkIndex * CHUNK_SIZE}:`, error);
            throw new Error(this.t.translate('admin.imageError'));
        }
    }
    
    return results.join('\n\n');
  }

  async proofreadQuestions(questions: AiGeneratedQuestion[], language: Language): Promise<AiGeneratedQuestion[]> {
    // Bypassed ensureApiKey check because Proofread All Questions uses the Monthly Pro Plan instead of custom user API key
    const languageName = this.getLanguageName(language);
    
    const CHUNK_SIZE = 5;
    const allCorrected: AiGeneratedQuestion[] = [];

    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      let prompt = `
        You are a meticulous proofreader specializing in educational content.
        Your task is to correct any spelling, grammar, and punctuation errors in the following JSON array of multiple-choice questions.

        **CRITICAL INSTRUCTIONS:**
        1.  **Correct, Don't Rewrite:** Fix only clear errors in "text", "options" (the strings inside), and "explanation". Do NOT change the original wording, style, or sentence structure unless it's grammatically incorrect.
        2.  **Preserve Structure:** Maintain the "correctAnswerIndex" exactly as it is.
        3.  **Educational Quality:** Ensure the content remains academically accurate.
        4.  **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau").
        5.  **NUMBER FORMATTING:** For ${languageName}, ensure any numbers with a sign (e.g., -5) have the sign on the LEFT.
        6.  **JSON ONLY:** Output ONLY the corrected JSON array. No explanations or conversational text.
      `;

      if (language === 'ku_badini') {
        prompt += this.getKurdishBadiniInstructions();
      }

      prompt += `
        Questions to proofread (in ${languageName}):
        ---
        ${JSON.stringify(chunk)}
        ---
      `;

      try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    minItems: 4,
                    maxItems: 4,
                  },
                  correctAnswerIndex: { type: Type.INTEGER, minimum: 0, maximum: 3 },
                  explanation: { type: Type.STRING },
                },
                required: ['text', 'options', 'correctAnswerIndex', 'explanation'],
              }
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        }));

        const cleanedJson = this.cleanJsonString(response.text);
        const correctedChunk = JSON.parse(cleanedJson);

        if (Array.isArray(correctedChunk) && correctedChunk.every(this.isValidQuestionFormat)) {
          allCorrected.push(...correctedChunk);
        } else {
          console.error('Invalid proofread format from AI:', correctedChunk);
          throw new Error('Invalid proofread format');
        }
      } catch (error) {
        console.error('Error in batch proofreading:', error);
        throw error;
      }
    }
    
    return allCorrected;
  }

  async autoCategorizeQuestions(
    questions: { id: string; text: string }[], 
    subchapters: { id: string; name: string }[]
  ): Promise<{ questionId: string; targetSubchapterId: string }[]> {
    await this.ensureApiKey();
    
    const CHUNK_SIZE = 15;
    const finalMappings: { questionId: string; targetSubchapterId: string }[] = [];

    const subchapterList = subchapters.map(s => `ID: ${s.id} | Name: ${s.name}`).join('\n');

    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      const prompt = `
        You are an expert curriculum organizer. 
        I have a list of questions that might be misplaced in their current subchapter.
        Your task is to analyze each question and determine which of the available target subchapters (from the list below) is the BEST fit for it.

        AVAILABLE TARGET SUBCHAPTERS:
        ---
        ${subchapterList}
        ---

        QUESTIONS TO CATEGORIZE:
        ---
        ${chunk.map(q => `ID: ${q.id} | Content: ${q.text}`).join('\n')}
        ---

        **INSTRUCTIONS:**
        1.  Carefully read each question.
        2.  Find the target subchapter whose title/topic most closely matches the question's content.
        3.  Return a JSON array of objects, each containing:
            - "questionId": The ID of the question.
            - "targetSubchapterId": The ID of the best-fitting subchapter.
        4.  OUTPUT ONLY THE JSON ARRAY.
      `;

      try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  targetSubchapterId: { type: Type.STRING }
                },
                required: ['questionId', 'targetSubchapterId']
              }
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        }));

        const cleanedJson = this.cleanJsonString(response.text);
        const mappedChunk = JSON.parse(cleanedJson);
        if (Array.isArray(mappedChunk)) {
            finalMappings.push(...mappedChunk);
        }
      } catch (error) {
        console.error('Error auto-categorizing questions:', error);
        throw new Error('AI failed to categorize questions');
      }
    }

    return finalMappings;
  }

  async identifyMisplacedQuestions(
    questions: { id: string; text: string }[],
    currentSubchapterName: string
  ): Promise<string[]> {
    await this.ensureApiKey();
    
    const CHUNK_SIZE = 25;
    const misplacedIds: string[] = [];

    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      const prompt = `
        You are a curriculum auditor. 
        The current subchapter is titled: "${currentSubchapterName}".
        
        Analyze the following questions and identify which ones DO NOT belong in this subchapter. 
        A question is misplaced if its topic is distinctly different from "${currentSubchapterName}".

        QUESTIONS:
        ---
        ${chunk.map(q => `ID: ${q.id} | Content: ${q.text}`).join('\n')}
        ---

        **INSTRUCTIONS:**
        1.  Return a JSON array containing ONLY the IDs of the questions that are MISPLACED.
        2.  If all questions belong, return an empty array [].
        3.  OUTPUT ONLY THE JSON ARRAY.
      `;

      try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        }));

        const cleanedJson = this.cleanJsonString(response.text);
        const chunkMisplaced = JSON.parse(cleanedJson);
        if (Array.isArray(chunkMisplaced)) {
            misplacedIds.push(...chunkMisplaced);
        }
      } catch (error) {
        console.error('Error identifying misplaced questions:', error);
        throw new Error('AI failed to identify misplaced questions');
      }
    }

    return misplacedIds;
  }

  async translateQuestions(questions: Question[], targetLanguage: Language): Promise<AiGeneratedQuestion[]> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(targetLanguage);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(targetLanguage);

    const CHUNK_SIZE = 5; // Reduced from 10 to further minimize 500 errors and timeout issues
    const allTranslated: AiGeneratedQuestion[] = [];

    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      const prompt = `
        You are an expert translator specializing in educational content.
        Translate the following JSON array of multiple-choice questions into ${languageName}.
        
        **CRITICAL INSTRUCTIONS:**
        1.  **Verbatim Translation:** Translate the "text", each string in the "options" array, and the "explanation" into ${languageName}.
        2.  **Preserve Structure:** Maintain the "correctAnswerIndex" exactly as it is.
        3.  **Educational Quality:** Ensure the translated content is academically accurate and suitable for students.
        4.  **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau"). This ensures the JSON is valid and the backslash is preserved after parsing. DO NOT translate common Latin/English variables in formulas (e.g., m, n, x, y) as MathJax cannot render RTL text correctly inside formulas.
        5.  **NUMBER FORMATTING:** For ${languageName}, ensure any numbers with a sign (e.g., -5) have the sign on the LEFT.
        6.  **JSON ONLY:** Output ONLY the translated JSON array. No explanations or conversational text.
        
        ${targetLanguage === 'ku_badini' ? this.getKurdishBadiniInstructions() : ''}

        Questions to translate:
        ---
        ${JSON.stringify(chunk.map(q => ({
          text: q.text,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          explanation: q.explanation
        })))}
        ---
      `;

      try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    minItems: 4,
                    maxItems: 4,
                  },
                  correctAnswerIndex: { type: Type.INTEGER, minimum: 0, maximum: 3 },
                  explanation: { type: Type.STRING },
                },
                required: ['text', 'options', 'correctAnswerIndex', 'explanation'],
              }
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          }
        }));

        const cleanedJson = this.cleanJsonString(response.text);
        const translatedChunk = JSON.parse(cleanedJson);

        if (Array.isArray(translatedChunk) && translatedChunk.every(this.isValidQuestionFormat)) {
          allTranslated.push(...translatedChunk);
        } else {
          console.error('Invalid translation format from AI:', translatedChunk);
          throw new Error('Invalid translation format');
        }
      } catch (error) {
        console.error('Error in batch translation:', error);
        throw error;
      }
    }

    return allTranslated;
  }

  /**
   * Translates a single piece of text to a target language.
   * Useful for names of chapters, subchapters, etc.
   */
  async translateText(text: string, targetLanguage: Language): Promise<string> {
    await this.ensureApiKey();
    const targetLanguageName = this.getLanguageName(targetLanguage);
    
    try {
      const prompt = `You are a translator. Translate the following text into ${targetLanguageName}. 
      Return ONLY the translated text, no explanation or extra content. 
      If the text is already in the target language or is a technical term that should stay in English, keep it as is.
      
      Text to translate:
      ${text}`;

      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }));

      return response.text.trim();
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Fallback to original
    }
  }

  async translateStudyGuide(guideHtml: string, targetLanguage: Language): Promise<string> {
    await this.ensureApiKey();
    const targetLanguageName = this.getLanguageName(targetLanguage);
    
    try {
      const prompt = `You are a professional educational content translator. 
      Translate the following study guide content from HTML into ${targetLanguageName}.
      
      RULES:
      1. CRITICAL: Preserve all HTML tags perfectly. Do not remove, add, or modify any HTML tags or their attributes.
      2. Keep mathematical formulas (LaTeX) exactly as they are. They are usually wrapped in spans or custom tags.
      3. Translate only the user-visible text content within the tags.
      4. Ensure the translation is formal and educational in tone.
      5. Return ONLY the translated HTML content.
      
      HTML to translate:
      ${guideHtml}`;

      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }));

      return response.text.trim();
    } catch (error) {
      console.error('Error translating study guide:', error);
      return guideHtml; // Fallback
    }
  }

  async generateStudyGuide(params: StudyGuideGenerationParams): Promise<{ guide_html: string; image_prompts: { id: string; prompt: string; }[]; }> {
    // Bypassed ensureApiKey check because Study Guide generation uses the Monthly Pro Plan instead of custom user API key
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);

    const systemInstruction = `You are an expert educator creating study materials. Your output MUST be a single, valid JSON object. Do NOT use markdown formatting. Your entire response must be only the raw JSON content.
    **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau"). This ensures the JSON is valid and the backslash is preserved after parsing.
    **UNICODE SAFETY:** Avoid using unicode escape sequences like "\\uXXXX" unless absolutely necessary. Prefer literal UTF-8 characters for Kurdish/Arabic text. Do NOT use the "\\u{XXXX}" format.`;

    let userPrompt = `
    Please generate a comprehensive study guide in ${languageName}.
    The materials are for a grade ${params.grade} student studying "${params.subject}", chapter "${params.chapter}", topic "${params.subchapter}".
    
    Base the entire guide on the following quiz questions and answers:
    ---
    ${params.context}
    ---
 

    Your JSON output must contain two keys: "guide_html" and "image_prompts".

    1.  **For "guide_html"**:
        -   The value must be a string of well-structured HTML body content (no \`<html>\`, \`<head>\`, or \`<body>\` tags).
        -   **STRUCTURE & DESIGN STANDARDS (To make layouts highly engaging, cohesive, and visually standardized across all subjects)**:
            * **Typography**: Start with the main topic \`<h2>\` (gets a beautiful gradient underline). Use \`<h3>\` for distinct sections (gets a purple dot bullet). Use \`<p>\` for short, punchy paragraphs. Keep walls of text to a minimum. Use bulleted lists (\`<ul>\`/\`<li>\`) or ordered lists (\`<ol>\`/\`<li>\`) for points and steps.
            * **Typography Highlight**: Use \`<code class="...">\` (renders beautiful light-purple/indigo inline badges) for important vocabulary terms, key names, values, or formula parts to make them stand out.
            * **Standardized Theme Containers (Semantic Callouts)**: Break the study guide into visually distinct sections using one of these unified \`<blockquote>\` classes (DO NOT invent custom classes, styles, or write plain unclassed blocks):
                - Key Takeaways: Use \`<blockquote class="takeaways">\` with a list inside for critical summaries/focus points. (Yellow/Amber Theme - ⭐)
                - Definitions & Principles: Use \`<blockquote class="definition">\` for formal term definitions, rules, laws, or formulas. (Cyan/Sky Theme - 📖)
                - Practical Examples & Steps: Use \`<blockquote class="example">\` for math solutions, science calculation examples, or hands-on practice guides. (Green/Emerald Theme - 📝)
                - Common Pitfalls & Warnings: Use \`<blockquote class="warning">\` to call out key common student errors, exam traps, or formulas to double-check. (Red/Rose Theme - ⚠️)
                - Memory Boosters & Concept Notes: Use \`<blockquote class="note">\` or a default \`<blockquote>\` for extra background information, tips, or trivia. (Indigo/Purple Theme - 💡)
            - Start the document with a "Key Takeaways" section inside a \`<blockquote class="takeaways">\` containing a \`<ul>\` of 3-5 critical study points.
            - Follow with the main content starting with an \`<h2>\` tag for the main topic segment.
        ${params.skipImages ? 
        `-   **VISUAL AIDS:** DO NOT generate any \`<img>\` tags or image placeholders. You may generate inline **SVG** code directly within the HTML for precise data, graphs, charts, or mathematical diagrams if absolutely necessary, but do not request external images.` : 
        `-   **VISUAL AIDS (Graphs, Charts, Diagrams, Illustrations):** Identify key concepts throughout the guide that would be best explained visually. You decide on the optimal number, size, and type of these visual aids (e.g., explanation graphs, charts, diagrams, etc.) to explain the concepts in the best possible quality for students. Generate as many visual aids as you think are necessary.
            - For precise data, graphs, charts, or mathematical diagrams, you may generate inline **SVG** code directly within the HTML. Ensure the SVG is responsive (e.g., \`width="100%" viewBox="..."\`) and clearly labeled **in English**.
            - For illustrations or scenes, insert a \`<figure>\` tag.
            - Inside the \`<figure>\`, place an \`<img>\` tag. This tag MUST have a unique \`id\` attribute (e.g., \`id="img-a1b2c3"\`) and an empty \`src\` attribute. Add a descriptive \`alt\` attribute.
            - Following the \`<img>\` or \`<svg>\` tag, inside the \`<figure>\`, add a \`<figcaption>\` tag. **CRUCIAL:** The text inside this \`<figcaption>\` MUST be written in ${languageName}.`}

    2.  **For "image_prompts"**:
        ${params.skipImages ? 
        `-   Since images are disabled, this MUST be an empty array [].` : 
        `-   This should be a JSON array of objects. If no images are needed, return an empty array [].
        -   For each \`<img>\` placeholder you created, create a corresponding object in this array.
        -   Each object must have two keys: "id" and "prompt".
        -   The "id" value must be the exact "id" of the \`<img>\` tag (e.g., "img-a1b2c3").
        -   The "prompt" value must be a detailed, descriptive prompt (in English) for an AI image generator to create a **clear and simple digital illustration**.
        -   **IMPORTANT:** Focus on describing the visual elements, shapes, and colors. **You MUST ask the image generator to include clear text labels pointing to the key parts of the diagram. IMPORTANT: All text and labels inside the figure MUST be in English.** Use the English equivalents of the names and parts mentioned in the study guide text. Do NOT add extra labels or information not found in the text.
        -   Example: \`[ { "id": "img-a1b2c3", "prompt": "A simple digital illustration of a plant cell, showing the nucleus, chloroplasts, and cell wall clearly with distinct colors. Friendly, educational vector art style, white background, with clear English labels: 'Nucleus', 'Chloroplast', 'Cell Wall'." } ]\``}
    `;

    if (isRtl) {
      userPrompt += `\n**IMPORTANT FOR ${languageName.toUpperCase()}:** Any numbers with a sign (e.g., -5) must have the sign on the LEFT.`;
      userPrompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding HTML text.`;
    }

    if (params.language === 'ku_badini') {
      userPrompt += this.getKurdishBadiniInstructions();
    }

    const imageParts = params.images?.map(img => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    })) || [];

    const contents = imageParts.length > 0 
      ? { parts: [...imageParts, { text: userPrompt }] }
      : userPrompt;

    try {
        const useCheap = params.useCheapModel !== false; // Default to true
        const modelName = useCheap ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';
        const thinkingConfig = useCheap ? { thinkingLevel: ThinkingLevel.LOW } : { thinkingLevel: ThinkingLevel.HIGH };
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      guide_html: { type: Type.STRING },
                      image_prompts: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  id: { type: Type.STRING },
                                  prompt: { type: Type.STRING }
                              },
                              required: ['id', 'prompt']
                          }
                      }
                  },
                  required: ['guide_html', 'image_prompts']
              },
              thinkingConfig
            },
        }));
        
        let jsonStr = this.cleanJsonString(response.text);
        const parsed = JSON.parse(jsonStr);

        if (typeof parsed.guide_html !== 'string' || !Array.isArray(parsed.image_prompts)) {
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }

        return {
            guide_html: parsed.guide_html,
            image_prompts: parsed.image_prompts,
        };
    } catch (error: any) {
        console.error('Error generating study guide:', error);
        const originalMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        let errorDetails = '';
        if (originalMessage) {
          try {
            if (originalMessage.startsWith('{')) {
              const parsed = JSON.parse(originalMessage);
              errorDetails = parsed.error?.message || parsed.message || originalMessage;
            } else {
              errorDetails = originalMessage;
            }
          } catch (_) {
            errorDetails = originalMessage;
          }
        }
        throw new Error(`${this.t.translate('gemini.studyGuideError')} ${errorDetails ? `(${errorDetails})` : ''}`);
    }
  }

  async generateStudyGuideFromContent(params: StudyGuideContentGenerationParams): Promise<{ guide_html: string; image_prompts: { id: string; prompt: string; }[]; }> {
    // Bypassed ensureApiKey check because Study Guide generation uses the Monthly Pro Plan instead of custom user API key
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);

    const systemInstruction = `You are an expert educator creating study materials. Your output MUST be a single, valid JSON object. Do NOT use markdown formatting. Your entire response must be only the raw JSON content.
    **LATEX & BACKSLASHES:** For any LaTeX formulas, you MUST use double backslashes for the commands in your JSON string (e.g., use "\\\\tau" instead of "\\tau"). This ensures the JSON is valid and the backslash is preserved after parsing.
    **UNICODE SAFETY:** Avoid using unicode escape sequences like "\\uXXXX" unless absolutely necessary. Prefer literal UTF-8 characters for Kurdish/Arabic text. Do NOT use the "\\u{XXXX}" format.`;

    let userPrompt = `
    Please generate a comprehensive study guide in ${languageName}.
    The materials are for a grade ${params.grade} student studying "${params.subject}", chapter "${params.chapter}", topic "${params.subchapter}".
    
    CRITICAL TOPIC RELEVANCE: While you are provided with text content, you MUST ONLY include information and topics that directly relate to the specific subchapter: "${params.subchapter}".
    - If the provided text contains information about other topics, chapters, or subchapters, DISREGARD that information when creating this guide.
    - The guide must focus strictly on ${params.subchapter} and not stray into other areas.
    
    CRITICAL INSTRUCTION: You MUST adapt your writing style, formatting, and terminology to perfectly match the specific subject matter ("${params.subject}"). 
    - For example, if the subject is Chemistry, use standard chemical notation, formulas, and scientific terminology. 
    - If the subject is English Language, focus on grammar rules, linguistic nuances, vocabulary, and literary devices.
    - If the subject is Mathematics, use precise mathematical language, step-by-step proofs, and LaTeX formatting for equations.
    - If the subject is History, focus on chronological events, historical context, and primary sources.
    The guide must feel like it was written by an expert teacher of that specific subject.
 

    ADDITIONAL REQUIREMENT: The study guide MUST be highly detailed and comprehensive. Do NOT skip any steps in explanations, proofs, or problem-solving processes. Break down complex concepts into thorough, easy-to-understand, step-by-step explanations.

    Base the entire guide on the following text content:
    ---
    ${params.context}
    ---

    NOTE: The input text may contain mathematical formulas in LaTeX notation and detailed descriptions of images or diagrams. Use these to generate a comprehensive guide that explains both the text and the visual/mathematical concepts described.

    Your JSON output must contain two keys: "guide_html" and "image_prompts".

    1.  **For "guide_html"**:
        -   The value must be a string of well-structured HTML body content (no \`<html>\`, \`<head>\`, or \`<body>\` tags).
        -   **STRUCTURE & DESIGN STANDARDS (To make layouts highly engaging, cohesive, and visually standardized across all subjects)**:
            * **Typography**: Start with the main topic \`<h2>\` (gets a beautiful gradient underline). Use \`<h3>\` for distinct sections (gets a purple dot bullet). Use \`<p>\` for short, punchy paragraphs. Keep walls of text to a minimum. Use bulleted lists (\`<ul>\`/\`<li>\`) or ordered lists (\`<ol>\`/\`<li>\`) for points and steps.
            * **Typography Highlight**: Use \`<code class="...">\` (renders beautiful light-purple/indigo inline badges) for important vocabulary terms, key names, values, or formula parts to make them stand out.
            * **Standardized Theme Containers (Semantic Callouts)**: Break the study guide into visually distinct sections using one of these unified \`<blockquote>\` classes (DO NOT invent custom classes, styles, or write plain unclassed blocks):
                - Key Takeaways: Use \`<blockquote class="takeaways">\` with a list inside for critical summaries/focus points. (Yellow/Amber Theme - ⭐)
                - Definitions & Principles: Use \`<blockquote class="definition">\` for formal term definitions, rules, laws, or formulas. (Cyan/Sky Theme - 📖)
                - Practical Examples & Steps: Use \`<blockquote class="example">\` for math solutions, science calculation examples, or hands-on practice guides. (Green/Emerald Theme - 📝)
                - Common Pitfalls & Warnings: Use \`<blockquote class="warning">\` to call out key common student errors, exam traps, or formulas to double-check. (Red/Rose Theme - ⚠️)
                - Memory Boosters & Concept Notes: Use \`<blockquote class="note">\` or a default \`<blockquote>\` for extra background information, tips, or trivia. (Indigo/Purple Theme - 💡)
            - Start the document with a "Key Takeaways" section inside a \`<blockquote class="takeaways">\` containing a \`<ul>\` of 3-5 critical study points.
            - Follow with the main content starting with an \`<h2>\` tag for the main topic segment.
        ${params.skipImages ? 
        `-   **VISUAL AIDS:** DO NOT generate any \`<img>\` tags or image placeholders. You may generate inline **SVG** code directly within the HTML for precise data, graphs, charts, or mathematical diagrams if absolutely necessary, but do not request external images.` : 
        `-   **VISUAL AIDS (Graphs, Charts, Diagrams, Illustrations):** Identify key concepts throughout the guide that would be best explained visually. You decide on the optimal number, size, and type of these visual aids (e.g., explanation graphs, charts, diagrams, etc.) to explain the concepts in the best possible quality for students. Generate as many visual aids as you think are necessary.
            - For precise data, graphs, charts, or mathematical diagrams, you may generate inline **SVG** code directly within the HTML. Ensure the SVG is responsive (e.g., \`width="100%" viewBox="..."\`) and clearly labeled **in English**.
            - For illustrations or scenes, insert a \`<figure>\` tag.
            - Inside the \`<figure>\`, place an \`<img>\` tag. This tag MUST have a unique \`id\` attribute (e.g., \`id="img-a1b2c3"\`) and an empty \`src\` attribute. Add a descriptive \`alt\` attribute.
            - Following the \`<img>\` or \`<svg>\` tag, inside the \`<figure>\`, add a \`<figcaption>\` tag. **CRUCIAL:** The text inside this \`<figcaption>\` MUST be written in ${languageName}.`}

    2.  **For "image_prompts"**:
        ${params.skipImages ? 
        `-   Since images are disabled, this MUST be an empty array [].` : 
        `-   This should be a JSON array of objects. If no images are needed, return an empty array [].
        -   For each \`<img>\` placeholder you created, create a corresponding object in this array.
        -   Each object must have two keys: "id" and "prompt".
        -   The "id" value must be the exact "id" of the \`<img>\` tag (e.g., "img-a1b2c3").
        -   The "prompt" value must be a detailed, descriptive prompt (in English) for an AI image generator to create a **clear and simple digital illustration**.
        -   **IMPORTANT:** Focus on describing the visual elements, shapes, and colors. **You MUST ask the image generator to include clear text labels pointing to the key parts of the diagram. IMPORTANT: All text and labels inside the figure MUST be in English.** Use the English equivalents of the names and parts mentioned in the study guide text. Do NOT add extra labels or information not found in the text.
        -   Example: \`[ { "id": "img-a1b2c3", "prompt": "A simple digital illustration of a plant cell, showing the nucleus, chloroplasts, and cell wall clearly with distinct colors. Friendly, educational vector art style, white background, with clear English labels: 'Nucleus', 'Chloroplast', 'Cell Wall'." } ]\``}
    `;

    if (isRtl) {
      userPrompt += `\n**IMPORTANT FOR ${languageName.toUpperCase()}:** Any numbers with a sign (e.g., -5) must have the sign on the LEFT.`;
      userPrompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding HTML text.`;
    }

    if (params.language === 'ku_badini') {
      userPrompt += this.getKurdishBadiniInstructions();
    }

    const imageParts = params.images?.map(img => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    })) || [];

    const contents = imageParts.length > 0 
      ? { parts: [...imageParts, { text: userPrompt }] }
      : userPrompt;

    try {
        const useCheap = params.useCheapModel !== false; // Default to true
        const modelName = useCheap ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview';
        const thinkingConfig = useCheap ? { thinkingLevel: ThinkingLevel.LOW } : { thinkingLevel: ThinkingLevel.HIGH };
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      guide_html: { type: Type.STRING },
                      image_prompts: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  id: { type: Type.STRING },
                                  prompt: { type: Type.STRING }
                              },
                              required: ['id', 'prompt']
                          }
                      }
                  },
                  required: ['guide_html', 'image_prompts']
              },
              thinkingConfig
            },
        }));
        
        let jsonStr = this.cleanJsonString(response.text);
        const parsed = JSON.parse(jsonStr);

        if (typeof parsed.guide_html !== 'string' || !Array.isArray(parsed.image_prompts)) {
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }

        return {
            guide_html: parsed.guide_html,
            image_prompts: parsed.image_prompts,
        };
    } catch (error: any) {
        console.error('Error generating study guide from content:', error);
        const originalMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        let errorDetails = '';
        if (originalMessage) {
          try {
            if (originalMessage.startsWith('{')) {
              const parsed = JSON.parse(originalMessage);
              errorDetails = parsed.error?.message || parsed.message || originalMessage;
            } else {
              errorDetails = originalMessage;
            }
          } catch (_) {
            errorDetails = originalMessage;
          }
        }
        throw new Error(`${this.t.translate('gemini.studyGuideError')} ${errorDetails ? `(${errorDetails})` : ''}`);
    }
  }
  
  async generateVisualsForStudyGuide(params: VisualsGenerationParams): Promise<{ updated_html: string; image_prompts: { id: string; prompt: string; }[]; }> {
    // Bypassed ensureApiKey check because Study Guide generation uses the Monthly Pro Plan instead of custom user API key
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);

    const systemInstruction = `You are an expert educator and visual designer. Your output MUST be a single, valid JSON object. Do NOT use markdown formatting. Your entire response must be only the raw JSON content.`;

    let userPrompt = `
    Analyze the following study guide content in ${languageName}.
    Your task is to identify key concepts that would be best explained visually and generate appropriate visual aids (graphs, charts, diagrams, or illustrations) to enhance student comprehension.
    
    The materials are for a grade ${params.grade} student studying "${params.subject}", chapter "${params.chapter}", topic "${params.subchapter}".
    
    Study Guide Content:
    ---
    ${params.htmlContent}
    ---

    Your JSON output must contain two keys: "updated_html" and "image_prompts".

    1.  **For "updated_html"**:
        -   The value must be the ENTIRE original HTML content, but with the new visual aids inserted at the most appropriate contextual locations within the text.
        -   **VISUAL AIDS (Graphs, Charts, Diagrams, Illustrations):** Identify key concepts that need visual explanation. You decide on the optimal number, size, and type of these visual aids.
        -   For precise data, graphs, charts, or mathematical diagrams, you may generate inline **SVG** code directly within the HTML. Ensure the SVG is responsive (e.g., \`width="100%" viewBox="..."\`) and clearly labeled **in English**.
        -   For illustrations or scenes, insert a \`<figure>\` tag at the relevant point in the text.
        -   Inside the \`<figure>\`, place an \`<img>\` tag. This tag MUST have a unique \`id\` attribute (e.g., \`id="vis-a1b2c3"\`) and an empty \`src\` attribute. Add a descriptive \`alt\` attribute.
        -   Following the \`<img>\` or \`<svg>\` tag, inside the \`<figure>\`, add a \`<figcaption>\` tag. **CRUCIAL:** The text inside this \`<figcaption>\` MUST be written in ${languageName}.
        -   DO NOT just append visuals at the end. Integrate them smoothly into the flow of the document.

    2.  **For "image_prompts"**:
        -   This should be a JSON array of objects. If no images are needed, return an empty array [].
        -   For each \`<img>\` placeholder you created, create a corresponding object in this array.
        -   Each object must have two keys: "id" and "prompt".
        -   The "id" value must be the exact "id" of the \`<img>\` tag.
        -   The "prompt" value must be a detailed, descriptive prompt (in English) for an AI image generator to create a **clear and simple digital illustration**.
        -   **IMPORTANT:** Focus on describing the visual elements, shapes, and colors. **You MUST ask the image generator to include clear text labels pointing to the key parts of the diagram. IMPORTANT: All text and labels inside the figure MUST be in English.** Use the English equivalents of the names and parts mentioned in the study guide text. Do NOT add extra labels or information not found in the text.
    `;

    if (isRtl) {
      userPrompt += `\n**IMPORTANT FOR ${languageName.toUpperCase()}:** Any numbers with a sign (e.g., -5) must have the sign on the LEFT.`;
    }

    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: params.useCheapModel !== false ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      updated_html: { type: Type.STRING },
                      image_prompts: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  id: { type: Type.STRING },
                                  prompt: { type: Type.STRING }
                              },
                              required: ['id', 'prompt']
                          }
                      }
                  },
                  required: ['updated_html', 'image_prompts']
              },
              thinkingConfig: { thinkingLevel: params.useCheapModel !== false ? ThinkingLevel.LOW : ThinkingLevel.HIGH }
            },
        }));
        
        const jsonStrToParse = this.cleanJsonString(response.text);
        const parsed = JSON.parse(jsonStrToParse);
        return {
            updated_html: parsed.updated_html,
            image_prompts: parsed.image_prompts,
        };
    } catch (error) {
        console.error('Error generating visuals for study guide:', error);
        throw new Error('Failed to generate visuals.');
    }
  }

  async generateImage(prompt: string): Promise<{ data: string; mimeType: string }> {
    try {
      // Bypassed ensureApiKey check because Premium image generation uses the Monthly Pro Plan instead of custom user API key
      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `${prompt}. Educational diagram, scientifically accurate, clear vector art style, white background, high resolution. IMPORTANT: Include clear, readable text labels pointing to the key parts and structures within the figure. **All labels and text in the image MUST be in English.** Use ONLY the terminology provided in the prompt. Do NOT add external information or extra labels.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: '4:3'
            }
          } as any,
      }));

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          return {
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png'
          };
        }
      }
      throw new Error('Image generation returned no images.');
    } catch (error) {
      console.error('Error generating image with Gemini:', error);
      throw new Error('Failed to generate image.');
    }
  }

  async getAlternateExplanation(params: AlternateExplanationParams): Promise<string> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    let instruction = '';

    switch (params.mode) {
      case 'simple':
        instruction = `Explain the following text as if you were talking to a 10-year-old. Be clear, simple, and concise.`;
        break;
      case 'analogy':
        instruction = `Provide a simple and relatable analogy to explain the main concept in the following text.`;
        break;
      case 'real-world':
        instruction = `Give a real-world example that illustrates the main point of the following text.`;
        break;
    }

    let prompt = `You are a helpful teaching assistant. Your audience is a grade ${params.grade} student. Your response must be in ${languageName}.

    ${instruction}
    `;

    if (isRtl) {
      prompt += `\n**Formatting Note:** For numbers with signs, put the sign on the left (e.g., -5), not the right (5-).`;
      prompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      prompt += this.getKurdishBadiniInstructions();
    }

    prompt += `
    ---
    Text to explain:
    "${params.text}"
    ---
    `;

    try {
      const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
      }));
      return response.text.trim();
    } catch (error) {
      console.error('Error getting alternate explanation from AI:', error);
      throw new Error(this.t.translate('gemini.explanationError'));
    }
  }

  async generateFlashcards(params: FlashcardGenerationParams): Promise<Flashcard[]> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    
    const systemInstruction = `You are an expert educator who specializes in creating study aids.
Your task is to analyze the provided HTML content of a study guide for a grade ${params.grade} student.
Extract the most important key terms and their concise definitions.
The final output must be only a JSON array, with no other text, comments, or markdown formatting.`;

    let userPrompt = `
    Analyze the following HTML content, which is a study guide in ${languageName}.
    Identify between 8 and 15 of the most crucial terms, concepts, or names.
    For each term, provide a clear and concise definition suitable for a grade ${params.grade} student.
    Return the result as a JSON array of objects, where each object has a "term" and a "definition" property.
    `;

    if (isRtl) {
      userPrompt += `\n**CRITICAL FORMATTING for ${languageName.toUpperCase()}:** Any numbers with signs (e.g., -5, +10) MUST have the sign on the left of the number. Writing "5-" is incorrect.`;
      userPrompt += `\n**CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      userPrompt += this.getKurdishBadiniInstructions();
    }

    userPrompt +=`
    HTML Content to analyze:
    ---
    ${params.htmlContent}
    ---
    `;
    
    let jsonStrToParse = '';
    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            term: { type: Type.STRING },
                            definition: { type: Type.STRING },
                        },
                        required: ['term', 'definition'],
                    },
                },
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            },
        }));

        jsonStrToParse = this.cleanJsonString(response.text);
        const generated = JSON.parse(jsonStrToParse);

        if (Array.isArray(generated) && generated.every(item => 'term' in item && 'definition' in item)) {
            return generated;
        } else {
            console.error('AI flashcard response is not in the expected format:', generated);
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }
    } catch (error) {
        console.error('Error generating flashcards with AI:', error);
        if (jsonStrToParse) {
            console.error('Failed to parse JSON from flashcard response:', jsonStrToParse);
        }
        throw new Error(this.t.translate('gemini.flashcardError'));
    }
  }

  async askAboutStudyGuide(params: AskAboutGuideParams): Promise<string> {
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    
    let systemInstruction = `You are a helpful and encouraging tutor for a grade ${params.grade} student.
Your sole purpose is to answer questions based *only* on the provided study guide text.
Your response MUST be in ${languageName}.
- If the answer is in the text, explain it clearly and concisely.
- If the answer is not in the text, you MUST state that the information is not available in the provided material, and you cannot answer. Do not use any external knowledge.`;

    if (isRtl) {
      systemInstruction += `\n- **CRITICAL FORMATTING:** For any numbers with signs (e.g., -5, +10), you MUST place the sign to the left of the number. Writing "5-" is incorrect.`;
      systemInstruction += `\n- **CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      systemInstruction += this.getKurdishBadiniInstructions();
    }
    
    const userPrompt = `
    Here is the study guide content:
    ---
    ${params.htmlContent}
    ---
    
    Here is my question: "${params.question}"
    
    Please answer my question based *only* on the study guide text provided above.
    `;

    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: { 
                systemInstruction,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
            },
        }));
        return response.text.trim();
    } catch (error) {
        console.error('Error asking about study guide:', error);
        throw new Error(this.t.translate('gemini.explanationError'));
    }
  }

  async generateCurriculumStructure(params: CurriculumGenerationParams): Promise<AiGeneratedCurriculum> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    const branchInfo = params.branch ? ` The branch is "${params.branch}".` : '';

    const systemInstruction = `You are an expert curriculum designer. Your task is to generate a logical course structure for a given subject. The final output must be only a JSON object matching the provided schema, with no other text or markdown formatting.`;

    let userPrompt = `
    Generate a curriculum structure in ${languageName} for a grade ${params.grade} subject described as: "${params.subjectDescription}".${branchInfo}

    Rules:
    - Create a concise and appropriate subject name based on the description.
    - Generate a logical list of chapters (between 5 and 10 chapters).
    - For each chapter, generate a list of relevant subchapters (between 3 and 7 subchapters).
    - All names (subject, chapters, subchapters) must be in ${languageName}.
    - For each subchapter, provide a concise summary or key points in the 'source_text' field that can serve as a basis for study materials.
    `;

    if (isRtl) {
      userPrompt += `\n- **Formatting Rule:** If any names contain numbers with signs, ensure the sign is on the left (e.g., -5, not 5-).`;
      userPrompt += `\n- **CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      userPrompt += this.getKurdishBadiniInstructions();
    }

    let jsonStrToParse = '';
    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: params.useCheapModel !== false ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: this.getCurriculumSchema(),
                thinkingConfig: { thinkingLevel: params.useCheapModel !== false ? ThinkingLevel.LOW : ThinkingLevel.HIGH }
            },
        }));
        jsonStrToParse = this.cleanJsonString(response.text);
        const generated = JSON.parse(jsonStrToParse);

        // Basic validation
        if (generated && typeof generated.subjectName === 'string' && Array.isArray(generated.chapters)) {
            return generated;
        } else {
            console.error('AI curriculum response is not in the expected format:', generated);
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }
    } catch (error) {
        console.error('Error generating curriculum structure with AI:', error);
        if (jsonStrToParse) {
            console.error('Failed to parse JSON from curriculum response:', jsonStrToParse);
        }
        throw new Error(this.t.translate('gemini.generationFailed'));
    }
  }

  async generateCurriculumFromText(params: CurriculumFromTextGenerationParams): Promise<AiGeneratedCurriculum> {
    await this.ensureApiKey();
    const languageName = this.getLanguageName(params.language);
    const isRtl = ['ar', 'ku_sorani', 'ku_badini'].includes(params.language);
    const branchInfo = params.branch ? ` The branch is "${params.branch}".` : '';

    const systemInstruction = `You are an expert curriculum designer. Your task is to analyze the provided text (likely a syllabus or table of contents) and generate a logical course structure. The final output must be only a JSON object matching the provided schema, with no other text or markdown formatting.`;

    let userPrompt = `
    Analyze the following text, which represents a curriculum for a grade ${params.grade} student in ${languageName}.${branchInfo}
    From this text, generate a complete curriculum structure.

    Rules:
    - Infer a concise and appropriate subject name from the text.
    - Identify the main sections or units and treat them as chapters.
    - Identify the topics within each chapter and treat them as subchapters.
    - All names (subject, chapters, subchapters) must be in ${languageName}.
    - For each subchapter, provide a brief summary of the topic in the 'source_text' field (do NOT extract the full text, just a 1-2 sentence summary to identify the topic).
    - For each subchapter, identify the exact page numbers from the original PDF that contain the content for that subchapter and include them in the 'page_numbers' field as an array of integers.
    `;

    if (isRtl) {
      userPrompt += `\n- **Formatting Rule:** If any names contain numbers with signs, ensure the sign is on the left (e.g., -5, not 5-).`;
      userPrompt += `\n- **CRITICAL RULE FOR MATH/FORMULAS:** DO NOT use Arabic or Kurdish text inside LaTeX/MathJax formulas (e.g., inside \\text{}). MathJax cannot render RTL text correctly. Instead, use standard Latin/English variables in the formulas (e.g., m = n / M) and explain the variables in the surrounding text.`;
    }

    if (params.language === 'ku_badini') {
      userPrompt += this.getKurdishBadiniInstructions();
    }

    userPrompt += `
    --- TEXT TO ANALYZE ---
    ${params.contextText}
    ---
    `;

    let jsonStrToParse = '';
    try {
        const response = await this.callGeminiWithRetry(() => this.getAI().models.generateContent({
            model: params.useCheapModel !== false ? 'gemini-3-flash-preview' : 'gemini-3.1-pro-preview',
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: this.getCurriculumSchema(),
                thinkingConfig: { thinkingLevel: params.useCheapModel !== false ? ThinkingLevel.LOW : ThinkingLevel.HIGH }
            },
        }));
        jsonStrToParse = this.cleanJsonString(response.text);
        const generated = JSON.parse(jsonStrToParse);

        if (generated && typeof generated.subjectName === 'string' && Array.isArray(generated.chapters)) {
            return generated;
        } else {
            console.error('AI curriculum response from text is not in the expected format:', generated);
            throw new Error(this.t.translate('gemini.invalidFormat'));
        }
    } catch (error) {
        console.error('Error generating curriculum from text with AI:', error);
        if (jsonStrToParse) {
            console.error('Failed to parse JSON from curriculum (from text) response:', jsonStrToParse);
        }
        throw new Error(this.t.translate('gemini.generationFailed'));
    }
  }

  private getCurriculumSchema() {
    return {
      type: Type.OBJECT,
      properties: {
          subjectName: { type: Type.STRING, description: 'A concise name for the subject.' },
          chapters: {
              type: Type.ARRAY,
              description: 'A list of chapters for the subject.',
              items: {
                  type: Type.OBJECT,
                  properties: {
                      name: { type: Type.STRING, description: 'The name of the chapter.' },
                      subchapters: {
                          type: Type.ARRAY,
                          description: 'A list of subchapters for this chapter.',
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  name: { type: Type.STRING, description: 'The name of the subchapter.' },
                                  source_text: { type: Type.STRING, description: 'The relevant text content from the source document for this specific subchapter.' },
                                  page_numbers: { 
                                      type: Type.ARRAY, 
                                      items: { type: Type.INTEGER },
                                      description: 'The page numbers from the original PDF that contain the content for this subchapter.' 
                                  }
                              },
                              required: ['name', 'source_text', 'page_numbers']
                          }
                      }
                  },
                  required: ['name', 'subchapters']
              }
          }
      },
      required: ['subjectName', 'chapters']
    };
  }
}
