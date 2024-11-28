document.addEventListener('DOMContentLoaded', () => {
    obtenerProductos();
});

function obtenerProductos() {
    fetch('/obtenerProductos')
        .then(response => response.json())
        .then(data => mostrarTablaProductos(data))
        .catch(error => console.error("Error al obtener los productos:", error));
}

function mostrarTablaProductos(productos) {
    const tabla = document.createElement('table');
    tabla.border = 1;
    tabla.style.width = '100%';

    // Crear la fila de encabezados
    const encabezados = ['ID', 'Nombre', 'Precio', 'Imagen', 'Existencias'];
    const thead = document.createElement('thead');
    const encabezadoFila = document.createElement('tr');

    encabezados.forEach(encabezadoTexto => {
        const th = document.createElement('th');
        th.textContent = encabezadoTexto;
        encabezadoFila.appendChild(th);
    });

    thead.appendChild(encabezadoFila);
    tabla.appendChild(thead);

    // Crear el cuerpo de la tabla
    const tbody = document.createElement('tbody');
    productos.forEach(producto => {
        const fila = document.createElement('tr');

        const celdaID = document.createElement('td');
        celdaID.textContent = producto.id_producto;
        fila.appendChild(celdaID);

        const celdaNombre = document.createElement('td');
        celdaNombre.textContent = producto.nombre_producto;
        fila.appendChild(celdaNombre);

        const celdaPrecio = document.createElement('td');
        celdaPrecio.textContent = `$${producto.precio}`;
        fila.appendChild(celdaPrecio);

        const celdaImagen = document.createElement('td');
        const img = document.createElement('img');
        img.src = producto.imagen_url;
        img.alt = producto.nombre_producto;
        img.style.maxWidth = '100px';
        celdaImagen.appendChild(img);
        fila.appendChild(celdaImagen);

        const celdaExistencias = document.createElement('td');
        celdaExistencias.textContent = producto.existencias;
        fila.appendChild(celdaExistencias);

        tbody.appendChild(fila);
    });

    tabla.appendChild(tbody);
    
    // Insertar la tabla en el contenedor específico
    const contenedorTabla = document.getElementById('tabla-contenedor');
    contenedorTabla.innerHTML = "";  // Limpiar contenido previo
    contenedorTabla.appendChild(tabla);
}
