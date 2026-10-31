import { describe, expect, it } from "vitest";
import { formatFrenchPhone, isValidFrenchPhone } from "./validation";

describe("téléphone français", () => {
  it("accepte les formats nationaux et internationaux", () => {
    expect(isValidFrenchPhone("06 12 34 56 78")).toBe(true);
    expect(isValidFrenchPhone("0612345678")).toBe(true);
    expect(isValidFrenchPhone("+33 6 12 34 56 78")).toBe(true);
    expect(isValidFrenchPhone("07.12.34.56.78")).toBe(true);
  });

  it("refuse les numéros invalides", () => {
    expect(isValidFrenchPhone("00 12 34 56 78")).toBe(false);
    expect(isValidFrenchPhone("061234567")).toBe(false);
    expect(isValidFrenchPhone("+44 7911 123456")).toBe(false);
  });

  it("normalise au format 0X XX XX XX XX", () => {
    expect(formatFrenchPhone("+33612345678")).toBe("06 12 34 56 78");
  });
});
