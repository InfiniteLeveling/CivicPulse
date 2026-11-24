import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env.local or .env
function loadEnv() {
  const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  {
    email: "citizen@civicpulse.org",
    password: "Password123!",
    fullName: "Citizen Test User",
    role: "citizen",
  },
  {
    email: "authority@civicpulse.org",
    password: "Password123!",
    fullName: "Authority Admin Officer",
    role: "admin",
  },
];

async function ensureUser(userDef) {
  console.log(`\nEnsuring ${userDef.role} user: ${userDef.email}...`);

  // 1. Check if user already exists in auth.users
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  let existing = listData.users.find((u) => u.email?.toLowerCase() === userDef.email.toLowerCase());
  let userId;

  if (existing) {
    userId = existing.id;
    console.log(`User already exists in Auth (ID: ${userId}). Updating password and metadata...`);
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: userDef.password,
      email_confirm: true,
      user_metadata: { full_name: userDef.fullName },
    });
    if (updateError) {
      console.warn("Failed to update user in auth:", updateError.message);
    }
  } else {
    console.log(`Creating new user in Auth...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: userDef.email,
      password: userDef.password,
      email_confirm: true,
      user_metadata: { full_name: userDef.fullName },
    });
    if (createError) {
      throw createError;
    }
    userId = createData.user.id;
    console.log(`Created user in Auth (ID: ${userId})`);
  }

  // 2. Ensure profile exists and has the designated role
  // Wait 1 second for potential trigger execution
  await new Promise((r) => setTimeout(r, 1000));

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    console.log(`Profile not found by trigger, inserting directly into public.profiles...`);
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name: userDef.fullName,
      role: userDef.role,
    });
    if (insertErr) {
      console.error(`Failed to insert profile:`, insertErr.message);
    } else {
      console.log(`Profile created with role '${userDef.role}'`);
    }
  } else {
    console.log(`Existing profile found with role '${profile.role}'. Updating role to '${userDef.role}'...`);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        role: userDef.role,
        full_name: userDef.fullName,
      })
      .eq("id", userId);
    if (updateErr) {
      console.error(`Failed to update profile role:`, updateErr.message);
    } else {
      console.log(`Profile updated successfully to role '${userDef.role}'`);
    }
  }

  return { email: userDef.email, password: userDef.password, role: userDef.role, userId };
}

async function main() {
  console.log("=== Seeding CivicPulse Test Accounts ===");
  const results = [];
  for (const u of TEST_USERS) {
    try {
      const res = await ensureUser(u);
      results.push(res);
    } catch (err) {
      console.error(`Error configuring ${u.email}:`, err);
    }
  }

  console.log("\n=== Test Accounts Summary ===");
  console.table(results);
}

main().catch(console.error);
