// Inicializa el cliente de Supabase con la clave anónima
const SUPABASE_URL = 'https://fpzzmtvucdsbetgpwgkh.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'sb_publishable_3PLALZRgWNXQ6oJ_Ylbavw_9-e8LJaj'; // Reemplaza con tu clave anónima

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);