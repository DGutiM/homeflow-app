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
- Las aportaciones mensuales **desde ingresos** a renta variable y renta fija reducen el **ahorro disponible**, porque se consideran dinero reservado a largo plazo.
- Los traspasos desde renta fija a variable aparecen en la actividad inversora, pero no se descuentan de nuevo de los ingresos ni generan ahorro nuevo. En el mes se elige su origen.
- Los traspasos antiguos sin mes efectivo usan provisionalmente la fecha de registro y muestran una advertencia. Histórico permite corregir su mes y distinguir inversión de ajuste de saldo sin cambiar el patrimonio.
- El **ahorro total** suma el disponible y esas aportaciones, para que invertir no aparezca como si fuera consumo.
- Histórico muestra el ahorro anual de cada adulto. Los gastos comunes, hijos e inversiones del hogar se reparten a partes iguales; lo personal se asigna a su titular.
- Guardar de nuevo el mismo período sustituye `AAAA-MM`; no crea otro mes.
- La web avisa cuando un mes tiene cambios sin guardar y pide confirmación antes de descartarlos.
- Un depósito cobrado desaparece del patrimonio y su interés neto se agrupa por año.
- Los depósitos se concilian desde sus dos ubicaciones históricas y el estado `closed` siempre prevalece. Perfil y copia compatible se guardan en una sola escritura.
- Los depósitos antiguos marcados con `sentToCash` se migran en memoria a `closed` sin perder información.
- Las cuentas remuneradas permiten registrar el interés neto real: el abono aumenta el saldo y se suma al histórico anual junto a los intereses de depósitos.
- La estimación de depósitos muestra interés bruto, retención configurable e interés neto. El formulario de cobro permite guardar fecha e interés neto real, o una estimación marcada como pendiente de cotejar. Los cobros pueden revisarse después.
- La cuota mensual de vivienda es gasto común y pago acumulado de vivienda, calculado desde el mismo período. Los pagos antiguos pueden vincularse a un mes sin volver a sumarlos.
- La cuota habitual se configura con importe, mes inicial y final opcional; se propone solo en meses nuevos y se puede modificar, incluso a cero.
- Los cambios de jornada son contexto fechado. No alteran automáticamente la nómina neta.
- Diego incluye **Altan** como ingreso recurrente además de sus pagadores ya configurados.

## Interfaz

- Mes, histórico, inversiones y ajustes usan bloques cerrados por defecto.
- Al añadir o eliminar un dato dentro de un bloque, ese desplegable permanece abierto.
- Los importes a cero se muestran como campos vacíos con marcador `0` para facilitar la escritura.
- Ingresos por pagador agrupa importes mensuales de hasta 500 € en «Otros», con opción de ver todos.
- En móvil, el histórico se muestra como tarjetas legibles en vez de una tabla comprimida.
- Acceso y cambio de tema están integrados en la cabecera compacta.
- «Herramientas y seguridad» deja espacio suficiente para desplazarse sin quedar tapado por la navegación móvil.
- El patrimonio inicial se configura desde Ajustes.
- El listado de depósitos muestra número de posiciones activas, capital activo, interés pendiente y total estimado al vencimiento.
- Las cuentas remuneradas guardan saldo, titular y TAE; se suman al patrimonio y al Rosco Económico, con interés mensual y anual estimados.
- Los desplegables de cuentas e intereses anuales conservan su estado al guardar un abono.
- CSS y JavaScript llevan versión de publicación para evitar que el navegador reutilice lógica antigua.
- La calculadora de interés compuesto compara escenarios, inflación, valor real y objetivo.
- Excel y PDF incluyen actividad inversora, traspasos e intereses, distinguiendo los intereses estimados de los confirmados.
- Los guardados se serializan para evitar que dos operaciones simultáneas dentro de la misma sesión se sobrescriban.
- Guardar el perfil no reescribe los meses; guardar un mes reemplaza solo ese período. Vincular un pago de vivienda utiliza una transacción atómica.
- Ajustes permite descargar una copia JSON privada completa (perfil, períodos y depósitos). No se debe subir al repositorio público.

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
