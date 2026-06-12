import { prisma } from "@/lib/db"
import { getGoCardlessClient } from "./gocardless-client"

/**
 * Create a GoCardless requisition link for an institution and persist the
 * pending requisition so the OAuth callback can claim it.
 * Shared by the create-link API route and reconnectBankAction.
 */
export async function createBankLink(
  organizationId: string,
  institutionId: string
): Promise<{ link: string }> {
  const gc = getGoCardlessClient()

  // Create end-user agreement (controls how long we can access the account)
  const institution = await gc.getInstitution(institutionId)
  const maxHistoricalDays = institution?.transaction_total_days
    ? parseInt(institution.transaction_total_days, 10)
    : 90
  const agreement = await gc.createEndUserAgreement(institutionId, maxHistoricalDays)

  // Create requisition — the link the user follows to authenticate with their bank
  // reference = organizationId so the callback can look up the pending requisition
  const { requisitionId, link } = await gc.buildLink({
    institutionId,
    agreement: agreement.id,
    redirect: process.env.GOCARDLESS_REDIRECT_URI!,
    reference: organizationId,
  })

  // Save pending requisition so the callback can find it
  await prisma.pendingRequisition.create({
    data: {
      organizationId,
      requisitionId,
      institutionId,
    },
  })

  return { link }
}
