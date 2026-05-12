import React from 'react';
import { Shield, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Policies = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020203] text-white p-8 md:p-16">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-12 transition-colors">
        <ChevronLeft className="w-5 h-5" /> Volver a la Landing
      </button>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tight uppercase">Políticas de Servicio</h1>
        </div>
        <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Aceptación del Servicio</h2>
            <p>Al acceder a Upfunnel, aceptas estar vinculado por estos términos de servicio. Nuestro panel ofrece acceso a más de 50 agentes de IA diseñados para optimizar tu productividad empresarial por un costo anual de $50 USD.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Suscripción y Pagos</h2>
            <p>La suscripción es de carácter anual. El pago de $50 USD otorga acceso ilimitado a las herramientas durante 12 meses. No se realizan reembolsos parciales tras el uso activo de los agentes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Uso de la Inteligencia Artificial</h2>
            <p>Los agentes de IA son herramientas de asistencia. El usuario es responsable de verificar los resultados finales generados por la IA para su aplicación comercial o personal.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. Restricciones</h2>
            <p>Queda prohibido el uso de los agentes para generar contenido malicioso, spam o cualquier actividad que viole las leyes locales o internacionales.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Policies;
