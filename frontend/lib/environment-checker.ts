// Environment variable checker for production debugging
export interface EnvironmentStatus {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

export function checkEnvironmentVariables(): EnvironmentStatus {
  // Only truly required for auth to work
  const required = [
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const varName of required) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (
      value === 'fallback-secret-key' ||
      value.includes('localhost')
    ) {
      warnings.push(`${varName} appears to be a development/test value`);
    }
  }

  // Check DATABASE_URL format (PostgreSQL)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('postgres')) {
    warnings.push(
      'DATABASE_URL does not appear to be a valid PostgreSQL connection string'
    );
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

export function logEnvironmentStatus() {
  const status = checkEnvironmentVariables();

  if (!status.isValid) {
    console.error('❌ Missing required environment variables:', status.missing);
  }

  if (status.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:', status.warnings);
  }

  if (status.isValid && status.warnings.length === 0) {
    console.log('✅ Environment variables configured correctly');
  }

  return status;
}
