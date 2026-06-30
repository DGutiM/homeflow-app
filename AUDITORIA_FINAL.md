# Auditoría final · 30 de junio de 2026

## Seguridad de datos

- Copia remota previa: `backup/pre-redesign-2026-06-29`.
- Copia local previa a esta revisión: `/private/tmp/homeflow-backup-2026-06-30-before-compact-ui`.
- Copia local previa a la aclaración del ahorro: `/private/tmp/homeflow-backup-2026-06-30-savings-scroll`.
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
- Se retiraron funciones sin ninguna llamada, sin eliminar estructuras de datos compatibles.
