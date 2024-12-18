const express = require('express');
const session = require('express-session');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    console.log('Solicitud:', req.method, req.path);
    next();
});

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sigmma0312+',
    database: 'panaderia'
});

db.connect((err) => {
    if (err) {
        console.error("Error al conectar a la base de datos:", err);
    } else {
        console.log("Conectado a la base de datos.");
    }
});

// Configuración de sesiones
app.use(session({
    secret: 'mi_clave_secreta',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// JWT Secret Key
const SECRET_KEY = 'mi_clave_secreta';

// Middleware de autenticación
function authMiddleware(req, res, next) {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(403).json({ error: "No autorizado" });
    }
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Token inválido o expirado" });
    }
}
// Configurar almacenamiento de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Carpeta donde se guardarán los archivos
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Evita conflictos con nombres únicos
    }
});

const upload = multer({ storage: storage }); // Inicializa multer con la configuración


// Rutas de usuario
app.post('/registro', (req, res) => {
    const { name, email, password, confirm } = req.body;

    if (!name || !email || !password || !confirm) {
        return res.status(400).send("Todos los datos son requeridos");
    }

    if (password !== confirm) {
        return res.status(400).send("Las contraseñas no coinciden");
    }

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).send("El correo electrónico no tiene un formato válido");
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error("Error al encriptar la contraseña:", err);
            return res.status(500).send("Error interno del servidor");
        }

        db.query(
            'INSERT INTO usuario (nombre_usuario, correo_electronico, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword],
            (err) => {
                if (err) {
                    console.error("Error al insertar el usuario:", err);
                    return res.status(500).send("Error al registrar el usuario");
                }
                res.send(`Usuario registrado con éxito. <a href='/logueo.html'>Ir a Login</a>`);
            }
        );
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Todos los datos son requeridos");
    }

    db.query('SELECT * FROM usuario WHERE correo_electronico = ?', [email], (err, result) => {
        if (err) {
            console.error("Error al verificar el correo electrónico:", err);
            return res.status(500).send("Error interno del servidor");
        }

        if (result.length === 0) {
            return res.status(400).send("El correo electrónico no está registrado");
        }

        const usuario = result[0];

        bcrypt.compare(password, usuario.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(400).send("Credenciales inválidas");
            }

            const token = jwt.sign(
                { id_usuario: usuario.id_usuario, nombre_usuario: usuario.nombre_usuario, rol: usuario.rol },
                SECRET_KEY,
                { expiresIn: '1h' }
            );

            res.cookie('authToken', token, {
                httpOnly: true,
                secure: false,
                maxAge: 3600000
            });

            res.redirect(usuario.rol === 'Administrador' ? '/admin' : '/indexcli.html');
        });
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('authToken');  // Asegúrate de usar clearCookie correctamente

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'No se pudo cerrar la sesión' });
        }
        // Redirige al usuario después de cerrar la sesión
        res.redirect('/index.html');  // Redirige a la página deseada (puede ser indexcli.html u otra)
    });
});


app.get('/verify', authMiddleware, (req, res) => {
    res.status(200).json({ authenticated: true, user: req.user });
});


app.post('/agregarProducto', upload.single('imagen'), (req, res) => {
    const { nombre_producto, precio, existencias } = req.body;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    if(precio <= 0 || existencias <= 0 || precio > 10000 || existencias > 10000){
        console.log("Datos inválidos")
        return res.status(404).send("Precio o existencias inválido")
    }

    db.query(
        'INSERT INTO producto (nombre_producto, precio, imagen_url, existencias) VALUES (?, ?, ?, ?)',
        [nombre_producto, precio, imagen_url, existencias],
        (err, respuesta) => {
            if (err) {
                console.error("Error al insertar el producto:", err);
                return res.status(500).send("Error al conectar");
            }

            res.send(`
                <h2>Producto agregado:</h2>
                <p>Nombre: ${nombre_producto}</p>
                <p>Precio: $${precio}</p>
                <p>Existencias: ${existencias}</p>
                ${imagen_url ? `<img src="${imagen_url}" alt="${nombre_producto}" style="max-width:200px;">` : ''}
                <br><a href="/inventario.html">Regresar</a>
            `);
        }
    );
});

app.post('/actualizarProducto', upload.single('imagen'), (req, res) => {
    const { nombre_producto, precio, existencias } = req.body;
    const id_producto = req.body.id_producto;
    const imagen_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Validar precio y existencias
    if (precio && (isNaN(precio) || precio <= 0)) {
        console.log("Precio inválido");
        return res.status(400).send("Precio inválido");
    }

    if (existencias && (isNaN(existencias) || existencias < 0) || existencias > 10000) {
        console.log("Existencias inválidas");
        return res.status(400).send("Existencias inválidas");
    }

    if(precio > 10000){
        console.log('El precio no puede ser mayor a 10 000 pesos')
        return res.status(400).send('Precio Inválido')
    }

    let query = 'UPDATE producto SET';
    const values = [];

    if (nombre_producto) {
        query += ' nombre_producto = ?,';
        values.push(nombre_producto);
    }
    
    if (precio) {
        query += ' precio = ?,';
        values.push(precio);
    }

    if (existencias) {
        query += ' existencias = ?,';
        values.push(existencias);
    }

    if (imagen_url) {
        query += ' imagen_url = ?,';
        values.push(imagen_url);
    }

    query = query.slice(0, -1);
    query += ' WHERE id_producto = ?';
    values.push(id_producto);

    db.query(query, values, (err, respuesta) => {
        if (err) {
            console.error("Error al actualizar el producto:", err);
            return res.status(500).send("Error al actualizar producto");
        }

        res.send(`
            <h2>Producto actualizado:</h2>
            <p>Nombre: ${nombre_producto || 'sin cambios'}</p>
            <p>Precio: $${precio || 'sin cambios'}</p>
            <p>Existencias: ${existencias || 'sin cambios'}</p>
            ${imagen_url ? `<img src="${imagen_url}" alt="${nombre_producto}" style="max-width:200px;">` : ''}
            <br><a href="/inventario.html">Regresar</a>
        `);
    });
});


app.post(`/eliminarProducto`, (req, res) =>{
    const {id_producto} = req.body
    
    if(id_producto <= 0 || isNaN(id_producto)){
        console.error("Ingrese un ID válido")
        return res.status(400).send("Id Inválido")
    }

    db.query('DELETE FROM producto WHERE id_producto = ?', [id_producto], (err, respuesta) =>{
        if(err){
            console.error("Error al eliminar el producto", err)
            return res.status("Error al eliminar producto")
        }

        res.send(
            `
            <h2>Producto eliminado</h2>
            <p>Producto con ID: ${id_producto} ha sido eliminado.</p>
            <br><a href="/inventario.html">Regresar</a>
        `
        )
    })
})


app.get('/obtenerProducto', (req, res) => {
    db.query('SELECT * FROM producto', (err, respuesta) => {
        if (err) return console.log('ERROR', err);

        var prodHTML = ``;
        respuesta.forEach(prod => {
            prodHTML += `
                <tr>
                    <td>${prod.id_producto}</td>
                    <td><img src="${prod.imagen_url}" alt="Imagen del Producto" width="200" height="200"></td>
                    <td>${prod.nombre_producto}</td>
                    <td>${prod.precio}</td>
                    <td>${prod.existencias}</td>
                    <td>
                        <!-- Botón Comprar con ID del producto -->
                        <button onclick="agregarAlCarrito(${prod.id_producto})">Comprar</button>
                    </td>
                </tr>
            `;
        });

        return res.send(`
            <table>
                <tr>
                    <th>ID del Producto</th>
                    <th>Imagen</th>
                    <th>Nombre del producto</th>
                    <th>Precio por unidad</th>
                    <th>Existencias</th>
                    <th>Comprar</th>
                </tr>
                ${prodHTML}
            </table>
        `);
    });
});

// Ruta para agregar un producto al carrito
app.post('/agregarAlCarrito', (req, res) => {
    const { id_producto, cantidad } = req.body; // Datos enviados desde el frontend
    const id_usuario = req.session.userId; // Asumimos que el usuario está logueado y su id está en la sesión

    // Verificar si el producto ya está en el carrito
    db.query(`
        SELECT * FROM carrito WHERE id_usuario = ? AND id_producto = ?
    `, [id_usuario, id_producto], (err, result) => {
        if (err) {
            console.error('Error al verificar el carrito:', err);
            return res.status(500).send('Error en el servidor');
        }

        if (result.length > 0) {
            // Si el producto ya está en el carrito, actualizamos la cantidad
            const nuevaCantidad = result[0].cantidad + cantidad;
            db.query(`
                UPDATE carrito SET cantidad = ? WHERE id_usuario = ? AND id_producto = ?
            `, [nuevaCantidad, id_usuario, id_producto], (err, result) => {
                if (err) {
                    console.error('Error al actualizar la cantidad del carrito:', err);
                    return res.status(500).send('Error en el servidor');
                }

                return res.status(200).send('Producto actualizado en el carrito');
            });
        } else {
            // Si el producto no está en el carrito, lo agregamos
            db.query(`
                INSERT INTO carrito (id_usuario, id_producto, cantidad) VALUES (?, ?, ?)
            `, [id_usuario, id_producto, cantidad], (err, result) => {
                if (err) {
                    console.error('Error al agregar el producto al carrito:', err);
                    return res.status(500).send('Error en el servidor');
                }

                return res.status(200).send('Producto agregado al carrito');
            });
        }
    });
});

// Ruta para obtener los productos del carrito del usuario
app.get('/obtenerCarrito', (req, res) => {
    const id_usuario = req.session.userId; // Asumimos que el usuario está logueado y su id está en la sesión

    db.query(`
        SELECT p.id_producto, p.nombre_producto, p.precio, p.imagen_url, c.cantidad
        FROM carrito c
        JOIN producto p ON c.id_producto = p.id_producto
        WHERE c.id_usuario = ?
    `, [id_usuario], (err, carrito) => {
        if (err) {
            console.error('Error al obtener el carrito:', err);
            return res.status(500).send('Error en el servidor');
        }

        res.json(carrito);
    });
});


// Ruta para actualizar la cantidad de un producto en el carrito
app.post('/actualizarCantidad/:id_producto', (req, res) => {
    const { cantidad } = req.body;
    const { id_producto } = req.params;
    const id_usuario = req.session.userId; // Obtener el ID del usuario desde la sesión

    db.query(`
        UPDATE carrito 
        SET cantidad = ? 
        WHERE id_usuario = ? AND id_producto = ?
    `, [cantidad, id_usuario, id_producto], (err, result) => {
        if (err) {
            console.error('Error al actualizar la cantidad:', err);
            return res.status(500).send('Error en el servidor');
        }

        res.status(200).send('Cantidad actualizada');
    });
});


// Ruta para eliminar un producto del carrito
app.delete('/eliminarProducto/:id_producto', (req, res) => {
    const { id_producto } = req.params;
    const id_usuario = req.session.userId; // Obtener el ID del usuario desde la sesión

    db.query(`
        DELETE FROM carrito 
        WHERE id_usuario = ? AND id_producto = ?
    `, [id_usuario, id_producto], (err, result) => {
        if (err) {
            console.error('Error al eliminar el producto:', err);
            return res.status(500).send('Error en el servidor');
        }

        res.status(200).send('Producto eliminado');
    });
});

app.get('/obtenerCliente', (req, res) => {
    console.log("Solicitud recibida en /obtenerCliente");
    db.query('SELECT * FROM cliente', (err, respuesta) => {
        if (err) {
            console.log('ERROR', err);
            return res.status(500).send("Error en el servidor");
        }
        let clienteHTML = ``;
        respuesta.forEach(cliente => {
            clienteHTML += `
                <tr>
                    <td>${cliente.id_cliente}</td>
                    <td>${cliente.nombre_cliente}</td>
                    <td>${cliente.telefono}</td>
                    <td>${cliente.correo_electronico}</td>
                    <td> <a href="pedidos.html">Pedidos del cliente</a></td>
                </tr>
            `;
        });

        return res.send(
            `
            <style>
                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 15px; /* Espaciado entre las celdas */
                    text-align: center;
                    font-family: 'Courier New', Courier, monospace;
                    color: #fcf2eb;
                    background-color: #efb084;
                }
                th {
                    font-size: 1.2em;
                    font-weight: bold;
                }
                td {
                    padding: 10px;
                }
            </style>
            <table>
                <tr>
                    <th>ID del Cliente</th>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Correo Electrónico</th>
                    <th>Pedidos</th>
                </tr>
                ${clienteHTML}
            </table>
            `
        );
    });
});

app.post('/agregarCliente', (req, res) => {
    const { nombre_cliente, telefono, correo_electronico } = req.body;

    if (!/^\d{10}$/.test(telefono)) {
        console.log("Teléfono inválido: debe contener 10 dígitos");
        return res.status(400).send("Teléfono inválido: debe contener exactamente 10 dígitos");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo_electronico)) {
        console.log("Correo electrónico inválido");
        return res.status(400).send("Correo electrónico inválido");
    }

    db.query(
        'INSERT INTO cliente (nombre_cliente, telefono, correo_electronico) VALUES (?, ?, ?)',
        [nombre_cliente, telefono, correo_electronico],
        (err, resultado) => {
            if (err) {
                console.error("Error al insertar el cliente:", err);
                return res.status(500).send("Error al agregar cliente");
            }

            res.send(`
                <h2>Cliente agregado:</h2>
                <p>Nombre: ${nombre_cliente}</p>
                <p>Teléfono: ${telefono}</p>
                <p>Correo Electrónico: ${correo_electronico}</p>
                <br><a href="/cliente.html">Regresar a la lista de clientes</a>
            `);
        }
    );
});


app.post('/actualizarCliente', (req, res) => {
    const { nombre_cliente, telefono, correo_electronico } = req.body;
    const id_cliente = req.body.id_cliente;

    // Validar teléfono y correo electrónico
    if (telefono && isNaN(telefono)) {
        console.log("Teléfono inválido");
        return res.status(400).send("Teléfono inválido");
    }

    if (correo_electronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo_electronico)) {
        console.log("Correo electrónico inválido");
        return res.status(400).send("Correo electrónico inválido");
    }

    let query = 'UPDATE cliente SET';
    const values = [];

    if (nombre_cliente) {
        query += ' nombre_cliente = ?,';
        values.push(nombre_cliente);
    }
    
    if (telefono) {
        query += ' telefono = ?,';
        values.push(telefono);
    }

    if (correo_electronico) {
        query += ' correo_electronico = ?,';
        values.push(correo_electronico);
    }

    // Remover la última coma y agregar condición WHERE
    query = query.slice(0, -1);
    query += ' WHERE id_cliente = ?';
    values.push(id_cliente);

    db.query(query, values, (err, respuesta) => {
        if (err) {
            console.error("Error al actualizar el cliente:", err);
            return res.status(500).send("Error al actualizar cliente");
        }

        res.send(`
            <h2>Cliente actualizado:</h2>
            <p>Nombre: ${nombre_cliente || 'sin cambios'}</p>
            <p>Teléfono: ${telefono || 'sin cambios'}</p>
            <p>Correo Electrónico: ${correo_electronico || 'sin cambios'}</p>
            <br><a href="/cliente.html">Regresar</a>
        `);
    });
});


app.post('/eliminarCliente', (req, res) => {
    const { id_cliente } = req.body;

    db.query('DELETE FROM cliente WHERE id_cliente = ?', [id_cliente], (err, respuesta) => {
        if (err) {
            console.error("Error al eliminar el cliente:", err);
            return res.status(500).send("Error al eliminar cliente");
        }

        res.send(`
            <h2>Cliente eliminado</h2>
            <p>El cliente con ID ${id_cliente} ha sido eliminado.</p>
            <br><a href="/cliente.html">Regresar a la lista de clientes</a>
        `);
    });
});


app.post('/agregarPedido', (req, res) => {
    const { id_cliente, fecha_pedido, estado_pedido, id_producto, cantidad, precio_unidad } = req.body;
    const subtotal = cantidad * precio_unidad;

    db.query(
        'INSERT INTO pedido (id_cliente, fecha_pedido, estado_pedido) VALUES (?, ?, ?)',
        [id_cliente, fecha_pedido, estado_pedido],
        (err, resultadoPedido) => {
            if (err) {
                console.error("Error al insertar el pedido:", err);
                return res.status(500).send("Error al agregar pedido");
            }

            const id_pedido = resultadoPedido.insertId;

            db.query(
                'INSERT INTO detallePedido (id_pedido, id_producto, cantidad, precio_unidad, subtotal) VALUES (?, ?, ?, ?, ?)',
                [id_pedido, id_producto, cantidad, precio_unidad, subtotal],
                (err, resultadoDetalle) => {
                    if (err) {
                        console.error("Error al insertar el detalle del pedido:", err);
                        return res.status(500).send("Error al agregar detalle del pedido");
                    }

                    res.send(`
                        <h2>Pedido agregado exitosamente</h2>
                        <p>ID Pedido: ${id_pedido}</p>
                        <p>Cliente ID: ${id_cliente}</p>
                        <p>Fecha del Pedido: ${fecha_pedido}</p>
                        <p>Estado del Pedido: ${estado_pedido}</p>
                        <h3>Detalles del Pedido</h3>
                        <p>ID Producto: ${id_producto}</p>
                        <p>Cantidad: ${cantidad}</p>
                        <p>Precio por Unidad: ${precio_unidad}</p>
                        <p>Subtotal: ${subtotal.toFixed(2)}</p>
                        <br><a href="/pedido.html">Regresar a la lista de pedidos</a>
                    `);
                }
            );
        }
    );
});

app.get('/obtenerPedido', (req, res) => {
    db.query('SELECT * FROM pedido', (err, respuesta) => {
        if (err) return console.log('ERROR', err);

        let pedidoHTML = ``;
        respuesta.forEach(pedido => {
            pedidoHTML += `
                <tr>
                    <td>${pedido.id_pedido}</td>
                    <td>${pedido.id_cliente}</td>
                    <td>${pedido.fecha_pedido}</td>
                    <td>${pedido.estado_pedido}</td>
                    <td> <a href="detallesped.html">Detalles</a></td>
                </tr>
            `;
        });

        return res.send(
            `
            <table>
                <tr>
                    <th>ID del Pedido</th>
                    <th>ID del Cliente</th>
                    <th>Fecha del Pedido</th>
                    <th>Estado del Pedido</th>
                    <th>Detalles del Pedido</th>
                </tr>
                ${pedidoHTML}
            </table>
            `
        );
    });
});

app.get('/obtenerDetallePedido', (req, res) => {
    db.query(`
        SELECT dp.id_detalle_pedido, dp.id_pedido, dp.id_producto, dp.cantidad, dp.precio_unidad, dp.subtotal, p.nombre_producto
        FROM detallePedido dp
        JOIN producto p ON dp.id_producto = p.id_producto
    `, (err, respuesta) => {
        if (err) return console.log('ERROR', err);

        let detallePedidoHTML = ``;
        respuesta.forEach(detalle => {
            detallePedidoHTML += `
                <tr>
                    <td>${detalle.id_detalle_pedido}</td>
                    <td>${detalle.id_pedido}</td>
                    <td>${detalle.nombre_producto}</td>
                    <td>${detalle.cantidad}</td>
                    <td>${detalle.precio_unidad}</td>
                    <td>${detalle.subtotal}</td>
                </tr>
            `;
        });

        return res.send(
            `
            <table>
                <tr>
                    <th>ID Detalle Pedido</th>
                    <th>ID Pedido</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unidad</th>
                    <th>Subtotal</th>
                </tr>
                ${detallePedidoHTML}
            </table>
            `
        );
    });
});



app.use(express.static('public'));
app.use(express.static('uploads'));

app.get('/check-cookie', (req, res) => {
    const authToken = req.cookies.authToken;
    if (authToken) {
        res.status(200).send(`Cookie encontrada: ${authToken}`);
    } else {
        res.status(404).send("No se encontró la cookie.");
    }
});

app.listen(3000, () => {
    console.log("Servidor escuchando en http://localhost:3000");
});
