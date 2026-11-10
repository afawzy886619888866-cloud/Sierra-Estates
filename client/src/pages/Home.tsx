import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Filter,
  Landmark,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type RoleId = "all" | "sales" | "admin" | "closer" | "teamleader";

type Role = {
  id: Exclude<RoleId, "all">;
  number: string;
  eyebrow: string;
  title: string;
  short: string;
  commission: string;
  accent: string;
  icon: typeof Users;
  points: string[];
};

const roles: Role[] = [
  {
    id: "sales",
    number: "01",
    eyebrow: "REAL ESTATE SALES",
    title: "مستشار عقاري - سيلز",
    short: "حوّل احتياجات العملاء إلى قرارات شراء، وابنِ علاقات تدوم بعد الحجز.",
    commission: "10% — 25% / زيادة 2.5%",
    accent: "زيادة 2.5% عند كل نقطة",
    icon: Users,
    points: ["إدارة المحادثات والاستفسارات", "ترشيح الوحدات المناسبة", "متابعة العميل حتى الحجز"],
  },
  {
    id: "admin",
    number: "02",
    eyebrow: "OPERATIONS & ADMIN",
    title: "أدمن",
    short: "نظّم تدفق البيانات والمتابعة اليومية لتظل كل فرصة وكل عميل في مكانه الصحيح.",
    commission: "حوافز أداء + زيادة 2.5%",
    accent: "نمو ثابت مع كل نقطة",
    icon: Building2,
    points: ["تحديث ومراجعة بيانات الوحدات", "تنسيق المتابعة بين الفريق", "إعداد تقارير التشغيل اليومية"],
  },
  {
    id: "closer",
    number: "03",
    eyebrow: "CLOSING & FIELD SALES",
    title: "مغلق صفقات - Closer",
    short: "كن عين العميل على الأرض، وقدّم تجربة معاينة تقود إلى حجز واثق وإغلاق احترافي.",
    commission: "15% — 30% / زيادة 2.5%",
    accent: "زيادة 2.5% عند كل نقطة",
    icon: Landmark,
    points: ["تنسيق وتنفيذ المعاينات", "إدارة الاعتراضات باحتراف", "إغلاق الصفقة وتوثيق الحجز"],
  },
  {
    id: "teamleader",
    number: "04",
    eyebrow: "LEADERSHIP & GROWTH",
    title: "Team Leaders",
    short: "قد فريقاً من المستشارين، ارفع جودة المتابعة، ودرّب الفريق على تحويل الفرص إلى حجوزات قابلة للقياس.",
    commission: "حتى 60% إجمالي كوميشن للسيلز",
    accent: "تقسيم نسبي عادل",
    icon: Users,
    points: ["توجيه ومتابعة أداء الفريق", "توزيع الفرص بعدالة ووضوح", "رفع نسب التحويل وتحقيق المستهدف"],
  },
];

const filters: { id: RoleId; label: string }[] = [
  { id: "all", label: "كل الوظائف" },
  { id: "sales", label: "مستشار عقاري - سيلز" },
  { id: "admin", label: "أدمن" },
  { id: "closer", label: "مغلق صفقات - Closer" },
  { id: "teamleader", label: "Team Leaders" },
];

const roleQuestions: Record<Exclude<RoleId, "all">, { label: string; options?: string[]; textarea?: boolean }> = {
  sales: {
    label: "عميل ميزانيته 4 مليون ويبحث عن تسليم فوري، بينما أقرب وحدة 5.2 مليون. ما تصرفك الأول؟",
    options: ["أعيد جدولة أولوياته وأقترح تقسيطاً أو بديلاً قريباً يناسب ميزانيته.", "أبلغه بعدم وجود طلبه وأنهي المكالمة.", "أطلب منه زيادة الميزانية فوراً."],
  },
  admin: {
    label: "كيف تضمن أن بيانات وحدة جديدة وصلت من بروكر صحيحة وجاهزة للعرض؟",
    options: ["أراجع المصدر والمستندات الأساسية وأتأكد من السعر والتفاصيل قبل إدراجها.", "أدرجها فوراً دون مراجعة.", "أنتظر حتى يسأل عنها العميل."],
  },
  closer: {
    label: "ما السؤال الأهم الذي تطرحه قبل خروج العميل من الوحدة لتعرف مدى جديته في الحجز؟",
    textarea: true,
  },
  teamleader: {
    label: "كيف تتصرف إذا كان أحد أعضاء الفريق يحقق حجوزات جيدة لكن متابعته للعملاء غير منتظمة؟",
    textarea: true,
  },
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RoleId>("all");
  const [selectedRole, setSelectedRole] = useState<Exclude<RoleId, "all">>("sales");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const visibleRoles = useMemo(
    () => (activeFilter === "all" ? roles : roles.filter((role) => role.id === activeFilter)),
    [activeFilter],
  );

  // Keep the form resilient to stale hot-reload or browser state from removed role IDs.
  const safeSelectedRole = roleQuestions[selectedRole] ? selectedRole : "sales";
  const selectedQuestion = roleQuestions[safeSelectedRole];
  const selectedRoleTitle = roles.find((role) => role.id === safeSelectedRole)?.title ?? roles[0].title;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const chooseRole = (id: Exclude<RoleId, "all">) => {
    setSelectedRole(id);
    scrollTo("apply");
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError("");
    setFileName("");
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("يرجى اختيار ملف PDF فقط.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("حجم الملف يجب ألا يتجاوز 5 ميجابايت.");
      event.target.value = "";
      return;
    }
    setFileName(file.name);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (fileError) return;
    setSubmitted(true);
    toast.success("تم استلام طلبك بنجاح", { description: "سيتواصل معك فريق سييرا قريباً." });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-hidden bg-[#f7f4ee] text-[#102c52]">
      <header className="sticky top-0 z-50 border-b border-[#102c52]/10 bg-[#f7f4ee]/95 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between">
          <button onClick={() => scrollTo("top")} className="flex items-center gap-3" aria-label="العودة إلى الأعلى">
            <span className="brand-mark">S</span>
            <span className="text-lg font-black tracking-tight">SIERRA <span className="font-normal text-[#a7773c]">ESTATES</span></span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-bold text-[#102c52]/70 md:flex">
            <button onClick={() => scrollTo("roles")} className="hover:text-[#a7773c]">الفرص المتاحة</button>
            <button onClick={() => scrollTo("commissions")} className="hover:text-[#a7773c]">نظام العمولات</button>
            <button onClick={() => scrollTo("apply")} className="hover:text-[#a7773c]">قدّم الآن</button>
          </nav>
          <Button onClick={() => scrollTo("apply")} className="hidden rounded-sm bg-[#a7773c] px-6 font-bold text-white hover:bg-[#8e612d] md:inline-flex">ابدأ التقديم <ArrowLeft className="mr-2 h-4 w-4" /></Button>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t border-[#102c52]/10 bg-[#f7f4ee] px-6 py-5 md:hidden"><div className="flex flex-col gap-5 text-right font-bold"><button onClick={() => scrollTo("roles")}>الفرص المتاحة</button><button onClick={() => scrollTo("commissions")}>نظام العمولات</button><button onClick={() => scrollTo("apply")}>قدّم الآن</button></div></div>}
      </header>

      <main id="top">
        <section className="hero-sierra relative">
          <div className="hero-grid" />
          <div className="container relative grid min-h-[650px] items-center gap-12 py-20 lg:grid-cols-[1.1fr_.9fr]">
            <div className="max-w-3xl">
              <div className="mb-7 flex items-center gap-3 text-xs font-black tracking-[.18em] text-[#c29351]"><span className="h-px w-12 bg-[#c29351]" /> SIERRA ESTATES / CAREERS</div>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.12] tracking-tight text-white sm:text-7xl">أكثر من مجرد وسيط<br /><span className="gold-gradient">انضم إلى فريق سييرا</span></h1>
              <p className="mt-8 max-w-2xl text-lg leading-9 text-white/70">نحن نبني فريقاً يعرف أن العقار ليس مساحة فقط، بل ثقة وقرار ومستقبل. اختر مسارك، واصنع أثرك في سوق يتحرك بسرعة.</p>
              <div className="mt-10 flex flex-wrap gap-4"><Button onClick={() => scrollTo("apply")} className="h-14 rounded-sm bg-[#b88340] px-8 text-base font-black text-white shadow-[0_12px_35px_rgba(184,131,64,.28)] hover:bg-[#d19c58]">تقديم سريع <ArrowLeft className="mr-2 h-5 w-5" /></Button><button onClick={() => scrollTo("roles")} className="flex items-center gap-2 px-5 text-sm font-bold text-white/80 hover:text-white">استكشف الوظائف <ArrowLeft className="h-4 w-4" /></button></div>
              <div className="mt-14 flex flex-wrap gap-8 text-sm text-white/55"><span className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-[#c29351]" /> عمولات تصاعدية</span><span className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#c29351]" /> نمو حقيقي</span><span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#c29351]" /> فريق موثوق</span></div>
            </div>
            <div className="relative hidden min-h-[430px] lg:block"><div className="absolute right-10 top-4 h-72 w-72 rounded-full border border-[#c29351]/35" /><div className="absolute bottom-2 left-4 h-72 w-72 rounded-full border border-[#c29351]/15" /><div className="sierra-stamp absolute right-20 top-20">S</div><div className="absolute bottom-8 left-10 w-72 border border-[#c29351]/40 bg-[#173961]/75 p-7 backdrop-blur-sm"><div className="mb-12 text-xs font-black tracking-[.25em] text-[#c29351]">CAREER NOTE / 2026</div><p className="text-3xl font-black leading-tight text-white">كل حجز<br /><span className="text-[#c29351]">يصنع فرقاً.</span></p><div className="mt-10 flex items-center justify-between text-xs text-white/50"><span>القاهرة · مصر</span><span>01 — 03</span></div></div></div>
          </div>
        </section>

        <section id="roles" className="container scroll-mt-24 py-24"><div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-black tracking-[.16em] text-[#a7773c]">الفرص المتاحة</p><h2 className="text-4xl font-black tracking-tight sm:text-5xl">اختر المسار الذي يشبهك</h2><p className="mt-4 max-w-2xl leading-8 text-[#102c52]/65">أربعة أدوار، هدف واحد: أن نكون الشريك العقاري الأكثر ثقة وتأثيراً.</p></div><div className="flex items-center gap-2 text-sm font-bold text-[#102c52]/50"><Filter className="h-4 w-4" /> تصفية الوظائف</div></div><div className="mb-9 flex flex-wrap gap-2">{filters.map((filter) => <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${activeFilter === filter.id ? "border-[#102c52] bg-[#102c52] text-white" : "border-[#102c52]/15 bg-white/45 text-[#102c52]/65 hover:border-[#a7773c] hover:text-[#a7773c]"}`}>{filter.label}</button>)}</div><div className="grid gap-5 lg:grid-cols-4">{visibleRoles.map((role) => <RoleCard key={role.id} role={role} onChoose={chooseRole} />)}</div></section>

        <section id="commissions" className="scroll-mt-24 bg-[#102c52] py-24 text-white"><div className="container"><div className="mb-12 max-w-2xl"><p className="mb-3 text-sm font-black tracking-[.16em] text-[#c29351]">نظام العمولات</p><h2 className="text-4xl font-black tracking-tight sm:text-5xl">كل حجز يرفع سقفك</h2><p className="mt-5 leading-8 text-white/65">نظام واضح ومتصاعد يكافئ الاستمرارية، جودة المتابعة، والقدرة على تحويل الفرصة إلى صفقة ناجحة.</p></div><div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><div className="overflow-hidden border border-white/12 bg-white/[.04]"><div className="grid grid-cols-[1.1fr_.8fr_.8fr] border-b border-white/10 bg-white/[.06] px-6 py-4 text-sm font-black text-[#c29351]"><span>الشريحة</span><span>عدد الحجوزات</span><span>نسبة العمولة</span></div>{[["النقطة 1","بداية المسار","10%"],["النقطة 2","تقدم ثابت","12.5%"],["النقطة 3","أداء متقدم","15%"],["النقطة 4","مستوى مميز","17.5%"],["النقطة 5","أعلى شريحة","20%"],["النقطة 6+","قمة الأداء","22.5% — 25%"]].map(([point, level, rate]) => <div key={point} className="grid grid-cols-[.7fr_1.1fr_.8fr] items-center border-b border-white/10 px-6 py-5 last:border-0"><span className="text-sm font-bold text-[#d7aa6b]">{point}</span><span className="font-bold">{level}</span><span className="font-black text-[#d7aa6b]">{rate}</span></div>)}</div><div className="border border-[#c29351]/35 bg-[#c29351]/10 p-8"><CircleDollarSign className="mb-8 h-10 w-10 text-[#c29351]" /><p className="text-4xl font-black text-[#d7aa6b]">60%</p><h3 className="mt-3 text-xl font-black">قاعدة الحد الأقصى للسيلز</h3><p className="mt-4 text-sm leading-8 text-white/65">إذا وصل 3 أفراد إلى أعلى نسبة، لا يتجاوز إجمالي الكوميشن المخصوم للسيلز 60%. تُقسّم النسبة بينهم تناسبياً وفق مساهمة كل شخص.</p></div></div></div></section>

        <section id="apply" className="container scroll-mt-24 py-24"><div className="grid gap-14 lg:grid-cols-[.72fr_1.28fr]"><aside><p className="mb-3 text-sm font-black tracking-[.16em] text-[#a7773c]">التقديم</p><h2 className="text-4xl font-black leading-tight sm:text-5xl">أخبرنا كيف<br /><span className="text-[#a7773c]">ستضيف القيمة.</span></h2><p className="mt-6 leading-8 text-[#102c52]/65">املأ البيانات الأساسية، أرفق سيرتك الذاتية، ودعنا نبدأ محادثة عن المسار الأنسب لك.</p><div className="mt-10 space-y-5 text-sm font-bold text-[#102c52]/70"><div className="flex gap-3"><Check className="h-5 w-5 text-[#a7773c]" /> مراجعة بشرية لكل طلب</div><div className="flex gap-3"><Check className="h-5 w-5 text-[#a7773c]" /> تواصل سريع مع المرشحين المناسبين</div><div className="flex gap-3"><Check className="h-5 w-5 text-[#a7773c]" /> PDF حتى 5 ميجابايت</div></div></aside><div className="border border-[#102c52]/12 bg-white/55 p-6 shadow-[0_20px_60px_rgba(16,44,82,.06)] sm:p-10">{submitted ? <SuccessState onReset={() => setSubmitted(false)} /> : <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2"><Field label="الاسم الكامل" placeholder="اكتب اسمك بالكامل" required /><Field label="رقم الواتساب" placeholder="01xxxxxxxxx" type="tel" required /><Field label="المحافظة / المنطقة" placeholder="مثال: القاهرة الجديدة" required /><label><span className="mb-2 block text-sm font-black">الدور الوظيفي <span className="text-[#a7773c]">*</span></span><div className="relative"><select required value={safeSelectedRole} onChange={(e) => setSelectedRole(e.target.value as Exclude<RoleId, "all">)} className="h-12 w-full appearance-none border border-[#102c52]/15 bg-[#f7f4ee] px-4 pl-10 outline-none focus:border-[#a7773c]"><option value="sales">مستشار مبيعات وتواصل عقاري</option><option value="closer">مسؤول معاينات وإغلاق صفقات</option><option value="sourcing">مسؤول جلب وتغذية وحدات</option></select><ChevronDown className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[#a7773c]" /></div></label><label><span className="mb-2 block text-sm font-black">سنوات الخبرة العقارية</span><select className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]"><option>بدون خبرة سابقة — شغف وتفرغ للتعلم</option><option>أقل من سنة</option><option>من سنة إلى 3 سنوات</option><option>أكثر من 3 سنوات</option></select></label><label><span className="mb-2 block text-sm font-black">وسيلة الانتقال للعمل الميداني</span><select className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]"><option>سيارة خاصة</option><option>دراجة نارية</option><option>مواصلات عامة وتطبيقات نقل</option></select></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-black">رابط لينكدإن / فيسبوك <span className="font-normal text-[#102c52]/40">(اختياري)</span></span><input type="url" placeholder="https://" className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]" /></label><div className="sm:col-span-2"><span className="mb-2 block text-sm font-black">السيرة الذاتية <span className="text-[#a7773c]">PDF فقط · حتى 5MB</span></span><input ref={fileInputRef} onChange={handleFile} type="file" accept="application/pdf,.pdf" className="hidden" /><button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-20 w-full items-center justify-between border border-dashed border-[#a7773c]/55 bg-[#a7773c]/5 px-5 text-right hover:bg-[#a7773c]/10"><span className="flex items-center gap-3">{fileName ? <FileText className="h-6 w-6 text-[#a7773c]" /> : <UploadCloud className="h-6 w-6 text-[#a7773c]" />}<span><strong className="block text-sm">{fileName || "اضغط لاختيار ملف السيرة الذاتية"}</strong><small className="text-xs text-[#102c52]/45">{fileName ? "تم اختيار الملف بنجاح" : "PDF — الحد الأقصى 5 ميجابايت"}</small></span></span><ArrowUpLeft className="h-5 w-5 text-[#a7773c]" /></button>{fileError && <p className="mt-2 text-sm font-bold text-red-700">{fileError}</p>}</div><div className="sm:col-span-2"><label className="mb-2 block text-sm font-black">سؤال سريع لمسار {selectedRoleTitle}</label>{selectedQuestion.options ? <select className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]"><option value="">اختر إجابتك</option>{selectedQuestion.options?.map((option) => <option key={option}>{option}</option>)}</select> : <><p className="mb-2 text-xs leading-6 text-[#102c52]/55">{selectedQuestion.label}</p><textarea rows={3} required placeholder="اكتب إجابتك في سطرين" className="w-full resize-none border border-[#102c52]/15 bg-[#f7f4ee] px-4 py-3 outline-none focus:border-[#a7773c]" /></>}</div><label className="sm:col-span-2"><span className="mb-2 block text-sm font-black">ما مدى جاهزيتك للعمل بنظام العمولات التصاعدية؟</span><select required className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]"><option value="">اختر إجابتك</option><option>مستعد تماماً لتحقيق دخل مرتبط بعدد الحجوزات</option><option>أفضل مزيجاً بين نسبة ثابتة وعمولة</option><option>أفضل راتباً ثابتاً بالكامل</option></select></label><Button type="submit" className="h-14 rounded-sm bg-[#102c52] text-base font-black text-white hover:bg-[#a7773c] sm:col-span-2">إرسال طلب التقديم <ArrowLeft className="mr-2 h-5 w-5" /></Button></form>}</div></div></section>
      </main>
      <footer className="border-t border-[#102c52]/10 bg-[#102c52] text-white"><div className="container flex flex-col items-start justify-between gap-4 py-8 text-sm text-white/55 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="brand-mark small">S</span><span>SIERRA ESTATES — أكثر من مجرد وسيط.</span></div><span>© ٢٠٢٦ سييرا للعقارات والاستشارات</span></div></footer>
    </div>
  );
}

function RoleCard({ role, onChoose }: { role: Role; onChoose: (id: Exclude<RoleId, "all">) => void }) {
  const Icon = role.icon;
  return <article className="role-card group"><div className="flex items-start justify-between"><span className="text-5xl font-black text-[#102c52]/10">{role.number}</span><span className="flex h-12 w-12 items-center justify-center border border-[#a7773c]/30 text-[#a7773c]"><Icon className="h-6 w-6" /></span></div><p className="mt-10 text-[11px] font-black tracking-[.12em] text-[#a7773c]">{role.eyebrow}</p><h3 className="mt-3 min-h-16 text-2xl font-black leading-tight">{role.title}</h3><p className="mt-4 min-h-16 text-sm leading-7 text-[#102c52]/62">{role.short}</p><div className="mt-7 border-y border-[#102c52]/10 py-4"><span className="text-xs text-[#102c52]/50">العمولة / البونص</span><strong className="mt-1 block text-lg font-black text-[#a7773c]">{role.commission}</strong></div><ul className="mt-5 space-y-3 text-sm text-[#102c52]/70">{role.points.map((point) => <li key={point} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-[#a7773c]" />{point}</li>)}</ul><button onClick={() => onChoose(role.id)} className="mt-8 flex w-full items-center justify-between border border-[#102c52]/15 px-4 py-3 text-sm font-black transition group-hover:border-[#a7773c] group-hover:text-[#a7773c]">قدّم على هذا الدور <ArrowLeft className="h-4 w-4" /></button></article>;
}

function Field({ label, placeholder, type = "text", required = false }: { label: string; placeholder: string; type?: string; required?: boolean }) {
  return <label><span className="mb-2 block text-sm font-black">{label}{required && <span className="text-[#a7773c]"> *</span>}</span><input required={required} type={type} placeholder={placeholder} className="h-12 w-full border border-[#102c52]/15 bg-[#f7f4ee] px-4 outline-none focus:border-[#a7773c]" /></label>;
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return <div className="flex min-h-[500px] flex-col items-center justify-center text-center"><div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#a7773c]/12 text-[#a7773c]"><Check className="h-10 w-10" /></div><h3 className="text-3xl font-black">وصلنا طلبك بنجاح.</h3><p className="mt-4 max-w-md leading-8 text-[#102c52]/65">شكراً لاهتمامك بالانضمام إلى سييرا. سيقوم فريقنا بمراجعة بياناتك والتواصل معك قريباً.</p><button onClick={onReset} className="mt-8 text-sm font-black text-[#a7773c] underline underline-offset-4">إرسال طلب آخر</button></div>;
}
