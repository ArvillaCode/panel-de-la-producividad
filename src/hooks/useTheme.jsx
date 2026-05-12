import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // 1. Prioridad: Tema guardado manualmente
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;

    // 2. Prioridad: Preferencia del sistema (Modo Inteligente)
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // 3. Fallback: Horario (Opcional: Oscuro de 19:00 a 07:00)
    const hour = new Date().getHours();
    if (hour < 7 || hour >= 19) return 'dark';

    return 'light';
  });

  useEffect(() => {
    // Escuchar cambios en la preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    // Guardar tema en localStorage si fue seleccionado manualmente
    localStorage.setItem('theme', theme);
    
    // Aplicar clase al documento
    document.documentElement.className = theme;
    
    // Aplicar variables CSS según el tema
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#0f172a');
      document.documentElement.style.setProperty('--bg-secondary', '#1e293b');
      document.documentElement.style.setProperty('--text-primary', '#f8fafc');
      document.documentElement.style.setProperty('--text-secondary', '#cbd5e1');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--text-primary', '#0f172a');
      document.documentElement.style.setProperty('--text-secondary', '#475569');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
    }
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
    setSpecificTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};