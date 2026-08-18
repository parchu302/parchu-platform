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
      | campo       |
      | nombre      |
      | descripción |
      | categoría   |

  Escenario: Registro rechazado por nombre de emprendimiento ya existente
    Dado que ya existe un emprendimiento registrado con el nombre "Postres Ana"
    Cuando el emprendedor intenta registrar un nuevo emprendimiento con el nombre "Postres Ana"
    Entonces el sistema muestra un error indicando que ya existe un emprendimiento con ese nombre
    Y el nuevo emprendimiento no se crea
