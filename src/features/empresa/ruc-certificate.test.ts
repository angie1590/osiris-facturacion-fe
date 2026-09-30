import { beforeEach, describe, expect, it, vi } from "vitest";
import { previewSriRucCertificate } from "./hooks";

const post = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({ default: { post, get: vi.fn() } }));

describe("previewSriRucCertificate", () => {
  beforeEach(() => post.mockReset());

  it("envía el PDF como multipart al endpoint de empresa", async () => {
    const response = { ruc: "0103523908001" };
    post.mockResolvedValue({ data: response });
    const file = new File(["%PDF-1.4"], "certificado-ruc.pdf", {
      type: "application/pdf",
    });

    await expect(previewSriRucCertificate(file)).resolves.toEqual(response);
    expect(post).toHaveBeenCalledWith(
      "/empresas/importar-certificado-ruc",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const formData = post.mock.calls[0][1] as FormData;
    expect(formData.get("file")).toBe(file);
  });
});