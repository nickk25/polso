"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"
import { normalizeCounterpartyName } from "@polso/banking"

interface CreateClientInput {
  name: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
}

interface UpdateClientInput {
  name?: string
  website?: string | null
  taxId?: string | null
  defaultCategoryId?: string | null
}

interface MergeClientsInput {
  sourceClientIds: string[] // Clients to merge FROM (will be deleted)
  targetClientId: string // Client to merge INTO (will keep)
}

interface ClientResult {
  id: string
  name: string
  normalizedName: string
}

interface DeleteClientResult {
  deleted: boolean
  incomeCount?: number
}

interface MergeClientResult {
  mergedClientId: string
  incomesReassigned: number
  clientsDeleted: number
}

/**
 * Create a new client manually
 */
export async function createClientAction(
  input: CreateClientInput
): Promise<ActionResponse<ClientResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      return errorResponse("Client name is required", "VALIDATION_ERROR")
    }

    if (input.name.length > 100) {
      return errorResponse("Client name must be 100 characters or less", "VALIDATION_ERROR")
    }

    // Generate normalized name
    const normalizedName = normalizeCounterpartyName(input.name.trim())

    // Check for duplicate normalized name
    const existing = await prisma.client.findFirst({
      where: {
        organizationId,
        normalizedName,
      },
    })

    if (existing) {
      return errorResponse(
        `A client with a similar name already exists: "${existing.name}"`,
        "DUPLICATE_ERROR"
      )
    }

    // Validate category if provided
    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.defaultCategoryId,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        organizationId,
        name: input.name.trim(),
        normalizedName,
        website: input.website || null,
        taxId: input.taxId || null,
        defaultCategoryId: input.defaultCategoryId || null,
        isAutoDetected: false,
        detectionPatterns: [normalizedName],
      },
    })

    revalidatePath("/clients")
    revalidatePath("/income")

    return successResponse({
      id: client.id,
      name: client.name,
      normalizedName: client.normalizedName,
    })
  } catch (error) {
    console.error("Error creating client:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to create client",
      "ERROR"
    )
  }
}

/**
 * Update an existing client
 */
export async function updateClientAction(
  clientId: string,
  input: UpdateClientInput
): Promise<ActionResponse<ClientResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
    })

    if (!client) {
      return errorResponse("Client not found", "NOT_FOUND")
    }

    // Validate name if provided
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return errorResponse("Client name is required", "VALIDATION_ERROR")
      }

      if (input.name.length > 100) {
        return errorResponse("Client name must be 100 characters or less", "VALIDATION_ERROR")
      }
    }

    // Generate new normalized name if name changed
    let newNormalizedName = client.normalizedName
    if (input.name && input.name.trim() !== client.name) {
      newNormalizedName = normalizeCounterpartyName(input.name.trim())

      // Check for duplicate normalized name
      const existing = await prisma.client.findFirst({
        where: {
          organizationId,
          normalizedName: newNormalizedName,
          id: { not: clientId },
        },
      })

      if (existing) {
        return errorResponse(
          `A client with a similar name already exists: "${existing.name}"`,
          "DUPLICATE_ERROR"
        )
      }
    }

    // Validate category if provided
    if (input.defaultCategoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: input.defaultCategoryId,
          OR: [{ isSystem: true }, { organizationId }],
        },
      })

      if (!category) {
        return errorResponse("Category not found", "NOT_FOUND")
      }
    }

    // Update client
    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: input.name?.trim() ?? client.name,
        normalizedName: newNormalizedName,
        website: input.website !== undefined ? input.website : client.website,
        taxId: input.taxId !== undefined ? input.taxId : client.taxId,
        defaultCategoryId:
          input.defaultCategoryId !== undefined
            ? input.defaultCategoryId
            : client.defaultCategoryId,
      },
    })

    revalidatePath("/clients")
    revalidatePath("/income")

    return successResponse({
      id: updated.id,
      name: updated.name,
      normalizedName: updated.normalizedName,
    })
  } catch (error) {
    console.error("Error updating client:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to update client",
      "ERROR"
    )
  }
}

/**
 * Delete a client
 * Cannot delete if there are linked incomes (must reassign first)
 */
export async function deleteClientAction(
  clientId: string
): Promise<ActionResponse<DeleteClientResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Find the client with income count
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            incomes: true,
          },
        },
      },
    })

    if (!client) {
      return errorResponse("Client not found", "NOT_FOUND")
    }

    // Check if client has linked incomes
    if (client._count.incomes > 0) {
      return errorResponse(
        `Cannot delete client with ${client._count.incomes} linked income${client._count.incomes > 1 ? "s" : ""}. Reassign them first or merge this client with another.`,
        "HAS_LINKED_ITEMS"
      )
    }

    // Delete the client
    await prisma.client.delete({
      where: { id: clientId },
    })

    revalidatePath("/clients")
    revalidatePath("/income")

    return successResponse({ deleted: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to delete client",
      "ERROR"
    )
  }
}

/**
 * Merge multiple clients into one
 * Reassigns all incomes from source clients to target, then deletes sources
 */
export async function mergeClientsAction(
  input: MergeClientsInput
): Promise<ActionResponse<MergeClientResult>> {
  try {
    const { organizationId } = await getAuthContext()

    // Validate input
    if (!input.sourceClientIds || input.sourceClientIds.length === 0) {
      return errorResponse("At least one source client is required", "VALIDATION_ERROR")
    }

    if (!input.targetClientId) {
      return errorResponse("Target client is required", "VALIDATION_ERROR")
    }

    if (input.sourceClientIds.includes(input.targetClientId)) {
      return errorResponse(
        "Target client cannot be in the source clients list",
        "VALIDATION_ERROR"
      )
    }

    // Verify all clients belong to the organization
    const clients = await prisma.client.findMany({
      where: {
        organizationId,
        id: { in: [...input.sourceClientIds, input.targetClientId] },
      },
      select: {
        id: true,
        detectionPatterns: true,
      },
    })

    if (clients.length !== input.sourceClientIds.length + 1) {
      return errorResponse("One or more clients not found", "NOT_FOUND")
    }

    const targetClient = clients.find((c) => c.id === input.targetClientId)
    if (!targetClient) {
      return errorResponse("Target client not found", "NOT_FOUND")
    }

    // Perform merge in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Reassign all incomes from source clients to target
      const incomesUpdate = await tx.income.updateMany({
        where: {
          clientId: { in: input.sourceClientIds },
        },
        data: {
          clientId: input.targetClientId,
        },
      })

      // 2. Merge detection patterns from all source clients into target
      const sourceClients = clients.filter((c) => input.sourceClientIds.includes(c.id))
      const allPatterns = new Set([
        ...targetClient.detectionPatterns,
        ...sourceClients.flatMap((c) => c.detectionPatterns),
      ])

      await tx.client.update({
        where: { id: input.targetClientId },
        data: {
          detectionPatterns: Array.from(allPatterns),
        },
      })

      // 3. Delete source clients
      await tx.client.deleteMany({
        where: {
          id: { in: input.sourceClientIds },
        },
      })

      return {
        incomesReassigned: incomesUpdate.count,
        clientsDeleted: input.sourceClientIds.length,
      }
    })

    revalidatePath("/clients")
    revalidatePath("/income")

    return successResponse({
      mergedClientId: input.targetClientId,
      ...result,
    })
  } catch (error) {
    console.error("Error merging clients:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to merge clients",
      "ERROR"
    )
  }
}

/**
 * Get the count of incomes linked to a client
 * Useful for showing warning before delete
 */
export async function getClientUsageAction(
  clientId: string
): Promise<ActionResponse<{ incomeCount: number }>> {
  try {
    const { organizationId } = await getAuthContext()

    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
      include: {
        _count: {
          select: {
            incomes: true,
          },
        },
      },
    })

    if (!client) {
      return errorResponse("Client not found", "NOT_FOUND")
    }

    return successResponse({
      incomeCount: client._count.incomes,
    })
  } catch (error) {
    console.error("Error getting client usage:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to get client usage",
      "ERROR"
    )
  }
}
