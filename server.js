// Importar módulos necesarios de Node.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Importar configuración de base de datos y controlador
const { sequelize, testConnection, syncDatabase } = require('./config/database');
const ConceptoController = require('./controllers/conceptoController');

// Puerto del servidor
const PORT = 3000;

/**
 * Función auxiliar para parsear el body de las peticiones
 * @param {Object} req - Request object
 * @returns {Promise<Object>} Body parseado
 */
function parsearBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                resolve(parsed);
            } catch (error) {
                reject(new Error('JSON inválido'));
            }
        });
        
        req.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Función para obtener el tipo MIME según la extensión del archivo
 * @param {string} extension - Extensión del archivo
 * @returns {string} Tipo MIME
 */
function obtenerTipoMIME(extension) {
    const tipos = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon'
    };
    return tipos[extension] || 'text/plain';
}

/**
 * Función para servir archivos estáticos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} filePath - Ruta del archivo
 */
function servirArchivoEstatico(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Archivo no encontrado');
            return;
        }
        
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': obtenerTipoMIME(ext) });
        res.end(data);
    });
}

/**
 * Función para enviar respuesta JSON
 * @param {Object} res - Response object
 * @param {number} statusCode - Código de estado HTTP
 * @param {Object} data - Datos a enviar
 */
function enviarJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

/**
 * Crear el servidor HTTP
 */
const servidor = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight requests
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ==================== SERVIR ARCHIVOS ESTÁTICOS ====================
    
    if (pathname === '/' || pathname.startsWith('/public')) {
        let filePath = pathname === '/' ? '/public/index.html' : pathname;
        filePath = path.join(__dirname, filePath);
        servirArchivoEstatico(req, res, filePath);
        return;
    }

    // ==================== API REST ====================
    
    try {
        // GET: Obtener todos los conceptos
        // Endpoint: GET /api/conceptos
        if (pathname === '/api/conceptos' && method === 'GET') {
            const conceptos = await ConceptoController.obtenerTodos();
            enviarJSON(res, 200, conceptos);
            return;
        }

        // POST: Crear un nuevo concepto
        // Endpoint: POST /api/conceptos
        // Body: { nombre: string, descripcion: string }
        if (pathname === '/api/conceptos' && method === 'POST') {
            try {
                const datos = await parsearBody(req);
                const nuevoConcepto = await ConceptoController.crear(datos);
                enviarJSON(res, 201, nuevoConcepto);
            } catch (error) {
                enviarJSON(res, 400, { 
                    error: 'Error al crear concepto', 
                    mensaje: error.message 
                });
            }
            return;
        }

        // DELETE: Eliminar todos los conceptos
        // Endpoint: DELETE /api/conceptos
        if (pathname === '/api/conceptos' && method === 'DELETE') {
            const eliminados = await ConceptoController.eliminarTodos();
            enviarJSON(res, 200, { 
                mensaje: 'Todos los conceptos eliminados',
                cantidad: eliminados
            });
            return;
        }

        // Manejo de rutas con ID: /api/conceptos/:id
        const matchId = pathname.match(/^\/api\/conceptos\/(\d+)$/);
        
        if (matchId) {
            const id = parseInt(matchId[1]);

            // GET/id: Obtener un concepto específico
            // Endpoint: GET /api/conceptos/:id
            if (method === 'GET') {
                const concepto = await ConceptoController.obtenerPorId(id);
                
                if (concepto) {
                    enviarJSON(res, 200, concepto);
                } else {
                    enviarJSON(res, 404, { 
                        error: 'Concepto no encontrado',
                        id 
                    });
                }
                return;
            }

            // PUT: Actualizar un concepto específico
            // Endpoint: PUT /api/conceptos/:id
            // Body: { nombre?: string, descripcion?: string }
            if (method === 'PUT') {
                try {
                    const datos = await parsearBody(req);
                    const conceptoActualizado = await ConceptoController.actualizar(id, datos);
                    
                    if (conceptoActualizado) {
                        enviarJSON(res, 200, conceptoActualizado);
                    } else {
                        enviarJSON(res, 404, { 
                            error: 'Concepto no encontrado',
                            id 
                        });
                    }
                } catch (error) {
                    enviarJSON(res, 400, { 
                        error: 'Error al actualizar concepto',
                        mensaje: error.message 
                    });
                }
                return;
            }

            // DELETE/id: Eliminar un concepto específico
            // Endpoint: DELETE /api/conceptos/:id
            if (method === 'DELETE') {
                const eliminado = await ConceptoController.eliminar(id);
                
                if (eliminado) {
                    enviarJSON(res, 200, { 
                        mensaje: 'Concepto eliminado',
                        id 
                    });
                } else {
                    enviarJSON(res, 404, { 
                        error: 'Concepto no encontrado',
                        id 
                    });
                }
                return;
            }
        }

        // GET: Buscar conceptos
        // Endpoint: GET /api/conceptos/buscar?q=termino
        if (pathname === '/api/conceptos/buscar' && method === 'GET') {
            const termino = parsedUrl.query.q;
            
            if (!termino) {
                enviarJSON(res, 400, { 
                    error: 'Parámetro de búsqueda "q" es requerido' 
                });
                return;
            }
            
            const conceptos = await ConceptoController.buscar(termino);
            enviarJSON(res, 200, conceptos);
            return;
        }

        // GET: Obtener estadísticas
        // Endpoint: GET /api/conceptos/stats
        if (pathname === '/api/conceptos/stats' && method === 'GET') {
            const stats = await ConceptoController.obtenerEstadisticas();
            enviarJSON(res, 200, stats);
            return;
        }

        // Ruta no encontrada
        enviarJSON(res, 404, { 
            error: 'Ruta no encontrada',
            ruta: pathname,
            metodo: method
        });

    } catch (error) {
        // Manejo de errores generales
        console.error('Error en el servidor:', error);
        enviarJSON(res, 500, { 
            error: 'Error interno del servidor',
            mensaje: error.message 
        });
    }
});

/**
 * Inicializar la base de datos y arrancar el servidor
 */
async function iniciarServidor() {
    try {
        console.log('🚀 Iniciando servidor...');
        
        // Probar conexión a la base de datos
        await testConnection();
        
        // Sincronizar modelos con la base de datos
        // force: false = no elimina datos existentes
        await syncDatabase(false);
        
        // Iniciar el servidor HTTP
        servidor.listen(PORT, () => {
            console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
            console.log(`📊 Base de datos SQLite en: database/conceptos.db`);
            console.log(`\n📝 Endpoints disponibles:`);
            console.log(`   GET    /api/conceptos          - Obtener todos`);
            console.log(`   GET    /api/conceptos/:id      - Obtener por ID`);
            console.log(`   POST   /api/conceptos          - Crear nuevo`);
            console.log(`   PUT    /api/conceptos/:id      - Actualizar`);
            console.log(`   DELETE /api/conceptos/:id      - Eliminar uno`);
            console.log(`   DELETE /api/conceptos          - Eliminar todos`);
            console.log(`   GET    /api/conceptos/buscar?q - Buscar`);
            console.log(`   GET    /api/conceptos/stats    - Estadísticas\n`);
        });
        
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre graceful del servidor
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    try {
        await sequelize.close();
        console.log('✅ Conexión a la base de datos cerrada');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al cerrar:', error);
        process.exit(1);
    }
});

// Iniciar el servidor
iniciarServidor();