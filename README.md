# HomeFlow

Aplicación web personal para registrar ingresos, gastos, inversiones, depósitos, vivienda e histórico familiar.

## Estructura

- `index.html`: estructura de la interfaz.
- `styles.css`: diseño adaptable para escritorio y móvil.
- `app.js`: interfaz, Firebase, histórico y exportaciones.
- `homeflow-core.js`: reglas financieras puras y compatibles con datos anteriores.
- `tests/`: comprobaciones de cálculos y contratos de integración.

## Cambios financieros

- Fondo, ETF, acciones y renta variable se agrupan como **renta variable**.
- **Renta fija** solo suma posiciones de renta fija.
- Las aportaciones mensuales continúan alimentando automáticamente la categoría elegida.
- Guardar de nuevo el mismo período sustituye `AAAA-MM`; no crea otro mes.
- Un depósito cobrado desaparece del patrimonio y su interés neto se agrupa por año.
- Los depósitos antiguos marcados con `sentToCash` se migran en memoria a `closed` sin perder información.

## Desarrollo

La aplicación no necesita compilación. Para servirla localmente:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Pruebas:

```bash
npm test
```

## Datos

La actualización conserva las claves y estructuras ya guardadas en Firebase. Los saldos personales no se incluyen en el código público: se editan dentro de la cuenta autenticada.
