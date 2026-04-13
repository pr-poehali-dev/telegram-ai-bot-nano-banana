import { useState, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const GENERATE_URL = "https://functions.poehali.dev/967a2ae9-a5b6-49d8-b6d4-d055009b43e5";
const SAVE_IMAGE_URL = "https://functions.poehali.dev/41b47fcc-99ec-4ba7-820b-0a9c2db87cb1";
const GET_HISTORY_URL = "https://functions.poehali.dev/71c50a95-7be7-4e94-aa81-826f3b7959b4";

type Page = "home" | "generate" | "subscription" | "profile" | "admin";

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "home", label: "Главная", icon: "LayoutDashboard" },
  { id: "generate", label: "Генерация", icon: "Sparkles" },
  { id: "subscription", label: "Подписка", icon: "CreditCard" },
  { id: "profile", label: "Профиль", icon: "User" },
  { id: "admin", label: "Админ-панель", icon: "ShieldCheck" },
];

const PLANS = [
  {
    id: "starter",
    name: "Старт",
    price: "990",
    color: "text-muted-foreground",
    accent: "bg-muted/60",
    border: "border-border",
    daily: 10,
    monthly: 100,
    features: ["10 генераций / день", "100 в месяц", "SD качество", "Базовые стили"],
  },
  {
    id: "pro",
    name: "Про",
    price: "2 490",
    color: "text-primary",
    accent: "bg-primary/10",
    border: "border-primary/40",
    daily: 50,
    monthly: 1000,
    popular: true,
    features: ["50 генераций / день", "1 000 в месяц", "HD качество", "Все стили", "Приоритет"],
  },
  {
    id: "business",
    name: "Бизнес",
    price: "7 490",
    color: "text-warning",
    accent: "bg-warning/10",
    border: "border-warning/30",
    daily: 200,
    monthly: 5000,
    features: ["200 генераций / день", "5 000 в месяц", "4K качество", "API доступ", "SLA 99.9%"],
  },
];

const USERS_DATA = [
  { id: 1, name: "Иванов А.П.", email: "ivanov@corp.ru", plan: "Про", daily: 34, dailyMax: 50, monthly: 456, monthlyMax: 1000, status: "active" },
  { id: 2, name: "Смирнова Е.В.", email: "smirnova@corp.ru", plan: "Старт", daily: 10, dailyMax: 10, monthly: 98, monthlyMax: 100, status: "limit" },
  { id: 3, name: "Козлов И.М.", email: "kozlov@corp.ru", plan: "Бизнес", daily: 12, dailyMax: 200, monthly: 201, monthlyMax: 5000, status: "active" },
  { id: 4, name: "Петрова О.Д.", email: "petrova@corp.ru", plan: "Про", daily: 0, dailyMax: 50, monthly: 12, monthlyMax: 1000, status: "inactive" },
];

const HISTORY = [
  { id: 1, prompt: "Корпоративный логотип в минималистичном стиле", style: "Минимализм", time: "14:32", status: "done" },
  { id: 2, prompt: "Иллюстрация для презентации — командная работа", style: "Деловой", time: "13:18", status: "done" },
  { id: 3, prompt: "Баннер для конференции по цифровым технологиям", style: "Техно", time: "11:05", status: "done" },
  { id: 4, prompt: "Аватар для корпоративного профиля сотрудника", style: "Портрет", time: "09:44", status: "error" },
];

interface HistoryItem {
  id: number;
  prompt: string;
  style: string;
  time: string;
  status: "done" | "error";
  imageUrl?: string;
}

export default function Index() {
  const [page, setPage] = useState<Page>("home");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("minimal");
  const [quality, setQuality] = useState("hd");
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = useCallback(async (imageUrl: string, id: number, promptText: string) => {
    setDownloadingId(id);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generation-${id}-${promptText.slice(0, 30).replace(/[^a-zа-яё0-9]/gi, "_")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }, []);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const styleLabels: Record<string, string> = {
    minimal: "Минимализм", business: "Деловой", tech: "Техно",
    portrait: "Портрет", abstract: "Абстракция",
  };

  // Загружаем историю из БД при старте
  useEffect(() => {
    fetch(GET_HISTORY_URL)
      .then(r => r.json())
      .then(data => {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        const items: HistoryItem[] = (parsed.items || []).map((item: {
          id: number; prompt: string; style: string; created_at: string;
          image_url?: string; status: string;
        }) => ({
          id: item.id,
          prompt: item.prompt,
          style: styleLabels[item.style] || item.style,
          time: new Date(item.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
          status: item.status as "done" | "error",
          imageUrl: item.image_url || undefined,
        }));
        setHistory(items);
      })
      .catch(() => setHistory(HISTORY))
      .finally(() => setHistoryLoading(false));
  }, []);

  const dailyUsed = history.filter(h => h.status === "done").length;
  const dailyMax = 50;
  const monthlyUsed = history.filter(h => h.status === "done").length;
  const monthlyMax = 1000;

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    setGenerateError(null);

    try {
      // 1. Генерируем через DALL-E
      const res = await fetch(GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, quality }),
      });
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      if (!res.ok || parsed.error) {
        throw new Error(parsed.error || "Ошибка генерации");
      }

      setGeneratedImage(parsed.url);

      // 2. Сохраняем в S3 + БД
      const saveRes = await fetch(SAVE_IMAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: parsed.url, prompt, style, quality, status: "done" }),
      });
      const saveData = await saveRes.json();
      const saved = typeof saveData === "string" ? JSON.parse(saveData) : saveData;

      const cdnUrl = saved.cdn_url || parsed.url;
      setGeneratedImage(cdnUrl);

      const now = new Date();
      const time = now.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      setHistory(prev => [{
        id: saved.id || Date.now(),
        prompt,
        style: styleLabels[style] || style,
        time,
        status: "done",
        imageUrl: cdnUrl,
      }, ...prev].slice(0, 50));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка генерации";
      setGenerateError(msg);
      const now = new Date();
      const time = now.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
      setHistory(prev => [{
        id: Date.now(),
        prompt,
        style: styleLabels[style] || style,
        time,
        status: "error",
      }, ...prev].slice(0, 50));
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, style, quality, isGenerating]);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-ibm">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} transition-all duration-200 flex flex-col border-r border-border bg-sidebar shrink-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center shrink-0">
            <Icon name="Zap" size={14} className="text-primary-foreground" />
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm tracking-wide text-foreground">ImageGen Pro</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`nav-link w-full ${page === item.id ? "active" : ""}`}
            >
              <Icon name={item.icon} size={17} className="shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-border shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">ИА</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Иванов А.П.</p>
                <p className="text-xs text-muted-foreground truncate">Тариф: Про</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">ИА</span>
              </div>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center justify-center h-9 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <Icon name={sidebarOpen ? "PanelLeftClose" : "PanelLeftOpen"} size={15} />
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card/50">
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {NAV_ITEMS.find(n => n.id === page)?.label}
            </h1>
            <p className="text-xs text-muted-foreground">
              {page === "home" && "Сводка активности и статистика"}
              {page === "generate" && "Создание изображений по описанию"}
              {page === "subscription" && "Тарифные планы и управление подпиской"}
              {page === "profile" && "Настройки аккаунта"}
              {page === "admin" && "Управление пользователями и лимитами"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              Система работает
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Icon name="Bell" size={16} />
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* HOME */}
          {page === "home" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Генераций сегодня", value: "34", max: "50", icon: "Sparkles", trend: "+12%" },
                  { label: "В этом месяце", value: "456", max: "1 000", icon: "BarChart2", trend: "+8%" },
                  { label: "Активных пользователей", value: "127", icon: "Users", trend: "+3%" },
                  { label: "Доступно генераций", value: "16", icon: "Layers", trend: null },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <Icon name={s.icon} size={14} className="text-primary" />
                      </div>
                    </div>
                    <p className="text-2xl font-semibold text-foreground">{s.value}
                      {s.max && <span className="text-sm text-muted-foreground font-normal"> / {s.max}</span>}
                    </p>
                    {s.trend && (
                      <p className="text-xs text-success mt-1">{s.trend} к прошлому периоду</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 bg-card border border-border rounded-lg p-5 space-y-5">
                  <h3 className="text-sm font-semibold text-foreground">Использование лимитов</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Дневной лимит</span>
                        <span className="font-mono text-foreground">{dailyUsed} / {dailyMax}</span>
                      </div>
                      <Progress value={(dailyUsed / dailyMax) * 100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">Обновится в 00:00</p>
                    </div>
                    <Separator />
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-muted-foreground">Месячный лимит</span>
                        <span className="font-mono text-foreground">{monthlyUsed} / {monthlyMax}</span>
                      </div>
                      <Progress value={(monthlyUsed / monthlyMax) * 100} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">Обновится 1 июня</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium">Тариф: Про</Badge>
                  </div>
                </div>

                <div className="col-span-2 bg-card border border-border rounded-lg p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Последние генерации</h3>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/40 hover:bg-secondary/70 transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${h.status === "done" ? "bg-success" : "bg-destructive"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{h.prompt}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.style}</p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GENERATE */}
          {page === "generate" && (
            <div className="max-w-3xl space-y-5 animate-fade-in">
              {/* Limits bar */}
              <div className="flex items-center gap-6 p-4 bg-card border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Дневной лимит</span>
                    <span className="font-mono text-foreground">{dailyUsed} / {dailyMax}</span>
                  </div>
                  <Progress value={(dailyUsed / dailyMax) * 100} className="h-1" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Месячный лимит</span>
                    <span className="font-mono text-foreground">{monthlyUsed} / {monthlyMax}</span>
                  </div>
                  <Progress value={(monthlyUsed / monthlyMax) * 100} className="h-1" />
                </div>
                <Badge className="bg-primary/10 text-primary border-0 shrink-0">Про</Badge>
              </div>

              {/* Form */}
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Описание изображения</label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Опишите изображение, которое нужно создать..."
                    className="resize-none h-28 text-sm bg-secondary/50 border-border focus:border-primary/50 transition-colors"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">{prompt.length} / 500 символов</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Стиль</label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="bg-secondary/50 border-border text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Минимализм</SelectItem>
                        <SelectItem value="business">Деловой</SelectItem>
                        <SelectItem value="tech">Техно</SelectItem>
                        <SelectItem value="portrait">Портрет</SelectItem>
                        <SelectItem value="abstract">Абстракция</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Качество</label>
                    <Select value={quality} onValueChange={setQuality}>
                      <SelectTrigger className="bg-secondary/50 border-border text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sd">SD — Стандарт</SelectItem>
                        <SelectItem value="hd">HD — Высокое</SelectItem>
                        <SelectItem value="4k">4K — Максимум</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm"
                >
                  {isGenerating ? (
                    <span className="flex items-center gap-2">
                      <Icon name="Loader2" size={16} className="animate-spin" />
                      Генерация... это займёт ~15 секунд
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Icon name="Sparkles" size={16} />
                      Создать изображение
                    </span>
                  )}
                </Button>
              </div>

              {/* Error */}
              {generateError && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg animate-fade-in">
                  <Icon name="AlertCircle" size={16} className="text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Ошибка генерации</p>
                    <p className="text-xs text-destructive/80 mt-0.5">{generateError}</p>
                  </div>
                  <button onClick={() => setGenerateError(null)} className="ml-auto text-destructive/60 hover:text-destructive">
                    <Icon name="X" size={14} />
                  </button>
                </div>
              )}

              {/* Result image */}
              {generatedImage && (
                <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-xs font-medium text-foreground">Готово</span>
                    </div>
                    <button
                      onClick={() => handleDownload(generatedImage, 0, prompt)}
                      disabled={downloadingId === 0}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === 0
                        ? <Icon name="Loader2" size={13} className="animate-spin" />
                        : <Icon name="Download" size={13} />
                      }
                      Скачать
                    </button>
                  </div>
                  <img
                    src={generatedImage}
                    alt="Сгенерированное изображение"
                    className="w-full object-contain max-h-[512px]"
                  />
                </div>
              )}

              {/* History */}
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">История генераций</h3>
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    Загрузка истории...
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Генераций пока нет</p>
                ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-md border border-border/50 hover:border-border transition-colors group">
                      {h.imageUrl ? (
                        <img src={h.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${h.status === "done" ? "bg-success/10" : "bg-destructive/10"}`}>
                          <Icon name={h.status === "done" ? "CheckCircle" : "XCircle"} size={15} className={h.status === "done" ? "text-success" : "text-destructive"} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{h.prompt}</p>
                        <p className="text-xs text-muted-foreground">{h.style} • {h.time}</p>
                      </div>
                      {h.imageUrl && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <a href={h.imageUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Открыть">
                              <Icon name="ExternalLink" size={13} />
                            </Button>
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            title="Скачать"
                            disabled={downloadingId === h.id}
                            onClick={() => handleDownload(h.imageUrl!, h.id, h.prompt)}
                          >
                            {downloadingId === h.id
                              ? <Icon name="Loader2" size={13} className="animate-spin" />
                              : <Icon name="Download" size={13} />
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          )}

          {/* SUBSCRIPTION */}
          {page === "subscription" && (
            <div className="max-w-4xl space-y-6 animate-fade-in">
              <div className="grid grid-cols-3 gap-4">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`relative bg-card border ${plan.border} rounded-lg p-5 flex flex-col gap-4`}>
                    {plan.popular && (
                      <div className="absolute -top-px left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground border-0 rounded-t-none rounded-b-md text-xs px-3">Популярный</Badge>
                      </div>
                    )}
                    <div>
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium mb-3 ${plan.accent} ${plan.color}`}>{plan.name}</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-semibold text-foreground">{plan.price}</span>
                        <span className="text-xs text-muted-foreground">₽/мес</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">В день</span>
                          <span className={`font-mono font-medium ${plan.color}`}>{plan.daily}</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">В месяц</span>
                          <span className={`font-mono font-medium ${plan.color}`}>{plan.monthly.toLocaleString("ru")}</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full" />
                      </div>
                    </div>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Icon name="Check" size={12} className={plan.color} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`h-9 text-sm font-medium ${plan.id === "pro" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                      variant={plan.id === "pro" ? "default" : "secondary"}
                    >
                      {plan.id === "pro" ? "Текущий план" : "Выбрать"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Ваша подписка</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Тариф", value: "Про", mono: false },
                    { label: "Следующее списание", value: "01.06.2026", mono: true },
                    { label: "Сумма", value: "2 490 ₽", mono: true },
                    { label: "Статус", value: "Активна", ok: true },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className={`text-sm font-medium ${item.mono ? "font-mono" : ""} ${item.ok ? "text-success" : "text-foreground"}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {page === "profile" && (
            <div className="max-w-2xl space-y-5 animate-fade-in">
              <div className="bg-card border border-border rounded-lg p-5 flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
                  ИА
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">Иванов Алексей Петрович</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">ivanov@corp.ru</p>
                  <Badge className="mt-2 bg-primary/10 text-primary border-0 text-xs">Тариф: Про</Badge>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 text-xs border-border">
                  <Icon name="Pencil" size={13} className="mr-1.5" />
                  Редактировать
                </Button>
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Личные данные</h3>
                {[
                  { label: "Имя", value: "Алексей Петрович" },
                  { label: "Email", value: "ivanov@corp.ru" },
                  { label: "Организация", value: "ООО «Технологии»" },
                  { label: "Роль", value: "Руководитель отдела" },
                ].map((field, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground w-32">{field.label}</span>
                    <span className="text-sm text-foreground flex-1 text-right">{field.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Настройки</h3>
                {[
                  { label: "Email-уведомления при достижении лимита", desc: "Получать оповещения при 80% и 100% использования", def: true },
                  { label: "Двухфакторная аутентификация", desc: "Дополнительный уровень безопасности аккаунта", def: false },
                  { label: "Сохранять историю генераций", desc: "Хранить все созданные изображения 90 дней", def: true },
                ].map((s, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-foreground">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                    <Switch defaultChecked={s.def} />
                  </div>
                ))}
              </div>

              <Button variant="outline" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Icon name="LogOut" size={13} className="mr-1.5" />
                Выйти из аккаунта
              </Button>
            </div>
          )}

          {/* ADMIN */}
          {page === "admin" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Всего пользователей", value: "127", icon: "Users", warn: false },
                  { label: "Достигли лимита", value: "8", icon: "AlertTriangle", warn: true },
                  { label: "Генераций сегодня", value: "2 341", icon: "Sparkles", warn: false },
                  { label: "Выручка в месяц", value: "184 500 ₽", icon: "TrendingUp", warn: false },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${s.warn ? "bg-warning/10" : "bg-primary/10"}`}>
                        <Icon name={s.icon} size={14} className={s.warn ? "text-warning" : "text-primary"} />
                      </div>
                    </div>
                    <p className={`text-2xl font-semibold ${s.warn ? "text-warning" : "text-foreground"}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Пользователи</h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs border-border">
                      <Icon name="Filter" size={12} className="mr-1.5" />
                      Фильтр
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      <Icon name="UserPlus" size={12} className="mr-1.5" />
                      Добавить
                    </Button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Пользователь</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Тариф</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">День</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Месяц</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Статус</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {USERS_DATA.map((u, i) => (
                      <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i === USERS_DATA.length - 1 ? "border-0" : ""}`}>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {u.name.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="tag bg-secondary text-muted-foreground">{u.plan}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-28">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-mono text-foreground">{u.daily}/{u.dailyMax}</span>
                              <span className={`${u.daily >= u.dailyMax ? "text-destructive" : "text-muted-foreground"}`}>
                                {Math.round((u.daily / u.dailyMax) * 100)}%
                              </span>
                            </div>
                            <Progress value={(u.daily / u.dailyMax) * 100} className="h-1" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="w-28">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-mono text-foreground">{u.monthly}/{u.monthlyMax}</span>
                              <span className="text-muted-foreground">{Math.round((u.monthly / u.monthlyMax) * 100)}%</span>
                            </div>
                            <Progress value={(u.monthly / u.monthlyMax) * 100} className="h-1" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`tag ${
                            u.status === "active" ? "bg-success/10 text-success" :
                            u.status === "limit" ? "bg-destructive/10 text-destructive" :
                            "bg-secondary text-muted-foreground"
                          }`}>
                            {u.status === "active" ? "Активен" : u.status === "limit" ? "Лимит" : "Неактивен"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Icon name="Settings" size={13} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Icon name="Trash2" size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Настройка лимитов по тарифам</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-8 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Тариф</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Дневной лимит</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Месячный лимит</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Качество</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {PLANS.map((plan) => (
                      <tr key={plan.id} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-8">
                          <span className={`tag ${plan.accent} ${plan.color}`}>{plan.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-foreground">{plan.daily}</span>
                          <span className="text-xs text-muted-foreground ml-1">/ день</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-foreground">{plan.monthly.toLocaleString("ru")}</span>
                          <span className="text-xs text-muted-foreground ml-1">/ мес</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-muted-foreground">{plan.id === "starter" ? "SD" : plan.id === "pro" ? "HD" : "4K"}</span>
                        </td>
                        <td className="py-3 text-right">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10">
                            <Icon name="Pencil" size={12} className="mr-1" />
                            Изменить
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}