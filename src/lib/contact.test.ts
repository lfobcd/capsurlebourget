import { describe, expect, it } from "vitest";
import { smsUrl, toInternationalDigits, whatsappUrl } from "./contact";

describe("liens d'alerte SMS / WhatsApp", () => {
  it("convertit un numéro français au format international", () => {
    expect(toInternationalDigits("06 12 34 56 78")).toBe("33612345678");
    expect(toInternationalDigits("+33 6 12 34 56 78")).toBe("33612345678");
    expect(toInternationalDigits("0033712345678")).toBe("33712345678");
  });

  it("refuse un numéro invalide pour WhatsApp", () => {
    expect(toInternationalDigits("12345")).toBeNull();
    expect(whatsappUrl("12345", "salut")).toBeNull();
  });

  it("construit les liens avec le message prérempli", () => {
    expect(whatsappUrl("06 12 34 56 78", "Salut !")).toBe("https://wa.me/33612345678?text=Salut%20!");
    expect(smsUrl("06 12 34 56 78", "Salut !")).toBe("sms:+33612345678?&body=Salut%20!");
  });
});
