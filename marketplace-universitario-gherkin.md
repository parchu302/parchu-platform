# Marketplace Universitario — Casos de Uso en Gherkin

## 0. Autenticación del sistema

### 0.1 Registro e inicio de sesión de emprendedores

```gherkin
# language: es
Característica: Registro e inicio de sesión de emprendedores
  Como futuro emprendedor
  Quiero registrarme con correo y contraseña e iniciar sesión
  Para poder registrar mi emprendimiento y acceder a la plataforma

  Escenario: Registro exitoso de un emprendedor
    Dado que no existe una cuenta registrada con el correo "ana@uni.edu"
    Cuando el usuario completa el formulario de registro con correo "ana@uni.edu", contraseña y datos básicos (nombre, apellido)
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
    Cuando el usuario intenta registrarse con una contraseña que no cumple los requisitos mínimos (longitud, mayúscula, número)
    Entonces el sistema muestra un error indicando los requisitos de la contraseña
    Y la cuenta no se crea

  Esquema del escenario: Registro rechazado por campos obligatorios faltantes
    Cuando el usuario completa el formulario de registro dejando vacío el campo "<campo>"
    Y confirma el registro
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y la cuenta no se crea

    Ejemplos:
      | campo       |
      | correo      |
      | contraseña  |
      | nombre      |

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
```

**Supuestos:**
- Solo los emprendedores requieren registro (correo + contraseña); clientes y administradores no se registran por este flujo.
- Tras el registro, la cuenta queda activa de inmediato y habilitada para registrar un emprendimiento (caso de uso 1), sin verificación de correo adicional (si se requiere verificación por correo, se agrega como escenario aparte).
- El mensaje de error de login es genérico ("credenciales inválidas") para no revelar si el correo existe, como buena práctica de seguridad.
- Requisitos de contraseña asumidos (longitud mínima, mayúscula, número); ajustar si nuam tiene una política de contraseñas definida.

---

### 0.2 Inicio de sesión y gestión de administrador

```gherkin
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
    Entonces el sistema muestra estadísticas básicas (ej. total de emprendimientos, total de productos, total de pedidos, emprendimientos pendientes de aprobación)

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

  Escenario: Desbloqueo de un pedido con código de confirmación bloqueado
    Dado que existe un pedido cuyo código de confirmación está bloqueado por exceso de intentos fallidos
    Cuando el administrador regenera el código de confirmación del pedido
    Entonces el sistema genera un nuevo código de confirmación único para el pedido
    Y reinicia el contador de intentos fallidos del pedido a cero
    Y desbloquea la validación del código para ese pedido
    Y actualiza el enlace de seguimiento del cliente con el nuevo código

  Escenario: Intento de regenerar el código de un pedido no bloqueado
    Dado que existe un pedido cuyo código de confirmación no está bloqueado
    Cuando el administrador intenta regenerar el código de confirmación del pedido
    Entonces el sistema muestra un mensaje indicando que el pedido no requiere desbloqueo
    Y el código de confirmación no cambia
```

**Supuestos:**
- La cuenta de administrador se crea directamente en base de datos (no hay flujo de registro por UI), pero autentica con el mismo mecanismo de correo/contraseña.
- El panel de administrador muestra estadísticas básicas, las acciones de aprobar/eliminar/pausar/reactivar sobre emprendimientos y el desbloqueo de pedidos con código bloqueado.
- **Eliminar es una baja lógica (soft delete)**: el emprendimiento se marca como eliminado (fecha + motivo), se oculta junto con sus productos de la vista pública y se conserva el histórico de pedidos.
- El **desbloqueo de un pedido** se hace **regenerando el código**: esto crea un código nuevo, reinicia el contador de intentos a cero y desbloquea la validación. El cliente consulta el nuevo código a través de su enlace de seguimiento (no se envía por correo).
- "Reactivación" de un emprendimiento pausado se incluye como contraparte lógica de la pausa.

---

### 0.3 Compra de clientes sin registro

```gherkin
# language: es
Característica: Compra de clientes sin registro
  Como cliente sin cuenta en la plataforma
  Quiero completar mis datos básicos al momento de comprar
  Para realizar mi pedido sin necesidad de registrarme

  Escenario: Compra exitosa completando datos básicos
    Dado que el cliente tiene productos seleccionados para comprar
    Cuando el cliente completa sus datos básicos (nombre, correo o teléfono de contacto)
    Y selecciona una forma de pago disponible
    Y confirma la compra
    Entonces el sistema crea el pedido con estado "Pendiente"
    Y genera un código de confirmación único asociado al pedido
    Y genera un enlace de seguimiento único para que el cliente consulte el estado y el código del pedido
    Y muestra al cliente una confirmación con el detalle del pedido, su código de confirmación y su enlace de seguimiento

  Esquema del escenario: Compra rechazada por campos obligatorios faltantes
    Dado que el cliente tiene productos seleccionados para comprar
    Cuando el cliente completa sus datos básicos dejando vacío el campo "<campo>"
    Y confirma la compra
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y el pedido no se crea

    Ejemplos:
      | campo    |
      | nombre   |
      | contacto |

  Escenario: Compra rechazada por formato de contacto inválido
    Dado que el cliente tiene productos seleccionados para comprar
    Cuando el cliente ingresa un correo o teléfono con formato inválido como dato de contacto
    Y confirma la compra
    Entonces el sistema muestra un error indicando que el formato de contacto es inválido
    Y el pedido no se crea

  Escenario: Compra rechazada por falta de stock
    Dado que el cliente tiene un producto seleccionado cuyo stock disponible es menor a la cantidad solicitada
    Cuando el cliente confirma la compra
    Entonces el sistema muestra un error indicando que no hay stock suficiente
    Y el pedido no se crea
```

**Supuestos:**
- El cliente no crea cuenta ni requiere correo/contraseña; solo se piden datos mínimos de contacto (nombre + correo o teléfono) para poder notificarle sobre su pedido.
- No se valida identidad del cliente ni se guarda un historial de cuenta; el seguimiento del pedido se hace mediante un **enlace único con token no adivinable** entregado al momento de la compra, donde el cliente consulta el estado y su código de confirmación (incluido si el administrador lo regenera).
- La reserva de stock ocurre al confirmar la compra (mismo criterio usado en el caso de uso de administración de pedidos, donde cancelar libera el stock reservado).
- El código de confirmación es único por pedido y se entrega al cliente en la confirmación de compra; este código es el que el emprendedor solicitará y validará para completar la venta (ver caso de uso 3).

---

## 1. Registro de emprendimiento

```gherkin
# language: es
Característica: Registro de emprendimiento
  Como emprendedor registrado en la plataforma
  Quiero registrar los detalles básicos de mi emprendimiento
  Para poder ofrecer mis productos en el marketplace universitario

  Antecedentes:
    Dado que el emprendedor ha iniciado sesión en el sistema

  Escenario: Registro exitoso de un nuevo emprendimiento
    Cuando el emprendedor completa el formulario con nombre, descripción, categoría y datos de contacto del emprendimiento
    Y confirma el registro
    Entonces el sistema crea el emprendimiento con estado "Pendiente de aprobación"
    Y lo asocia a la cuenta del emprendedor
    Y muestra un mensaje de confirmación al emprendedor

  Escenario: Registro de un emprendimiento adicional por el mismo emprendedor
    Dado que el emprendedor ya tiene uno o más emprendimientos registrados
    Cuando el emprendedor completa el formulario con un nombre distinto y los datos requeridos
    Y confirma el registro
    Entonces el sistema crea el nuevo emprendimiento con estado "Pendiente de aprobación"
    Y lo asocia a la cuenta del emprendedor

  Esquema del escenario: Registro rechazado por campos obligatorios faltantes
    Cuando el emprendedor completa el formulario dejando vacío el campo "<campo>"
    Y confirma el registro
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y el emprendimiento no se crea

    Ejemplos:
      | campo         |
      | nombre        |
      | descripción   |
      | categoría     |

  Escenario: Registro rechazado por nombre de emprendimiento ya existente
    Dado que ya existe un emprendimiento registrado con el nombre "Postres Ana"
    Cuando el emprendedor intenta registrar un nuevo emprendimiento con el nombre "Postres Ana"
    Entonces el sistema muestra un error indicando que ya existe un emprendimiento con ese nombre
    Y el nuevo emprendimiento no se crea
```

**Supuestos:**
- El emprendimiento queda en estado "Pendiente de aprobación" tras el registro.
- Campos obligatorios: nombre, descripción, categoría, datos de contacto.
- Un emprendedor puede tener **varios emprendimientos**; cada uno se aprueba por separado.
- El **nombre de emprendimiento es único a nivel global** en la plataforma (dos emprendimientos no pueden compartir nombre, sin importar el dueño).

---

## 2. Registro de productos y formas de pago

```gherkin
# language: es
Característica: Registro de productos y formas de pago
  Como emprendedor con emprendimiento aprobado
  Quiero registrar los datos básicos de mis productos y mis formas de pago
  Para poder ofrecerlos a la venta en el marketplace universitario

  Antecedentes:
    Dado que el emprendedor ha iniciado sesión en el sistema
    Y ha seleccionado uno de sus emprendimientos con estado "Aprobado"

  Escenario: Registro exitoso de un producto
    Cuando el emprendedor completa el formulario con nombre, descripción, precio, categoría y stock del producto
    Y confirma el registro
    Entonces el sistema crea el producto asociado a su emprendimiento con estado "Publicado"
    Y muestra un mensaje de confirmación al emprendedor

  Esquema del escenario: Registro de producto rechazado por campos obligatorios faltantes
    Cuando el emprendedor completa el formulario del producto dejando vacío el campo "<campo>"
    Y confirma el registro
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y el producto no se crea

    Ejemplos:
      | campo       |
      | nombre      |
      | precio      |
      | categoría   |
      | stock       |

  Escenario: Registro de producto rechazado por precio o stock inválido
    Cuando el emprendedor completa el formulario del producto con un precio o stock negativo
    Y confirma el registro
    Entonces el sistema muestra un error indicando que el valor debe ser mayor o igual a cero
    Y el producto no se crea

  Escenario: Registro exitoso de una forma de pago
    Cuando el emprendedor selecciona un método de pago disponible (ej. transferencia, Yape/Plin, efectivo)
    Y completa los datos requeridos para ese método
    Y confirma el registro
    Entonces el sistema asocia la forma de pago a su emprendimiento
    Y muestra un mensaje de confirmación al emprendedor

  Escenario: Registro de forma de pago rechazado por datos incompletos
    Cuando el emprendedor selecciona un método de pago disponible
    Y deja incompletos los datos requeridos para ese método
    Y confirma el registro
    Entonces el sistema muestra un error indicando los datos faltantes
    Y la forma de pago no se registra

  Escenario: Registro bloqueado en un emprendimiento no aprobado
    Dado que el emprendedor ha seleccionado un emprendimiento con estado "Pendiente de aprobación"
    Cuando el emprendedor intenta acceder al formulario de registro de producto
    Entonces el sistema le impide el acceso
    Y muestra un mensaje indicando que ese emprendimiento aún no ha sido aprobado
```

**Supuestos:**
- Campos obligatorios del producto: nombre, precio, categoría, stock (descripción opcional).
- Un producto queda "Publicado" automáticamente al registrarse, sin aprobación adicional.
- Las formas de pago provienen de un catálogo configurable (transferencia, Yape/Plin, efectivo, etc.).
- Se reutiliza la regla de "emprendimiento aprobado" como precondición bloqueante.

---

## 3. Administración de pedidos por el emprendedor

```gherkin
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
    Y notifica al comprador que el producto/servicio fue marcado como entregado
    Y habilita al emprendedor para ingresar el código de confirmación y completar la venta

  Escenario: Intento de marcar como entregado un pedido no recibido
    Dado que existe un pedido con estado "Pendiente" asociado a su emprendimiento
    Cuando el emprendedor intenta marcar el pedido como entregado
    Entonces el sistema muestra un error indicando que el pedido debe estar en estado "Recibido" para marcarse como entregado
    Y el estado del pedido no cambia

  Escenario: Finalización exitosa del pedido mediante código de confirmación
    Dado que existe un pedido con estado "Entregado" asociado a su emprendimiento
    Cuando el emprendedor solicita el código de confirmación al cliente
    Y lo ingresa en el sistema
    Y el código coincide con el asignado al pedido
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
    Cuando el emprendedor ingresa un código de confirmación incorrecto por tercera vez
    Entonces el sistema bloquea la validación del código para ese pedido
    Y muestra un mensaje indicando que se alcanzó el límite de intentos y se requiere soporte del administrador
    Y el estado del pedido no cambia

  Escenario: Intento de validar un código en un pedido no entregado
    Dado que existe un pedido con estado "Recibido" asociado a su emprendimiento
    Cuando el emprendedor intenta ingresar un código de confirmación
    Entonces el sistema muestra un error indicando que el pedido debe estar en estado "Entregado" para validar el código
    Y el estado del pedido no cambia
```

**Supuestos:**
- Ciclo de vida del pedido: `Pendiente → Recibido → Entregado → Completado`, con `Cancelado` como salida posible desde `Pendiente` o `Recibido` (no desde `Entregado`).
- "Completado" ahora se dispara cuando el **emprendedor** ingresa y valida correctamente el código de confirmación entregado al cliente al momento de la compra (ver caso de uso 0.3). Esto reemplaza la confirmación del comprador en la app.
- El código solo puede validarse cuando el pedido está en estado "Entregado" (requiere que el emprendedor lo haya marcado como tal previamente).
- Límite de intentos fallidos definido en **3**; al alcanzarlo, la validación del código queda bloqueada y requiere que el administrador **regenere el código** (ver escenario "Desbloqueo de un pedido con código de confirmación bloqueado" en el caso de uso 0.2). El cliente consulta el nuevo código en su enlace de seguimiento.
- Se notifica al comprador/emprendedor en cada transición relevante.

---

## 4. Exploración de productos sin autenticación (con paginación)

```gherkin
# language: es
Característica: Exploración de productos sin autenticación
  Como cliente sin necesidad de autenticarme
  Quiero ver los productos disponibles, filtrarlos por categoría, buscarlos por nombre y navegar por páginas de resultados
  Para encontrar los productos que me interesan dentro del marketplace universitario

  Antecedentes:
    Dado que el cliente accede al sistema sin haber iniciado sesión
    Y el sistema muestra los resultados en páginas de 20 productos

  Escenario: Ver productos sin ningún filtro ni búsqueda activa
    Dado que el cliente no ha aplicado ningún filtro de categoría
    Y no ha ingresado ningún término de búsqueda
    Cuando el cliente ingresa a la vista de productos
    Entonces el sistema muestra la primera página de productos publicados
    Y los ordena de mayor a menor cantidad de ventas
    Y muestra el total de productos encontrados y el total de páginas disponibles

  Escenario: Filtrar productos por categoría
    Cuando el cliente selecciona la categoría "Postres"
    Entonces el sistema muestra la primera página de productos publicados que pertenecen a la categoría "Postres"
    Y muestra el total de productos encontrados y el total de páginas disponibles

  Escenario: Buscar productos por nombre
    Cuando el cliente ingresa "brownie" en el buscador
    Entonces el sistema muestra la primera página de productos publicados cuyo nombre contiene "brownie"
    Y muestra el total de productos encontrados y el total de páginas disponibles

  Escenario: Buscar productos por nombre dentro de una categoría filtrada
    Dado que el cliente ha seleccionado la categoría "Postres"
    Cuando el cliente ingresa "brownie" en el buscador
    Entonces el sistema muestra la primera página de productos publicados que pertenecen a la categoría "Postres"
    Y cuyo nombre contiene "brownie"
    Y muestra el total de productos encontrados y el total de páginas disponibles

  Escenario: Búsqueda sin resultados
    Cuando el cliente ingresa "pizza" en el buscador
    Y ningún producto publicado coincide con ese término
    Entonces el sistema muestra un mensaje indicando que no se encontraron productos
    Y no muestra controles de paginación

  Escenario: Navegar a la siguiente página de resultados
    Dado que el resultado actual (con o sin filtros aplicados) tiene más de una página de productos
    Y el cliente se encuentra en la página 1
    Cuando el cliente navega a la página siguiente
    Entonces el sistema muestra la página 2 de resultados
    Y mantiene los filtros, la búsqueda y el orden aplicados

  Escenario: Intento de navegar a una página inexistente
    Dado que el resultado actual tiene un total de 3 páginas
    Cuando el cliente intenta acceder a la página 4
    Entonces el sistema muestra un error indicando que la página solicitada no existe
    Y permanece en la última página válida

  Escenario: Cambiar de filtro o búsqueda reinicia la paginación
    Dado que el cliente se encuentra en una página distinta a la 1
    Cuando el cliente aplica un nuevo filtro de categoría o un nuevo término de búsqueda
    Entonces el sistema muestra la primera página de los resultados actualizados

  Escenario: Limpiar filtros y búsqueda activos
    Dado que el cliente tiene un filtro de categoría o un término de búsqueda activo
    Cuando el cliente limpia los filtros y la búsqueda
    Entonces el sistema muestra la primera página de todos los productos publicados
    Y los ordena de mayor a menor cantidad de ventas
```

**Supuestos:**
- Solo se muestran productos con estado "Publicado".
- La búsqueda por nombre es parcial y no sensible a mayúsculas/minúsculas.
- El criterio de "más vendidos" se basa en cantidad de unidades vendidas (o pedidos completados) por producto.
- Tamaño de página asumido en 20 productos (ajustable).
- Cambiar filtro, categoría o búsqueda reinicia la paginación a la página 1.
- No se incluye filtro por emprendimiento/vendedor específico.
