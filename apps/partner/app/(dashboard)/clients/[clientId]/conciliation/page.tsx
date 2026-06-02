import { redirect } from "next/navigation"

export default async function ConciliationPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  redirect(`/clients/${clientId}/inbox`)
}
