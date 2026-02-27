// Verificar si el usuario está autenticado
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
    }
    return user;
}

// Cargar servicios para selects
async function loadServicios(selectId) {
    const { data: servicios } = await supabase.from('servicios').select('*');
    const select = document.getElementById(selectId);
    if (select && servicios) {
        select.innerHTML = servicios.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }
    return servicios;
}

// Cargar citas en la tabla
async function loadCitas() {
    const { data: citas, error } = await supabase
        .from('citas')
        .select('*, servicios(nombre)')
        .order('fecha_cita', { ascending: true })
        .order('hora_cita', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.getElementById('citasBody');
    tbody.innerHTML = citas.map(c => `
        <tr>
            <td>${c.fecha_cita}</td>
            <td>${c.hora_cita}</td>
            <td>${c.nombre_cliente} ${c.apellido_cliente}</td>
            <td>${c.servicios.nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning editar" data-id="${c.id}" data-nombre="${c.nombre_cliente}" data-apellido="${c.apellido_cliente}" data-servicio="${c.servicio_id}" data-fecha="${c.fecha_cita}" data-hora="${c.hora_cita}">Editar</button>
                <button class="btn btn-sm btn-danger eliminar" data-id="${c.id}">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

// Cargar configuración actual
async function loadConfig() {
    const { data: config } = await supabase.from('configuracion').select('*');
    const configObj = {};
    config.forEach(item => configObj[item.clave] = item.valor);
    document.getElementById('whatsapp').value = configObj.whatsapp || '';
    document.getElementById('instagram').value = configObj.instagram || '';
    document.getElementById('tiktok').value = configObj.tiktok || '';
}

// Guardar configuración
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = [
        { clave: 'whatsapp', valor: document.getElementById('whatsapp').value },
        { clave: 'instagram', valor: document.getElementById('instagram').value },
        { clave: 'tiktok', valor: document.getElementById('tiktok').value }
    ];

    for (let item of updates) {
        await supabase
            .from('configuracion')
            .update({ valor: item.valor })
            .eq('clave', item.clave);
    }
    alert('Configuración guardada');
});

// Eliminar cita
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('eliminar')) {
        if (!confirm('¿Eliminar esta cita?')) return;
        const id = e.target.dataset.id;
        const { error } = await supabase.from('citas').delete().eq('id', id);
        if (!error) loadCitas();
    }
});

// Abrir modal de edición
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('editar')) {
        const btn = e.target;
        document.getElementById('editId').value = btn.dataset.id;
        document.getElementById('editNombre').value = btn.dataset.nombre;
        document.getElementById('editApellido').value = btn.dataset.apellido;
        document.getElementById('editServicio').value = btn.dataset.servicio;
        document.getElementById('editFecha').value = btn.dataset.fecha;
        document.getElementById('editHora').value = btn.dataset.hora;
        new bootstrap.Modal(document.getElementById('editModal')).show();
    }
});

// Guardar edición
document.getElementById('guardarEdicion').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const nombre = document.getElementById('editNombre').value;
    const apellido = document.getElementById('editApellido').value;
    const servicio_id = document.getElementById('editServicio').value;
    const fecha = document.getElementById('editFecha').value;
    const hora = document.getElementById('editHora').value;

    const { error } = await supabase
        .from('citas')
        .update({ nombre_cliente: nombre, apellido_cliente: apellido, servicio_id, fecha_cita: fecha, hora_cita: hora })
        .eq('id', id);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        loadCitas();
    }
});

// Cerrar sesión
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
});

// Inicializar
checkAuth().then(() => {
    loadServicios('editServicio');
    loadCitas();
    loadConfig();
});