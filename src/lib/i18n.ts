// Central translation dictionary — Phase 1 of real UI translation (previously
// the Display tab's language picker only set <html lang>, see AppearanceStudio).
// Scope is intentionally bounded to the chrome that's visible on every page
// (Sidebar nav, Header) plus the Dashboard page and the Appearance Studio
// itself (including its Live Preview mockup). Extending coverage to the rest
// of the app is just adding more keys here and calling t() at the call site —
// no architecture change needed.
export type LanguageCode = "en" | "hi" | "ta" | "te" | "ml" | "fr" | "es" | "de" | "ja" | "zh" | "ar";

export type TranslationKey = keyof typeof TRANSLATIONS;

export const TRANSLATIONS = {
  // Sidebar navigation
  "nav.workspace": {
    en: "Workspace", hi: "कार्यक्षेत्र", ta: "பணியிடம்", te: "కార్యస్థలం", ml: "വർക്ക്‌സ്‌പേസ്",
    fr: "Espace de travail", es: "Espacio de trabajo", de: "Arbeitsbereich", ja: "ワークスペース", zh: "工作区", ar: "مساحة العمل",
  },
  "nav.platform": {
    en: "Platform", hi: "प्लेटफ़ॉर्म", ta: "தளம்", te: "ప్లాట్‌ఫారమ్", ml: "പ്ലാറ്റ്‌ഫോം",
    fr: "Plateforme", es: "Plataforma", de: "Plattform", ja: "プラットフォーム", zh: "平台", ar: "المنصة",
  },
  "nav.dashboard": {
    en: "Dashboard", hi: "डैशबोर्ड", ta: "டாஷ்போர்டு", te: "డాష్‌బోర్డ్", ml: "ഡാഷ്‌ബോർഡ്",
    fr: "Tableau de bord", es: "Panel de control", de: "Dashboard", ja: "ダッシュボード", zh: "仪表板", ar: "لوحة التحكم",
  },
  "nav.products": {
    en: "Products", hi: "उत्पाद", ta: "தயாரிப்புகள்", te: "ఉత్పత్తులు", ml: "ഉൽപ്പന്നങ്ങൾ",
    fr: "Produits", es: "Productos", de: "Produkte", ja: "製品", zh: "产品", ar: "المنتجات",
  },
  "nav.ruleBuilder": {
    en: "Rule Builder", hi: "नियम निर्माता", ta: "விதி உருவாக்கி", te: "నియమ నిర్మాత", ml: "റൂൾ ബിൽഡർ",
    fr: "Générateur de règles", es: "Generador de reglas", de: "Regelersteller", ja: "ルールビルダー", zh: "规则构建器", ar: "منشئ القواعد",
  },
  "nav.ruleRepository": {
    en: "Rule Repository", hi: "नियम भंडार", ta: "விதி களஞ்சியம்", te: "నియమ రిపోజిటరీ", ml: "റൂൾ റെപ്പോസിറ്ററി",
    fr: "Référentiel de règles", es: "Repositorio de reglas", de: "Regel-Repository", ja: "ルールリポジトリ", zh: "规则库", ar: "مستودع القواعد",
  },
  "nav.decisionMatrix": {
    en: "Decision Matrix", hi: "निर्णय मैट्रिक्स", ta: "முடிவு அணி", te: "నిర్ణయ మాత్రిక", ml: "ഡിസിഷൻ മാട്രിക്സ്",
    fr: "Matrice de décision", es: "Matriz de decisión", de: "Entscheidungsmatrix", ja: "決定マトリクス", zh: "决策矩阵", ar: "مصفوفة القرار",
  },
  "nav.ruleSimulator": {
    en: "Rule Simulator", hi: "नियम सिम्युलेटर", ta: "விதி உருவகப்படுத்தி", te: "నియమ సిమ్యులేటర్", ml: "റൂൾ സിമുലേറ്റർ",
    fr: "Simulateur de règles", es: "Simulador de reglas", de: "Regelsimulator", ja: "ルールシミュレーター", zh: "规则模拟器", ar: "محاكي القواعد",
  },
  "nav.auditLog": {
    en: "Audit Log", hi: "ऑडिट लॉग", ta: "தணிக்கை பதிவு", te: "ఆడిట్ లాగ్", ml: "ഓഡിറ്റ് ലോഗ്",
    fr: "Journal d'audit", es: "Registro de auditoría", de: "Prüfprotokoll", ja: "監査ログ", zh: "审计日志", ar: "سجل التدقيق",
  },
  "nav.metadataExplorer": {
    en: "Metadata Explorer", hi: "मेटाडेटा एक्सप्लोरर", ta: "மேலான்தரவு ஆய்வி", te: "మెటాడేటా ఎక్స్‌ప్లోరర్", ml: "മെറ്റാഡാറ്റ എക്സ്പ്ലോറർ",
    fr: "Explorateur de métadonnées", es: "Explorador de metadatos", de: "Metadaten-Explorer", ja: "メタデータエクスプローラー", zh: "元数据浏览器", ar: "مستكشف البيانات الوصفية",
  },
  "nav.configStudio": {
    en: "Configuration Studio", hi: "कॉन्फ़िगरेशन स्टूडियो", ta: "கட்டமைப்பு ஸ்டூடியோ", te: "కాన్ఫిగరేషన్ స్టూడియో", ml: "കോൺഫിഗറേഷൻ സ്റ്റുഡിയോ",
    fr: "Studio de configuration", es: "Estudio de configuración", de: "Konfigurationsstudio", ja: "コンフィグレーションスタジオ", zh: "配置工作室", ar: "استوديو التكوين",
  },

  // Header
  "header.searchPlaceholder": {
    en: "Search rules, modules...", hi: "नियम, मॉड्यूल खोजें...", ta: "விதிகள், தொகுதிகளைத் தேடு...", te: "నియమాలు, మాడ్యూల్స్ శోధించండి...", ml: "റൂളുകൾ, മൊഡ്യൂളുകൾ തിരയുക...",
    fr: "Rechercher règles, modules...", es: "Buscar reglas, módulos...", de: "Regeln, Module suchen...", ja: "ルール、モジュールを検索...", zh: "搜索规则、模块…", ar: "ابحث عن القواعد والوحدات...",
  },
  "header.createRule": {
    en: "Create Rule", hi: "नियम बनाएं", ta: "விதியை உருவாக்கு", te: "నియమాన్ని సృష్టించండి", ml: "റൂൾ സൃഷ്ടിക്കുക",
    fr: "Créer une règle", es: "Crear regla", de: "Regel erstellen", ja: "ルールを作成", zh: "创建规则", ar: "إنشاء قاعدة",
  },

  // Dashboard page chrome
  "dashboard.title": {
    en: "Dashboard", hi: "डैशबोर्ड", ta: "டாஷ்போர்டு", te: "డాష్‌బోర్డ్", ml: "ഡാഷ്‌ബോർഡ്",
    fr: "Tableau de bord", es: "Panel de control", de: "Dashboard", ja: "ダッシュボード", zh: "仪表板", ar: "لوحة التحكم",
  },
  "dashboard.subtitle": {
    en: "Central workspace for the Business Rules Engine", hi: "बिज़नेस रूल्स इंजन के लिए केंद्रीय कार्यक्षेत्र", ta: "பிசினஸ் ரூல்ஸ் இன்ஜினுக்கான மைய பணியிடம்", te: "బిజినెస్ రూల్స్ ఇంజిన్ కోసం కేంద్ర కార్యస్థలం", ml: "ബിസിനസ് റൂൾസ് എഞ്ചിനുള്ള കേന്ദ്ര വർക്ക്‌സ്‌പേസ്",
    fr: "Espace de travail central pour le moteur de règles métier", es: "Espacio de trabajo central para el motor de reglas de negocio", de: "Zentraler Arbeitsbereich für die Business-Rules-Engine", ja: "ビジネスルールエンジンの中央ワークスペース", zh: "业务规则引擎的中心工作区", ar: "مساحة العمل المركزية لمحرك قواعد الأعمال",
  },
  "dashboard.export": {
    en: "Export", hi: "एक्सपोर्ट", ta: "ஏற்றுமதி", te: "ఎగుమతి", ml: "എക്‌സ്‌പോർട്ട്",
    fr: "Exporter", es: "Exportar", de: "Exportieren", ja: "エクスポート", zh: "导出", ar: "تصدير",
  },
  "dashboard.products": {
    en: "Products", hi: "उत्पाद", ta: "தயாரிப்புகள்", te: "ఉత్పత్తులు", ml: "ഉൽപ്പന്നങ്ങൾ",
    fr: "Produits", es: "Productos", de: "Produkte", ja: "製品", zh: "产品", ar: "المنتجات",
  },
  "dashboard.viewAll": {
    en: "View all", hi: "सभी देखें", ta: "அனைத்தையும் காண்க", te: "అన్నీ చూడండి", ml: "എല്ലാം കാണുക",
    fr: "Tout voir", es: "Ver todo", de: "Alle anzeigen", ja: "すべて表示", zh: "查看全部", ar: "عرض الكل",
  },

  // KPI cards
  "kpi.totalRules": {
    en: "Total Rules", hi: "कुल नियम", ta: "மொத்த விதிகள்", te: "మొత్తం నియమాలు", ml: "മൊത്തം റൂളുകൾ",
    fr: "Total des règles", es: "Total de reglas", de: "Regeln gesamt", ja: "総ルール数", zh: "规则总数", ar: "إجمالي القواعد",
  },
  "kpi.activeRules": {
    en: "Published Rules", hi: "प्रकाशित नियम", ta: "வெளியிடப்பட்ட விதிகள்", te: "ప్రచురించిన నియమాలు", ml: "പ്രസിദ്ധീകരിച്ച റൂളുകൾ",
    fr: "Règles actives", es: "Reglas activas", de: "Aktive Regeln", ja: "アクティブなルール", zh: "活跃规则", ar: "القواعد النشطة",
  },
  "kpi.draftRules": {
    en: "Draft Rules", hi: "प्रारूप नियम", ta: "வரைவு விதிகள்", te: "డ్రాఫ్ట్ నియమాలు", ml: "ഡ്രാഫ്റ്റ് റൂളുകൾ",
    fr: "Règles en brouillon", es: "Reglas en borrador", de: "Entwurfsregeln", ja: "下書きルール", zh: "草稿规则", ar: "قواعد المسودة",
  },
  "kpi.pendingReview": {
    en: "Pending Approval", hi: "अनुमोदन लंबित", ta: "ஒப்புதல் நிலுவையில்", te: "ఆమోదం పెండింగ్‌లో ఉంది", ml: "അംഗീകാരം തീർപ്പുകൽപ്പിക്കാത്തത്",
    fr: "Révision en attente", es: "Revisión pendiente", de: "Prüfung ausstehend", ja: "レビュー待ち", zh: "待审核", ar: "قيد المراجعة",
  },
  "kpi.pendingApprovals": {
    en: "Pending Approvals", hi: "लंबित अनुमोदन", ta: "நிலுவையிலுள்ள ஒப்புதல்கள்", te: "పెండింగ్ ఆమోదాలు", ml: "തീർപ്പുകൽപ്പിക്കാത്ത അംഗീകാരങ്ങൾ",
    fr: "Approbations en attente", es: "Aprobaciones pendientes", de: "Ausstehende Genehmigungen", ja: "承認待ち", zh: "待批准", ar: "الموافقات المعلقة",
  },
  "kpi.ruleConflicts": {
    en: "Rule Conflicts", hi: "नियम टकराव", ta: "விதி முரண்பாடுகள்", te: "నియమ వైరుధ్యాలు", ml: "റൂൾ വൈരുദ്ധ്യങ്ങൾ",
    fr: "Conflits de règles", es: "Conflictos de reglas", de: "Regelkonflikte", ja: "ルールの競合", zh: "规则冲突", ar: "تعارضات القواعد",
  },
  "kpi.activeProducts": {
    en: "Active Products", hi: "परिनियोजन", ta: "வரிசைப்படுத்தல்கள்", te: "డిప్లాయ్‌మెంట్‌లు", ml: "ഡിപ്ലോയ്‌മെന്റുകൾ",
    fr: "Déploiements", es: "Implementaciones", de: "Bereitstellungen", ja: "デプロイ", zh: "部署", ar: "عمليات النشر",
  },
  "kpi.ruleExecutions": {
    en: "Rule Executions", hi: "नियम निष्पादन", ta: "விதி இயக்கங்கள்", te: "నియమ అమలులు", ml: "റൂൾ എക്സിക്യൂഷനുകൾ",
    fr: "Exécutions de règles", es: "Ejecuciones de reglas", de: "Regelausführungen", ja: "ルール実行", zh: "规则执行", ar: "عمليات تنفيذ القواعد",
  },
  "kpi.failedSimulations": {
    en: "Failed Simulations", hi: "विफल सिमुलेशन", ta: "தோல்வியடைந்த உருவகப்படுத்தல்கள்", te: "విఫలమైన సిమ్యులేషన్‌లు", ml: "പരാജയപ്പെട്ട സിമുലേഷനുകൾ",
    fr: "Simulations échouées", es: "Simulaciones fallidas", de: "Fehlgeschlagene Simulationen", ja: "失敗したシミュレーション", zh: "失败的模拟", ar: "المحاكاة الفاشلة",
  },
  "kpi.businessCategories": {
    en: "Business Categories", hi: "व्यावसायिक श्रेणियाँ", ta: "வணிக வகைகள்", te: "వ్యాపార వర్గాలు", ml: "ബിസിനസ് വിഭാഗങ്ങൾ",
    fr: "Catégories métier", es: "Categorías de negocio", de: "Geschäftskategorien", ja: "ビジネスカテゴリ", zh: "业务类别", ar: "فئات الأعمال",
  },
  "kpi.systemUsers": {
    en: "System Users", hi: "सिस्टम उपयोगकर्ता", ta: "கணினி பயனர்கள்", te: "సిస్టమ్ వినియోగదారులు", ml: "സിസ്റ്റം ഉപയോക്താക്കൾ",
    fr: "Utilisateurs système", es: "Usuarios del sistema", de: "Systembenutzer", ja: "システムユーザー", zh: "系统用户", ar: "مستخدمو النظام",
  },

  // Appearance Studio chrome
  "appearance.title": {
    en: "Appearance Studio", hi: "अपीयरेंस स्टूडियो", ta: "தோற்ற ஸ்டூடியோ", te: "అపియరెన్స్ స్టూడియో", ml: "അപ്പിയറൻസ് സ്റ്റുഡിയോ",
    fr: "Studio d'apparence", es: "Estudio de apariencia", de: "Erscheinungsbild-Studio", ja: "外観スタジオ", zh: "外观工作室", ar: "استوديو المظهر",
  },
  "appearance.livePreviewBadge": {
    en: "Live Preview", hi: "लाइव पूर्वावलोकन", ta: "நேரடி முன்னோட்டம்", te: "లైవ్ ప్రివ్యూ", ml: "തത്സമയ പ്രിവ്യൂ",
    fr: "Aperçu en direct", es: "Vista previa en vivo", de: "Live-Vorschau", ja: "ライブプレビュー", zh: "实时预览", ar: "معاينة مباشرة",
  },
  "appearance.tabTheme": {
    en: "Theme", hi: "थीम", ta: "தீம்", te: "థీమ్", ml: "തീം",
    fr: "Thème", es: "Tema", de: "Design", ja: "テーマ", zh: "主题", ar: "السمة",
  },
  "appearance.tabColors": {
    en: "Colors", hi: "रंग", ta: "நிறங்கள்", te: "రంగులు", ml: "നിറങ്ങൾ",
    fr: "Couleurs", es: "Colores", de: "Farben", ja: "カラー", zh: "颜色", ar: "الألوان",
  },
  "appearance.tabBg": {
    en: "BG", hi: "बैकग्राउंड", ta: "பின்னணி", te: "నేపథ్యం", ml: "പശ്ചാത്തലം",
    fr: "Fond", es: "Fondo", de: "Hintergrund", ja: "背景", zh: "背景", ar: "الخلفية",
  },
  "appearance.tabDisplay": {
    en: "Display", hi: "डिस्प्ले", ta: "காட்சி", te: "ప్రదర్శన", ml: "ഡിസ്‌പ്ലേ",
    fr: "Affichage", es: "Pantalla", de: "Anzeige", ja: "表示", zh: "显示", ar: "العرض",
  },
  "appearance.tabBranding": {
    en: "Branding", hi: "ब्रांडिंग", ta: "பிராண்டிங்", te: "బ్రాండింగ్", ml: "ബ്രാൻഡിംഗ്",
    fr: "Image de marque", es: "Marca", de: "Branding", ja: "ブランディング", zh: "品牌", ar: "العلامة التجارية",
  },
  "appearance.livePreviewHeading": {
    en: "Live Preview", hi: "लाइव पूर्वावलोकन", ta: "நேரடி முன்னோட்டம்", te: "లైవ్ ప్రివ్యూ", ml: "തത്സമയ പ്രിവ്യൂ",
    fr: "Aperçu en direct", es: "Vista previa en vivo", de: "Live-Vorschau", ja: "ライブプレビュー", zh: "实时预览", ar: "معاينة مباشرة",
  },
  "appearance.changesApplyInstantly": {
    en: "Changes apply instantly", hi: "बदलाव तुरंत लागू होते हैं", ta: "மாற்றங்கள் உடனடியாகப் பயன்படுத்தப்படும்", te: "మార్పులు తక్షణమే వర్తిస్తాయి", ml: "മാറ്റങ്ങൾ ഉടനടി പ്രാബല്യത്തിൽ വരും",
    fr: "Les modifications s'appliquent instantanément", es: "Los cambios se aplican al instante", de: "Änderungen werden sofort übernommen", ja: "変更は即座に適用されます", zh: "更改立即生效", ar: "يتم تطبيق التغييرات فورًا",
  },
  "appearance.previewDashboardTab": {
    en: "Dashboard", hi: "डैशबोर्ड", ta: "டாஷ்போர்டு", te: "డాష్‌బోర్డ్", ml: "ഡാഷ്‌ബോർഡ്",
    fr: "Tableau de bord", es: "Panel de control", de: "Dashboard", ja: "ダッシュボード", zh: "仪表板", ar: "لوحة التحكم",
  },
  "appearance.previewSignInTab": {
    en: "Sign-in Page", hi: "साइन-इन पेज", ta: "உள்நுழைவு பக்கம்", te: "సైన్-ఇన్ పేజీ", ml: "സൈൻ-ഇൻ പേജ്",
    fr: "Page de connexion", es: "Página de inicio de sesión", de: "Anmeldeseite", ja: "サインインページ", zh: "登录页面", ar: "صفحة تسجيل الدخول",
  },

  // Live Preview mockup content (fake dashboard shown inside Appearance Studio)
  "mockup.revenue": {
    en: "Revenue", hi: "राजस्व", ta: "வருவாய்", te: "ఆదాయం", ml: "വരുമാനം",
    fr: "Revenu", es: "Ingresos", de: "Umsatz", ja: "収益", zh: "收入", ar: "الإيرادات",
  },
  "mockup.sessions": {
    en: "Sessions", hi: "सत्र", ta: "அமர்வுகள்", te: "సెషన్‌లు", ml: "സെഷനുകൾ",
    fr: "Sessions", es: "Sesiones", de: "Sitzungen", ja: "セッション", zh: "会话", ar: "الجلسات",
  },
  "mockup.payables": {
    en: "Payables", hi: "देय राशि", ta: "செலுத்த வேண்டியவை", te: "చెల్లించవలసినవి", ml: "കൊടുക്കാനുള്ളവ",
    fr: "Comptes fournisseurs", es: "Cuentas por pagar", de: "Verbindlichkeiten", ja: "未払金", zh: "应付款", ar: "الذمم الدائنة",
  },
  "mockup.billingTrend": {
    en: "Billing Trend", hi: "बिलिंग रुझान", ta: "பில்லிங் போக்கு", te: "బిల్లింగ్ ధోరణి", ml: "ബില്ലിംഗ് ട്രെൻഡ്",
    fr: "Tendance de facturation", es: "Tendencia de facturación", de: "Abrechnungstrend", ja: "請求トレンド", zh: "账单趋势", ar: "اتجاه الفوترة",
  },
  "mockup.engagements": {
    en: "Engagements", hi: "एंगेजमेंट", ta: "ஈடுபாடுகள்", te: "ఎంగేజ్‌మెంట్‌లు", ml: "എൻഗേജ്‌മെന്റുകൾ",
    fr: "Engagements", es: "Compromisos", de: "Engagements", ja: "エンゲージメント", zh: "业务往来", ar: "المشاركات",
  },
  "mockup.newEngagement": {
    en: "New Engagement", hi: "नया एंगेजमेंट", ta: "புதிய ஈடுபாடு", te: "కొత్త ఎంగేజ్‌మెంట్", ml: "പുതിയ എൻഗേജ്‌മെന്റ്",
    fr: "Nouvel engagement", es: "Nuevo compromiso", de: "Neues Engagement", ja: "新規エンゲージメント", zh: "新建业务", ar: "مشاركة جديدة",
  },
  "mockup.exportCsv": {
    en: "Export CSV", hi: "CSV एक्सपोर्ट करें", ta: "CSV ஏற்றுமதி", te: "CSV ఎగుమతి", ml: "CSV എക്‌സ്‌പോർട്ട്",
    fr: "Exporter CSV", es: "Exportar CSV", de: "CSV exportieren", ja: "CSVエクスポート", zh: "导出CSV", ar: "تصدير CSV",
  },
  "mockup.smartInsightPrefix": {
    en: "Smart Insight:", hi: "स्मार्ट इनसाइट:", ta: "ஸ்மார்ட் இன்சைட்:", te: "స్మార్ట్ ఇన్‌సైట్:", ml: "സ്മാർട്ട് ഇൻസൈറ്റ്:",
    fr: "Analyse intelligente :", es: "Perspectiva inteligente:", de: "Smart Insight:", ja: "スマートインサイト：", zh: "智能洞察：", ar: "رؤية ذكية:",
  },
  "mockup.smartInsightBody": {
    en: "2 high-risk engagements need attention", hi: "2 उच्च-जोखिम एंगेजमेंट पर ध्यान देने की आवश्यकता है", ta: "2 அதிக ஆபத்துள்ள ஈடுபாடுகளுக்கு கவனம் தேவை", te: "2 అధిక-ప్రమాద ఎంగేజ్‌మెంట్‌లకు దృష్టి అవసరం", ml: "2 ഉയർന്ന അപകടസാധ്യതയുള്ള എൻഗേജ്‌മെന്റുകൾക്ക് ശ്രദ്ധ ആവശ്യമാണ്",
    fr: "2 engagements à haut risque nécessitent une attention", es: "2 compromisos de alto riesgo requieren atención", de: "2 risikoreiche Engagements benötigen Aufmerksamkeit", ja: "2件の高リスク案件に対応が必要です", zh: "2 项高风险业务需要关注", ar: "هناك مشاركتان عاليتا الخطورة تحتاجان إلى اهتمام",
  },
} as const satisfies Record<string, Record<LanguageCode, string>>;

export function translate(key: TranslationKey, language: LanguageCode): string {
  return TRANSLATIONS[key][language] ?? TRANSLATIONS[key].en;
}
