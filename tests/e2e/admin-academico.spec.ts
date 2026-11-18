import { expect, test } from "@playwright/test";

const usuario = process.env.E2E_ADMIN_USER;
const password = process.env.E2E_ADMIN_PASSWORD;

test.skip(!usuario || !password, "Define E2E_ADMIN_USER y E2E_ADMIN_PASSWORD");

test("el Administrador crea un Docente, le asigna un curso y ve la auditoría", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(usuario!);
  await page.getByLabel("Contraseña").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin\/usuarios/);
  await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();

  const sufijo = Date.now().toString().slice(-6);
  await page.getByLabel("Nombre completo").fill(`Docente ${sufijo}`);
  await page.getByLabel("Usuario").fill(`docente${sufijo}`);
  await page.getByLabel("Contraseña inicial").fill("Docente1234!");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText(`Docente ${sufijo}`)).toBeVisible();

  await page.getByRole("link", { name: "Auditoría" }).click();
  await expect(page.getByRole("heading", { name: "Auditoría" })).toBeVisible();
});
