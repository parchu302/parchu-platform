# language: es
Característica: Administración de pedidos por el emprendedor
  Como emprendedor con emprendimiento aprobado
  Quiero administrar mis pedidos (recibir, cancelar y marcar como entregado)
  Para gestionar el ciclo de vida de las ventas de mi emprendimiento

  Antecedentes:
    Dado que el emprendedor ha iniciado sesión en el sistema
    Y ha seleccionado uno de sus emprendimientos con estado "Aprobado"
    Y accede al panel de administración de pedidos de ese emprendimiento

  Escenario: Recepción de un nuevo pedido
    Dado que existe un pedido con estado "Pendiente" asociado a su emprendimiento
    Cuando el emprendedor recibe el pedido
    Entonces el sistema cambia el estado del pedido a "Recibido"
    Y notifica al comprador que su pedido fue recibido por el emprendedor

  Escenario: Cancelación de un pedido pendiente
    Dado que existe un pedido con estado "Pendiente" asociado a su emprendimiento
    Cuando el emprendedor cancela el pedido indicando un motivo
    Entonces el sistema cambia el estado del pedido a "Cancelado"
    Y notifica al comprador la cancelación junto con el motivo
    Y libera el stock reservado del producto

  Escenario: Cancelación de un pedido ya recibido
    Dado que existe un pedido con estado "Recibido" asociado a su emprendimiento
    Cuando el emprendedor cancela el pedido indicando un motivo
    Entonces el sistema cambia el estado del pedido a "Cancelado"
    Y notifica al comprador la cancelación junto con el motivo
    Y libera el stock reservado del producto

  Escenario: Intento de cancelar un pedido ya entregado
    Dado que existe un pedido con estado "Entregado" asociado a su emprendimiento
    Cuando el emprendedor intenta cancelar el pedido
    Entonces el sistema muestra un error indicando que un pedido entregado no puede cancelarse
    Y el estado del pedido no cambia

  Escenario: Marcar un pedido como entregado
    Dado que existe un pedido con estado "Recibido" asociado a su emprendimiento
    Cuando el emprendedor marca el pedido como entregado
    Entonces el sistema cambia el estado del pedido a "Entregado"
    Y notifica al comprador que el producto fue marcado como entregado
    Y habilita al emprendedor para ingresar el código de confirmación y completar la venta

  Escenario: Intento de marcar como entregado un pedido no recibido
    Dado que existe un pedido con estado "Pendiente" asociado a su emprendimiento
    Cuando el emprendedor intenta marcar el pedido como entregado
    Entonces el sistema muestra un error indicando que el pedido debe estar en estado "Recibido" para marcarse como entregado
    Y el estado del pedido no cambia

  Escenario: Finalización exitosa del pedido mediante código de confirmación
    Dado que existe un pedido con estado "Entregado" asociado a su emprendimiento
    Cuando el emprendedor solicita el código de confirmación al cliente y lo ingresa en el sistema
    Entonces el sistema cambia el estado del pedido a "Completado"
    Y reinicia el contador de intentos fallidos del pedido
    Y notifica al comprador que su pedido fue completado

  Escenario: Código de confirmación incorrecto
    Dado que existe un pedido con estado "Entregado" asociado a su emprendimiento
    Y el pedido tiene 0 intentos fallidos registrados
    Cuando el emprendedor ingresa un código de confirmación que no coincide con el asignado al pedido
    Entonces el sistema muestra un error indicando que el código es incorrecto
    Y incrementa el contador de intentos fallidos del pedido
    Y el estado del pedido no cambia

  Escenario: Bloqueo por exceder el número de intentos fallidos
    Dado que existe un pedido con estado "Entregado" asociado a su emprendimiento
    Y el pedido ya tiene 2 intentos fallidos registrados
    Cuando el emprendedor ingresa un código de confirmación que no coincide con el asignado al pedido
    Entonces el sistema bloquea la validación del código para ese pedido
    Y muestra un mensaje indicando que se alcanzó el límite de intentos y se requiere soporte del administrador
    Y el estado del pedido no cambia

  Escenario: Intento de validar un código en un pedido no entregado
    Dado que existe un pedido con estado "Recibido" asociado a su emprendimiento
    Cuando el emprendedor intenta ingresar un código de confirmación
    Entonces el sistema muestra un error indicando que el pedido debe estar en estado "Entregado" para validar el código
    Y el estado del pedido no cambia
