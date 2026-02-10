import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not configured. Running in offline mode with localStorage.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return Boolean(supabaseUrl && supabaseAnonKey);
};

// Auth helpers
export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signUp = async (email: string, password: string, metadata?: { fullName?: string }) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
};

export const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
};

export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};
