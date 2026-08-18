# language: es
Característica: Inicio de sesión y gestión de administrador
  Como administrador de la plataforma
  Quiero iniciar sesión y ver estadísticas básicas
  Para aprobar, eliminar o pausar emprendimientos

  Antecedentes:
    Dado que la cuenta de administrador fue creada previamente en base de datos

  Escenario: Inicio de sesión exitoso del administrador
    Cuando el administrador ingresa su correo y contraseña correctos
    Entonces el sistema lo autentica con rol "Administrador"
    Y lo redirige a un panel con estadísticas básicas de la plataforma

  Escenario: Inicio de sesión rechazado por credenciales incorrectas
    Cuando el administrador ingresa su correo y una contraseña incorrecta
    Entonces el sistema muestra un error de credenciales inválidas
    Y no concede acceso
