import { Badge } from "@polso/ui/badge"

const statusMap = {
  active: { label: "Conectado", variant: "default" as const },
  pending: { label: "Pendiente", variant: "secondary" as const },
  disconnected: { label: "Desconectado", variant: "outline" as const },
}

export function ClientStatusBadge({ status }: { status: string }) {
  const cfg = statusMap[status as keyof typeof statusMap] ?? {
    label: status,
    variant: "outline" as const,
  }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
