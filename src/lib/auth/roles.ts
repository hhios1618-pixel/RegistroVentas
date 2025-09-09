// Normalizador
export function normRole(r?: string|null) {
    return String(r || '').trim().toUpperCase();
  }
  
  /**
   * ALLOW: rutas (prefijos) habilitadas por rol.
   * TODO: ajusta a tu gusto; es declarativo.
   */
  export const ALLOW: Record<string, string[]> = {
    // Dirección / C-level / Dueños
    GERENCIA:      ['/', '/dashboard', '/admin', '/captura', '/devoluciones', '/registro', '/delivery', '/logistica'],
    ADMIN:         ['/', '/dashboard', '/admin', '/captura', '/devoluciones', '/registro', '/delivery', '/logistica'],
  
    // Mandos medios
    COORDINADOR:   ['/dashboard', '/captura', '/devoluciones', '/delivery', '/logistica', '/promotores', '/registro'],
    ASESOR:        ['/dashboard', '/captura', '/devoluciones', '/promotores', '/registro'],
  
    // Terreno
    PROMOTOR:      ['/registro'],     // solo registro
    VENDEDOR:      ['/captura', '/dashboard'],
    LOGISTICA:     ['/delivery', '/logistica', '/dashboard'],
  
    // Fallback
    USER:          ['/dashboard']
  };
  
  /**
   * HOME: ruta “home” por rol para redirecciones.
   */
  export const HOME: Record<string, string> = {
    GERENCIA:    '/dashboard',
    ADMIN:       '/dashboard',
    COORDINADOR: '/dashboard',
    ASESOR:      '/dashboard',
    PROMOTOR:    '/registro',
    VENDEDOR:    '/captura',
    LOGISTICA:   '/delivery',
    USER:        '/dashboard'
  };
  
  // Chequea si path está permitido para el rol
  export function isAllowed(role: string, path: string) {
    const wl = ALLOW[normRole(role)] || ALLOW.USER;
    return wl.some(p => path === p || path.startsWith(p));
  }
  
  // Home por rol
  export function roleHome(role: string) {
    return HOME[normRole(role)] || HOME.USER;
  }