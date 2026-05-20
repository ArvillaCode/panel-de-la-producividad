# Guía de Configuración de Supabase Auth para Upfunnel

Para resolver los problemas de remitente del correo y redirecciones fallidas ("localhost refused to connect"), sigue estos pasos en tu panel de Supabase.

## 1. Configurar Redirecciones de Producción
Esto evitará el error de "localhost refused to connect" cuando hagas clic en el enlace del correo.

1. Ve a **Authentication** -> **URL Configuration**.
2. En **Site URL**, cambia `http://localhost:3000` (o lo que tengas) por:
   `https://app.upfunnel.click`
3. En **Redirect URLs**, añade:
   `https://app.upfunnel.click/**`
4. Haz clic en **Save**.

---

## 2. Configurar Correo Corporativo (SMTP)
Esto hará que los correos lleguen desde tu dominio y no desde Supabase.

1. Ve a **Project Settings** -> **Auth**.
2. Busca la sección **SMTP Settings**.
3. Activa el interruptor **Enable Custom SMTP**.
4. Rellena los campos con los datos de tu proveedor de correo (ej. Resend, SendGrid o tu hosting):
   - **Sender email:** tu-correo@tu-dominio.com
   - **Sender name:** Upfunnel Panel
   - **Host:** (ej. smtp.resend.com)
   - **Port:** 587 o 465
   - **User:** (tu usuario SMTP)
   - **Password:** (tu contraseña SMTP)
5. Haz clic en **Save**.

---

## 3. Personalizar Plantilla de Correo
Para que el correo de inicio de sesión se vea profesional.

1. Ve a **Authentication** -> **Email Templates**.
2. Selecciona **Magic Link**.
3. En **Subject**, puedes poner: `Tu código de acceso a Upfunnel: {{ .Token }}`.
4. En **Body**, asegúrate de que el mensaje sea claro y usa la variable `{{ .ConfirmationURL }}` para el enlace o `{{ .Token }}` si prefieres que copien y peguen el código de 6 dígitos.

---

## Notas Adicionales
- Si usas el código de 6 dígitos (OTP) en lugar de un enlace, el usuario no necesita hacer clic en nada, solo copiar el número del correo y pegarlo en tu aplicación.
- Con los cambios que ya hice en el código, la aplicación detectará automáticamente si estás en local o en producción para pedirle a Supabase que te devuelva al sitio correcto.
