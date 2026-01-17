import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

// Create a Supabase client for server-side operations with cookie handling
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}

const demoEmail = "demo@listenlayer.local";

async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail },
  });
}

// Get or create our app's User record from Supabase auth user
async function getOrCreateAppUser(supabaseUser: { id: string; email?: string }) {
  if (!supabaseUser.email) return null;

  const email = supabaseUser.email.toLowerCase();

  // Try to find by supabaseId first, then by email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ supabaseId: supabaseUser.id }, { email }],
    },
  });

  if (!user) {
    // Create new user linked to Supabase
    user = await prisma.user.create({
      data: {
        email,
        supabaseId: supabaseUser.id,
      },
    });
  } else if (!user.supabaseId) {
    // Link existing user to Supabase
    user = await prisma.user.update({
      where: { id: user.id },
      data: { supabaseId: supabaseUser.id },
    });
  }

  return user;
}

export async function getCurrentUser() {
  // DEV_AUTH_BYPASS for local development only - never allow in production
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  ) {
    return getOrCreateDemoUser();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  return getOrCreateAppUser(supabaseUser);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
