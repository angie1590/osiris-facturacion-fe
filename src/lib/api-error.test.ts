import { describe, expect, it } from "vitest";
import { getApiErrorMessage, getApiFieldErrors, parseApiError } from "./api-error";

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

  it("extrae errores de campo en detail.fields", () => {
    const error = {
      response: {
        data: {
          detail: {
            code: "PRODUCT_REQUIRED_ATTRIBUTES_MISSING",
            message: "Faltan atributos obligatorios.",
            fields: { "atributos.attribute-1": "Este valor es obligatorio." },
          },
        },
      },
    };

    expect(getApiFieldErrors(error)).toEqual({
      "atributos.attribute-1": "Este valor es obligatorio.",
    });
    expect(parseApiError(error)).toEqual({
      code: "PRODUCT_REQUIRED_ATTRIBUTES_MISSING",
      message: "Faltan atributos obligatorios.",
    });
  });
});