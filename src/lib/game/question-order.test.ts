import { describe, expect, it } from "vitest";
import { computeQuestionPositions } from "./question-order";

describe("computeQuestionPositions", () => {
  it("returns no changes when already in ascending point order", () => {
    const questions = [
      { id: "a", points: 100, position: 0 },
      { id: "b", points: 200, position: 1 },
      { id: "c", points: 300, position: 2 },
    ];
    expect(computeQuestionPositions(questions)).toEqual([]);
  });

  it("moves a later-added lower-value question ahead of higher-value ones", () => {
    const questions = [
      { id: "a", points: 100, position: 0 },
      { id: "b", points: 200, position: 1 },
      { id: "c", points: 300, position: 2 },
      { id: "d", points: 100, position: 3 },
      { id: "e", points: 200, position: 4 },
    ];
    expect(computeQuestionPositions(questions)).toEqual([
      { id: "d", position: 1 },
      { id: "b", position: 2 },
      { id: "e", position: 3 },
      { id: "c", position: 4 },
    ]);
  });

  it("keeps existing relative order for tied point values", () => {
    const questions = [
      { id: "a", points: 100, position: 0 },
      { id: "b", points: 100, position: 1 },
    ];
    expect(computeQuestionPositions(questions)).toEqual([]);
  });

  it("re-sorts after editing a question's points down", () => {
    const questions = [
      { id: "a", points: 100, position: 0 },
      { id: "b", points: 200, position: 1 },
      { id: "c", points: 50, position: 2 },
    ];
    expect(computeQuestionPositions(questions)).toEqual([
      { id: "c", position: 0 },
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ]);
  });
});
