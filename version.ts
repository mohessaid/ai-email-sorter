/**
 * version.ts
 * Tracks API versions and feature implementations for AI Email Sorter
 */

export const VERSION = {
  API: {
    CURRENT: 'v1',
    SUPPORTED: ['v1'],
    DEPRECATED: [],
    SUNSET_DATE: null,
  },
  FEATURES: {
    EMAIL_SYNC: {
      version: '1.0.0',
      implemented: true,
      notes: 'Gmail API integration with Supabase storage',
    },
    AI_CLASSIFICATION: {
      version: '1.0.0',
      implemented: true,
      notes: 'OpenAI-powered email classification',
    },
    UNSUBSCRIBE: {
      version: '2.0.0',
      implemented: true,
      notes: 'Gmail API native unsubscribe functionality',
      changelog: [
        {
          version: '2.0.0',
          date: '2024-03-12',
          changes: [
            'Migrated from Playwright automation to Gmail API native unsubscribe',
            'Improved reliability and performance',
            'Removed browser automation dependencies',
          ],
        },
        {
          version: '1.0.0',
          date: '2024-02-01',
          changes: [
            'Initial implementation with Playwright browser automation',
            'Support for List-Unsubscribe headers',
            'HTML link extraction',
          ],
        },
      ],
    },
    BATCH_OPERATIONS: {
      version: '1.0.0',
      implemented: true,
      notes: 'Bulk actions for emails including move, delete, and unsubscribe',
    },
  },
  APP: {
    VERSION: '0.2.0',
    MIN_NODE_VERSION: '18.17.0',
    LAST_UPDATED: '2024-03-12',
    CHANGELOG: [
      {
        version: '0.2.0',
        date: '2024-03-12',
        changes: [
          'Migrated to Gmail API native unsubscribe',
          'Improved performance and reliability',
          'Removed Playwright dependencies',
          'Added version tracking',
        ],
      },
      {
        version: '0.1.0',
        date: '2024-02-01',
        changes: [
          'Initial release',
          'Email sync and classification',
          'Category management',
          'Basic unsubscribe functionality',
        ],
      },
    ],
  },
  // Feature flags for gradual rollout
  FLAGS: {
    USE_GMAIL_NATIVE_UNSUBSCRIBE: true,
    ENABLE_BATCH_PROCESSING: true,
    MAX_BATCH_SIZE: 10,
    RETRY_ATTEMPTS: 3,
  },
} as const;

// Type for checking version compatibility
export type VersionCompatibility = {
  compatible: boolean;
  reason?: string;
  minimumRequired?: string;
};

// Utility functions for version checking
export const versionUtils = {
  isApiVersionSupported(version: string): boolean {
    return VERSION.API.SUPPORTED.includes(version);
  },

  isApiVersionDeprecated(version: string): boolean {
    return VERSION.API.DEPRECATED.includes(version);
  },

  isFeatureImplemented(featureKey: keyof typeof VERSION.FEATURES): boolean {
    return VERSION.FEATURES[featureKey].implemented;
  },

  getFeatureVersion(featureKey: keyof typeof VERSION.FEATURES): string {
    return VERSION.FEATURES[featureKey].version;
  },

  checkNodeVersion(): VersionCompatibility {
    const currentNode = process.version;
    const required = VERSION.APP.MIN_NODE_VERSION;

    return {
      compatible: currentNode >= required,
      reason: currentNode < required ?
        `Node.js ${required} or higher is required` : undefined,
      minimumRequired: required,
    };
  },
};

export default VERSION;
