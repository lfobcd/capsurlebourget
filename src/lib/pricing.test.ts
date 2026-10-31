import { describe, expect, it } from "vitest";
import { computeFairPrice, exceedsCap, priceCap } from "./pricing";

describe("plafond de prix", () => {
  it("applique 0,08 € par km et par passager", () => {
    expect(priceCap(210)).toBe(16.8); // Lille
    expect(priceCap(15)).toBe(1.2); // Paris
  });

  it("ne dépasse jamais 45 €", () => {
    expect(priceCap(690)).toBe(45); // Toulouse : 55,20 → 45
    expect(priceCap(940)).toBe(45);
  });

  it("plafonne le coût réel par personne", () => {
    const r = computeFairPrice({ distanceKm: 475, fuelPrice: 1.85, consumption: 6.2, toll: 40, occupants: 1 });
    expect(r.cap).toBe(38);
    expect(r.suggested).toBe(38);
    expect(r.capped).toBe(true);
  });

  it("garde le coût réel quand il est sous le plafond", () => {
    // 210 km × 6,2 L × 1,85 € / 100 = 24,087 € + 0 péage, / 4 = 6,02 €
    const r = computeFairPrice({ distanceKm: 210, fuelPrice: 1.85, consumption: 6.2, toll: 0, occupants: 4 });
    expect(r.perPerson).toBe(6.02);
    expect(r.suggested).toBe(6.02);
    expect(r.capped).toBe(false);
  });

  it("signale un prix saisi au-dessus du plafond", () => {
    expect(exceedsCap(17, 210)).toBe(true);
    expect(exceedsCap(16.8, 210)).toBe(false);
  });
});
