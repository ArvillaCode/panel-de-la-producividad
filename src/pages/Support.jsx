import React from 'react';
import { Mail, ChevronLeft, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Support = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#020203] text-white p-8 md:p-16">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-12 transition-colors">
        <ChevronLeft className="w-5 h-5" /> Volver a la Landing
      </button>
      <div className="max-w-4xl mx-auto text-center">
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tight uppercase">Centro de Soporte</h1>
          <p className="text-slate-400 text-lg max-w-xl font-medium">
            Estamos aquí para asegurarnos de que tu experiencia con Upfunnel sea impecable. ¿Tienes alguna duda técnica o de facturación?
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all">
            <Mail className="w-8 h-8 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Correo Electrónico</h3>
            <p className="text-slate-400 mb-6">Respuesta en menos de 24 horas hábiles.</p>
            <a href="mailto:soporte@upfunnel.click" className="text-purple-400 font-bold hover:underline">soporte@upfunnel.click</a>
          </div>
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-green-500/30 transition-all">
            <MessageCircle className="w-8 h-8 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">WhatsApp Directo</h3>
            <p className="text-slate-400 mb-6">Soporte prioritario para suscriptores activos.</p>
            <a 
              href="https://wa.link/jlrmkb" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-block px-8 py-3 bg-green-600 hover:bg-green-700 rounded-xl font-bold transition-all text-white no-underline shadow-lg shadow-green-600/20"
            >
              Contactar Asesor
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
