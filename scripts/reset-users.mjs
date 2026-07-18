// ============================================================
// reset-users.mjs — one-off cleanup
// Deletes ALL auth users (admins + staff) and ALL businesses,
// plus the users + staff_members rows, so you can start fresh.
//
// Run from the project root:
//   node scripts/reset-users.mjs
//
// It reads credentials from .env.local (SUPABASE_SERVICE_ROLE_KEY).
// This is DESTRUCTIVE and cannot be undone.
// ============================================================

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local (no extra deps) ---
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    console.error("Could not read .env.local from the project root.");
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log("Connecting to", url);

  // 1. Delete every auth user (admins + staff), paging through all of them
  let page = 1;
  let deleted = 0;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("Failed to list users:", error.message);
      process.exit(1);
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;

    for (const u of users) {
      const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.warn(`  ! could not delete ${u.email || u.id}: ${delErr.message}`);
      } else {
        deleted++;
        console.log(`  - deleted auth user ${u.email || u.id}`);
      }
    }
    // stay on page 1: as users are removed the list shrinks
  }
  console.log(`Deleted ${deleted} auth user(s).`);

  // 2. Clear the app tables. Children first to avoid FK errors.
  //    (A stray auth row may leave a users row behind depending on your triggers.)
  const tables = ["staff_members", "users", "businesses"];
  for (const t of tables) {
    const { error } = await admin
      .from(t)
      .delete()
      .not("id", "is", null); // matches every row
    if (error) {
      console.warn(`  ! could not clear "${t}": ${error.message}`);
      if (t === "businesses") {
        console.warn(
          "    (Other tables like warehouses/products may still reference businesses. " +
            "If you want those cleared too, tell me and I'll extend this script.)",
        );
      }
    } else {
      console.log(`  - cleared table "${t}"`);
    }
  }

  console.log("\nDone. You can now register a fresh admin from the app.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
