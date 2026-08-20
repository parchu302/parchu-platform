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
    Y confirma el registro del producto
    Entonces el sistema crea el producto asociado a su emprendimiento con estado "Publicado"
    Y muestra un mensaje de confirmación al emprendedor

  Esquema del escenario: Registro de producto rechazado por campos obligatorios faltantes
    Cuando el emprendedor completa el formulario del producto dejando vacío el campo "<campo>"
    Y confirma el registro del producto
    Entonces el sistema muestra un error indicando que el campo "<campo>" es obligatorio
    Y el producto no se crea

    Ejemplos:
      | campo     |
      | nombre    |
      | precio    |
      | categoría |
      | stock     |

  Escenario: Registro de producto rechazado por precio o stock inválido
    Cuando el emprendedor completa el formulario del producto con un precio o stock negativo
    Y confirma el registro del producto
    Entonces el sistema muestra un error indicando que el valor debe ser mayor o igual a cero
    Y el producto no se crea

  Escenario: Registro exitoso de un producto con imagen
    Cuando el emprendedor completa el formulario con nombre, descripción, precio, categoría y stock del producto
    Y adjunta una imagen válida del producto
    Y confirma el registro del producto
    Entonces el sistema crea el producto asociado a su emprendimiento con estado "Publicado"
    Y guarda la imagen comprimida y codificada en base64
    Y muestra un mensaje de confirmación al emprendedor

  Escenario: Registro de producto rechazado por imagen inválida
    Cuando el emprendedor completa el formulario con nombre, descripción, precio, categoría y stock del producto
    Y adjunta un archivo que no es una imagen válida
    Y confirma el registro del producto
    Entonces el sistema muestra un error indicando que el archivo debe ser una imagen válida
    Y el producto no se crea

  Escenario: Registro exitoso de una forma de pago
    Cuando el emprendedor selecciona un método de pago disponible
    Y completa los datos requeridos para ese método
    Y confirma el registro de la forma de pago
    Entonces el sistema asocia la forma de pago a su emprendimiento
    Y muestra un mensaje de confirmación al emprendedor

  Escenario: Registro de forma de pago rechazado por datos incompletos
    Cuando el emprendedor selecciona un método de pago disponible
    Y deja incompletos los datos requeridos para ese método
    Y confirma el registro de la forma de pago
    Entonces el sistema muestra un error indicando los datos faltantes
    Y la forma de pago no se registra

  Escenario: Registro bloqueado en un emprendimiento no aprobado
    Dado que el emprendedor ha seleccionado un emprendimiento con estado "Pendiente de aprobación"
    Cuando el emprendedor intenta acceder al formulario de registro de producto
    Entonces el sistema le impide el acceso
    Y muestra un mensaje indicando que ese emprendimiento aún no ha sido aprobado
