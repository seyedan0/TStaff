import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Shield, CheckCheck, User } from "lucide-react";
import { Card } from "../../shared/ui/Card.js";
import { Button } from "../../shared/ui/Button.js";
import { Badge } from "../../shared/ui/Badge.js";
import { useAuth } from "../auth/AuthContext.js";

export interface DirectChatViewProps {
  onNotify: (type: "success" | "error" | "info", title: string, message?: string) => void;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isMe: boolean;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      senderId: "sup-01",
      senderName: "دکتر حسینی (مدیر علمی)",
      content: "سلام، گزارش مصاحبه میدانی سوم پرونده سبک زندگی دیجیتال به خوبی تنظیم شده است.",
      createdAt: "۱۰:۱۵",
      isMe: false,
    },
    {
      id: "msg-2",
      senderId: currentUser?.id || "me",
      senderName: currentUser?.fullName || "من",
      content: "سلام استاد گرامی. سپاسگزارم. داده‌های کدگذاری‌شده مرحله تبیین نیز آماده بارگذاری است.",
      createdAt: "۱۰:۱۸",
      isMe: true,
    },
    {
      id: "msg-3",
      senderId: "sup-01",
      senderName: "دکتر حسینی (مدیر علمی)",
      content: "بسیار عالی. پیش‌نویس مرحله تبیین را ارسال کنید تا پیش از اتمام مهلت داوری بررسی نمایم.",
      createdAt: "۱۰:۲۲",
      isMe: false,
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser?.id || "me",
      senderName: currentUser?.fullName || "من",
      content: inputMessage.trim(),
      createdAt: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };

    setMessages([...messages, newMsg]);
    setInputMessage("");

    // Simulate instant delivery
    onNotify("success", "پیام ارسال شد", "پیام در گفت‌وگوی دونفره مستقیم تحویل داده شد (FR-030).");
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-apple-blue" />
            پیام‌رسان دونفره مستقیم علمی (FR-024, FR-030, BR-16)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ارتباط مستقیم و امن میان پژوهشگر/کارآموز و مدیر علمی (چت گروهی و تالار عمومی خارج از محدوده است)
          </p>
        </div>

        <Badge variant="info" size="sm" dot>
          گفت‌وگوی دونفره مستقیم فعال
        </Badge>
      </div>

      {/* Chat Container */}
      <Card variant="glass" className="h-[65vh] flex flex-col p-0 overflow-hidden border-white/10">
        {/* Chat Top Info Bar */}
        <div className="p-3.5 bg-white/[0.03] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-apple-blue/20 border border-apple-blue/40 flex items-center justify-center text-apple-blue">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100">دکتر مهدی حسینی</h4>
              <span className="text-[10px] text-slate-400">مدیر علمی پرونده CASE-101</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-apple-green" />
            کانال مستقیم و اختصاصی (BR-16)
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-start" : "items-end"}`}
            >
              <div
                className={`max-w-[75%] p-3.5 rounded-apple-lg text-xs leading-relaxed ${
                  msg.isMe
                    ? "bg-apple-blue text-white rounded-br-none shadow-sm"
                    : "bg-slate-800/90 text-slate-100 border border-white/10 rounded-bl-none"
                }`}
              >
                {!msg.isMe && (
                  <span className="block font-bold text-[10px] text-apple-blue mb-1">
                    {msg.senderName}
                  </span>
                )}
                <p>{msg.content}</p>
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    msg.isMe ? "text-blue-100" : "text-slate-400"
                  }`}
                >
                  <span>{msg.createdAt}</span>
                  {msg.isMe && <CheckCheck className="w-3 h-3" />}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white/[0.02] border-t border-white/5 flex gap-2">
          <input
            className="flex-1 bg-slate-900/80 text-slate-100 placeholder-slate-500 text-xs rounded-apple-md border border-white/10 px-4 py-2.5 outline-none focus:border-apple-blue"
            placeholder="پیام خود را بنویسید..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<Send className="w-4 h-4 -scale-x-100" />}
            disabled={!inputMessage.trim()}
          >
            ارسال
          </Button>
        </form>
      </Card>
    </div>
  );
};
