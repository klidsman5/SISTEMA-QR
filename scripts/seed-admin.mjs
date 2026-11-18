import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD ?? "Admin1234!";
const nombre = process.env.ADMIN_NAME ?? "Administrador";
const dominio = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX ?? "colegio.local";

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const email = `${username}@${dominio}`;

const { data: creado, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error && !error.message.includes("already")) {
  console.error(error.message);
  process.exit(1);
}

const authUserId =
  creado?.user?.id ??
  (await admin.from("usuarios").select("auth_user_id").eq("username", username).maybeSingle()).data
    ?.auth_user_id;

if (!authUserId) {
  console.error("No se pudo obtener el usuario de acceso");
  process.exit(1);
}

const { error: errorPerfil } = await admin.from("usuarios").upsert(
  {
    auth_user_id: authUserId,
    nombre,
    username,
    rol: "administrador",
    activo: true,
  },
  { onConflict: "username" },
);

if (errorPerfil) {
  console.error(errorPerfil.message);
  process.exit(1);
}

console.log(`Administrador listo: ${username} / ${password}`);
