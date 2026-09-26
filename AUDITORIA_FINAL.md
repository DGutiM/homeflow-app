# Auditoría integral · 26 de septiembre de 2026

## Alcance

Revisión de la estructura HTML, estilos responsive, cálculos financieros, persistencia en Firebase, histórico, inversiones, depósitos, cuentas remuneradas y exportaciones. La comprobación visual se realizó con datos de demostración aislados, sin leer ni modificar los datos reales del usuario.

## Correcciones aplicadas

- Las aportaciones mensuales a renta variable y renta fija se consideran inversión a largo plazo. Ambas reducen el ahorro disponible y permanecen dentro del ahorro total.
- El histórico calcula ahora una tasa global ponderada (`ahorro total / ingresos totales`) en vez de promediar porcentajes mensuales.
- El bloque mensual muestra por separado renta variable, renta fija y total aportado.
- Los meses modificados muestran `Cambios sin guardar`; cargar otro período, cerrar sesión o salir de la página ya no puede descartarlos silenciosamente.
- Guardar un mes existente continúa sustituyendo su clave `AAAA-MM`, sin crear otra fila ni volver a sumar el mes.
- Los guardados de perfil y períodos se ejecutan en cola para impedir que dos escrituras simultáneas de la misma pestaña se sobrescriban.
- Varias operaciones de patrimonio restauran el estado anterior si Firebase rechaza el guardado.
- Los depósitos muestran interés bruto, retención estimada configurable e interés neto. Al cobrar se solicita el interés neto real, que es el importe archivado por año.
- Los informes Excel y PDF incluyen el histórico de intereses cobrados de depósitos y cuentas remuneradas.
- Se rechazan importes negativos o nulos en altas de gastos, ingresos, inversiones, depósitos, vivienda y traspasos.
- Las dependencias principales del CDN quedan fijadas a versiones concretas y los gráficos o la exportación muestran un aviso si una librería externa no carga.
- Se retiró el modo local antiguo que podía guardar contraseñas en `localStorage`. Se conserva únicamente la lectura de copias locales antiguas necesaria para migrarlas a Firebase.
- Al cambiar de pestaña se vuelve al inicio de la nueva sección.

## Compatibilidad y seguridad de datos

- Copia remota previa: `backup/pre-full-audit-2026-09-26`.
- Punto de partida auditado: `97ef65f60f40bb9dca44d275f838240c070f822c`.
- No se cambian las colecciones, claves ni documentos existentes de Firebase.
- Se mantienen los campos heredados de depósitos, renta fija y copias locales que todavía sirven para compatibilidad o migración.
- Un depósito cerrado nunca vuelve a activo al conciliar copias históricas.
- No se ha añadido lectura de nóminas o recibos, tal como se decidió.

## Validación realizada

- Sintaxis completa de `app.js` y `homeflow-core.js`.
- Pruebas de clasificación de renta fija y variable, ahorro disponible, ahorro total y reparto anual por adulto.
- Prueba de tasa histórica ponderada con meses de ingresos distintos.
- Pruebas de cálculo de depósitos, cierre, conciliación, vencimiento a final de mes, retención configurable e intereses por año.
- Pruebas de cuentas remuneradas y proyección TAE.
- Contratos HTML, IDs únicos, controles críticos, caché de publicación y actualización idempotente de meses.
- Prueba funcional de edición: el desplegable permanece abierto al escribir y aparece el aviso de cambios pendientes.
- Prueba funcional de actualización del mismo mes: nueve meses antes y nueve después, con mensaje de período actualizado.
- Prueba de seis depósitos: tres visibles inicialmente; `Ver 3 más` muestra los seis y cambia a `Mostrar menos`.
- Revisión visual real en 390 × 844 y 1440 × 900, modo oscuro, sin desbordamiento horizontal y con la navegación móvil fija sin tapar el botón de guardado.
- Consola sin errores propios de HomeFlow durante la prueba visual.

## Hallazgos que no conviene cambiar sin una decisión funcional

1. **Vivienda no equivale necesariamente a patrimonio neto.** Ahora se suman entrada, pagos extraordinarios y cuotas hipotecarias registradas. Si las cuotas incluyen intereses, el rosco refleja desembolso, no capital amortizado. Para calcular patrimonio real harían falta saldo pendiente de hipoteca y valor actual de la vivienda.
2. **Reglas de Firestore fuera del repositorio.** El cliente está revisado, pero las reglas de seguridad del servidor no pueden auditarse porque no están versionadas aquí. Conviene añadir `firestore.rules` y una prueba de acceso por usuario cuando se disponga del proyecto Firebase.
3. **`app.js` sigue siendo grande.** La lógica financiera crítica ya está en `homeflow-core.js` y cubierta por pruebas. Dividir el resto por dominios mejoraría mantenimiento, pero hacerlo sin empaquetador tendría más riesgo que beneficio en esta entrega.
4. **Dependencia de CDN.** Hay degradación controlada para gráficos y exportaciones, pero la aplicación sigue necesitando internet para Firebase y las librerías externas.

## Resultado

La versión auditada conserva los datos existentes, corrige las inconsistencias financieras detectadas, protege mejor los cambios no guardados y hace que depósitos e informes usen importes reales cuando están disponibles. La interfaz mantiene todos los desplegables cerrados al entrar y se ha comprobado tanto en móvil como en escritorio.
