import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/db"
import {
  plaidClient,
  syncTransactions,
  getBalances,
  normalizeCounterpartyName,
  getTransactionType,
  detectIncomeSource,
  type PlaidTransaction,
} from "@/features/banking/lib/plaid-client"

/**
 * Plaid Webhook Handler
 *
 * Register this URL in the Plaid Dashboard:
 *   https://dashboard.plaid.com/developers/api → Webhook URL
 *   Value: https://yourdomain.com/api/webhooks/plaid
 *
 * Handles:
 *   TRANSACTIONS/SYNC_UPDATES_AVAILABLE  → sync transactions + balances for item
 *   TRANSACTIONS/DEFAULT_UPDATE          → legacy: same as above
 *   TRANSACTIONS/HISTORICAL_UPDATE       → same as above
 *   ITEM/ERROR                           → mark accounts with sync error
 *   ITEM/PENDING_EXPIRATION              → mark accounts with re-auth warning
 *
 * Verification: Plaid signs each webhook with ES256 JWT (ECDSA P-256).
 * We verify using the public key fetched from Plaid's verification key endpoint.
 */

// ============================================================================
// JWT Verification — ES256 (ECDSA P-256) using Web Crypto
// ============================================================================

/** Cache JWKs to avoid a Plaid API call on every webhook */
const jwkCache = new Map<string, CryptoKey>()

function base64urlToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
  return Buffer.from(padded, "base64").toString("utf8")
}

function base64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=")
  const buf = Buffer.from(padded, "base64")
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

async function verifyPlaidWebhook(
  rawBody: string,
  jwtToken: string | null
): Promise<boolean> {
  // In sandbox / development, allow missing token
  if (!jwtToken) {
    if (process.env.PLAID_ENV !== "production") {
      console.warn("[Plaid Webhook] No Plaid-Verification header — allowing in non-production")
      return true
    }
    return false
  }

  try {
    const parts = jwtToken.split(".")
    if (parts.length !== 3) return false

    const [headerB64, payloadB64, signatureB64] = parts

    const header = JSON.parse(base64urlToString(headerB64)) as {
      kid: string
      alg: string
    }

    const payload = JSON.parse(base64urlToString(payloadB64)) as {
      request_body_sha256: string
      iat: number
    }

    // Fetch and cache the public key
    let cryptoKey = jwkCache.get(header.kid)
    if (!cryptoKey) {
      const keyResponse = await plaidClient.webhookVerificationKeyGet({
        key_id: header.kid,
      })
      const jwk = keyResponse.data.key

      // Plaid uses ES256: ECDSA with P-256 curve
      cryptoKey = await crypto.subtle.importKey(
        "jwk",
        {
          kty: jwk.kty,
          crv: jwk.crv,
          x: jwk.x,
          y: jwk.y,
          key_ops: ["verify"],
          ext: true,
        },
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
      )
      jwkCache.set(header.kid, cryptoKey)
    }

    // Verify the JWT signature over "headerB64.payloadB64"
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const signature = base64urlToBuffer(signatureB64)

    const isSignatureValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      cryptoKey,
      signature,
      signingInput
    )

    if (!isSignatureValid) {
      console.error("[Plaid Webhook] JWT signature invalid")
      return false
    }

    // Verify the body hash claim
    const bodyHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawBody)
    )
    const bodyHash = Buffer.from(bodyHashBuffer).toString("hex")

    if (payload.request_body_sha256 !== bodyHash) {
      console.error("[Plaid Webhook] Body hash mismatch")
      return false
    }

    return true
  } catch (error) {
    console.error("[Plaid Webhook] Verification error:", error)
    return false
  }
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

interface PlaidWebhookBody {
  webhook_type: string
  webhook_code: string
  item_id: string
  error?: {
    error_type: string
    error_code: string
    error_message: string
  }
  environment: string
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  // Read raw body first (required for signature verification)
  const rawBody = await request.text()
  const jwtToken = request.headers.get("plaid-verification")

  const isValid = await verifyPlaidWebhook(rawBody, jwtToken)
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: PlaidWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { webhook_type, webhook_code, item_id } = body
  console.log(`[Plaid Webhook] ${webhook_type}/${webhook_code} item=${item_id}`)

  try {
    switch (webhook_type) {
      case "TRANSACTIONS":
        if (
          webhook_code === "SYNC_UPDATES_AVAILABLE" ||
          webhook_code === "DEFAULT_UPDATE" ||
          webhook_code === "HISTORICAL_UPDATE"
        ) {
          await syncItem(item_id)
        }
        break

      case "ITEM":
        if (webhook_code === "ERROR" && body.error) {
          await markItemError(item_id, body.error.error_message)
        } else if (webhook_code === "PENDING_EXPIRATION") {
          await markItemError(
            item_id,
            "Bank connection will expire soon. Please re-authenticate in Settings → Banking."
          )
        }
        break

      default:
        console.log(`[Plaid Webhook] Unhandled: ${webhook_type}/${webhook_code}`)
    }
  } catch (error) {
    // Log but always return 200 — prevents Plaid from retrying indefinitely
    console.error(`[Plaid Webhook] Processing error for item ${item_id}:`, error)
  }

  return NextResponse.json({ received: true })
}

// ============================================================================
// Sync a Single Plaid Item (bank connection)
// ============================================================================

async function syncItem(itemId: string): Promise<void> {
  const accounts = await prisma.account.findMany({
    where: {
      plaidItemId: itemId,
      status: "active",
      plaidAccessToken: { not: null },
    },
  })

  if (accounts.length === 0) {
    console.warn(`[Plaid Webhook] No active accounts found for item ${itemId}`)
    return
  }

  const accessToken = accounts[0].plaidAccessToken!
  const cursor = accounts[0].plaidCursor
  const organizationId = accounts[0].organizationId

  try {
    // 1. Refresh balances
    const balancesResponse = await getBalances(accessToken)
    for (const account of accounts) {
      const balance = balancesResponse.accounts.find(
        (b) => b.account_id === account.plaidAccountId
      )
      if (balance) {
        await prisma.account.update({
          where: { id: account.id },
          data: {
            balanceAvailable: balance.balances.available,
            balanceCurrent: balance.balances.current,
            balanceLimit: balance.balances.limit,
            lastSyncedAt: new Date(),
            syncError: null,
          },
        })
      }
    }

    // 2. Fetch transaction deltas via cursor-based sync
    const syncResult = await syncTransactions(accessToken, cursor)

    for (const tx of syncResult.added) {
      const account = accounts.find((a) => a.plaidAccountId === tx.account_id)
      if (!account) continue
      await importTransaction(organizationId, account.id, tx)
    }

    for (const tx of syncResult.modified) {
      const account = accounts.find((a) => a.plaidAccountId === tx.account_id)
      if (!account) continue
      await updateTransaction(account.id, tx)
    }

    for (const removed of syncResult.removed) {
      await prisma.transaction.deleteMany({
        where: { plaidTransactionId: removed.transaction_id },
      })
    }

    // 3. Advance the cursor for all accounts in this Item
    await prisma.account.updateMany({
      where: { plaidItemId: itemId },
      data: { plaidCursor: syncResult.nextCursor },
    })

    console.log(
      `[Plaid Webhook] Item ${itemId} synced: +${syncResult.added.length} / ~${syncResult.modified.length} / -${syncResult.removed.length}`
    )
  } catch (error) {
    console.error(`[Plaid Webhook] Sync failed for item ${itemId}:`, error)
    await markItemError(itemId, error instanceof Error ? error.message : "Sync failed")
  }
}

async function markItemError(itemId: string, message: string): Promise<void> {
  await prisma.account.updateMany({
    where: { plaidItemId: itemId },
    data: { syncError: message, lastSyncedAt: new Date() },
  })
}

// ============================================================================
// Transaction Import / Update
// ============================================================================

async function importTransaction(
  organizationId: string,
  accountId: string,
  tx: PlaidTransaction
): Promise<void> {
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  const transaction = await prisma.transaction.upsert({
    where: {
      organizationId_plaidTransactionId: {
        organizationId,
        plaidTransactionId: tx.transaction_id,
      },
    },
    update: {
      accountId,
      amount: tx.amount,
      currency: tx.iso_currency_code || "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel,
      transactionType: getTransactionType(tx.amount),
      category: tx.personal_finance_category?.primary || null,
      categoryDetailed: tx.personal_finance_category?.detailed || null,
      counterpartyName: normalizedCounterparty,
    },
    create: {
      organizationId,
      accountId,
      plaidTransactionId: tx.transaction_id,
      amount: tx.amount,
      currency: tx.iso_currency_code || "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel,
      transactionType: getTransactionType(tx.amount),
      category: tx.personal_finance_category?.primary || null,
      categoryDetailed: tx.personal_finance_category?.detailed || null,
      counterpartyName: normalizedCounterparty,
    },
  })

  // Create Expense for outgoing transactions (positive = money out, non-pending)
  if (tx.amount > 0 && !tx.pending) {
    const existing = await prisma.expense.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })
    if (!existing) {
      try {
        await prisma.expense.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: tx.amount,
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            expenseType: "variable",
            status: "pending",
            isManual: false,
          },
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // Race condition with concurrent sync — already exists, skip
        } else {
          throw error
        }
      }
    }
  }

  // Create Income for incoming transactions (negative = money in, non-pending)
  if (tx.amount < 0 && !tx.pending) {
    const existing = await prisma.income.findUnique({
      where: { transactionId: transaction.id },
      select: { id: true },
    })
    if (!existing) {
      try {
        await prisma.income.create({
          data: {
            organizationId,
            transactionId: transaction.id,
            amount: Math.abs(tx.amount),
            currency: tx.iso_currency_code || "USD",
            date: new Date(tx.date),
            description: tx.merchant_name || tx.name,
            source: detectIncomeSource(tx),
            status: "pending",
          },
        })
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // Race condition — already exists, skip
        } else {
          throw error
        }
      }
    }
  }
}

async function updateTransaction(
  accountId: string,
  tx: PlaidTransaction
): Promise<void> {
  const counterpartyName = tx.merchant_name || tx.name || null
  const normalizedCounterparty = counterpartyName
    ? normalizeCounterpartyName(counterpartyName)
    : null

  await prisma.transaction.updateMany({
    where: { accountId, plaidTransactionId: tx.transaction_id },
    data: {
      amount: tx.amount,
      currency: tx.iso_currency_code || "USD",
      date: new Date(tx.date),
      authorizedDate: tx.authorized_date ? new Date(tx.authorized_date) : null,
      name: tx.name,
      merchantName: tx.merchant_name || null,
      pending: tx.pending,
      paymentChannel: tx.payment_channel,
      transactionType: getTransactionType(tx.amount),
      category: tx.personal_finance_category?.primary || null,
      categoryDetailed: tx.personal_finance_category?.detailed || null,
      counterpartyName: normalizedCounterparty,
    },
  })

  // Propagate changes to linked expense / income
  const transaction = await prisma.transaction.findFirst({
    where: { accountId, plaidTransactionId: tx.transaction_id },
    include: { expense: true, income: true },
  })

  if (transaction?.expense) {
    await prisma.expense.update({
      where: { id: transaction.expense.id },
      data: {
        amount: Math.abs(tx.amount),
        currency: tx.iso_currency_code || "USD",
        date: new Date(tx.date),
        description: tx.merchant_name || tx.name,
      },
    })
  }

  if (transaction?.income) {
    await prisma.income.update({
      where: { id: transaction.income.id },
      data: {
        amount: Math.abs(tx.amount),
        currency: tx.iso_currency_code || "USD",
        date: new Date(tx.date),
        description: tx.merchant_name || tx.name,
        source: detectIncomeSource(tx),
      },
    })
  }
}
