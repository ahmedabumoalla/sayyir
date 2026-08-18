export const LANDMARK_SORT_ORDER = [
  "قرية النصب التراثية",
  "قلعة شمسان",
  "قرية رجال المع",
  "قرية آل ينفع",
  "قرية الزهراء التراثية",
  "قلعة شعار",
  "قلاع الدقل",
  "قرية العكاس",
  "حصون وادي عيّا",
  "قرية المفتاحة التاريخية",
  "قرية آل عليان التراثية",
  "قرية طبب التاريخية",
  "قرية العرش التراثية",
  "قرية غيه",
  "قرية قنتب التراثية",
  "القرية التراثية بالقرية",
  "متحف فاطمة للقط العسيري",
  "مزرعة الشيخ مازن بن غانم للبن السعودي",
  "مزرعة التوت الأسود",
  "قرية بن حمسان التراثية",
  "قصور آل مشيط",
  "قرية الصالحية التراثية",
  "مزرعة أعناب",
  "قصر مالك التاريخي",
  "مزرعة آل عثمان للورد الطائفي",
  "قصر آل عبيد التراثي",
  "قرية الجو بباحة ربيعة",
  "قرية زينة",
  "ممر السعادة ببني غنمي",
  "مزرعة الليوان",
  "قرية درامة",
  "قرية آل خلف",
  "قصر الرميح التراثي",
  "مزرعة الشعبة السياحية",
  "قصور أبو سراح التاريخية",
  "مزرعة السحاب للفراولة",
  "جرش",
  "قصر المقر",
  "القصر التراثي بآل قزع",
  "بسطة القابل",
  "قصور العسابلة",
  "قرية المسقي التراثية",
  "عين الذيبة",
  "جامع قرية بني وهب القديم",
  "سوق الجمعة",
  "سوق الثلاثاء",
  "شلال المحتطبة",
  "جامع السقا",
  "جامع المسقي",
  "جامع طبب",
  "سوق محايل الشعبي",
  "سوق ربوع العجمة الشعبي",
  "سوق ربوع آل يزيد الشعبي",
  "قصر ثربان",
  "متحف لجوان التراثي",
];

type PlaceLike = { id?: string; name?: string; created_at?: string };

const normalizeValue = (value?: string) =>
  (value || "").trim().toLowerCase().replace(/\s+/g, " ");

const landmarkOrderMap = new Map(
  LANDMARK_SORT_ORDER.map((name, index) => [normalizeValue(name), index])
);

export const getLandmarkSortIndex = (place: PlaceLike): number =>
  landmarkOrderMap.get(normalizeValue(place?.name)) ?? Number.MAX_SAFE_INTEGER;

export const sortPlacesByLandmarkSheet = <T extends PlaceLike>(places: T[]): T[] => {
  return [...places].sort((a, b) => {
    const indexA = getLandmarkSortIndex(a);
    const indexB = getLandmarkSortIndex(b);

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    if (a.created_at && b.created_at) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });
};
