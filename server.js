// Importar módulos necesarios de Node.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Puerto del servidor
const PORT = 3000;

// Archivo donde se guardarán los conceptos
const DATA_FILE = path.join(__dirname, 'data', 'conceptos.json');

// Función para leer conceptos del archivo
function leerConceptos() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si el archivo no existe, retornar array vacío
        return [];
    }
}

// Función para guardar conceptos en el archivo
function guardarConceptos(conceptos) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(conceptos, null, 2));
}

// Función para obtener el tipo MIME según la extensión
function obtenerTipoMIME(extension) {
    const tipos = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json'
    };
    return tipos[extension] || 'text/plain';
}

// Crear el servidor HTTP
const servidor = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Configurar CORS para permitir peticiones del frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight requests
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Servir archivos estáticos
    if (pathname === '/' || pathname.startsWith('/public')) {
        let filePath = pathname === '/' ? '/public/index.html' : pathname;
        filePath = path.join(__dirname, filePath);

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
        return;
    }

    // API REST - Manejo de /api/conceptos
    if (pathname === '/api/conceptos') {
        // GET: Obtener todos los conceptos
        if (method === 'GET') {
            const conceptos = leerConceptos();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(conceptos));
            return;
        }

        // POST: Crear un nuevo concepto
        if (method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const nuevoConcepto = JSON.parse(body);
                    const conceptos = leerConceptos();
                    
                    // Asignar ID único
                    const nuevoId = conceptos.length > 0 
                        ? Math.max(...conceptos.map(c => c.id)) + 1 
                        : 1;
                    
                    nuevoConcepto.id = nuevoId;
                    conceptos.push(nuevoConcepto);
                    guardarConceptos(conceptos);

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(nuevoConcepto));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Datos inválidos' }));
                }
            });
            return;
        }

        // DELETE: Eliminar todos los conceptos
        if (method === 'DELETE') {
            guardarConceptos([]);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ mensaje: 'Todos los conceptos eliminados' }));
            return;
        }
    }

    // API REST - Manejo de /api/conceptos/:id
    const matchId = pathname.match(/^\/api\/conceptos\/(\d+)$/);
    if (matchId) {
        const id = parseInt(matchId[1]);

        // GET/id: Obtener un concepto específico
        if (method === 'GET') {
            const conceptos = leerConceptos();
            const concepto = conceptos.find(c => c.id === id);
            
            if (concepto) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(concepto));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Concepto no encontrado' }));
            }
            return;
        }

        // DELETE/id: Eliminar un concepto específico
        if (method === 'DELETE') {
            let conceptos = leerConceptos();
            const index = conceptos.findIndex(c => c.id === id);
            
            if (index !== -1) {
                conceptos.splice(index, 1);
                guardarConceptos(conceptos);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ mensaje: 'Concepto eliminado' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Concepto no encontrado' }));
            }
            return;
        }
    }

    // Ruta no encontrada
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Ruta no encontrada');
});

// Iniciar el servidor
servidor.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});