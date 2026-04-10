export default function NotPartnerPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold">Acceso restringido</h1>
      <p className="mt-2 text-muted-foreground max-w-md">
        Este panel es exclusivo para cuentas de asesoría. Tu cuenta no tiene el tipo correcto.
        Contacta con soporte si crees que es un error.
      </p>
    </main>
  )
}
