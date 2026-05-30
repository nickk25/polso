interface SettingsHeaderProps {
  title: string
  description?: string
}

export function SettingsHeader({ title, description }: SettingsHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
