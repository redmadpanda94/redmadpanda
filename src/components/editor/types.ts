import type { CategoryRow, MediaRow, QuestionRow } from "@/types/database";

export interface QuestionWithMedia extends QuestionRow {
  media: MediaRow[];
}

export interface CategoryWithQuestions extends CategoryRow {
  questions: QuestionWithMedia[];
}
