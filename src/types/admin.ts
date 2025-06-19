// MARK: Admin Types

export interface AdminAuditLog {
  id: string;
  timestamp: number; // Unix epoch millis
  action: string;
  performedBy: string;
  targetUserId?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    reason?: string;
    [key: string]: unknown;
  };
}

export interface UserAdminView {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isAdmin: boolean;
  isSuspended: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  familyTreeName?: string;
  storyCount: number;
  eventCount: number;
  vaultItemCount: number;
  createdAt: number; // timestamp or Date acceptable, consumers format accordingly
  lastLoginAt?: number;
}

export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsers: number;
  activeSubscriptions: number;
  revenue: {
    thisMonth: number;
    [key: string]: number;
  };
  storageUsedGB: number;
  totalVaultItems: number;
  totalFamilies: number;
  totalStories: number;
  totalEvents: number;
  [key: string]: unknown;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  avgResponseTime: number; // milliseconds
  errorRate: number; // 0 - 1
  [key: string]: unknown;
}

export interface AdminConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;

  registrationEnabled: boolean;
  inviteOnly: boolean;

  maxUsersPerFamily: number;
  maxStoragePerUserGB: number;

  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;

  aiModerationEnabled: boolean;
  autoBackupEnabled: boolean;

  featureFlags: {
    newDashboard: boolean;
    advancedAnalytics: boolean;
    betaFeatures: boolean;
    [key: string]: boolean;
  };
} 