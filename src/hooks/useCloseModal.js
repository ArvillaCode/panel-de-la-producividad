import { useEffect, useRef } from 'react';

/**
 * Hook personalizado para manejar el cierre de modales
 * @param {boolean} isOpen - Estado de visibilidad del modal
 * @param {function} onClose - Función a ejecutar para cerrar el modal
 * @returns {React.RefObject} - Referencia para asignar al contenido interno del modal (para evitar cierre al hacer click dentro)
 */
export const useCloseModal = (isOpen, onClose) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (isOpen && modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return { modalRef };
};
