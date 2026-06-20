import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getReportBuffer, createWrappedFetch } from 'coze-coding-dev-sdk';

let supabaseClient: SupabaseClient | null = null;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function getSupabaseCredentials(): SupabaseCredentials | null {
  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('[Supabase] COZE_SUPABASE_URL or COZE_SUPABASE_ANON_KEY is not set');
    return null;
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient | null {
  if (supabaseClient) {
    return supabaseClient;
  }

  const credentials = getSupabaseCredentials();
  if (!credentials) {
    return null;
  }

  const { url, anonKey } = credentials;

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  const globalOptions: Record<string, any> = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }
  try {
    const buffer = getReportBuffer();
    if (buffer) {
      globalOptions.fetch = createWrappedFetch(buffer, 'supabase');
    }
  } catch {
    // Silent — reporting setup failure should not block client creation
  }

  supabaseClient = createClient(url, key, {
    global: globalOptions,
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

export { getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };