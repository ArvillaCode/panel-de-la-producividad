import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const translations = {
  es: {
    dashboard: 'Panel de Agentes',
    admin: 'Administración',
    settings: 'Configuración',
    users: 'Usuarios',
    agents: 'Agentes',
    novedades: 'Novedades',
    logout: 'Cerrar Sesión',
    welcome: 'Bienvenido de nuevo',
    save: 'Guardar Cambios',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    search: 'Buscar',
    active: 'Activo',
    inactive: 'Inactivo',
    timezone: 'Zona Horaria',
    language: 'Idioma'
  },
  en: {
    dashboard: 'Agent Panel',
    admin: 'Administration',
    settings: 'Settings',
    users: 'Users',
    agents: 'Agents',
    novedades: 'What\'s New',
    logout: 'Logout',
    welcome: 'Welcome back',
    save: 'Save Changes',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    active: 'Active',
    inactive: 'Inactive',
    timezone: 'Timezone',
    language: 'Language'
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'es');

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
