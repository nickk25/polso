import { InviteClientForm } from "@/components/clients/invite-client-form"

export default function InvitePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Invitar cliente</h1>
        <p className="text-muted-foreground text-sm">Conecta a un nuevo cliente autónomo o empresa</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-6">
          El cliente recibirá un email con un enlace para registrarse y conectar su banco.
          Una vez conectado, podrás ver sus transacciones y recibos desde aquí.
        </p>
        <InviteClientForm />
      </div>
    </div>
  )
}
