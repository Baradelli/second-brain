export interface GuideQuestion {
  id: string;
  labelId: string;
  text: string;
  order: number;
  active: boolean;
}

export interface GuideQuestionLabel {
  id: string;
  userId: string;
  name: string;
}

export interface SuggestedQuestionsGroup {
  label: { id: string; name: string };
  questions: GuideQuestion[];
}
