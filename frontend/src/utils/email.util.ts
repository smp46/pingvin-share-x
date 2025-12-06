/**
 * Email validation utility
 * Uses a regex pattern that matches the backend's class-validator @IsEmail() behavior
 * This ensures frontend and backend validation are consistent
 */

// RFC 5322 compliant email regex
// This matches the validation used by class-validator's @IsEmail() decorator
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Validates an email address using RFC 5322 compliant regex
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") {
    return false;
  }

  const trimmedEmail = email.trim();

  // Basic length check (RFC 5321 limits)
  if (trimmedEmail.length > 254) {
    return false;
  }

  // Check for @ symbol
  if (!trimmedEmail.includes("@")) {
    return false;
  }

  // Split into local and domain parts
  const parts = trimmedEmail.split("@");
  if (parts.length !== 2) {
    return false;
  }

  const [localPart, domainPart] = parts;

  // Validate local part length (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }

  // Validate domain part length (after @)
  if (domainPart.length === 0 || domainPart.length > 253) {
    return false;
  }

  // Check domain has at least one dot and a valid TLD
  if (!domainPart.includes(".")) {
    return false;
  }

  // Extract TLD (top-level domain) and validate it's at least 2 characters
  const domainParts = domainPart.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return false;
  }

  // Validate against RFC 5322 regex
  return EMAIL_REGEX.test(trimmedEmail);
};
