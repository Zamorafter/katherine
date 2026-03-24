# Katherine

Aplicacion Next.js 16 para reservas, con persistencia en Supabase y panel admin protegido con autenticacion.

## Variables locales

Crea un archivo `.env.local` en la raiz del proyecto con estos valores:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
NEXT_PUBLIC_WHATSAPP_URL=https://wa.me/584129281774
NEXT_PUBLIC_INSTAGRAM_URL=https://www.instagram.com/studiosevenk?igsh=NnoyaHkzeGpxMDFr
NEXT_PUBLIC_TIKTOK_URL=https://www.tiktok.com/@studioseven7k?_r=1&_t=ZS-94H64QJZp5w
```

No subas `.env.local` a GitHub.

## Como conectar Supabase con GitHub

La app ya usa Supabase desde el codigo. Para enlazar el proyecto con GitHub de forma segura:

1. En Supabase, abre tu proyecto.
2. Ve a `Project Settings > API`.
3. Copia estos valores:
   `Project URL`
   `anon public key`
   `service_role secret`
4. En GitHub, abre tu repositorio.
5. Ve a `Settings > Secrets and variables > Actions`.
6. Crea estos secretos:
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   `SUPABASE_SERVICE_ROLE_KEY`
7. Haz push a GitHub. La workflow `ci.yml` usara esos secretos para validar que la app pueda compilar con la configuracion de Supabase.

## Base de datos

El esquema base del proyecto esta en `supabase-schema.sql`.

Si todavia no lo has cargado:

1. Abre el `SQL Editor` en Supabase.
2. Pega el contenido de `supabase-schema.sql`.
3. Ejecuta el script.

## Desarrollo

Instala dependencias y levanta el proyecto:

```bash
npm install
npm run dev
```

La app quedara disponible en `http://localhost:3000`.

## Verificacion rapida

Cuando tengas las variables listas:

1. Abre la pagina principal y crea una reserva.
2. Confirma en Supabase que se inserto en `appointments`.
3. Entra a `/admin/login` con un usuario valido de Supabase Auth.
4. Edita o cancela una cita para verificar lectura y escritura.
