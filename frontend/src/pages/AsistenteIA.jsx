import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AsistenteIA() {
    const { usuario } = useAuth();
    const chatKey = `eka_chat_history_${usuario?.id || 'default'}`;
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Cargar historial al montar o cambiar de usuario
    useEffect(() => {
        const saved = localStorage.getItem(chatKey);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
                return;
            } catch (e) {
                console.error("Error parsing saved chat", e);
            }
        }
        setMessages([
            {
                role: 'assistant',
                content: `¡Hola ${usuario?.nombre ? usuario.nombre.split(' ')[0] : ''}! Soy el asistente inteligente de **EKA**. Puedes preguntarme sobre el inventario, lotes próximos a vencer, movimientos recientes o stock crítico.`
            }
        ]);
    }, [chatKey, usuario]);

    // Guardar en localStorage cuando cambian los mensajes
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(chatKey, JSON.stringify(messages));
        }
    }, [messages, chatKey]);
    
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userText = input.trim();
        const newMessages = [...messages, { role: 'user', content: userText }];
        
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            const response = await api.post('/ia/chat', { messages: newMessages });
            const assistantResponse = response.data?.response || "No se recibió respuesta.";
            setMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
        } catch (error) {
            console.error('Error al comunicarse con la IA:', error);
            const errorMessage = error.response?.data?.error || 'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.';
            setMessages(prev => [...prev, { role: 'assistant', content: `[Error] ${errorMessage}`, isError: true }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        if (window.confirm('¿Estás seguro de que quieres limpiar la conversación?')) {
            localStorage.removeItem(chatKey);
            setMessages([{
                role: 'assistant',
                content: `¡Hola ${usuario?.nombre ? usuario.nombre.split(' ')[0] : ''}! Soy el asistente inteligente de **EKA**. ¿En qué puedo ayudarte hoy?`
            }]);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 font-sans relative">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-eka-50 rounded-lg">
                        <Sparkles className="text-eka-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Asistente IA</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Droguería EKA S.A.C.</p>
                    </div>
                </div>
                <button 
                    onClick={clearChat}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Limpiar chat"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Chat Body - Centered Container */}
            <div className="flex-1 overflow-y-auto scroll-smooth">
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={index} className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                {/* Avatar Asistente */}
                                {!isUser && (
                                    <div className="w-10 h-10 rounded-full bg-eka-100 flex items-center justify-center shrink-0 shadow-sm border border-eka-200">
                                        <Bot size={20} className="text-eka-600" />
                                    </div>
                                )}

                                {/* Burbuja */}
                                <div 
                                    className={`max-w-[85%] px-6 py-4 rounded-2xl shadow-md transition-all ${
                                        isUser 
                                            ? 'bg-eka-700 text-white rounded-tr-none' 
                                            : msg.isError 
                                                ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-none'
                                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                    }`}
                                >
                                    <div className={`prose prose-slate max-w-none ${isUser ? 'prose-invert' : ''}`}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({children}) => <p className="m-0 leading-relaxed text-sm md:text-base">{children}</p>,
                                                strong: ({children}) => <strong className="font-bold text-inherit">{children}</strong>,
                                                ul: ({children}) => <ul className="mt-2 space-y-1 list-disc pl-4">{children}</ul>,
                                                ol: ({children}) => <ol className="mt-2 space-y-1 list-decimal pl-4">{children}</ol>,
                                                li: ({children}) => <li className="text-sm md:text-base">{children}</li>
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {/* Avatar Usuario */}
                                {isUser && (
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 shadow-sm border border-slate-300">
                                        <User size={20} className="text-slate-600" />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {loading && (
                        <div className="flex gap-4 justify-start animate-fade-in-up">
                            <div className="w-10 h-10 rounded-full bg-eka-100 flex items-center justify-center shrink-0 shadow-sm border border-eka-200">
                                <Bot size={20} className="text-eka-600" />
                            </div>
                            <div className="bg-white border border-slate-100 text-slate-700 px-6 py-4 rounded-2xl rounded-tl-none shadow-md flex items-center gap-2">
                                <span className="flex gap-1">
                                    <span className="w-2 h-2 bg-eka-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-eka-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-eka-400 rounded-full animate-bounce"></span>
                                </span>
                                <span className="text-xs text-slate-400 font-medium ml-2">Analizando inventario...</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Elemento invisible para el scroll auto */}
                    <div ref={messagesEndRef} className="h-1" />
                </div>
            </div>

            {/* Footer Input */}
            <div className="bg-white border-t border-slate-200 p-6 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className="max-w-4xl mx-auto flex gap-4 relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu consulta sobre productos, stock o vencimientos..."
                        className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 min-h-[56px] max-h-40 focus:outline-none focus:ring-2 focus:ring-eka-500 focus:border-transparent transition-all shadow-inner text-slate-700 placeholder:text-slate-400"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-eka-600 hover:bg-eka-700 disabled:bg-eka-300 disabled:cursor-not-allowed text-white rounded-2xl px-6 flex items-center justify-center transition-all shadow-lg hover:shadow-eka-500/20 active:scale-95 shrink-0"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <Send size={22} />
                        )}
                    </button>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-3 uppercase tracking-widest font-medium">
                    Powered by Azure • Droguería EKA S.A.C.
                </p>
            </div>
        </div>
    );
}
