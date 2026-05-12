import React from 'react';
import { Lock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020203] text-white p-8 md:p-16">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-12 transition-colors">
        <ChevronLeft className="w-5 h-5" /> Volver a la Landing
      </button>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tight uppercase">Privacidad de Datos</h1>
        </div>
        <div className="space-y-8 text-slate-300 leading-relaxed font-medium">
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Recolección de Información</h2>
            <p>Solo recolectamos los datos necesarios para tu acceso: nombre y correo electrónico. Tu información nunca es vendida a terceros.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Seguridad de la IA</h2>
            <p>Las consultas realizadas a los agentes de IA se procesan de forma segura. No almacenamos el contenido de tus conversaciones con el fin de entrenar modelos externos fuera de tu sesión privada.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Almacenamiento</h2>
            <p>Utilizamos infraestructura de última generación para asegurar que tus credenciales y datos de perfil estén protegidos bajo cifrado de nivel bancario.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
