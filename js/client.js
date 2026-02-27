// Función para obtener las fechas de la semana (lunes a sábado)
function getWeekDates() {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 domingo, 1 lunes, ...
    let lunes;
    if (diaSemana === 0) { // domingo
        lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + 1);
    } else {
        lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (diaSemana - 1));
    }
    const fechas = [];
    for (let i = 0; i < 6; i++) {
        const fecha = new Date(lunes);
        fecha.setDate(lunes.getDate() + i);
        fechas.push(fecha);
    }
    return fechas;
}

// Formatear fecha como YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Cargar configuración (redes sociales) y servicios
async function loadConfigAndServices() {
    const { data: config, error: configError } = await supabase
        .from('configuracion')
        .select('*');
    if (!configError && config) {
        const configObj = {};
        config.forEach(item => configObj[item.clave] = item.valor);
        const socialDiv = document.getElementById('social-buttons');
        socialDiv.innerHTML = `
            <a href="https://wa.me/${configObj.whatsapp}" class="btn btn-success me-2" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>
            <a href="${configObj.instagram}" class="btn btn-danger me-2" target="_blank"><i class="fab fa-instagram"></i> Instagram</a>
            <a href="${configObj.tiktok}" class="btn btn-dark" target="_blank"><i class="fab fa-tiktok"></i> TikTok</a>
        `;
    }

    const { data: servicios, error: servError } = await supabase
        .from('servicios')
        .select('*');
    if (!servError && servicios) {
        const select = document.getElementById('servicio');
        select.innerHTML = servicios.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }
}

// Cargar calendario con horarios ocupados
async function loadCalendar() {
    const fechas = getWeekDates();
    const fechasStr = fechas.map(f => formatDate(f));
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const horas = ['9:00', '11:00', '13:00', '15:00'];

    // Obtener citas de la semana
    const { data: citas, error } = await supabase
        .from('citas')
        .select('fecha_cita, hora_cita')
        .in('fecha_cita', fechasStr);

    const ocupados = {};
    if (!error && citas) {
        citas.forEach(c => {
            if (!ocupados[c.fecha_cita]) ocupados[c.fecha_cita] = [];
            ocupados[c.fecha_cita].push(c.hora_cita);
        });
    }

    // Generar HTML del calendario
    let html = '<div class="row mb-2"><div class="col-2"><strong>Hora</strong></div>';
    fechasStr.forEach((fecha, index) => {
        html += `<div class="col-2"><strong>${diasSemana[index]}<br>${fecha}</strong></div>`;
    });
    html += '</div>';

    horas.forEach(hora => {
        html += '<div class="row align-items-center mb-2">';
        html += `<div class="col-2">${hora}</div>`;
        fechasStr.forEach(fecha => {
            const ocupado = ocupados[fecha] && ocupados[fecha].includes(hora);
            const clase = ocupado ? 'btn-danger disabled' : 'btn-outline-success';
            const icono = ocupado ? '❤️ ' : '';
            html += `<div class="col-2"><button class="btn ${clase} w-100 slot-btn" data-fecha="${fecha}" data-hora="${hora}" ${ocupado ? 'disabled' : ''}>${icono}${hora}</button></div>`;
        });
        html += '</div>';
    });

    document.getElementById('calendario').innerHTML = html;
}

// Manejar clic en slot disponible
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('slot-btn') && !e.target.disabled) {
        document.getElementById('fechaSeleccionada').value = e.target.dataset.fecha;
        document.getElementById('horaSeleccionada').value = e.target.dataset.hora;
        new bootstrap.Modal(document.getElementById('bookingModal')).show();
    }
});

// Confirmar reserva
document.getElementById('confirmarReserva').addEventListener('click', async () => {
    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const servicio_id = document.getElementById('servicio').value;
    const fecha = document.getElementById('fechaSeleccionada').value;
    const hora = document.getElementById('horaSeleccionada').value;

    if (!nombre || !apellido || !servicio_id) {
        alert('Por favor completa todos los campos');
        return;
    }

    const { error } = await supabase
        .from('citas')
        .insert([
            { nombre_cliente: nombre, apellido_cliente: apellido, servicio_id, fecha_cita: fecha, hora_cita: hora }
        ]);

    if (error) {
        if (error.code === '23505') { // Código de unique violation
            alert('Este horario ya fue reservado justo ahora. Por favor elige otro.');
        } else {
            alert('Error al reservar: ' + error.message);
        }
    } else {
        alert('¡Cita reservada con éxito!');
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        document.getElementById('bookingForm').reset();
        loadCalendar(); // Refrescar
    }
});

// Inicializar
loadConfigAndServices();
loadCalendar();