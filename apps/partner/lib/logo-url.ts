export function getOrgLogoUrl(orgId: string): string {
  const base = process.env.NEXT_PUBLIC_PARTNER_URL ?? ""
  return `${base}/api/org-logo/${orgId}`
}
