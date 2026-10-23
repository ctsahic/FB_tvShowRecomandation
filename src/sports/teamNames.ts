/**
 * מפת ההמרה עברית ↔ אנגלית של הקבוצות.
 *
 * למה זה נחוץ: לוח השידורים מגיע בעברית ("אטאלנטה - ונציה"), והטבלאות של
 * הליגות הזרות מגיעות באנגלית ("Atalanta", "Venezia"). בלי מפה הזוג לא מתאים
 * ואף משחק לא מקבל מיקום בטבלה.
 *
 * הכלל: `en` הוא השם הרשמי כפי שהוא מופיע בטבלה (ESPN/api-football), ו-`he`
 * הוא השם שאנחנו מציגים. `aliases` מכיל את כל שאר האיותים — כולל הקיצורים
 * שהמדריך משתמש בהם ("ה. י-ם", "מ. חיפה").
 */

export interface TeamNames {
  /** השם בעברית — מה שמוצג למשתמש. */
  he: string
  /** השם הרשמי באנגלית — מה שמופיע בטבלה. */
  en: string
  /** איותים נוספים, בעברית ובאנגלית. */
  aliases?: readonly string[]
}

export const TEAM_NAMES: readonly TeamNames[] = [
  /* ------------------------------ ליגת העל ------------------------------ */
  { he: 'מכבי תל אביב', en: 'Maccabi Tel Aviv', aliases: ['מכבי ת״א', 'מכבי תא', 'Maccabi Tel-Aviv', 'Maccabi TLV'] },
  { he: 'הפועל באר שבע', en: "Hapoel Be'er Sheva", aliases: ['הפועל ב״ש', 'ה. ב״ש', "ה.ב''ש", 'באר שבע', "Hapoel Be'er", 'Hapoel Beer Sheva'] },
  { he: 'מכבי חיפה', en: 'Maccabi Haifa', aliases: ['חיפה', 'מ. חיפה', 'Maccabi Haifa FC'] },
  { he: 'בית״ר ירושלים', en: 'Beitar Jerusalem', aliases: ['בית״ר', 'בית״ר י-ם', 'ביתר ירושלים', 'Beitar'] },
  { he: 'מכבי נתניה', en: 'Maccabi Netanya', aliases: ['נתניה', 'מ. נתניה'] },
  { he: 'הפועל תל אביב', en: 'Hapoel Tel Aviv', aliases: ['הפועל ת״א', 'ה. ת״א', 'Hapoel Tel-Aviv'] },
  { he: 'הפועל חיפה', en: 'Hapoel Haifa', aliases: ['ה. חיפה'] },
  { he: 'מכבי פתח תקווה', en: 'Maccabi Petah Tikva', aliases: ['מכבי פ״ת', 'מ. פ״ת', 'Maccabi Petach Tikva'] },
  { he: 'בני סכנין', en: 'Bnei Sakhnin', aliases: ['סכנין', 'Bnei Saknin'] },
  { he: 'עירוני קריית שמונה', en: 'Ironi Kiryat Shmona', aliases: ['קריית שמונה', 'קרית שמונה', 'ה. ק״ש', 'Kiryat Shmona'] },
  { he: 'מ.ס. אשדוד', en: 'FC Ashdod', aliases: ['אשדוד', 'מ.ס אשדוד', 'Ashdod'] },
  { he: 'מכבי בני ריינה', en: 'Maccabi Bnei Reineh', aliases: ['בני ריינה', 'ריינה', 'Bnei Reineh'] },
  { he: 'הפועל חדרה', en: 'Hapoel Hadera', aliases: ['חדרה'] },
  { he: 'עירוני טבריה', en: 'Ironi Tiberias', aliases: ['טבריה'] },
  { he: 'הפועל ירושלים', en: 'Hapoel Jerusalem', aliases: ['ה. י-ם', 'הפועל י-ם'] },
  { he: 'מכבי ירושלים', en: 'Maccabi Jerusalem', aliases: ['מ. י-ם'] },
  { he: 'הפועל רמת גן', en: 'Hapoel Ramat Gan', aliases: ['ה. ר״ג', 'הפועל ר״ג', 'רמת גן'] },
  { he: 'הפועל פתח תקווה', en: 'Hapoel Petah Tikva', aliases: ['הפועל פ״ת'] },
  { he: 'הפועל ראשון לציון', en: 'Hapoel Rishon Lezion', aliases: ['הפועל ר״ל', 'ראשון לציון'] },
  { he: 'עירוני נוף הגליל', en: 'Ironi Nof Hagalil', aliases: ['נוף הגליל'] },
  { he: 'מכבי הרצליה', en: 'Maccabi Herzliya', aliases: ['הרצליה'] },
  { he: 'הפועל רעננה', en: 'Hapoel Raanana', aliases: ['רעננה'] },

  /* ------------------------------ איטליה ------------------------------ */
  { he: 'אינטר', en: 'Internazionale', aliases: ['אינטרנציונל', 'אינטר מילאנו', 'Inter', 'Inter Milan'] },
  { he: 'לאציו', en: 'Lazio', aliases: ['לאציו רומא'] },
  { he: 'רומא', en: 'AS Roma', aliases: ['רומא', 'Roma'] },
  { he: 'קליארי', en: 'Cagliari', aliases: ['קליארי'] },
  { he: 'מילאן', en: 'AC Milan', aliases: ['מילאנו', 'Milan', 'מילאן'] },
  { he: 'יובנטוס', en: 'Juventus', aliases: ['יובה', 'Juventus Turin'] },
  { he: 'קומו', en: 'Como', aliases: ['קומו 1907'] },
  { he: 'נאפולי', en: 'Napoli', aliases: ['נאפולי'] },
  { he: 'פרוזינונה', en: 'Frosinone', aliases: ['פרוזינונה'] },
  { he: 'ססואולו', en: 'Sassuolo', aliases: ['סאסואולו'] },
  { he: 'אטאלנטה', en: 'Atalanta', aliases: ['אטלנטה', 'Atalanta BC'] },
  { he: 'לצ׳ה', en: 'Lecce', aliases: ['לצ׳ה', "לצ'ה", 'US Lecce'] },
  { he: 'בולוניה', en: 'Bologna', aliases: ['בולוניה 1909'] },
  { he: 'אודינזה', en: 'Udinese', aliases: ['אודינזה'] },
  { he: 'טורינו', en: 'Torino', aliases: ['טורינו'] },
  { he: 'מונצה', en: 'Monza', aliases: ['מונצה'] },
  { he: 'גנואה', en: 'Genoa', aliases: ['גנואה'] },
  { he: 'פארמה', en: 'Parma', aliases: ['פארמה'] },
  { he: 'פיורנטינה', en: 'Fiorentina', aliases: ['פיורנטינה', 'פיורנצה'] },
  { he: 'ונציה', en: 'Venezia', aliases: ['ונציה', 'Venezia FC'] },

  /* ------------------------------ אנגליה ------------------------------ */
  { he: 'מנצ׳סטר סיטי', en: 'Manchester City', aliases: ['מנצ׳סטר סיטי', "מנצ'סטר סיטי", 'סיטי', 'מנ. סיטי', 'Man City'] },
  { he: 'ארסנל', en: 'Arsenal', aliases: ['ארסנל'] },
  { he: 'ברייטון', en: 'Brighton & Hove Albion', aliases: ['ברייטון אנד הוב אלביון', 'Brighton', 'Brighton and Hove Albion'] },
  { he: 'ברנטפורד', en: 'Brentford', aliases: ['ברנטפורד'] },
  { he: 'אברטון', en: 'Everton', aliases: ['אברטון'] },
  { he: 'צ׳לסי', en: 'Chelsea', aliases: ['צ׳לסי', "צ'לסי"] },
  { he: 'לידס', en: 'Leeds United', aliases: ['לידס יונייטד', 'Leeds'] },
  { he: 'האל סיטי', en: 'Hull City', aliases: ['האל', 'Hull'] },
  { he: 'ליברפול', en: 'Liverpool', aliases: ['ליברפול'] },
  { he: 'איפסוויץ׳', en: 'Ipswich Town', aliases: ['איפסוויץ׳', "איפסוויץ'", 'Ipswich'] },
  { he: 'ניוקאסל', en: 'Newcastle United', aliases: ['ניוקאסל יונייטד', 'Newcastle'] },
  { he: 'קריסטל פאלאס', en: 'Crystal Palace', aliases: ['פאלאס', 'Crystal Palace'] },
  { he: 'מנצ׳סטר יונייטד', en: 'Manchester United', aliases: ['מנצ׳סטר יונייטד', "מנצ'סטר יונייטד", 'Man United', 'Man Utd'] },
  { he: 'נוטינגהאם פורסט', en: 'Nottingham Forest', aliases: ['נוטינגהאם', 'Forest'] },
  { he: 'אסטון וילה', en: 'Aston Villa', aliases: ['וילה'] },
  { he: 'סנדרלנד', en: 'Sunderland', aliases: ['סנדרלנד'] },
  { he: 'בורנמות׳', en: 'AFC Bournemouth', aliases: ['בורנמות׳', "בורנמות'", 'Bournemouth'] },
  { he: 'טוטנהאם', en: 'Tottenham Hotspur', aliases: ['טוטנהאם', 'Spurs', 'Tottenham'] },
  { he: 'קובנטרי', en: 'Coventry City', aliases: ['קובנטרי סיטי', 'Coventry'] },
  { he: 'פולהאם', en: 'Fulham', aliases: ['פולהאם'] },
  { he: 'וסט האם', en: 'West Ham United', aliases: ['ווסטהאם', 'West Ham'] },
  { he: 'סוונסי', en: 'Swansea City', aliases: ['סוונסי סיטי', 'Swansea'] },
  { he: 'מידלסברו', en: 'Middlesbrough', aliases: ['מידלסברו'] },
  /* ---------------------- הצ׳מפיונשיפ (ליגת המשנה) ---------------------- */
  { he: 'סטוק סיטי', en: 'Stoke City', aliases: ['סטוק'] },
  { he: 'וולברהמפטון', en: 'Wolverhampton Wanderers', aliases: ['וולבס', 'Wolves', 'Wolverhampton'] },
  { he: 'בירמינגהאם', en: 'Birmingham City', aliases: ['ברמינגהם', 'Birmingham'] },
  { he: 'מילוול', en: 'Millwall', aliases: [] },
  { he: 'וסט ברומיץ׳', en: 'West Bromwich Albion', aliases: ['וסט ברומיץ׳ אלביון', 'West Brom'] },
  { he: 'בריסטול סיטי', en: 'Bristol City', aliases: ['בריסטול'] },
  { he: 'סאות׳המפטון', en: 'Southampton', aliases: ['סאותהמפטון'] },
  { he: 'צ׳רלטון אתלטיק', en: 'Charlton Athletic', aliases: ['צ׳רלטון'] },
  { he: 'בלקברן רוברס', en: 'Blackburn Rovers', aliases: ['בלקברן'] },
  { he: 'שפילד יונייטד', en: 'Sheffield United', aliases: ['שפילד'] },
  { he: 'רקסהאם', en: 'Wrexham', aliases: [] },
  { he: 'לינקולן סיטי', en: 'Lincoln City', aliases: ['לינקולן'] },
  { he: 'בולטון', en: 'Bolton Wanderers', aliases: ['בולטון וונדררס'] },
  { he: 'נוריץ׳ סיטי', en: 'Norwich City', aliases: ['נוריץ׳', 'Norwich'] },
  { he: 'פורטסמות׳', en: 'Portsmouth', aliases: ['פורטסמאות׳'] },
  { he: 'ווטפורד', en: 'Watford', aliases: [] },
  { he: 'קארדיף סיטי', en: 'Cardiff City', aliases: ['קארדיף'] },
  { he: 'ברנלי', en: 'Burnley', aliases: [] },
  { he: 'דרבי קאונטי', en: 'Derby County', aliases: ['דרבי'] },
  { he: 'פרסטון', en: 'Preston North End', aliases: ['פרסטון נורת׳ אנד'] },

  /* ------------------------------ ספרד ------------------------------ */
  { he: 'ברצלונה', en: 'Barcelona', aliases: ['בארסה', 'Barca', 'FC Barcelona'] },
  // הקיצורים של המדריך ("את. מדריד", "ר. בטיס") — בלעדיהם הכרטיס של משחק
  // ספרדי היה מציג "אין נתוני טבלה" למרות שהטבלה נטענה.
  { he: 'אתלטיקו מדריד', en: 'Atlético Madrid', aliases: ['אתלטיקו', 'את. מדריד', 'אתלטיקו מדריד', 'Atletico Madrid', 'Atletico de Madrid', 'Athletic Madrid'] },
  { he: 'ריאל בטיס', en: 'Real Betis', aliases: ['בטיס', 'ר. בטיס', 'Betis'] },
  { he: 'ריאל מדריד', en: 'Real Madrid', aliases: ['ריאל', 'ר. מדריד', 'Real'] },
  { he: 'סביליה', en: 'Sevilla', aliases: ['סביליה'] },
  { he: 'ריאל סוסיאדד', en: 'Real Sociedad', aliases: ['סוסיאדד'] },
  { he: 'אלאבס', en: 'Alavés', aliases: ['אלאבס', 'Alaves', 'Deportivo Alaves'] },
  { he: 'דפורטיבו לה קורוניה', en: 'Deportivo', aliases: ['דפורטיבו', 'Deportivo La Coruna', 'Deportivo de La Coruña'] },
  { he: 'סלטה ויגו', en: 'Celta Vigo', aliases: ['סלטה', 'Celta de Vigo'] },
  { he: 'אתלטיק בילבאו', en: 'Athletic Club', aliases: ['אתלטיק בילבאו', 'את. בילבאו', 'בילבאו', 'Athletic Bilbao'] },
  { he: 'ויאריאל', en: 'Villarreal', aliases: ['ויאריאל'] },
  { he: 'אספניול', en: 'Espanyol', aliases: ['אספניול'] },
  { he: 'ראיו ואיקאנו', en: 'Rayo Vallecano', aliases: ['ראיו', 'Rayo'] },
  { he: 'חטאפה', en: 'Getafe', aliases: ['חטאפה', 'גטאפה'] },
  { he: 'ראסינג סנטנדר', en: 'Racing Santander', aliases: ['ראסינג', 'Racing'] },
  { he: 'אוססונה', en: 'Osasuna', aliases: ['אוססונה'] },
  { he: 'אלצ׳ה', en: 'Elche', aliases: ['אלצ׳ה', "אלצ'ה"] },
  { he: 'לבאנטה', en: 'Levante', aliases: ['לבאנטה'] },
  { he: 'ולנסיה', en: 'Valencia', aliases: ['ולנסיה'] },
  { he: 'מלגה', en: 'Málaga', aliases: ['מלאגה', 'Malaga'] },

  /* --------------------- הליגה הספרדית השנייה --------------------- */
  // 22 הקבוצות של הסגונדה (ESPN, עונת 2026/27). ההשוואה מול ה-EPG היא על
  // השם העברי, ולכן בלי השורות האלה טבלת הליגה השנייה הייתה מוצגת באנגלית.
  { he: 'אלמריה', en: 'Almería', aliases: ['אלמריה', 'Almeria'] },
  { he: 'אייבר', en: 'Eibar', aliases: ['אייבר', 'SD Eibar'] },
  { he: 'קסטיון', en: 'Castellón', aliases: ['קסטיון', 'Castellon'] },
  { he: 'מיורקה', en: 'Mallorca', aliases: ['מיורקה', 'מאיורקה', 'RCD Mallorca'] },
  { he: 'סבדל', en: 'CD Sabadell', aliases: ['סבדל', 'Sabadell'] },
  { he: 'ספורטינג חיחון', en: 'Sporting Gijón', aliases: ['חיחון', 'Gijon', 'Sporting Gijon'] },
  { he: 'ז׳ירונה', en: 'Girona', aliases: ['ג׳ירונה', 'ז׳ירונה', 'Girona FC'] },
  { he: 'בורגוס', en: 'Burgos', aliases: ['בורגוס', 'Burgos CF'] },
  { he: 'ריאל אוביידו', en: 'Real Oviedo', aliases: ['אוביידו', 'Oviedo'] },
  { he: 'גרנדה', en: 'Granada', aliases: ['גרנדה', 'Granada CF'] },
  { he: 'ריאל ויאדוליד', en: 'Real Valladolid', aliases: ['ויאדוליד', 'Valladolid'] },
  { he: 'טנריף', en: 'Tenerife', aliases: ['טנריף', 'CD Tenerife'] },
  { he: 'קורדובה', en: 'Córdoba', aliases: ['קורדובה', 'Cordoba'] },
  { he: 'סלטה פורטונה', en: 'RC Celta Fortuna', aliases: ['פורטונה', 'Celta Fortuna'] },
  { he: 'אלדנסה', en: 'Eldense', aliases: ['אלדנסה', 'CD Eldense'] },
  { he: 'לאס פאלמס', en: 'Las Palmas', aliases: ['לאס פלמס', 'UD Las Palmas'] },
  { he: 'לגנס', en: 'Leganés', aliases: ['לגנס', 'Leganes'] },
  { he: 'אנדורה', en: 'FC Andorra', aliases: ['אנדורה', 'Andorra'] },
  { he: 'ריאל סוסיאדד בי', en: 'Real Sociedad II', aliases: ['סוסיאדד בי', 'Real Sociedad B'] },
  { he: 'קאדיס', en: 'Cádiz', aliases: ['קאדיס', 'Cadiz'] },
  { he: 'סאוטה', en: 'Ceuta', aliases: ['סאוטה', 'AD Ceuta'] },
  { he: 'אלבסטה', en: 'Albacete', aliases: ['אלבסטה', 'Albacete Balompie'] },

  /* ------------------------------ גרמניה ------------------------------ */
  { he: 'פרייבורג', en: 'SC Freiburg', aliases: ['פרייבורג', 'Freiburg'] },
  { he: 'בורוסיה דורטמונד', en: 'Borussia Dortmund', aliases: ['דורטמונד', 'Dortmund', 'BVB'] },
  { he: 'באיירן מינכן', en: 'Bayern Munich', aliases: ['באיירן', 'Bayern München', 'Bayern'] },
  { he: 'באייר לברקוזן', en: 'Bayer Leverkusen', aliases: ['לברקוזן', 'Leverkusen'] },
  { he: 'ר.ב. לייפציג', en: 'RB Leipzig', aliases: ['לייפציג', 'Leipzig'] },
  { he: 'אאוגסבורג', en: 'FC Augsburg', aliases: ['אוגסבורג', 'Augsburg'] },
  { he: 'ורדר ברמן', en: 'Werder Bremen', aliases: ['ברמן', 'Werder'] },
  { he: 'מיינץ', en: 'Mainz', aliases: ['מיינץ 05', 'Mainz 05'] },
  { he: 'אלוורסברג', en: 'SV Elversberg', aliases: ['אלוורסברג', 'Elversberg'] },
  { he: 'קלן', en: 'FC Cologne', aliases: ['קולון', 'Cologne', '1. FC Köln', 'Koln'] },
  { he: 'שטוטגרט', en: 'VfB Stuttgart', aliases: ['שטוטגרט', 'Stuttgart'] },
  { he: 'המבורג', en: 'Hamburg SV', aliases: ['המבורג', 'Hamburger SV', 'HSV'] },
  { he: 'שאלקה 04', en: 'Schalke 04', aliases: ['שאלקה', 'Schalke'] },
  { he: 'איינטרכט פרנקפורט', en: 'Eintracht Frankfurt', aliases: ['פרנקפורט', 'Frankfurt', 'Eintracht'] },
  { he: 'פטרבורן', en: 'SC Paderborn 07', aliases: ['פטרבורן', 'Paderborn'] },
  { he: 'אוניון ברלין', en: '1. FC Union Berlin', aliases: ['אוניון ברלין', 'Union Berlin', 'ברלין אוניון'] },
  { he: 'הופנהיים', en: 'TSG Hoffenheim', aliases: ['הופנהיים', 'Hoffenheim'] },
  { he: 'בורוסיה מנשנגלדבאך', en: 'Borussia Mönchengladbach', aliases: ['מנשנגלדבאך', 'Gladbach', "Borussia M'gladbach"] },

  /* ---------------- גרמניה — הליגה השנייה (2. Bundesliga) ---------------- */
  /*
   * 18 הקבוצות של הליגה הגרמנית השנייה. בלעדיהן הטבלה שנשלפת מ-ESPN
   * מוצגת באנגלית ואין להתאים לה את השמות שהמדריך כותב בעברית
   * ("הולשטיין קיל - הרטה ברלין").
   */
  { he: 'הרטה ברלין', en: 'Hertha Berlin', aliases: ['הרטה', 'הרטה ב.ס.צ', 'Hertha BSC'] },
  { he: 'נירנברג', en: '1. FC Nürnberg', aliases: ['1. FC נירנברג', 'נירנברג 1. FC', 'FC נירנברג'] },
  { he: 'היידנהיים', en: '1. FC Heidenheim 1846', aliases: ['היידנהיים 1846', '1. FC היידנהיים'] },
  { he: 'מגדבורג', en: '1. FC Magdeburg', aliases: ['1. FC מגדבורג', 'מגדבורג 1. FC'] },
  { he: 'וולפסבורג', en: 'VfL Wolfsburg', aliases: ['VfL וולפסבורג'] },
  { he: 'קייזרסלאוטרן', en: 'Kaiserslautern', aliases: ['1. FC קייזרסלאוטרן', 'קייזרסלאוטרן 04'] },
  { he: 'סנט פאולי', en: 'St. Pauli', aliases: ['FC סנט פאולי', 'סנט פאולי 1910'] },
  { he: 'קוטבוס', en: 'Energie Cottbus', aliases: ['אנרגיה קוטבוס', 'FC קוטבוס'] },
  { he: 'בילפלד', en: 'Arminia Bielefeld', aliases: ['ארמיניה בילפלד'] },
  { he: 'אוסנבריק', en: 'VfL Osnabruck', aliases: ['אוסנברוק', 'VfL אוסנבריק'] },
  { he: 'בראונשווייג', en: 'TSV Eintracht Braunschweig', aliases: ['איינטרכט בראונשווייג', 'בראונשוויג'] },
  { he: 'בוכום', en: 'VfL Bochum', aliases: ['VfL בוכום', 'בוכום 1848'] },
  { he: 'הנובר', en: 'Hannover 96', aliases: ['הנובר 96', 'האנובר'] },
  { he: 'דרמשטאדט', en: 'SV Darmstadt 98', aliases: ['דרמשטאדט 98', 'דרמשטדט'] },
  { he: 'גרויטר פירת׳', en: 'SpVgg Greuther Fürth', aliases: ['פירת׳', 'גרויטר פירת'] },
  { he: 'דינמו דרזדן', en: 'Dynamo Dresden', aliases: ['דרזדן', 'דינמו דרזדן'] },
  { he: 'קרלסרוהה', en: 'Karlsruher SC', aliases: ['קארלסרוהה', 'קרלסרוהה SC'] },
  { he: 'הולשטיין קיל', en: 'Holstein Kiel', aliases: ['הולשטיין קיל KSV'] },

  /* ------------------------------ צרפת ------------------------------ */
  { he: 'מונאקו', en: 'AS Monaco', aliases: ['מונאקו', 'Monaco'] },
  { he: 'ליל', en: 'Lille', aliases: ['ליל', 'Lille OSC'] },
  { he: 'רן', en: 'Stade Rennais', aliases: ['רנה', 'Rennes', 'Stade Rennes'] },
  { he: 'ליון', en: 'Lyon', aliases: ['אולימפיק ליון', 'Olympique Lyonnais', 'OL'] },
  { he: 'פריז FC', en: 'Paris FC', aliases: ['פריז סי.אף', 'פריז'] },
  // המדריך כותב גם "פריס סן ז׳רמן" (סמ"ך) וגם "פ.ס.ז׳".
  { he: 'פריז סן ז׳רמן', en: 'Paris Saint-Germain', aliases: ['פריז סן ז׳רמן', "פריז סן ז'רמן", 'פריס סן ז׳רמן', 'פריס סן ז׳רם', 'פ.ס.ז׳', 'פ.ס.ז', 'PSG', 'Paris SG'] },
  { he: 'ברסט', en: 'Brest', aliases: ['ברסט'] },
  { he: 'לוריאן', en: 'Lorient', aliases: ['לוריאן'] },
  { he: 'ניס', en: 'Nice', aliases: ['ניס', 'OGC Nice'] },
  { he: 'לאנס', en: 'Lens', aliases: ['לאנס', 'RC Lens'] },
  { he: 'שטרסבורג', en: 'Strasbourg', aliases: ['שטרסבורג'] },
  { he: 'אנז׳ה', en: 'Angers', aliases: ['אנז׳ה', "אנז'ה"] },
  { he: 'מרסיי', en: 'Marseille', aliases: ['מרסי', 'Olympique Marseille', 'OM'] },
  { he: 'לה מאן', en: 'Le Mans', aliases: ['לה מאן'] },
  { he: 'טולוז', en: 'Toulouse', aliases: ['טולוז'] },
  { he: 'אוסר', en: 'AJ Auxerre', aliases: ['אוסר', 'Auxerre'] },
  { he: 'טרואה', en: 'Troyes', aliases: ['טרואה'] },
  { he: 'לה האבר', en: 'Le Havre AC', aliases: ['האברה', 'Le Havre'] },

  /* ---------------------- הליגה הצרפתית השנייה ---------------------- */
  // 18 הקבוצות של ליג 2 (ESPN, עונת 2026/27). המדריך משדר משם משחקים
  // ("נאנט נגד דנקרס, ליגה צרפתית שנייה") — ולכן צריך גם את השמות.
  { he: 'סנט אטיין', en: 'Saint-Étienne', aliases: ['סנט-אטיין', 'Saint-Etienne', 'AS Saint-Etienne'] },
  { he: 'ריימס', en: 'Stade de Reims', aliases: ['סטאד ריימס', 'Reims'] },
  { he: 'רד סטאר', en: 'Red Star FC 93', aliases: ['רד סטאר 93', 'Red Star'] },
  { he: 'נאנסי', en: 'AS Nancy Lorraine', aliases: ['ננסי', 'Nancy'] },
  { he: 'מונפלייה', en: 'Montpellier', aliases: ['מונפלייה', 'Montpellier HSC'] },
  { he: 'פו', en: 'Pau', aliases: ['פו FC', 'Pau FC'] },
  { he: 'אנסי', en: 'Annecy', aliases: ['אנסי', 'FC Annecy'] },
  { he: 'דיז׳ון', en: 'Dijon FCO', aliases: ['דיז׳ון', "דיז'ון", 'Dijon'] },
  { he: 'סושו', en: 'Sochaux', aliases: ['סושו', 'FC Sochaux'] },
  { he: 'מץ', en: 'Metz', aliases: ['מץ', 'FC Metz'] },
  { he: 'בולון', en: 'Boulogne', aliases: ['בולון', 'US Boulogne'] },
  { he: 'דנקרק', en: 'Dunkerque', aliases: ['דנקרק', 'USL Dunkerque'] },
  { he: 'גנגאן', en: 'Guingamp', aliases: ['גנגאן', 'EA Guingamp'] },
  { he: 'נאנט', en: 'Nantes', aliases: ['נאנט', 'FC Nantes'] },
  { he: 'גרנובל', en: 'Grenoble', aliases: ['גרנובל', 'Grenoble Foot'] },
  { he: 'קלרמון', en: 'Clermont Foot', aliases: ['קלרמון פוט', 'Clermont'] },
  { he: 'רודז', en: 'Rodez Aveyron', aliases: ['רודז', 'Rodez'] },
  { he: 'לבאל', en: 'Stade Laval', aliases: ['לאבל', 'Laval'] },

  /* ------------------------------ דנמרק ------------------------------ */
  { he: 'קופנהגן', en: 'F.C. København', aliases: ['פ.צ. קופנהגן', 'FC Copenhagen', 'Copenhagen', 'FCK'] },
  { he: 'מיטיולן', en: 'FC Midtjylland', aliases: ['מידטיילנד', 'Midtjylland'] },
  { he: 'ויבורג', en: 'Viborg FF', aliases: ['ויבורג', 'Viborg'] },
  { he: 'נורשלן', en: 'FC Nordsjælland', aliases: ['נורשלן', 'Nordsjaelland', 'Nordsjælland'] },
  { he: 'ברונדבי', en: 'Brøndby IF', aliases: ['ברונדבי', 'Brondby'] },
  { he: 'הורסנס', en: 'AC Horsens', aliases: ['הורסנס', 'Horsens'] },
  { he: 'סילקבורג', en: 'Silkeborg IF', aliases: ['סילקבורג', 'Silkeborg'] },
  { he: 'רנדרס', en: 'Randers FC', aliases: ['רנדרס', 'Randers'] },
  { he: 'אודנסה', en: 'Odense Boldklub', aliases: ['אודנסה', 'Odense', 'OB'] },
  { he: 'לינגבי', en: 'Lyngby Boldklub', aliases: ['לינגבי', 'Lyngby'] },
  // 'ארהוס' הוא האיות שהמדריך משתמש בו — ולכן הוא כינוי מפורש.
  { he: 'אורהוס', en: 'AGF', aliases: ['AGF Aarhus', 'Aarhus', 'אורהוס', 'ארהוס'] },
  { he: 'סונדרייסקה', en: 'Sønderjyske Fodbold', aliases: ['סונדרז׳יסקה', 'Sonderjyske', 'Sønderjyske', 'סונדריסקה', 'סונדרייסקה'] },

  /* --------------------------- MLS --------------------------- */
  { he: 'אטלנטה יונייטד', en: 'Atlanta United FC', aliases: ['Atlanta United'] },
  { he: 'אוסטין', en: 'Austin FC', aliases: [] },
  { he: 'מונטריאול', en: 'CF Montréal', aliases: ['CF Montreal', 'Montreal'] },
  { he: 'שארלוט', en: 'Charlotte FC', aliases: [] },
  { he: 'שיקגו פייר', en: 'Chicago Fire FC', aliases: ['Chicago Fire'] },
  { he: 'קולורדו ראפידס', en: 'Colorado Rapids', aliases: [] },
  { he: 'קולומבוס קרו', en: 'Columbus Crew', aliases: [] },
  { he: 'די.סי. יונייטד', en: 'D.C. United', aliases: ['DC United', 'וושינגטון יונייטד'] },
  { he: 'סינסינטי', en: 'FC Cincinnati', aliases: ['Cincinnati'] },
  { he: 'דאלאס', en: 'FC Dallas', aliases: ['Dallas'] },
  { he: 'יוסטון דינמו', en: 'Houston Dynamo FC', aliases: ['Houston Dynamo'] },
  { he: 'אינטר מיאמי', en: 'Inter Miami CF', aliases: ['אינטר מיאמי', 'מיאמי'] },
  { he: 'לוס אנג׳לס גלאקסי', en: 'LA Galaxy', aliases: ['ל.א. גלאקסי', 'Los Angeles Galaxy', 'גלאקסי'] },
  { he: 'לוס אנג׳לס FC', en: 'LAFC', aliases: ['ל.א. FC', 'Los Angeles FC'] },
  { he: 'מינסוטה יונייטד', en: 'Minnesota United FC', aliases: ['Minnesota United'] },
  { he: 'נאשוויל', en: 'Nashville SC', aliases: ['Nashville'] },
  { he: 'ניו אינגלנד רבולושן', en: 'New England Revolution', aliases: [] },
  { he: 'ניו יורק סיטי', en: 'New York City FC', aliases: ['NYCFC'] },
  { he: 'אורלנדו סיטי', en: 'Orlando City SC', aliases: ['Orlando City'] },
  { he: 'פילדלפיה יוניון', en: 'Philadelphia Union', aliases: [] },
  { he: 'פורטלנד טימברס', en: 'Portland Timbers', aliases: [] },
  { he: 'ריאל סולט לייק', en: 'Real Salt Lake', aliases: ['סולט לייק'] },
  { he: 'ניו יורק רד בולס', en: 'Red Bull New York', aliases: ['New York Red Bulls', 'רד בול ניו יורק'] },
  { he: 'סן דייגו', en: 'San Diego FC', aliases: [] },
  { he: 'סן חוזה ארת׳קווייקס', en: 'San Jose Earthquakes', aliases: ['סן חוזה'] },
  { he: 'סיאטל סאונדרס', en: 'Seattle Sounders FC', aliases: ['Seattle Sounders'] },
  { he: 'ספורטינג קנזס סיטי', en: 'Sporting Kansas City', aliases: ['קנזס סיטי'] },
  { he: 'סט. לואיס סיטי', en: 'St. Louis CITY SC', aliases: ['סט. לואיס', 'St. Louis City SC'] },
  { he: 'טורונטו', en: 'Toronto FC', aliases: ['Toronto'] },
  { he: 'ונקובר וייטקאפס', en: 'Vancouver Whitecaps', aliases: ['ונקובר', 'Vancouver Whitecaps FC'] },

  /* --------------------------- סעודיה --------------------------- */
  { he: 'אל הילאל', en: 'Al Hilal', aliases: ['אל הילאל', 'אל-הילאל'] },
  { he: 'אל קאדסיה', en: 'Al Qadsiah', aliases: ['אל קדסיה'] },
  { he: 'אל נאסר', en: 'Al Nassr', aliases: ['אל נאסר (רונאלדו)', 'אל-נאסר', 'Al-Nassr'] },
  { he: 'אל איתיחאד', en: 'Al Ittihad', aliases: ['אל איתחאד'] },
  { he: 'נאום', en: 'Neom SC', aliases: ['נאום SC', 'ניום'] },
  { he: 'אל אהלי', en: 'Al Ahli', aliases: ['אל-אהלי'] },
  { he: 'אל איתיפק', en: 'Al Ettifaq', aliases: ['אל אתפאק'] },
  { he: 'אל חולוד', en: 'Al Kholood', aliases: [] },
  { he: 'אל דיריה', en: 'Al Diriyah', aliases: [] },
  { he: 'אל חזם', en: 'Al Hazem', aliases: [] },
  { he: 'אל ריאד', en: 'Al Riyadh', aliases: [] },
  { he: 'אל שאבאב', en: 'Al Shabab', aliases: [] },
  { he: 'אל פייחה', en: 'Al Fayha', aliases: [] },
  { he: 'אל חליג׳', en: 'Al Khaleej', aliases: ['אל ח׳ליג׳'] },
  { he: 'אל פייסלי', en: 'Al Faisaly', aliases: [] },
  { he: 'אל פתח', en: 'Al Fateh', aliases: [] },
  { he: 'אל תעאון', en: 'Al Taawoun', aliases: [] },
  { he: 'אבהא', en: 'Abha', aliases: [] },

  /* --------------------------- טורקיה --------------------------- */
  { he: 'גלאטסראיי', en: 'Galatasaray', aliases: ['גלטסראי'] },
  { he: 'בשיקטאש', en: 'Besiktas', aliases: ['בשקטאש', 'Beşiktaş'] },
  { he: 'פנרבחצ׳ה', en: 'Fenerbahce', aliases: ['פנרבאחצ׳ה', 'Fenerbahçe'] },
  { he: 'טרבזונספור', en: 'Trabzonspor', aliases: [] },
  { he: 'איסטנבול בשאקשהיר', en: 'Istanbul Basaksehir', aliases: ['בשאקשהיר'] },
  { he: 'קונייהספור', en: 'Konyaspor', aliases: [] },
  { he: 'סמסונספור', en: 'Samsunspor', aliases: [] },
  { he: 'אלניהספור', en: 'Alanyaspor', aliases: [] },
  { he: 'קסימפאשה', en: 'Kasimpasa', aliases: ['קסימפאשה'] },
  { he: 'ריזספור', en: 'Caykur Rizespor', aliases: ['צ׳ייקור ריזספור', 'Rizespor'] },
  { he: 'גזיאנטפ', en: 'Gaziantep FK', aliases: ['Gaziantep'] },
  { he: 'קוג׳אלי', en: 'Kocaelispor', aliases: ['קוצ׳אלי'] },
  { he: 'צ׳ורום', en: 'Çorum FK', aliases: ['צ׳ורום FK', 'Corum FK'] },
  { he: 'אמד ספורטיף', en: 'Amed SFK', aliases: ['אמדספור', 'Amedspor'] },
  { he: 'גנצ׳לרבירליגי', en: 'Genclerbirligi', aliases: [] },
  { he: 'ארזורום', en: 'Erzurum BB', aliases: ['Erzurumspor'] },
  { he: 'גוזטפה', en: 'Goztepe', aliases: ['גזטפה', 'Göztepe'] },
  { he: 'איופ', en: 'Eyupspor', aliases: ['איופספור'] },

  /* --------------------------- יוון --------------------------- */
  { he: 'פנאתינייקוס', en: 'Panathinaikos', aliases: ['פנאתינאיקוס'] },
  { he: 'א.א.ק. אתונה', en: 'AEK Athens', aliases: ['א.א.ק אתונה', 'AEK'] },
  { he: 'אולימפיאקוס', en: 'Olympiacos', aliases: ['אולימפיאקוס פיראוס'] },
  { he: 'פאוק סלוניקי', en: 'PAOK', aliases: ['פאוק'] },
  { he: 'אופי כרתים', en: 'OFI Crete', aliases: ['אופי'] },
  { he: 'אריס סלוניקי', en: 'Aris', aliases: ['אריס'] },
  { he: 'אירקליס', en: 'Iraklis', aliases: [] },
  { he: 'פאנטוליקוס', en: 'Panetolikos', aliases: [] },
  { he: 'קיפיסיה', en: 'Kifisia', aliases: [] },
  { he: 'אסטרס טריפוליס', en: 'Asteras Tripoli', aliases: [] },
  { he: 'קאלמאטה', en: 'Kalamata', aliases: [] },
  { he: 'אטרומיטוס', en: 'Atromitos', aliases: [] },
  { he: 'לבדיאקוס', en: 'Levadiakos', aliases: [] },
  { he: 'וולוס', en: 'Volos NFC', aliases: [] },

  /* --------------------------- הולנד --------------------------- */
  { he: 'פיינורד', en: 'Feyenoord Rotterdam', aliases: ['פיינורד רוטרדם', 'Feyenoord'] },
  { he: 'פ.ס.וו. איינדהובן', en: 'PSV Eindhoven', aliases: ['איינדהובן', 'PSV'] },
  { he: 'א.ז. אלקמאר', en: 'AZ Alkmaar', aliases: ['אלקמאר', 'AZ'] },
  { he: 'טוונטה', en: 'FC Twente', aliases: ['טוונטה אנסחדה', 'Twente'] },
  { he: 'אייאקס', en: 'Ajax Amsterdam', aliases: ['איאקס', 'Ajax'] },
  { he: 'חרונינגן', en: 'FC Groningen', aliases: ['Groningen'] },
  { he: 'פורטונה סיטארד', en: 'Fortuna Sittard', aliases: [] },
  { he: 'גו אהד איגלס', en: 'Go Ahead Eagles', aliases: [] },
  { he: 'אקסלסיור', en: 'Excelsior', aliases: [] },
  { he: 'הירנפיין', en: 'Heerenveen', aliases: ['סקאלה הירנפיין'] },
  { he: 'נ.א.ק. ניימכן', en: 'NEC Nijmegen', aliases: ['ניימכן', 'NEC'] },
  { he: 'קמבור', en: 'SC Cambuur', aliases: [] },
  { he: 'אוטרכט', en: 'FC Utrecht', aliases: ['Utrecht'] },
  { he: 'ספרטה רוטרדם', en: 'Sparta Rotterdam', aliases: [] },
  { he: 'טלסטאר', en: 'Telstar', aliases: [] },
  { he: 'זוולה', en: 'PEC Zwolle', aliases: ['Zwolle'] },
  { he: 'דן האג', en: 'ADO Den Haag', aliases: [] },
  { he: 'וילם II', en: 'Willem II', aliases: [] },

  /* --------------------------- פורטוגל --------------------------- */
  { he: 'פורטו', en: 'FC Porto', aliases: ['פ.צ. פורטו', 'Porto'] },
  { he: 'בנפיקה', en: 'Benfica', aliases: ['בנפיקה ליסבון'] },
  { he: 'ספורטינג ליסבון', en: 'Sporting CP', aliases: ['ספורטינג', 'Sporting Lisbon', 'Sporting'] },
  { he: 'סנטה קלרה', en: 'Santa Clara', aliases: [] },
  { he: 'ארוקה', en: 'Arouca', aliases: [] },
  { he: 'אקדמיקו ויזאו', en: 'Académico de Viseu', aliases: ['Academico de Viseu'] },
  { he: 'ז׳יל ויסנטה', en: 'Gil Vicente', aliases: ['ז׳יל ויסנטה', 'Gil Vicente FC'] },
  { he: 'בראגה', en: 'Braga', aliases: ['ספורטינג בראגה', 'SC Braga'] },
  { he: 'אסטרלה', en: 'Estrela', aliases: ['אסטרלה דה אמאדורה'] },
  { he: 'מוריירנסה', en: 'Moreirense', aliases: [] },
  { he: 'אלוורקה', en: 'Alverca', aliases: [] },
  { he: 'מריטימו', en: 'Maritimo', aliases: [] },
  { he: 'פמליקאו', en: 'FC Famalicao', aliases: ['Famalicao'] },
  { he: 'ריו אבה', en: 'Rio Ave', aliases: [] },
  { he: 'ויטוריה גימארייש', en: 'Vitória de Guimaraes', aliases: ['ויטוריה גימראייש', 'Vitoria de Guimaraes'] },
  { he: 'נאסיונל', en: 'C.D. Nacional', aliases: ['Nacional'] },
  { he: 'קאזה פיה', en: 'Casa Pia', aliases: [] },
  { he: 'אשטוריל', en: 'Estoril', aliases: [] },

  /* --------------------------- סקוטלנד --------------------------- */
  { he: 'סלטיק', en: 'Celtic', aliases: ['סלטיק גלזגו'] },
  { he: 'ריינג׳רס', en: 'Rangers', aliases: ['ריינג׳רס גלזגו'] },
  { he: 'הארטס', en: 'Heart of Midlothian', aliases: ['הארטס אוף מידלות׳יאן', 'Hearts'] },
  { he: 'דנדי', en: 'Dundee', aliases: [] },
  { he: 'סט. ג׳ונסטון', en: 'St Johnstone', aliases: [] },
  { he: 'דנדי יונייטד', en: 'Dundee United', aliases: [] },
  { he: 'סט. מירן', en: 'St Mirren', aliases: [] },
  { he: 'אברדין', en: 'Aberdeen', aliases: [] },
  { he: 'מאת׳רוול', en: 'Motherwell', aliases: [] },
  { he: 'היברניאן', en: 'Hibernian', aliases: ['היבס'] },
  { he: 'פאלקירק', en: 'Falkirk', aliases: [] },
  { he: 'קילמרנוק', en: 'Kilmarnock', aliases: [] },

  /* --------------------------- בלגיה --------------------------- */
  { he: 'קלאב ברוז׳', en: 'Club Brugge', aliases: ['ברוז׳', 'Club Brugge KV'] },
  { he: 'אוניון סן ז׳ילואז', en: 'Union St.-Gilloise', aliases: ['אוניון סן ז׳יל', 'Union SG', 'Union Saint-Gilloise'] },
  { he: 'אנדרלכט', en: 'Anderlecht', aliases: ['אנדרלקט'] },
  { he: 'גנט', en: 'KAA Gent', aliases: ['Gent'] },
  { he: 'שארלרואה', en: 'Royal Charleroi SC', aliases: ['שרלרואה', 'Charleroi'] },
  { he: 'וסטרלו', en: 'KVC Westerlo', aliases: ['Westerlo'] },
  { he: 'גנק', en: 'Racing Genk', aliases: ['גנק', 'Genk'] },
  { he: 'זולטה ורכם', en: 'Zulte-Waregem', aliases: [] },
  { he: 'סטנדרד ליאז׳', en: 'Standard Liege', aliases: ['Standard Liège'] },
  { he: 'לומל', en: 'Lommel SK', aliases: [] },
  { he: 'ואסלנד-בברן', en: 'Waasland-Beveren', aliases: [] },
  { he: 'סינט-טרוידן', en: 'Sint-Truidense', aliases: ['STVV'] },
  { he: 'אנטוורפן', en: 'Antwerp', aliases: [] },
  { he: 'מכלה', en: 'KV Mechelen', aliases: [] },
  { he: 'לוון', en: 'Oud-Heverlee Leuven', aliases: ['OH Leuven'] },
  { he: 'לה לובייר', en: 'RAAL La Louvière', aliases: ['La Louviere'] },
  { he: 'קורטרייק', en: 'KV Kortrijk', aliases: [] },
  { he: 'סרקל ברוז׳', en: 'Cercle Brugge KSV', aliases: ['Cercle Brugge'] },

  /* --------------------------- אוסטריה --------------------------- */
  { he: 'ראפיד וינה', en: 'Rapid Vienna', aliases: ['ראפיד וינה'] },
  { he: 'רד בול זלצבורג', en: 'RB Salzburg', aliases: ['זלצבורג', 'Salzburg', 'Red Bull Salzburg'] },
  { he: 'לאסק לינץ', en: 'LASK Linz', aliases: ['לאסק', 'LASK'] },
  { he: 'שטורם גראץ', en: 'SK Sturm Graz', aliases: ['שטורם', 'Sturm Graz'] },
  { he: 'הארטברג', en: 'TSV Hartberg', aliases: ['Hartberg'] },
  { he: 'ריד', en: 'SV Josko Ried', aliases: ['Ried'] },
  { he: 'גראצר AK', en: 'Grazer AK', aliases: ['Grazer'] },
  { he: 'טירול', en: 'WSG Swarovski Tirol', aliases: ['WSG Tirol'] },
  { he: 'אוסטריה לוסטנאו', en: 'Austria Lustenau', aliases: [] },
  { he: 'אוסטריה וינה', en: 'Austria Vienna', aliases: ['Austria Wien'] },
  { he: 'אלטאך', en: 'SC Rheindorf Altach', aliases: ['Altach'] },
  { he: 'וולפסברגר', en: 'Wolfsberger', aliases: ['Wolfsberger AC'] },

  /* --------------- שאר אירופה (בליגת האלופות ובאירופית) --------------- */
  { he: 'שחטאר דונייצק', en: 'Shakhtar Donetsk', aliases: ['שחטאר'] },
  { he: 'סלביה פראג', en: 'Slavia Prague', aliases: ['סלביה'] },
  { he: 'ספרטה פראג', en: 'Sparta Prague', aliases: ['ספרטה פראג'] },
  { he: 'ויקטוריה פלזן', en: 'Viktoria Plzen', aliases: ['פלזן'] },
  { he: 'סלובן ברטיסלבה', en: 'Slovan Bratislava', aliases: ['סלובן'] },
  { he: 'דינמו זאגרב', en: 'Dinamo Zagreb', aliases: ['דינמו זגרב'] },
  { he: 'הכוכב האדום בלגרד', en: 'Red Star Belgrade', aliases: ['הכוכב האדום', 'Crvena Zvezda'] },
  { he: 'באצ׳קה טופולה', en: 'Backa Topola', aliases: ['TSC Backa Topola'] },
  { he: 'פרנצווארוש', en: 'Ferencvaros', aliases: ['פרנצוורוש', 'Ferencváros'] },
  { he: 'לבסקי סופיה', en: 'Levski Sofia', aliases: ['לבסקי'] },
  { he: 'אומוניה ניקוסיה', en: 'Omonia Nicosia', aliases: ['אומוניה'] },
  { he: 'אררט-ארמניה', en: 'Ararat-Armenia', aliases: ['אררט'] },
  { he: 'סבאח', en: 'Sabah FK', aliases: ['סבאח באקו'] },
  { he: 'ויקינג', en: 'Viking FK', aliases: ['ויקינג סטבנגר', 'Viking Stavanger'] },
  { he: 'בודו/גלימט', en: 'Bodo/Glimt', aliases: ['בודו גלימט', 'Bodø/Glimt'] },
  { he: 'לילסטרום', en: 'Lillestrom', aliases: ['לילסטרם', 'Lillestrøm'] },
  { he: 'יאגלוניה ביאליסטוק', en: 'Jagiellonia Bialystok', aliases: ['יאגלוניה'] },
  { he: 'לך פוזנן', en: 'Lech Poznan', aliases: ['לך'] },
  { he: 'צליה', en: 'NK Celje', aliases: ['צליה'] },
  { he: 'טוריאנסה', en: 'Torreense', aliases: [] },
  { he: 'קלקסביק', en: 'KI Klaksvik', aliases: [] },

  /*
   * ------------------------------ NBA ------------------------------
   * שמות הקבוצות כפי שהם חוזרים מ-ESPN (`displayName`), כדי ששורת הטבלה
   * תימצא לפי הכותרת בעברית מה-EPG ("לוס אנג׳לס לייקרס - בוסטון סלטיקס").
   */
  { he: 'אטלנטה הוקס', en: 'Atlanta Hawks', aliases: ['הוקס'] },
  { he: 'בוסטון סלטיקס', en: 'Boston Celtics', aliases: ['סלטיקס'] },
  { he: 'ברוקלין נטס', en: 'Brooklyn Nets', aliases: ['נטס'] },
  { he: 'שארלוט הורנטס', en: 'Charlotte Hornets', aliases: ['הורנטס'] },
  { he: 'שיקגו בולס', en: 'Chicago Bulls', aliases: ['בולס'] },
  { he: 'קליבלנד קאבלירס', en: 'Cleveland Cavaliers', aliases: ['קאבלירס'] },
  { he: 'דאלאס מאבריקס', en: 'Dallas Mavericks', aliases: ['מאבריקס'] },
  { he: 'דנוור נאגטס', en: 'Denver Nuggets', aliases: ['נאגטס'] },
  { he: 'דטרויט פיסטונס', en: 'Detroit Pistons', aliases: ['פיסטונס'] },
  { he: 'גולדן סטייט ווריורס', en: 'Golden State Warriors', aliases: ['ווריורס'] },
  { he: 'יוסטון רוקטס', en: 'Houston Rockets', aliases: ['רוקטס'] },
  { he: 'אינדיאנה פייסרס', en: 'Indiana Pacers', aliases: ['פייסרס'] },
  { he: 'לוס אנג׳לס קליפרס', en: 'LA Clippers', aliases: ['קליפרס', 'ל.א. קליפרס', 'Los Angeles Clippers'] },
  { he: 'לוס אנג׳לס לייקרס', en: 'Los Angeles Lakers', aliases: ['לייקרס', 'ל.א. לייקרס', 'LA Lakers'] },
  { he: 'ממפיס גריזליס', en: 'Memphis Grizzlies', aliases: ['גריזליס'] },
  { he: 'מיאמי היט', en: 'Miami Heat', aliases: ['היט'] },
  { he: 'מילווקי באקס', en: 'Milwaukee Bucks', aliases: ['באקס'] },
  { he: 'מינסוטה טימברוולבס', en: 'Minnesota Timberwolves', aliases: ['טימברוולבס'] },
  { he: 'ניו אורלינס פליקנס', en: 'New Orleans Pelicans', aliases: ['פליקנס'] },
  { he: 'ניו יורק ניקס', en: 'New York Knicks', aliases: ['ניקס'] },
  { he: 'אוקלהומה סיטי ת׳אנדר', en: 'Oklahoma City Thunder', aliases: ['ת׳אנדר'] },
  { he: 'אורלנדו מג׳יק', en: 'Orlando Magic', aliases: ['מג׳יק'] },
  { he: 'פילדלפיה 76', en: 'Philadelphia 76ers', aliases: ['Philadelphia Sixers'] },
  { he: 'פיניקס סאנס', en: 'Phoenix Suns', aliases: ['סאנס'] },
  { he: 'פורטלנד טרייל בלייזרס', en: 'Portland Trail Blazers', aliases: ['בלייזרס', 'Trail Blazers'] },
  { he: 'סקרמנטו קינגס', en: 'Sacramento Kings', aliases: ['קינגס'] },
  { he: 'סן אנטוניו ספרס', en: 'San Antonio Spurs', aliases: ['ספרס'] },
  { he: 'טורונטו ראפטורס', en: 'Toronto Raptors', aliases: ['ראפטורס'] },
  { he: 'יוטה ג׳אז', en: 'Utah Jazz', aliases: ['ג׳אז'] },
  { he: 'וושינגטון וויזארדס', en: 'Washington Wizards', aliases: ['וויזארדס'] },
]

/* ------------------------------------------------------------------ */
/* חיפוש                                                               */
/* ------------------------------------------------------------------ */

/**
 * ניקוי אגרסיבי להשוואה: בלי ניקוד, בלי פיסוק, בלי רווחים.
 * "פ.ס.וו. איינדהובן" -> "פסוואיינדהובן", "F.C. København" -> "fckbenhavn".
 */
export function foldTeamName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0591-\u05C7]/g, '')
    // גרש וגרשיים בעברית (״ ,׳) הם *בתוך* טווח העברית ולכן שרדו את הסינון
    // שלמטה — בעוד שהמדריך כותב אותם כגרשיים ASCII כפולים ("ה. ת''א").
    // בלי ההסרה הזו שתי הצורות מנורמלות אחרת ("הת״א" מול "התא") והקבוצה
    // לא נמצאה בטבלה. ר' את "ה. ת''א" מול "ה. ת״א".
    .replace(/[\u05F3\u05F4]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]/g, '')
}

interface IndexedTeam {
  entry: TeamNames
  /** כמה תווים יש בשם המנורמל — להתאמה מדויקת מול התאמה חלקית. */
  length: number
}

const INDEX: Map<string, IndexedTeam> = (() => {
  const index = new Map<string, IndexedTeam>()
  const put = (key: string, entry: TeamNames) => {
    const folded = foldTeamName(key)
    if (!folded) return
    const existing = index.get(folded)
    // שם ראשון מנצח — כדי שלא תהיה דריסה אקראית בין קבוצות בעלות כינוי זהה.
    if (!existing || folded === foldTeamName(entry.en)) {
      index.set(folded, { entry, length: folded.length })
    }
  }
  for (const entry of TEAM_NAMES) {
    put(entry.en, entry)
    put(entry.he, entry)
    for (const alias of entry.aliases ?? []) put(alias, entry)
  }
  return index
})()

/** מפתחות ממוינים מהארוך לקצר — להתאמה חלקית deterministic. */
const SORTED_KEYS: ReadonlyArray<{ key: string; entry: TeamNames }> = [...INDEX.entries()]
  .map(([key, value]) => ({ key, entry: value.entry }))
  .sort((a, b) => b.key.length - a.key.length)

/**
 * מחפש רשומה לפי כל שם — עברית, אנגלית, כינוי, או התאמה חלקית.
 * ההתאמה החלקית נדרשת כי ה-EPG מוסיף סוגריים ("אל נאסר (רונאלדו)") ולטבלאות
 * יש סיומות ("Manchester City FC").
 */
export function findTeamNames(raw: string | undefined): TeamNames | undefined {
  if (!raw) return undefined
  const folded = foldTeamName(raw)
  if (!folded) return undefined
  const direct = INDEX.get(folded)
  if (direct) return direct.entry
  if (folded.length < 4) return undefined
  for (const candidate of SORTED_KEYS) {
    if (candidate.key.length < 5) continue
    if (folded.includes(candidate.key)) return candidate.entry
  }
  return undefined
}

/** השם בעברית עבור שם באנגלית/עברית (לתצוגה). */
export function hebrewNameFor(raw: string | undefined): string | undefined {
  return findTeamNames(raw)?.he
}

/** השם הרשמי באנגלית עבור שם בעברית (לחיפוש בטבלה). */
export function englishNameFor(raw: string | undefined): string | undefined {
  return findTeamNames(raw)?.en
}

/** כל השמות שמייצגים את אותה קבוצה — לחיפוש בטבלה. */
export function teamNameVariants(raw: string | undefined): string[] {
  const entry = findTeamNames(raw)
  if (!entry) return raw ? [raw] : []
  const out = new Set<string>([entry.he, entry.en])
  for (const alias of entry.aliases ?? []) out.add(alias)
  return [...out]
}

/** האם המפה מכירה את השם הזה בכלל. */
export function isKnownTeam(raw: string | undefined): boolean {
  return findTeamNames(raw) !== undefined
}
