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
    Dado que el resultado actual tiene más de una página de productos
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
    Cuando el cliente aplica un nuevo filtro de categoría
    Entonces el sistema muestra la primera página de los resultados actualizados

  Escenario: Limpiar filtros y búsqueda activos
    Dado que el cliente tiene un filtro de categoría o un término de búsqueda activo
    Cuando el cliente limpia los filtros y la búsqueda
    Entonces el sistema muestra la primera página de todos los productos publicados
    Y los ordena de mayor a menor cantidad de ventas
