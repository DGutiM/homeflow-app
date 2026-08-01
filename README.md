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
- Las aportaciones a fondos indexados reducen el **ahorro disponible**, porque se consideran dinero reservado hasta el largo plazo.
- El **ahorro total** suma el disponible y esas aportaciones, para que invertir no aparezca como si fuera consumo.
- Histórico muestra el ahorro anual de cada adulto. Los gastos comunes, hijos e inversiones del hogar se reparten a partes iguales; lo personal se asigna a su titular.
- Guardar de nuevo el mismo período sustituye `AAAA-MM`; no crea otro mes.
- Un depósito cobrado desaparece del patrimonio y su interés neto se agrupa por año.
- Los depósitos se concilian desde sus dos ubicaciones históricas y el estado `closed` siempre prevalece. Perfil y copia compatible se guardan en una sola escritura.
- Los depósitos antiguos marcados con `sentToCash` se migran en memoria a `closed` sin perder información.
- Las cuentas remuneradas permiten registrar el interés neto real: el abono aumenta el saldo y se suma al histórico anual junto a los intereses de depósitos.
- Diego incluye **Altan** como ingreso recurrente además de sus pagadores ya configurados.

## Interfaz

- Mes, histórico, inversiones y ajustes usan bloques cerrados por defecto.
- Al añadir o eliminar un dato dentro de un bloque, ese desplegable permanece abierto.
- En móvil, el histórico se muestra como tarjetas legibles en vez de una tabla comprimida.
- Acceso y cambio de tema están integrados en la cabecera compacta.
- «Herramientas y seguridad» deja espacio suficiente para desplazarse sin quedar tapado por la navegación móvil.
- El patrimonio inicial se configura desde Ajustes.
- El listado de depósitos muestra número de posiciones activas, capital activo, interés pendiente y total estimado al vencimiento.
- Las cuentas remuneradas guardan saldo, titular y TAE; se suman al patrimonio y al Rosco Económico, con interés mensual y anual estimados.
- Los desplegables de cuentas e intereses anuales conservan su estado al guardar un abono.
- CSS y JavaScript llevan versión de publicación para evitar que el navegador reutilice lógica antigua.
- La calculadora de interés compuesto compara escenarios, inflación, valor real y objetivo.

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
