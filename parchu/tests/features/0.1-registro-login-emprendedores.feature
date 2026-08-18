# language: es
Característica: Registro e inicio de sesión de emprendedores
  Como futuro emprendedor
  Quiero registrarme con correo y contraseña e iniciar sesión
  Para poder registrar mi emprendimiento y acceder a la plataforma

  Escenario: Registro exitoso de un emprendedor
    Dado que no existe una cuenta registrada con el correo "ana@uni.edu"
    Cuando el usuario completa el formulario de registro con correo "ana@uni.edu", contraseña y datos básicos
    Y confirma el registro
    Entonces el sistema crea la cuenta del emprendedor con rol "Emprendedor"
    Y le permite iniciar sesión con esas credenciales
    Y le indica que puede continuar registrando su emprendimiento

  Escenario: Registro rechazado por correo ya registrado
    Dado que ya existe una cuenta registrada con el correo "ana@uni.edu"
    Cuando el usuario intenta registrarse con el correo "ana@uni.edu"
    Entonces el sistema muestra un error indicando que el correo ya está en uso
    Y la cuenta no se crea

  Escenario: Registro rechazado por formato de correo inválido
    Cuando el usuario intenta registrarse con el correo "ana@invalido"
    Entonces el sistema muestra un error indicando que el formato de correo es inválido
    Y la cuenta no se crea

  Escenario: Registro rechazado por contraseña insegura
    Cuando el usuario intenta registrarse con una contraseña que no cumple los requisitos mínimos
    Entonces el sistema muestra un error indicando los requisitos de la contraseña
    Y la cuenta no se crea

  Esquema del escenario: Registro rechazado por campos obligatorios faltantes
    Cuando el usuario completa el formulario de registro dejando vacío el campo "<campo>"
    Y confirma el registro
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y la cuenta no se crea

    Ejemplos:
      | campo      |
      | correo     |
      | contraseña |
      | nombre     |

  Escenario: Inicio de sesión exitoso
    Dado que existe una cuenta de emprendedor con correo "ana@uni.edu" y su contraseña correcta
    Cuando el emprendedor ingresa el correo "ana@uni.edu" y su contraseña correcta
    Entonces el sistema autentica al emprendedor
    Y lo redirige a su panel

  Escenario: Inicio de sesión rechazado por contraseña incorrecta
    Dado que existe una cuenta de emprendedor con correo "ana@uni.edu"
    Cuando el emprendedor ingresa el correo "ana@uni.edu" y una contraseña incorrecta
    Entonces el sistema muestra un error de credenciales inválidas
    Y no concede acceso

  Escenario: Inicio de sesión rechazado por correo no registrado
    Dado que no existe una cuenta registrada con el correo "desconocido@uni.edu"
    Cuando el usuario intenta iniciar sesión con el correo "desconocido@uni.edu"
    Entonces el sistema muestra un error de credenciales inválidas
    Y no concede acceso
