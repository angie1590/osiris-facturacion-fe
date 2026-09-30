import { describe, expect, it } from "vitest";
import { getApiErrorMessage, parseApiError } from "./api-error";

describe("api errors", () => {
  it("normaliza detail de validación FastAPI como texto", () => {
    const error = {
      response: {
        data: {
          detail: [
            {
              type: "missing",
              loc: ["body", "file"],
              msg: "Field required",
              input: null,
            },
          ],
        },
      },
    };

    expect(parseApiError(error)).toEqual({
      code: undefined,
      message: "Field required",
    });
    expect(getApiErrorMessage(error, "Error genérico")).toBe("Field required");
  });
});