# Estado de Funcionalidad del Panel Administrativo (Admin V2)

Este documento detalla qué hacen realmente las opciones de configuración disponibles en el apartado de **Configuración** del panel admin.

## 1. Servidor
*   **Modo Mantenimiento**: Actualmente funciona como una **bandera (flag)** en la base de datos. Para que sea efectiva, el `LandingPage.jsx` o el `App.jsx` deben consultar este valor y, si está activo, redirigir a los usuarios a una página de "Estamos en mantenimiento".
*   **Modo Debug**: Activa logs detallados en la consola del navegador para el administrador. No afecta la funcionalidad para el usuario final.

## 2. Base de Datos
*   **Frecuencia de Respaldo**: Es una configuración **lógica**. Indica al sistema la preferencia del administrador, pero requiere que un script externo (o un Edge Function de Supabase programado) realice el export de los datos realmente.
*   **Retención de Días**: Define cuántos días se deben conservar los logs antes de ser purgados (lógica a implementar en el script de limpieza).

## 3. Seguridad (2FA)
*   **Autenticación de Dos Factores (2FA)**: Actualmente el switch es **estético/configurativo**. Activa el campo en el perfil del usuario, pero el flujo de inicio de sesión actual (`useAuth.jsx`) aún no solicita un código adicional (OTP) por correo o app. Se requiere integración con un proveedor de SMS o correo para completar la funcionalidad.

## 4. Historial de Actividad
*   **Logs**: Se ha implementado la tabla `activity_logs`. Las acciones se registran cuando se realizan cambios críticos (ej: crear agente, eliminar usuario). Se visualizan en la nueva sección **Historial** del sidebar.

---
*Última actualización: 11 de Mayo de 2026*
