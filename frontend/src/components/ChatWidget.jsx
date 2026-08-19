import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { connectSocket } from '../api/socket';
import Icon from './Icon.jsx';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => { openRef.current = open; }, [open]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/messages');
      setMessages(data.messages || []);
      if (openRef.current) setUnread(0);
    } catch (err) {
      console.error('Unable to load chat history', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('educore_token');
    if (!token) return undefined;

    loadHistory();
    const socket = connectSocket(token, {
      onReconnect: loadHistory,
      onError: (err) => console.warn('Chat connection error', err.message),
    });
    socketRef.current = socket;
    socket.on('new_message', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender === 'admin' && !openRef.current) setUnread((u) => u + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadHistory]);

  const toggleOpen = () => {
    setOpen((value) => {
      const next = !value;
      if (next) loadHistory();
      return next;
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const draft = text.trim();
    if (!draft) return;
    setText('');
    const optimisticId = `local-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      sender: 'teacher',
      text: draft,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const { data } = await api.post('/messages', { text: draft });
      setMessages((prev) => prev.map((message) => (
        message.id === optimisticId ? data.message : message
      )));
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setText(draft);
      console.error('Unable to send message', err);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {open && (
        <div className="mb-3 w-80 max-w-[90vw] card shadow-xl flex flex-col overflow-hidden" style={{ height: 420 }}>
          <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-sm">الدعم الفني</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">×</button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-surface">
            {messages.length === 0 && <p className="text-ink/40 text-xs text-center mt-6">لا توجد رسائل بعد. أرسل استفسارك وسيتم الرد عليك قريبًا.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-xl2 text-sm ${m.sender === 'teacher' ? 'bg-primary text-white mr-auto' : 'bg-white border border-line ml-auto'}`}>
                {m.text}
                <div className={`text-[10px] mt-1 ${m.sender === 'teacher' ? 'text-white/70' : 'text-ink/40'}`}>
                  {new Date(m.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="p-2 border-t border-line flex gap-2 bg-white">
            <input className="input text-sm flex-1" placeholder="اكتب رسالتك..." value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary text-sm px-3" type="submit">إرسال</button>
          </form>
        </div>
      )}

      <button onClick={toggleOpen}
        className="relative w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-dark transition-colors">
        <Icon name="messageCircle" className="w-6 h-6" />
        {unread > 0 && !open && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{unread}</span>
        )}
      </button>
    </div>
  );
}
