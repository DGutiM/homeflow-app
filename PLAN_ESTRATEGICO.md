# HomeFlow · plan estratégico

## Principios

- Mantener compatibilidad con los documentos actuales de Firebase.
- No borrar movimientos históricos durante las migraciones.
- Diferenciar patrimonio actual, aportaciones mensuales y depósitos.
- Hacer que guardar un mes sea idempotente: actualizar el mismo período nunca debe duplicarlo.
- Priorizar una experiencia móvil rápida sin degradar la vista de escritorio.

## Etapa 1 · Corrección financiera

- Renta fija solo suma elementos clasificados como renta fija.
- Fondo, ETF, acciones y renta variable se agrupan como renta variable.
- Las aportaciones mensuales continúan alimentando automáticamente la cartera.
- Un depósito cobrado deja de formar parte del patrimonio.
- El interés neto del depósito queda agrupado por el año en que se cobra.
- Los depósitos antiguos con `sentToCash` se interpretan como cerrados sin alterar el dato original.

## Etapa 2 · Guardado seguro

- Un período se identifica por `AAAA-MM` y se sobrescribe por esa clave.
- Si el selector de mes cambia sin cargarlo, el guardado se bloquea para evitar copiar un mes en otro.
- La interfaz debe indicar claramente si el período es nuevo o ha sido actualizado.

## Etapa 3 · Interfaz móvil

- Navegación inferior fija con cinco secciones.
- Cabecera compacta en pantallas pequeñas.
- Bloques desplegables para gastos comunes, inversiones, Diego, Itxaso, Iago y totales.
- Histórico mensual en tarjetas, manteniendo las tablas completas en escritorio.
- Inversiones y ajustes organizados en secciones desplegables.
- KPI en dos columnas para reducir desplazamiento vertical.
- Formularios en una columna y objetivos táctiles de al menos 44 píxeles.
- Acción de guardado accesible sobre la navegación inferior.

## Etapa 4 · Simplificación técnica

- Extraer cálculos puros a `homeflow-core.js`.
- Extraer los estilos a `styles.css` y la aplicación a `app.js`.
- Mantener `index.html` como estructura compatible con GitHub Pages.
- Añadir pruebas de clasificación, importes, ciclo de vida de depósitos y actualización idempotente de meses.
- Eliminar funciones sin llamadas y controles antiguos ya desconectados de la interfaz.
- En una siguiente versión, dividir `app.js` por dominios cuando haya una herramienta de empaquetado.

## Etapa posterior

La lectura automática de nóminas y recibos queda expresamente fuera de esta actualización.
