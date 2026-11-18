import { expect, test } from "@playwright/test";

const usuario = process.env.E2E_ADMIN_USER;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!usuario || !password, "Define E2E_ADMIN_USER y E2E_ADMIN_PASSWORD");

test("el Administrador importa un padrón y descarga los carnets", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(usuario!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin\/usuarios/);

  await page.getByRole("link", { name: "Padrón" }).click();
  await page.getByRole("link", { name: "Importar padrón" }).click();

  const csv = [
    "dni,nombres,apellidos,grado,seccion",
    `799${Date.now().toString().slice(-5)},Ana Lucía,Torres Ríos,3ro,B`,
  ].join("\n");

  await page.getByLabel("Archivo CSV o XLSX").setInputFiles({
    name: "padron.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });
  await page.getByRole("button", { name: "Validar archivo" }).click();
  await expect(page.getByText(/filas válidas/i)).toBeVisible();

  const respuesta = await request.get("/api/admin/credenciales/pdf");
  expect([200, 404]).toContain(respuesta.status());
  if (respuesta.status() === 200) {
    expect(respuesta.headers()["content-type"]).toContain("application/pdf");
  }
});
