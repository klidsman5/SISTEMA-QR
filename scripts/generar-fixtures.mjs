import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve("tests/fixtures");
mkdirSync(dir, { recursive: true });

const grados = ["3ro", "4to", "5to"];
const secciones = ["A", "B"];

function fila(i) {
  return {
    dni: String(70000000 + i),
    nombres: i % 7 === 0 ? "Ana Lucía" : `Alumno${i}`,
    apellidos: i % 5 === 0 ? "Núñez Ríos" : `Apellido${i}`,
    grado: grados[i % grados.length],
    seccion: secciones[i % secciones.length],
  };
}

// CSV con 1,000 filas y acentos
const encabezado = "dni,nombres,apellidos,grado,seccion";
const filas1000 = Array.from({ length: 1000 }, (_, i) => fila(i));
writeFileSync(
  resolve(dir, "padron_1000.csv"),
  [encabezado, ...filas1000.map((f) => Object.values(f).join(","))].join("\n"),
  "utf8",
);

// CSV con 10 errores intencionales
const conErrores = filas1000.slice(0, 40).map((f, i) => {
  if (i < 5) return { ...f, dni: "" };
  if (i < 10) return { ...f, grado: "9no" };
  return f;
});
writeFileSync(
  resolve(dir, "padron_con_errores.csv"),
  [encabezado, ...conErrores.map((f) => Object.values(f).join(","))].join("\n"),
  "utf8",
);

// CSV de acentos
writeFileSync(
  resolve(dir, "padron_acentos_utf8.csv"),
  [encabezado, "70123456,Ana Lucía,Torres Ríos,3ro,B", "70123457,José María,Núñez Peña,3ro,A"].join("\n"),
  "utf8",
);

async function xlsx(nombre, filas) {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Padron");
  hoja.addRow(["dni", "nombres", "apellidos", "grado", "seccion"]);
  filas.forEach((f) => hoja.addRow([f.dni, f.nombres, f.apellidos, f.grado, f.seccion]));
  await wb.xlsx.writeFile(resolve(dir, nombre));
}

await xlsx("padron_1000.xlsx", filas1000);
await xlsx("padron_anio_nuevo.xlsx", filas1000.slice(0, 950));

console.log("Fixtures generados en tests/fixtures");
