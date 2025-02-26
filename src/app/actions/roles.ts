'use server'

import { z } from 'zod'
import { createClient } from '@/lib/server/supabase'
import { withAuth } from '@/lib/server/middleware'
import logger from '@/lib/logger'
import type { ServerActionResult } from '@/lib/shared/types/actions'
import { v4 as uuidv4 } from 'uuid'

// MARK: - Validation Schemas

const RoleSchema = z.string().min(1);
const PermissionSchema = z.string().min(1);
const UserIdSchema = z.string().uuid().optional();
const PermissionsArraySchema = z.array(z.string().min(1));

// MARK: - Role and Permission Actions

/**
 * Check if a user has a specific role
 */
export const hasRole = withAuth(async (
  input: { role: string, userId?: string }
): Promise<ServerActionResult<boolean>> => {
  const { role, userId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Checking role: ${role} for user${userId ? `: ${userId}` : ''}`,
      requestId,
    });

    // Validate the input
    RoleSchema.parse(role);
    if (userId) UserIdSchema.parse(userId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'hasRole',
        role,
        userId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error checking role via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to check role'
      };
    }

    logger.info({
      msg: `Role check complete: ${data.data}`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error checking role',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Check if a user has a specific permission
 */
export const hasPermission = withAuth(async (
  input: { permission: string, userId?: string }
): Promise<ServerActionResult<boolean>> => {
  const { permission, userId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Checking permission: ${permission} for user${userId ? `: ${userId}` : ''}`,
      requestId,
    });

    // Validate the input
    PermissionSchema.parse(permission);
    if (userId) UserIdSchema.parse(userId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'hasPermission',
        permission,
        userId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error checking permission via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to check permission'
      };
    }

    logger.info({
      msg: `Permission check complete: ${data.data}`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error checking permission',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Get all roles for a user
 */
export const getUserRoles = withAuth(async (
  input: { userId?: string }
): Promise<ServerActionResult<string[]>> => {
  const { userId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Getting roles for user${userId ? `: ${userId}` : ''}`,
      requestId,
    });

    // Validate the input
    if (userId) UserIdSchema.parse(userId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'getUserRoles',
        userId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error getting user roles via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to get user roles'
      };
    }

    logger.info({
      msg: `Got user roles: ${data.data.length}`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error getting user roles',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Get all permissions for a user
 */
export const getUserPermissions = withAuth(async (
  input: { userId?: string }
): Promise<ServerActionResult<string[]>> => {
  const { userId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Getting permissions for user${userId ? `: ${userId}` : ''}`,
      requestId,
    });

    // Validate the input
    if (userId) UserIdSchema.parse(userId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'getUserPermissions',
        userId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error getting user permissions via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to get user permissions'
      };
    }

    logger.info({
      msg: `Got user permissions: ${data.data.length}`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error getting user permissions',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Assign a role to a user - admin only
 */
export const assignRole = withAuth(async (
  input: { role: string, targetUserId: string }
): Promise<ServerActionResult<boolean>> => {
  const { role, targetUserId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Assigning role: ${role} to user: ${targetUserId}`,
      requestId,
    });

    // Validate the input
    RoleSchema.parse(role);
    UserIdSchema.parse(targetUserId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'assignRole',
        role,
        userId: targetUserId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error assigning role via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to assign role'
      };
    }

    logger.info({
      msg: `Role assigned successfully`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error assigning role',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Remove a role from a user - admin only
 */
export const removeRole = withAuth(async (
  input: { role: string, targetUserId: string }
): Promise<ServerActionResult<boolean>> => {
  const { role, targetUserId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Removing role: ${role} from user: ${targetUserId}`,
      requestId,
    });

    // Validate the input
    RoleSchema.parse(role);
    UserIdSchema.parse(targetUserId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'removeRole',
        role,
        userId: targetUserId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error removing role via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to remove role'
      };
    }

    logger.info({
      msg: `Role removed successfully`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error removing role',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Grant permissions to a user - admin only
 */
export const grantPermissions = withAuth(async (
  input: { permissions: string[], targetUserId: string }
): Promise<ServerActionResult<boolean>> => {
  const { permissions, targetUserId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Granting permissions to user: ${targetUserId}`,
      requestId,
    });

    // Validate the input
    PermissionsArraySchema.parse(permissions);
    UserIdSchema.parse(targetUserId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'grantPermissions',
        permissions,
        userId: targetUserId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error granting permissions via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to grant permissions'
      };
    }

    logger.info({
      msg: `Permissions granted successfully`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error granting permissions',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Revoke permissions from a user - admin only
 */
export const revokePermissions = withAuth(async (
  input: { permissions: string[], targetUserId: string }
): Promise<ServerActionResult<boolean>> => {
  const { permissions, targetUserId } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Revoking permissions from user: ${targetUserId}`,
      requestId,
    });

    // Validate the input
    PermissionsArraySchema.parse(permissions);
    UserIdSchema.parse(targetUserId);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('roles', {
      method: 'POST',
      body: {
        operation: 'revokePermissions',
        permissions,
        userId: targetUserId
      }
    });

    if (error) {
      logger.error({
        msg: 'Error revoking permissions via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to revoke permissions'
      };
    }

    logger.info({
      msg: `Permissions revoked successfully`,
      requestId
    });

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    logger.error({
      msg: 'Error revoking permissions',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}); 