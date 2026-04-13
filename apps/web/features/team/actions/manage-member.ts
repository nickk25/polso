"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { getAuthContext } from "@polso/auth/get-session"
import { successResponse, errorResponse, type ActionResponse } from "@/lib/types"

/**
 * Change a team member's role
 */
export async function changeMemberRoleAction(
  memberUserId: string,
  newRole: "admin" | "member"
): Promise<ActionResponse<void>> {
  try {
    const { userId, organizationId } = await getAuthContext()

    // Cannot change your own role
    if (memberUserId === userId) {
      return errorResponse("You cannot change your own role", "FORBIDDEN")
    }

    // Check if current user is owner
    const currentUserMembership = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        role: "owner",
      },
    })

    if (!currentUserMembership) {
      return errorResponse("Only the owner can change roles", "FORBIDDEN")
    }

    // Get the target member
    const targetMembership = await prisma.userOrganization.findFirst({
      where: {
        userId: memberUserId,
        organizationId,
      },
    })

    if (!targetMembership) {
      return errorResponse("Member not found", "NOT_FOUND")
    }

    // Cannot change owner role
    if (targetMembership.role === "owner") {
      return errorResponse("Cannot change owner role", "FORBIDDEN")
    }

    // Update role
    await prisma.userOrganization.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
    })

    revalidatePath("/settings/team")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error changing member role:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to change role",
      "ERROR"
    )
  }
}

/**
 * Remove a team member from the organization
 */
export async function removeMemberAction(
  memberUserId: string
): Promise<ActionResponse<void>> {
  try {
    const { userId, organizationId } = await getAuthContext()

    // Cannot remove yourself
    if (memberUserId === userId) {
      return errorResponse("You cannot remove yourself", "FORBIDDEN")
    }

    // Check if current user is owner or admin
    const currentUserMembership = await prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        role: { in: ["owner", "admin"] },
      },
    })

    if (!currentUserMembership) {
      return errorResponse("Only admins can remove members", "FORBIDDEN")
    }

    // Get the target member
    const targetMembership = await prisma.userOrganization.findFirst({
      where: {
        userId: memberUserId,
        organizationId,
      },
    })

    if (!targetMembership) {
      return errorResponse("Member not found", "NOT_FOUND")
    }

    // Cannot remove owner
    if (targetMembership.role === "owner") {
      return errorResponse("Cannot remove the owner", "FORBIDDEN")
    }

    // Only owner can remove admins
    if (targetMembership.role === "admin" && currentUserMembership.role !== "owner") {
      return errorResponse("Only the owner can remove admins", "FORBIDDEN")
    }

    // Remove membership
    await prisma.userOrganization.delete({
      where: { id: targetMembership.id },
    })

    revalidatePath("/settings/team")

    return successResponse(undefined)
  } catch (error) {
    console.error("Error removing member:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Failed to remove member",
      "ERROR"
    )
  }
}
