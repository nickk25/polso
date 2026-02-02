import { randomBytes } from "crypto"

/**
 * Generate a secure invite token (64-char hex = 256 bits)
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Get the expiry date for an invitation (7 days from now)
 */
export function getInviteExpiryDate(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}
