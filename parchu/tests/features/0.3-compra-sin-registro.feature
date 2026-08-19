# language: es
Característica: Compra de clientes sin registro
  Como cliente sin cuenta en la plataforma
  Quiero completar mis datos básicos al momento de comprar
  Para realizar mi pedido sin necesidad de registrarme

  Escenario: Compra exitosa completando datos básicos
    Dado que el cliente tiene productos seleccionados para comprar
    Cuando el cliente completa sus datos básicos
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
