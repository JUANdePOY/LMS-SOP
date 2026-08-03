import { calculateScore } from "./scoring.service";

const DEFAULT_TIME_LIMIT = 1800;

export class QuizPlayerEngine {
  constructor(quiz, onSaveDraft) {
    this.quiz = quiz;
    this.onSaveDraft = onSaveDraft;
    this.answers = {};
    this.timeLimit = quiz.time_limit ?? DEFAULT_TIME_LIMIT;
    this.startedAt = Date.now();
  }

  setAnswer(questionId, value) {
    this.answers[questionId] = value;
  }

  getElapsedSeconds() {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  isTimeUp() {
    return this.timeLimit > 0 && this.getElapsedSeconds() >= this.timeLimit;
  }

  getResult(questions) {
    return calculateScore(this.answers, questions);
  }

  serialize() {
    return {
      answers: this.answers,
      startedAt: this.startedAt,
      elapsed: this.getElapsedSeconds(),
    };
  }

  async saveDraft() {
    if (typeof this.onSaveDraft === "function") {
      return this.onSaveDraft(this.serialize());
    }
  }
}

export default QuizPlayerEngine;
