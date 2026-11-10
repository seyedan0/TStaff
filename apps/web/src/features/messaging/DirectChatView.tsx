import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCheck, MessageSquare, RefreshCw, Send, Shield, User } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ConversationContactDto, MessageDto } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import { PageHeader } from "../../shared/ui/PageHeader.js";
import { EmptyState, ErrorState, LoadingState } from "../../shared/ui/StateFeedback.js";
import { getRoleLabel } from "../../app/navigation.js";
import { useAuth } from "../auth/AuthContext.js";

export interface DirectChatViewProps {
  onNotify: (type: "success" | "error" | "info" | "warning", title: string, message?: string) => void;
}

interface ConversationSummary {
  id: string;
  type: string;
  researchCaseId?: string | null;
  updatedAt: string;
  otherParticipant?: {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: ConversationContactDto["role"];
    stage: ConversationContactDto["stage"];
  } | null;
  lastMessage?: MessageDto | null;
}

export const DirectChatView: React.FC<DirectChatViewProps> = ({ onNotify }) => {
  const { currentUser } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<ConversationContactDto[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [startingWithId, setStartingWithId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadInbox = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const [convRes, contactRes] = await Promise.all([
        apiClient.get<ConversationSummary[]>("/conversations"),
        apiClient.get<ConversationContactDto[]>("/conversations/contacts"),
      ]);
      setConversations(convRes);
      setContacts(contactRes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "دریافت گفت‌وگوها ناموفق بود.";
      setListError(message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setLoadingMessages(true);
    setThreadError(null);
    try {
      setMessages(await apiClient.get<MessageDto[]>(`/conversations/${encodeURIComponent(id)}/messages`));
    } catch (error) {
      setMessages([]);
      setThreadError(error instanceof Error ? error.message : "دریافت پیام‌های گفت‌وگو ناموفق بود.");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (conversationId) {
      void loadMessages(conversationId);
    } else {
      setMessages([]);
      setThreadError(null);
    }
  }, [conversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const activeConversation = conversations.find((c) => c.id === conversationId) ?? null;

  const openOrStartConversation = async (participantId: string) => {
    const existing = conversations.find((c) => c.otherParticipant?.id === participantId);
    if (existing) {
      navigate(`/messages/${encodeURIComponent(existing.id)}`);
      return;
    }
    setStartingWithId(participantId);
    try {
      const created = await apiClient.post<{ id: string }>("/conversations", {
        participantId,
        type: "DIRECT_SUPERVISOR_TRAINEE",
      });
      await loadInbox();
      navigate(`/messages/${encodeURIComponent(created.id)}`);
    } catch (error) {
      onNotify("error", "آغاز گفت‌وگو ناموفق بود", error instanceof Error ? error.message : undefined);
    } finally {
      setStartingWithId(null);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId || !inputMessage.trim()) return;
    setSending(true);
    try {
      const sent = await apiClient.post<MessageDto>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
        content: inputMessage.trim(),
      });
      setMessages((prev) => [...prev, sent]);
      setInputMessage("");
      void loadInbox();
    } catch (error) {
      onNotify("error", "ارسال پیام انجام نشد", error instanceof Error ? error.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const existingParticipantIds = new Set(conversations.map((c) => c.otherParticipant?.id).filter(Boolean));
  const freshContacts = contacts.filter((c) => !existingParticipantIds.has(c.id));

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#214E3A]" />
            گفت‌وگوی مستقیم دونفره
          </span>
        }
        subtitle="ارتباط مستقیم و اختصاصی میان اعضای مجاز و مدیران (گفت‌وگوی گروهی و تالار عمومی خارج از محدوده MVP است)"
        breadcrumbs={
          conversationId
            ? [{ label: "گفت‌وگوها", to: "/messages" }, { label: activeConversation?.otherParticipant?.fullName ?? "رشته پیام" }]
            : [{ label: "گفت‌وگوها" }]
        }
        backTo={conversationId ? { to: "/messages", label: "همه گفت‌وگوها" } : undefined}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            loading={loadingList || loadingMessages}
            onClick={() => {
              void loadInbox();
              if (conversationId) void loadMessages(conversationId);
            }}
          >
            به‌روزرسانی
          </Button>
        }
      />

      {listError && <ErrorState message={listError} onRetry={() => void loadInbox()} />}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Sidebar: Active conversations & contacts */}
        <div className={`space-y-4 lg:col-span-4 ${conversationId ? "hidden lg:block" : "block"}`}>
          <Card variant="default" title="گفت‌وگوهای فعال">
            {loadingList ? (
              <LoadingState message="در حال بارگذاری گفت‌وگوها..." />
            ) : conversations.length === 0 ? (
              <p className="text-xs leading-relaxed text-[#4F6659]">
                هنوز گفت‌وگویی آغاز نشده است. از فهرست مخاطبین مجاز زیر یک فرد را انتخاب کنید.
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const selected = conv.id === conversationId;
                  return (
                    <Link
                      key={conv.id}
                      to={`/messages/${encodeURIComponent(conv.id)}`}
                      className={`block rounded-xl border p-3 transition ${
                        selected
                          ? "border-[#214E3A] bg-[#214E3A]/10"
                          : "border-[#214E3A]/15 bg-[#F3EBDD]/40 hover:border-[#214E3A]/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#214031]">
                          {conv.otherParticipant?.fullName ?? "کاربر"}
                        </span>
                        {conv.otherParticipant && (
                          <Badge variant="neutral" size="sm">{getRoleLabel(conv.otherParticipant.role)}</Badge>
                        )}
                      </div>
                      {conv.lastMessage ? (
                        <p className="mt-1.5 truncate text-xs text-[#4F6659]">{conv.lastMessage.content}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-[#6B8073]">بدون پیام ثبت‌شده</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card variant="default" title="مخاطبین مجاز برای شروع گفت‌وگو">
            {loadingList ? (
              <p className="text-xs text-[#4F6659]">در حال دریافت مخاطبین...</p>
            ) : freshContacts.length === 0 && conversations.length === 0 ? (
              <p className="text-xs text-[#4F6659]">در حال حاضر مخاطب مجازی یافت نشد.</p>
            ) : freshContacts.length === 0 ? (
              <p className="text-xs text-[#4F6659]">با همه مخاطبین مجاز گفت‌وگوی فعال دارید.</p>
            ) : (
              <div className="space-y-2">
                {freshContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[#214E3A]/15 bg-[#F3EBDD]/40 p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#214031]">{contact.fullName}</div>
                      <div className="text-[11px] text-[#4F6659]">{getRoleLabel(contact.role)}</div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={startingWithId === contact.id}
                      onClick={() => void openOrStartConversation(contact.id)}
                    >
                      گفت‌وگو
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Thread Pane */}
        <div className={`lg:col-span-8 ${conversationId ? "block" : "hidden lg:block"}`}>
          {!conversationId ? (
            <EmptyState
              title="یک گفت‌وگو را انتخاب کنید"
              description="برای مشاهده تاریخچه پیام‌ها یا ارسال پیام تازه، از فهرست سمت راست مخاطب خود را برگزینید."
              icon={<MessageSquare className="h-6 w-6" />}
            />
          ) : (
            <Card variant="default" padding="none" className="flex h-[65vh] flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-[#214E3A]/15 bg-[#F3EBDD]/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/messages"
                    aria-label="بازگشت به فهرست گفت‌وگوها"
                    className="rounded-lg p-1.5 text-[#214E3A] hover:bg-[#214E3A]/10 lg:hidden"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#214E3A]/15 text-[#214E3A]">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#214031]">
                      {activeConversation?.otherParticipant?.fullName ?? "گفت‌وگوی مستقیم"}
                    </h2>
                    <span className="text-[11px] text-[#4F6659]">
                      {activeConversation?.otherParticipant ? getRoleLabel(activeConversation.otherParticipant.role) : "کانال مستقیم دونفره"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#214E3A]">
                  <Shield className="h-3.5 w-3.5" />
                  <span>ارتباط دونفره ایمن</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingMessages ? (
                  <LoadingState message="در حال بارگذاری پیام‌ها..." />
                ) : threadError ? (
                  <ErrorState message={threadError} onRetry={() => void loadMessages(conversationId)} />
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-[#4F6659]">
                    هنوز پیامی در این گفت‌وگو ثبت نشده است. نخستین پیام را بنویسید.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe
                              ? "rounded-br-none bg-[#214E3A] text-[#FFFCF5]"
                              : "rounded-bl-none border border-[#214E3A]/20 bg-[#F3EBDD]/70 text-[#214031]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isMe ? "text-[#F3EBDD]/80" : "text-[#4F6659]"
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString("fa-IR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={(e) => void handleSendMessage(e)} className="flex gap-2 border-t border-[#214E3A]/15 bg-[#F3EBDD]/40 p-3">
                <input
                  aria-label="متن پیام"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  className="flex-1 rounded-xl border border-[#214E3A]/20 bg-[#FFFCF5] px-3.5 py-2.5 text-xs text-[#214031] placeholder:text-[#6B8073] focus:border-[#214E3A] focus:outline-none"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={sending}
                  disabled={!inputMessage.trim() || sending}
                  icon={<Send className="h-4 w-4 -scale-x-100" />}
                >
                  ارسال
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
