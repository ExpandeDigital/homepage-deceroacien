export function welcomeEmail({ email }){
  return {
    subject: 'Bienvenido a DE CERO A CIEN',
    html: `<p>¡Hola!</p>
<p>Tu correo (${email}) ha sido registrado. Si aún no tienes cuenta, crea tu contraseña iniciando sesión desde nuestro portal:</p>
<p><a href="https://deceroacien.app/auth/login.html">Ir a Iniciar Sesión</a></p>
<p>Si usas Google/Firebase, simplemente inicia sesión y tus accesos se sincronizarán.</p>`,
    text: `Bienvenido. Inicia sesión en https://deceroacien.app/auth/login.html`
  };
}

export function purchaseConfirmationEmail({ email, items }){
  const list = (items||[]).map(s=>`- ${s}`).join('\n');
  return {
    subject: 'Confirmación de compra',
    html: `<p>¡Gracias por tu compra!</p>
<p>Se habilitó el acceso a:</p>
<ul>${(items||[]).map(s=>`<li>${s}</li>`).join('')}</ul>
<p>Ingresa a tu portal: <a href="https://deceroacien.app/portal-alumno.html">portal-alumno</a></p>`,
    text: `Gracias por tu compra. Accesos: \n${list}\nPortal: https://deceroacien.app/portal-alumno.html`
  };
}
