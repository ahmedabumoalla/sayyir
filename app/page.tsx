"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tajawal } from "next/font/google";
import { supabase } from "@/lib/supabaseClient"; 
import DynamicShowcase from "@/components/DynamicShowcase"; 
import { 
  Briefcase, Map as MapIcon, Sparkles, Tent, Coffee, Landmark, 
  User, LayoutDashboard, Eye, Target, Phone, Mail, 
  Instagram, Twitter, Linkedin, PlayCircle, Compass, ArrowRight, Activity, Clock, MapPin
} from "lucide-react";
import Link from "next/link";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
});

export default function HomePage() {
  const router = useRouter();
  
  const [userSession, setUserSession] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [dashboardLink, setDashboardLink] = useState("/client/dashboard");

  const [landmarksData, setLandmarksData] = useState<any[]>([]);
  const [facilitiesData, setFacilitiesData] = useState<any[]>([]);
  const [experiencesData, setExperiencesData] = useState<any[]>([]);
  
  const [platformInfo, setPlatformInfo] = useState<any>(null);

  const text = "اكتشف جمال الماضي وعِش تجربة سياحية مميزة";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    const speed = deleting ? 45 : 90;
    const timeout = setTimeout(() => {
      if (!deleting && index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        setIndex(index + 1);
      } else if (deleting && index > 0) {
        setDisplayedText(text.slice(0, index - 1));
        setIndex(index - 1);
      } else if (!deleting && index === text.length) {
        setTimeout(() => setDeleting(true), 2200);
      } else if (deleting && index === 0) {
        setDeleting(false);
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [index, deleting]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserSession(session);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, is_admin, is_super_admin, is_provider')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setUserName(profile.full_name);
          if (profile.is_super_admin || profile.is_admin) setDashboardLink("/admin/dashboard");
          else if (profile.is_provider) setDashboardLink("/provider/dashboard");
          else setDashboardLink("/client/dashboard");
        }
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching Homepage Data...");

      // 1. المعالم
      const { data: places } = await supabase.from('places').select('*').eq('is_active', true).limit(6);
      if (places) setLandmarksData(places);

      // 2. المرافق
      const { data: facilities } = await supabase.from('services').select('*').in('service_type', ['accommodation', 'food']).eq('status', 'approved').limit(6);
      if (facilities) setFacilitiesData(facilities);

      // 3. التجارب (بنفس منطق صفحة التجارب)
      const { data: experiences } = await supabase
        .from('services')
        .select('*')
        .eq('service_type', 'experience')
        .eq('status', 'approved')
        .limit(6);

      if (experiences) {
        // نستخدم نفس المنطق الموجود في صفحة التجارب لجلب الصورة أو الفيديو الصحيح
        const formattedExperiences = experiences.map((item: any) => ({
            ...item,
            // الأولوية للصورة في image_url، ثم أول عنصر في menu_items (لأن بعضها يخزن الفيديو هناك)، ثم صورة افتراضية
            image: item.image_url 
                ? item.image_url 
                : (item.details?.images && item.details.images.length > 0 ? item.details.images[0] : 
                   (item.menu_items && item.menu_items.length > 0 ? item.menu_items[0].image : 
                   "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?q=80&w=800&auto=format&fit=crop")),
            activity_type: item.activity_type || 'تجربة مميزة',
            source: 'service'
        }));
        setExperiencesData(formattedExperiences);
      }

      // 4. إعدادات المنصة
      const { data: info } = await supabase.from('platform_settings').select('*').single();
      if (info) setPlatformInfo(info);
    };
    fetchData();
  }, []);

  return (
    <main className={`relative min-h-screen ${tajawal.className} bg-black text-white`} dir="rtl">
      {/* HEADER SECTION */}
      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent transition-all duration-300">
        <div className="w-28 md:w-32 hover:scale-105 transition duration-300">
          <Link href="/">
              <Image src="/logo.png" alt="Sayyir" width={120} height={50} priority className="drop-shadow-lg" />
          </Link>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {userSession ? (
            <div className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-md px-3 md:px-5 py-2 rounded-full border border-white/10 shadow-lg">
              <div className="w-8 h-8 rounded-full bg-[#C89B3C] flex items-center justify-center text-[#2B1F17] font-bold shadow-md">
                <User size={16} />
              </div>
              <div className="hidden md:block text-xs md:text-sm">
                <span className="text-white/60 block text-[10px]">مرحباً،</span>
                <span className="font-bold text-white">{userName || "العميل"}</span>
              </div>
              <div className="w-px h-5 bg-white/20 mx-1 md:mx-2"></div>
              <Link href={dashboardLink} className="flex items-center gap-2 text-xs md:text-sm hover:text-[#C89B3C] transition font-bold">
                <LayoutDashboard size={16} />
                <span className="hidden md:inline">لوحتي</span>
              </Link>
            </div>
          ) : (
            <Link href="/login" className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#C89B3C] transition flex items-center gap-2 shadow-lg">
              <User size={16} />
              <span>دخول</span>
            </Link>
          )}

          <Link href="/ai-guide" className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-[#C89B3C] to-[#dcb45e] flex items-center justify-center shadow-lg animate-pulse hover:animate-none hover:scale-110 transition border border-[#C89B3C]/50" title="المرشد الذكي">
              <Sparkles size={20} className="text-[#2B1F17]" />
          </Link>
        </div>
      </header>

      {/* ✅ استرجاع فيديو الخلفية الأصلي (hero.mp4) */}
      <video className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none" src="/hero.mp4" autoPlay muted loop playsInline />
      <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

      <div className="relative z-10">
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center pt-24 md:pt-32">
          
          <div className="mb-6 animate-in fade-in zoom-in duration-1000 md:hidden">
            <Image src="/logo.png" alt="Sayyir AI" width={180} height={60} priority />
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight min-h-[4rem] tracking-wide mb-4 max-w-4xl drop-shadow-2xl">
            {displayedText}<span className="animate-pulse text-[#C89B3C]">|</span>
          </h1>
          <p className="mt-4 text-base md:text-xl text-white/80 max-w-2xl font-light">
            دليلك الذكي لاستكشاف المعالم، حجز التجارب، والعثور على أفضل أماكن الإقامة في عسير.
          </p>

          <div className="mt-12 mb-20 relative z-20 flex flex-col md:flex-row gap-4 w-full max-w-3xl justify-center px-4">
            <button onClick={() => router.push("/map")} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 text-white font-bold shadow-lg transition-all hover:-translate-y-1 hover:bg-white/10 hover:border-[#C89B3C]/50 group">
              <MapIcon size={20} className="group-hover:text-[#C89B3C] transition" /> استكشف الخريطة
            </button>
             <button onClick={() => router.push("/ai-guide")} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl backdrop-blur-md bg-gradient-to-r from-[#C89B3C] to-[#b38a35] text-[#2B1F17] font-bold shadow-lg shadow-[#C89B3C]/20 transition-all hover:-translate-y-1 hover:shadow-[#C89B3C]/40 group">
              <Sparkles size={20} className="group-hover:rotate-12 transition" /> المرشد الذكي
            </button>
            <button onClick={() => router.push("/register/provider")} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl backdrop-blur-md bg-[#C89B3C]/10 border border-[#C89B3C]/40 text-[#C89B3C] font-bold shadow-lg transition-all hover:-translate-y-1 hover:bg-[#C89B3C] hover:text-[#2B1F17] group">
              <Briefcase size={20} className="group-hover:scale-110 transition" /> انضم كشريك
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl pb-20 px-4">
            <Link href="/landmarks" className="block h-full"><GlassCard title="المعالم السياحية والتراثية" desc="جولة عبر التاريخ والطبيعة في أبرز معالم المنطقة" icon={<Landmark size={32} className="text-[#C89B3C]" />} /></Link>
            <Link href="/facilities" className="block h-full"><GlassCard title="المرافق والخدمات" desc="نزل تراثية، مطاعم شعبية، ومقاهي ريفية" icon={<Coffee size={32} className="text-blue-400" />} /></Link>
            <Link href="/experiences" className="block h-full"><GlassCard title="التجارب السياحية" desc="هايكنج، تخييم، وورش عمل تراثية مع أهل المنطقة" icon={<Tent size={32} className="text-emerald-400" />} /></Link>
          </div>
        </section>

        {/* Dynamic Data Sections */}
        <div className="bg-gradient-to-t from-black via-[#0a0a0a] to-transparent py-10 space-y-24">
          
          {/* المعالم */}
          {landmarksData.length > 0 && (
              <div className="container mx-auto px-4">
                <DynamicShowcase title="أبرز المعالم المختارة" linkHref="/landmarks" data={landmarksData} dataType="places" />
              </div>
          )}

          {/* المرافق */}
          {facilitiesData.length > 0 && (
              <div className="container mx-auto px-4">
                <DynamicShowcase title="أرقى المرافق والخدمات" linkHref="/facilities" data={facilitiesData} dataType="services" />
              </div>
          )}

          {/* التجارب (عرض مباشر للكروت لدعم الفيديو) */}
          {experiencesData.length > 0 && (
              <div className="container mx-auto px-4">
                {/* ✅ تعديل العنوان لليمين والزر لليسار */}
                <div className="flex flex-row items-center justify-between mb-8 w-full">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-8 bg-[#C89B3C] rounded-full inline-block"></span>
                        تجارب سياحية لا تُنسى
                    </h2>
                    <Link href="/experiences" className="text-[#C89B3C] hover:text-white transition flex items-center gap-2 text-sm font-bold">
                        عرض الكل <ArrowRight size={16} className="rotate-180" /> 
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {experiencesData.map((exp) => (
                        <ExperienceCard key={exp.id} data={exp} />
                    ))}
                </div>
              </div>
          )}
        </div>

        {/* Footer & Info Section ... (يبقى كما هو) */}
        {platformInfo && (
          <div className="relative bg-black py-20 px-4 border-t border-white/5">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-[#C89B3C] mb-4">عن منصة سَيّر</h2>
                  <p className="text-white/60 max-w-2xl mx-auto">{platformInfo.about_us || "منصة سياحية متكاملة لاكتشاف منطقة عسير..."}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition duration-500 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-[#C89B3C]/10 rounded-full blur-2xl -translate-x-10 -translate-y-10 group-hover:bg-[#C89B3C]/20 transition"></div>
                  <Eye className="text-[#C89B3C] mb-4" size={40} />
                  <h3 className="text-2xl font-bold text-white mb-3">رؤيتنا</h3>
                  <p className="text-white/70 leading-relaxed">{platformInfo.vision || "أن نكون الخيار الأول للسائح في عسير..."}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition duration-500 relative overflow-hidden group">
                   <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -translate-x-10 -translate-y-10 group-hover:bg-blue-500/20 transition"></div>
                  <Target className="text-blue-400 mb-4" size={40} />
                  <h3 className="text-2xl font-bold text-white mb-3">رسالتنا</h3>
                  <p className="text-white/70 leading-relaxed">{platformInfo.mission || "تسهيل تجربة السائح وربطه بأفضل الخدمات..."}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="bg-[#050505] border-t border-white/10 pt-16 pb-8 px-4 text-center md:text-right">
             {/* Footer Content ... Same as before */}
             <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-start gap-10">
                <div className="flex-1">
                  <Image src="/logo.png" alt="Sayyir" width={140} height={60} className="mb-6 opacity-90 mx-auto md:mx-0" />
                  <p className="text-white/50 text-sm leading-7 max-w-xs mx-auto md:mx-0">
                    منصة "سَير" هي رفيقك الرقمي لاستكشاف جمال عسير، نقدم لك أفضل المعالم والتجارب بأحدث التقنيات.
                  </p>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-lg mb-6">روابط سريعة</h4>
                  <ul className="space-y-3 text-white/60 text-sm">
                    <li><Link href="/map" className="hover:text-[#C89B3C] transition">الخريطة التفاعلية</Link></li>
                    <li><Link href="/ai-guide" className="hover:text-[#C89B3C] transition">المرشد الذكي (جـاد)</Link></li>
                    <li><Link href="/register/provider" className="hover:text-[#C89B3C] transition">انضم كشريك خدمة</Link></li>
                    <li><Link href="/login" className="hover:text-[#C89B3C] transition">تسجيل الدخول</Link></li>
                  </ul>
                </div>
                <div className="flex-1">
                   <h4 className="text-white font-bold text-lg mb-6">تواصل معنا</h4>
                   <ul className="space-y-4 text-white/60 text-sm flex flex-col items-center md:items-start">
                     {platformInfo?.whatsapp && (
                        <li className="flex items-center gap-3 hover:text-[#C89B3C] transition cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Phone size={16}/></div>
                          <span dir="ltr">{platformInfo.whatsapp}</span>
                        </li>
                     )}
                     {platformInfo?.email && (
                        <li className="flex items-center gap-3 hover:text-[#C89B3C] transition cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><Mail size={16}/></div>
                          <span>{platformInfo.email}</span>
                        </li>
                     )}
                     <div className="flex gap-4 mt-4 justify-center md:justify-start">
                        {platformInfo?.twitter && <a href={platformInfo.twitter} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-[#C89B3C] hover:bg-white/10 transition"><Twitter size={18} /></a>}
                        {platformInfo?.instagram && <a href={platformInfo.instagram} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-[#C89B3C] hover:bg-white/10 transition"><Instagram size={18} /></a>}
                        {platformInfo?.linkedin && <a href={platformInfo.linkedin} target="_blank" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-[#C89B3C] hover:bg-white/10 transition"><Linkedin size={18} /></a>}
                     </div>
                   </ul>
                </div>
             </div>
             <div className="border-t border-white/5 mt-12 pt-8 text-center text-white/30 text-xs">© 2026 منصة سَير. جميع الحقوق محفوظة.</div>
        </footer>
      </div>
    </main>
  );
}

// دالة فحص الفيديو
const isVideo = (url: string | null) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.ogg') || lowerUrl.includes('video'); 
};

// مكون كرت التجربة (مع دعم الفيديو)
function ExperienceCard({ data }: { data: any }) {
  const linkHref = `/service/${data.id}`;
  const mediaIsVideo = isVideo(data.image);

  return (
    <div className="group relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[#C89B3C]/10 hover:border-[#C89B3C]/30 flex flex-col h-full">
      <div className="relative h-64 w-full overflow-hidden shrink-0 bg-black">
        {mediaIsVideo ? (
            <video 
                src={data.image} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                autoPlay 
                muted 
                loop 
                playsInline 
            />
        ) : (
            <img 
              src={data.image} 
              alt={data.title} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = "/logo.png"; 
                e.currentTarget.className = "w-full h-full object-contain p-10 opacity-50 bg-[#1a1a1a]"; 
              }}
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        
        {data.price > 0 && (
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-[#C89B3C]/50 px-4 py-2 rounded-xl z-10">
            <span className="text-[#C89B3C] font-bold text-lg">
                {data.price} ﷼ <span className="text-xs text-white/60 font-normal">/ للشخص</span>
            </span>
            </div>
        )}
        
        <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 border border-white/10 z-10">
            {mediaIsVideo ? <PlayCircle size={12} className="text-[#C89B3C]"/> : <Compass size={12} />} 
            {data.activity_type}
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
            <h3 className="text-2xl font-bold group-hover:text-[#C89B3C] transition line-clamp-1">{data.title}</h3>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4 text-xs text-white/50 bg-white/5 p-3 rounded-xl border border-white/5">
            {data.duration && (
                <div className="flex items-center gap-1"><Clock size={14} className="text-[#C89B3C]"/> {data.duration}</div>
            )}
            {data.difficulty_level && (
                <div className="flex items-center gap-1">
                    <Activity size={14} className="text-[#C89B3C]"/> 
                    {data.difficulty_level === 'easy' ? 'سهل' : data.difficulty_level === 'medium' ? 'متوسط' : data.difficulty_level === 'hard' ? 'صعب' : data.difficulty_level}
                </div>
            )}
            {data.meeting_point && (
                <div className="flex items-center gap-1 line-clamp-1"><MapPin size={14} className="text-[#C89B3C]"/> {data.meeting_point}</div>
            )}
        </div>

        <p className="text-white/60 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">
            {data.description}
        </p>
        
        <Link href={linkHref} className="w-full block mt-auto">
            <button className="w-full py-3 rounded-xl bg-[#C89B3C] text-black font-bold hover:bg-[#b38a35] transition-all flex items-center justify-center gap-2">
                احجز تجربتك <ArrowRight size={18} className="rotate-180"/>
            </button>
        </Link>
      </div>
    </div>
  );
}

function GlassCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="h-full group backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 text-white transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:border-[#C89B3C]/50 hover:shadow-2xl hover:shadow-[#C89B3C]/10 cursor-pointer flex flex-col items-center text-center">
      <div className="mb-6 p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition duration-500 group-hover:scale-110 shadow-inner">{icon}</div>
      <h3 className="text-xl md:text-2xl font-bold mb-3 group-hover:text-[#C89B3C] transition">{title}</h3>
      <p className="text-sm text-white/70 leading-relaxed group-hover:text-white/90 transition">{desc}</p>
    </div>
  );
}