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

  Escenario: Visualización de estadísticas básicas
    Dado que el administrador ha iniciado sesión
    Cuando el administrador ingresa al panel principal
    Entonces el sistema muestra estadísticas básicas

  Escenario: Aprobación de un emprendimiento pendiente
    Dado que existe un emprendimiento con estado "Pendiente de aprobación"
    Cuando el administrador aprueba el emprendimiento
    Entonces el sistema cambia el estado del emprendimiento a "Aprobado"
    Y notifica al emprendedor que su emprendimiento fue aprobado

  Escenario: Eliminación (baja lógica) de un emprendimiento
    Dado que existe un emprendimiento registrado
    Cuando el administrador elimina el emprendimiento indicando un motivo
    Entonces el sistema marca el emprendimiento como eliminado registrando la fecha y el motivo
    Y oculta el emprendimiento y sus productos de la vista pública
    Y conserva el histórico de pedidos asociados
    Y notifica al emprendedor la eliminación junto con el motivo

  Escenario: Pausa de un emprendimiento aprobado
    Dado que existe un emprendimiento con estado "Aprobado"
    Cuando el administrador pausa el emprendimiento indicando un motivo
    Entonces el sistema cambia el estado del emprendimiento a "Pausado"
    Y oculta sus productos de la vista pública
    Y notifica al emprendedor la pausa junto con el motivo

  Escenario: Intento de pausar un emprendimiento no aprobado
    Dado que existe un emprendimiento con estado "Pendiente de aprobación"
    Cuando el administrador intenta pausar el emprendimiento
    Entonces el sistema muestra un error indicando que solo se pueden pausar emprendimientos aprobados
    Y el estado del emprendimiento no cambia

  Escenario: Reactivación de un emprendimiento pausado
    Dado que existe un emprendimiento con estado "Pausado"
    Cuando el administrador reactiva el emprendimiento
    Entonces el sistema cambia el estado del emprendimiento a "Aprobado"
    Y sus productos vuelven a ser visibles en la vista pública
    Y notifica al emprendedor la reactivación
