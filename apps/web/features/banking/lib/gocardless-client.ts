import { createGoCardlessClient } from "@polso/banking"

export function getGoCardlessClient() {
  return createGoCardlessClient({
    secretId: process.env.GOCARDLESS_SECRET_ID!,
    secretKey: process.env.GOCARDLESS_SECRET_KEY!,
    redirectUri: process.env.GOCARDLESS_REDIRECT_URI!,
  })
}
