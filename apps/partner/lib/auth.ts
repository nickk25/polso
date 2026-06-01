import { cache } from "react"
import { getAuthContextWithType, type PartnerAuthContext } from "@polso/auth/get-session"

export type { PartnerAuthContext }
export const getPartnerAuthContext = cache(getAuthContextWithType)
