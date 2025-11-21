// URL base de la API
const API_URL = 'http://localhost:3000/api/conceptos';

// Elementos del DOM
const formulario = document.getElementById('formulario-concepto');
const inputNombre = document.getElementById('nombre');
const inputDescripcion = document.getElementById('descripcion');
const listaConceptos = document.getElementById('lista-conceptos');
const mensajeVacio = document.getElementById('mensaje-vacio');
const btnEliminarTodos = document.getElementById('btn-eliminar-todos');

// Cargar conceptos al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarConceptos();
});

// Manejar envío del formulario
formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevoConcepto = {
        nombre: inputNombre.value.trim(),
        descripcion: inputDescripcion.value.trim()
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoConcepto)
        });

        if (response.ok) {
            // Limpiar formulario
            formulario.reset();
            // Recargar lista de conceptos
            cargarConceptos();
            alert('¡Concepto agregado exitosamente!');
        } else {
            alert('Error al agregar el concepto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});

// Función para cargar todos los conceptos
async function cargarConceptos() {
    try {
        const response = await fetch(API_URL);
        const conceptos = await response.json();

        // Limpiar lista
        listaConceptos.innerHTML = '';

        if (conceptos.length === 0) {
            mensajeVacio.classList.add('activo');
        } else {
            mensajeVacio.classList.remove('activo');
            conceptos.forEach(concepto => {
                agregarConceptoAlDOM(concepto);
            });
        }
    } catch (error) {
        console.error('Error al cargar conceptos:', error);
    }
}

// Función para agregar un concepto al DOM
function agregarConceptoAlDOM(concepto) {
    const card = document.createElement('div');
    card.className = 'concepto-card';
    card.innerHTML = `
        <div class="concepto-id">ID: ${concepto.id}</div>
        <h3>${concepto.nombre}</h3>
        <p>${concepto.descripcion}</p>
        <button class="btn btn-delete" onclick="eliminarConcepto(${concepto.id})">
            Eliminar
        </button>
    `;
    listaConceptos.appendChild(card);
}

// Función para eliminar un concepto específico
async function eliminarConcepto(id) {
    if (!confirm('¿Estás seguro de eliminar este concepto?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cargarConceptos();
            alert('Concepto eliminado');
        } else {
            alert('Error al eliminar el concepto');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
}

// Botón para eliminar todos los conceptos
btnEliminarTodos.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de eliminar TODOS los conceptos?')) {
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'DELETE'
        });

        if (response.ok) {
            cargarConceptos();
            alert('Todos los conceptos eliminados');
        } else {
            alert('Error al eliminar los conceptos');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});