import { z } from "zod";

/** Téléphone français : 0X XX XX XX XX ou +33 X XX XX XX XX (X = 1 à 9). */
export const FR_PHONE_REGEX = /^(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;

export function isValidFrenchPhone(value: string) {
  return FR_PHONE_REGEX.test(value.trim());
}

/** Normalise en 0X XX XX XX XX */
export function formatFrenchPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  let national = digits;
  if (digits.startsWith("0033")) national = "0" + digits.slice(4);
  else if (digits.startsWith("33") && digits.length === 11) national = "0" + digits.slice(2);
  return national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export const phoneSchema = z
  .string()
  .trim()
  .refine(isValidFrenchPhone, { message: "Numéro de téléphone français invalide (ex. 06 12 34 56 78)." });

export const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { message: `${label} est requis.` })
    .max(50, { message: `${label} : 50 caractères maximum.` });

export const emailSchema = z.string().trim().email({ message: "Adresse email invalide." }).max(255);
export const passwordSchema = z
  .string()
  .min(8, { message: "Ton mot de passe doit faire au moins 8 caractères." })
  .max(72);
