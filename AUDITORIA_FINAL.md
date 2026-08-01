# Auditoría final · 1 de agosto de 2026

## Revisión de depósitos, cuentas e ingresos

- Copia remota previa: `backup/pre-deposit-sync-altan-2026-08-01`.
- Clonación de trabajo aislada: `/private/tmp/homeflow-audit-20260801.znhwkj/repo`.
- Se encontró la causa de la desincronización: los depósitos se guardaban en `profile.deposits` y `bundle.deposits` mediante dos escrituras distintas.
- El guardado del perfil actualiza ambas ubicaciones en una sola operación y el método duplicado `saveDeposits` se ha retirado.
- La conciliación nunca permite que una copia activa vuelva a abrir un depósito que ya figura como cerrado en la otra copia.
- El resumen de depósitos se calcula únicamente con posiciones activas y muestra capital, interés pendiente y total al vencimiento.
- Los intereses reales de cuentas remuneradas se guardan por fecha, aumentan el saldo y aparecen en el acumulado anual junto a los depósitos cerrados.
- Altan se añade como ingreso recurrente específico de Diego sin sustituir Hospital, Universidad ni otros pagadores existentes.
- Los archivos JavaScript y CSS usan una versión de caché común para que GitHub Pages cargue la publicación nueva.

## Validación de esta revisión

- Prueba automática de dos copias contradictorias del mismo depósito: el resultado conserva `closed` y capital activo cero.
- Prueba de cartera con dos depósitos activos y uno cerrado: solo se suman los dos activos.
- Prueba combinada de intereses de depósito y Trade Republic separada por años y por origen.
- Cierre visual de un depósito: el contador pasó de 2 a 1 y el capital activo de 8.000 € a 5.000 €.
- Abono visual de 24,66 € en Trade Republic: saldo de 10.000 € a 10.024,66 € e histórico anual de 32,40 € a 57,06 €.
- El bloque de cuentas y el año de intereses permanecieron abiertos después de guardar el abono.
- Altan apareció en el bloque mensual de Diego junto a Hospital y Universidad.
- Interfaz revisada en 1365 × 900 y 390 × 844, sin desbordamiento horizontal en móvil.
- `npm test`, comprobación de sintaxis, contratos HTML, IDs duplicados y `git diff --check` correctos.

## Seguridad de datos

- Copia remota previa: `backup/pre-redesign-2026-06-29`.
- Copia local previa a esta revisión: `/private/tmp/homeflow-backup-2026-06-30-before-compact-ui`.
- Copia local previa a la aclaración del ahorro: `/private/tmp/homeflow-backup-2026-06-30-savings-scroll`.
- Copia local previa a desplegables, ahorro personal y cuentas remuneradas: `/private/tmp/homeflow-backup-2026-07-01-accordions-annual-savings`.
- No se cambian las claves existentes de Firebase.
- Guardar un período usa su clave `AAAA-MM`: una corrección reemplaza el mes, no lo duplica.
- Se conservan los campos antiguos necesarios para leer datos previos.

## Comprobaciones realizadas

- Sintaxis de `app.js` y `homeflow-core.js`.
- Pruebas de renta fija, renta variable, depósitos cerrados e intereses anuales.
- Prueba de actualización idempotente de un mes.
- IDs HTML sin duplicados.
- Referencias de controles estáticos revisadas.
- Interfaz probada en 390 × 844 y 1280 × 900.
- Resumen financiero probado con ingresos de 5.500 €, gastos de vida de 3.000 € y fondos de 1.000 €: 1.500 € disponibles y 2.500 € de ahorro total.
- Sin desbordamiento horizontal en móvil ni escritorio.
- Navegación inferior anclada al borde del viewport durante el scroll, con el área segura dentro de la barra.
- El último botón de «Herramientas y seguridad» queda 52 px por encima de la navegación inferior en 390 × 844.
- En móvil, añadir un gasto dentro del bloque de Diego conserva el desplegable abierto.
- El ahorro anual por persona se comprobó con dos meses y reconcilia con el total familiar.
- Una cuenta de 10.000 € al 3 % TAE muestra 24,66 € mensuales y 300 € anuales estimados; el saldo entra en el total y en el rosco.
- Sin errores ni avisos en la consola del navegador.
- Cero desplegables abiertos al iniciar, cero IDs duplicados y cero funciones sin uso.
- El despliegue de 14 depósitos se probó sin una nueva consulta remota.

## Resultado

- Los botones «Ver más / Mostrar menos» conservan correctamente su estado.
- «Ver más» en depósitos actualiza únicamente la lista visible y responde de forma inmediata.
- El histórico móvil usa tarjetas y el escritorio mantiene sus tablas.
- Mes, inversiones y ajustes están organizados en desplegables cerrados por defecto.
- Acceso y tema forman parte de la cabecera compacta.
- El patrimonio inicial se administra desde Ajustes.
- La lista de depósitos muestra capital, interés y total en campos separados.
- La calculadora añade escenarios rápidos, inflación, valor real y objetivo.
- El resumen, el histórico, los gráficos y las exportaciones distinguen entre ahorro disponible, inversión a largo plazo y ahorro total.
- Las aportaciones a fondos conservan su comportamiento anterior: se restan del disponible, pero ahora también cuentan en el ahorro total.
- Las cuentas remuneradas son compatibles con perfiles antiguos mediante el nuevo campo opcional `savingsAccounts`.
- Excel y PDF incluyen las cuentas remuneradas y sus estimaciones.
- Se retiraron funciones sin ninguna llamada, sin eliminar estructuras de datos compatibles.
