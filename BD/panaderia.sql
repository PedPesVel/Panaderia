CREATE DATABASE IF NOT EXISTS panaderia;
USE panaderia;

CREATE TABLE if not exists producto(
	id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    imagen_url VARCHAR(250) NOT NULL,
    existencias INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE if not exists Proveedor (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    nombre_proveedor VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo_electronico VARCHAR(250) NOT NULL,
    direccion VARCHAR(250) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE if not exists Compra (
    id_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_proveedor INT,
    fecha_compra DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    estado_compra ENUM('Pendiente', 'Completa', 'Cancelada') DEFAULT 'Pendiente',
    FOREIGN KEY (id_proveedor) REFERENCES Proveedor(id_proveedor) ON DELETE SET NULL
);

CREATE TABLE DetalleCompra (
    id_detalle_compra INT AUTO_INCREMENT PRIMARY KEY,
    id_compra INT,
    id_producto INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES Compra(id_compra) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE SET NULL
);

CREATE TABLE cliente(
	id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo_electronico VARCHAR(250) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE pedido(
	id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    fecha_pedido DATE NOT NULL,
    estado_pedido VARCHAR(50) NOT NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente) ON DELETE SET NULL
);

CREATE TABLE detallePedido(
	id_detalle_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT,
    id_producto INT,
    cantidad INT NOT NULL,
    precio_unidad DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE SET NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido) ON DELETE CASCADE
);

CREATE TABLE factura(
	id_factura INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    id_pedido INT,
    fecha_emision DATE NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedido(id_pedido) ON DELETE SET NULL
);

CREATE TABLE empleado(
	id_empleado INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    nombre_empleado VARCHAR(150) NOT NULL,
    puesto_empleado VARCHAR(100) NOT NULL,
    telefono_empleado VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE InventarioMovimiento (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT, 
    id_producto INT,                              
    fecha DATE,                                   
    cantidad INT,                     
    tipo_movimiento ENUM('Entrada', 'Salida'),  
    id_empleado INT,                             
    observacion VARCHAR(255),    
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE SET NULL,
    FOREIGN KEY (id_empleado) REFERENCES empleado(id_empleado) ON DELETE SET NULL
);