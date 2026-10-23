/**
 * כל המחרוזות בעברית של הממשק והמנוע במקום אחד.
 * אין טקסט עברי קשיח בקוד המנוע — הכל נשלף מכאן.
 */

export const he = {
  app: {
    title: 'מה כדאי לראות עכשיו?',
    subtitle: 'סורק 131 הערוצים הישראליים שלך וממליץ רק על מה ששווה את הזמן',
    /** התווית שלפני מספר הגרסה בכותרת, למשל "גרסה 1.1 (2)". */
    version: 'גרסה',
    scan: 'סרוק עכשיו',
    rescan: 'סריקה מחדש',
    scanning: 'סורק את לוח השידורים…',
    fetchNow: 'הבא נתונים עכשיו',
    fetchingChannels: 'מוריד לוח שידורים — {done} מתוך {total} ערוצים…',
    fetchingList: 'מביא את רשימת הערוצים…',
    waitingBetween: 'ממתין {seconds} שניות לפני הערוץ הבא ({done}/{total})…',
    waitingBetweenOne: 'ממתין שנייה אחת לפני הערוץ הבא ({done}/{total})…',
    usingCache: 'משתמש בנתונים שמורים',

    /* --- באר ההתקדמות: כל שלב עם כותרת משלו ועם שם הערוץ המדויק --- */
    progressListLabel: 'רשימת הערוצים',
    progressChannelsLabel: 'לוח השידורים',
    progressWaitingLabel: 'השהיה בין ערוצים',
    progressEnrichLabel: 'ביקורות וציונים',
    progressRecommendLabel: 'חישוב המלצות',
    progressCacheLabel: 'קריאה מהמטמון',
    progressChannel: 'ערוץ {done} מתוך {total}',
    progressList: 'מביא את רשימת 131 הערוצים מ-antifriz.tv — בקשה אחת',
    /** מוצג כשמדלגים על ערוצים שכבר יש להם לוח שידורים מהיום. */
    progressReusingCache:
      'לוח השידורים של {count} ערוצים כבר שמור מהיום — ממשיכים מאותה נקודה ומורידים רק את החסרים',
    /** תוספת לקבועה של שלב הורדת הלוח — כדי שיהיה על המסך למה הסריקה לא מתחילה מאפס. */
    progressReusingCacheShort: 'ממשיכים מאותה נקודה · {count} כבר שמורים',
    progressChannelFetch: 'שולף עכשיו את לוח השידורים של: {channel}',
    progressChannelFetchNum: 'שולף עכשיו את לוח השידורים של: {channel} (ערוץ {number})',
    progressWaitingNext: 'הערוץ הבא: {channel}',
    progressCountdown: 'נותרו {seconds} שניות',
    progressCountdownOne: 'נותרה שנייה',
    progressEnrichStart:
      'סיים להביא את הערוצים — עובר לחפש ביקורות וציונים ל-{total} סרטים וסדרות ({source})',
    progressEnrich: 'מחפש ביקורות וציונים ב-{source}: {done} מתוך {total}',
    progressRecommend: 'מחשב את ההמלצות מהנתונים שנאספו…',
    progressElapsed: 'עברו {time}',
    progressEta: 'נותרו כ-{time}',
    progressTook: 'הסריקה ארכה {time}',
    recomputing: 'מחשב המלצות מהנתונים השמורים…',
    /** מוצג כשההמלצות כבר על המסך והציונים עוד נשלפים ברקע. */
    enriching: 'ההמלצות מוצגות — משלים ציונים ברקע…',
    lastScan: 'סריקה אחרונה',
    never: 'עוד לא בוצעה סריקה',
    settings: 'הגדרות',
    close: 'סגור',
    save: 'שמור',
    cancel: 'ביטול',
    favorite: 'מועדף',
    /* שמות המקורות בצ'יפים של הציונים (השם המקוצר כמו שהמשתמש מכיר). */
    tmdb: 'TMDB',
    imdb: 'IMDb',
    rottenTomatoes: 'RT',
    /** הציון המאוחד — הממוצע המשוקלל של כל המקורות. */
    weighted: 'משוקלל',
    /** התווית שאחרי מספר המצביעים: "18,894 מדרגים". */
    votes: 'מדרגים',
    refresh: 'רענן',
    error: 'שגיאה',
    warning: 'אזהרה',
    retry: 'נסה שוב',
    loading: 'טוען…',
    watch: 'לצפייה בערוץ',
    channel: 'ערוץ',
    noResults: 'לא נמצאו המלצות כרגע',
    noResultsHint: 'נסה להרחיב את חלון החיפוש או לוודא שההגדרות מלאות',
    now: 'עכשיו',
    demo: 'הצג דוגמה',
    demoHint: 'תצוגה מקדימה עם נתוני דוגמה — בלי להתחבר לספק',
    antifrizHintShort:
      'לוח השידורים נשלף מאתר antifriz.tv פעם אחת ביום, ורק לערוצים שסימנת בהגדרות — כך האתר לא נטען בכל פתיחה ולא נחסמים.',
    today: 'היום',
    tomorrow: 'מחר',
    all: 'הכל',
  },

  tabs: {
    all: 'הכל',
    sport: 'ספורט',
    series: 'סדרות',
    movie: 'סרטים',
    kidsMovies: 'סרטי ילדים',
    other: 'אחר',
    settings: 'הגדרות',
  },

  category: {
    sport: 'ספורט',
    series: 'סדרה',
    movie: 'סרט',
    'movie-kids': 'סרט ילדים',
    news: 'חדשות',
    kids: 'ילדים',
    other: 'תכנית',
  },

  status: {
    live: 'משודר עכשיו',
    'starting-soon': 'מתחיל בקרוב',
  },

  /** תבניות הסבר — {…} מוחלף בערכים אמיתיים. */
  why: {
    ratingsNoVotes: 'ציון {source} {rating}',
    weightedRating: 'ציון משוקלל {score} מתוך 10 — {sources}',
    acclaimedMovie: 'סרט מוערך — ציון {rating} וקהל רחב',
    acclaimedSeries: 'סדרה מומלצת — ציון {rating}, {seasons} עונות',
    acclaimedSeriesNoSeasons: 'סדרה מומלצת — ציון {rating}',
    classicDirector: 'בימוי {director}',
    starring: 'משחק {actors}',
    genreMatch: 'ז׳אנר שאתה אוהב: {genres}',
    genreStrong: 'ז׳אנר מבוקש: {genres}',
    knownGoodSeries: 'סדרה מומלצת ומדוברת',
    strongSeries: 'סדרה חזקה — ציון {rating}',
    favoriteMovie: 'מועדף שלך — הסרט שסימנת',
    favoriteSeries: 'מועדף שלך — הסדרה שסימנת',
    favoriteTeam: '{team} — הקבוצה שלך משחקת',
    favoriteChannel: 'מהערוץ המועדף עליך: {channel}',
    live: 'שידור ישיר בלבד',
    liveNow: 'שידור ישיר עכשיו',
    newEpisode: 'פרק חדש (עונה {season}, פרק {episode})',
    newEpisodePlain: 'פרק חדש',
    premiere: 'בכורה',
    freshMovie: 'סרט חדש יחסית ({year})',
    newsPriority: 'מהדורת חדשות מרכזית — {channel}',
    newsBreaking: 'משדר חדשות בזמן אמת',
    knownCompetition: 'מפעל חשוב: {competition}',
    derby: '{label} — {note}',
    rivalry: 'יריבות טעונה: {label}',
    tableClash: 'מאבק צמרת: {home} ({homeRank}) נגד {away} ({awayRank})',
    tableGap: 'הפרש של {gap} מקומות בטבלה — פער איכות ברור',
    bigGap: 'פער גדול מדי בטבלה — פחות כדאי',
    titleRace: 'קרב על האליפות',
    relegation: 'מאבק נגד הירידה',
    euroSpot: 'מאבק על מקום באירופה',
    h2h: 'מפגש ישיר בין שתי קבוצות חזקות',
    lowSeed: 'משחק בין קבוצות בתחתית — עניין נמוך',
    tableBottom: 'מאבק בתחתית — כל נקודה קריטית',
    replay: 'שידור חוזר (לא ישיר)',
    onAirNow: 'משודר כרגע — אפשר להתחיל לצפות',
    knownGoodMovie: 'סרט מוכר ומוערך',
    tableStatus: '{team}: {rank}',
    gapSmall: 'שתי הקבוצות קרובות בטבלה — צפוי משחק צמוד',
    alternates: 'משודר גם ב־{channels}',
    plainProgramme: 'תכנית בערוץ {channel}',
  },

  /** כותרות קצרות לכרטיס ההמלצה. */
  headline: {
    movieRated: 'סרט חזק',
    moviePlain: 'סרט בערוץ {channel}',
    seriesRated: 'סדרה חזקה',
    seriesPlain: 'סדרה בערוץ {channel}',
    favoriteMovie: 'מועדף שלך — סרט',
    favoriteSeries: 'מועדף שלך — סדרה',
    sportDerby: '{label} — שידור ישיר',
    sportFavoriteTeam: '{team} על המסך',
    sportBigMatch: 'משחק גדול — {competition}',
    newsMain: '{program} — {channel}',
    newsPlain: 'חדשות בערוץ {channel}',
  },

  /** תוויות "למה כדאי לראות" — המשפט החותם. */
  verdict: {
    movie: 'סרט שווה את הזמן',
    movieAcclaimed: 'סרט מוערך במיוחד — הזדמנות טובה',
    series: 'סדרה מומלצת — שווה להתחיל',
    favorite: 'מועדף שלך — תראה גם אם הציון בינוני',
    derby: 'דרבי חי עכשיו — האנרגיה והסיפור הם כל העניין',
    favoriteTeam: '{team} על המסך — לא לפספס',
    bigMatch: 'משחק גדול בליגה — שני הצדדים בקצב ניצחון',
    news: 'מהדורה מרכזית — תדע מה קרה ב-12 השעות האחרונות',
    solid: 'תכנית סבירה — טוב כרקע',
  },

  sport: {
    interest: 'אחוז עניין',
    juice: 'ג׳וס',
    hasJuice: 'יש ג׳וס',
    noJuice: 'בינוני',
    derby: 'דרבי',
    competition: 'מסגרת',
    home: 'בית',
    away: 'חוץ',
    team: 'קבוצה',
    rank: 'מקום',
    points: 'נק׳',
    played: 'מש׳',
    table: 'טבלה',
    noTable: 'אין נתוני טבלה',
    liveOnly: 'רק שידורים ישירים',
    juiceFull: 'ג׳וס מלא',
    juiceSome: 'יש ג׳וס',
    juiceLow: 'אין ג׳וס',
    onAir: 'באוויר',
    kickoff: 'שעת התחלה',
    yourTeam: 'הקבוצה שלך',
    sportType: 'ענף',
    football: 'כדורגל',
    basketball: 'כדורסל',
    hockey: 'הוקי',
    tennis: 'טניס',
    handball: 'כדוריד',
    volleyball: 'כדורעף',
    americanFootball: 'פוטבול',
    baseball: 'בייסבול',
    motorsport: 'מרוצים',
    combat: 'אומנויות לחימה',
    otherSport: 'ספורט',
    eventType: 'סוג אירוע',
    channel: 'ערוץ',
    winPercent: 'אחוז ניצחונות',
    pointsScored: 'סלים',
    /* מסך פרטי המשחק — נפתח בלחיצה על הכרטיס כולו (אין כפתור נפרד). */
    detailsTitle: 'פרטי המשחק',
    baskets: 'סלים',
    wins: 'ניצ׳',
    losses: 'הפ׳',
    close: 'סגירה',
    leagueTable: 'טבלת הליגה',
    source: 'מקור',
    noTableForLeague: 'אין טבלה זמינה למסגרת הזו',
    teamNotFound: 'לא נמצאה בטבלה',
    englishName: 'שם באנגלית',
    loadingTable: 'טוען טבלה…',
    tapForDetails: 'לחץ על הכרטיס לפירוט, מיקומים וטבלה',
  },

  /**
   * "למה המשחק מעניין" — נגזר מהטבלה עצמה (פערים, אזורי ירידה ואירופה,
   * התקפה/הגנה והקבוצה האהודה). הכל מחושב, לא טקסט קבוע.
   */
  insight: {
    tableLine: '{team}: מקום {position} · {points} נק׳',
    levelOnPoints: 'שתי הקבוצות עם {points} נק׳ — מאבק ישיר על אותם מקומות',
    sixPointer: 'רק {gap} נק׳ מפרידות ביניהן — משחק של שש נקודות',
    sixPointerOne: 'רק נקודה אחת מפרידה ביניהן — משחק של שש נקודות',
    pointsGap: '{gap} נק׳ מפרידות ביניהן ({home} {homePoints} · {away} {awayPoints})',
    titleRace: '{team} במרחק {gap} נק׳ מהמוליכה {leader}',
    leader: '{team} מוליכה את הטבלה עם {points} נק׳',
    relegation: '{team} מתחת לקו האדום — מאבק ירידה',
    bottomBattle: 'שתי הקבוצות בתחתית — כל נקודה שווה זהב',
    europe: '{team} במקום שמוביל ל{zone}',
    bestAttack: 'ל{team} ההתקפה הטובה בליגה ({goals} שערי זכות)',
    worstDefense: 'ל{team} ההגנה החלשה בליגה ({goals} ספיגות)',
    hotStreak: '{team} בכושר שיא — {won} ניצחונות ב-{played} משחקים',
    goalDiff: 'הפרש השערים של {team}: {diff}',
    noTable: 'אין טבלה זמינה לליגה הזו — לכן אין מיקומים להציג',
    teamMissing: '{team} לא נמצאה בטבלה (ליגה אחרת, גביע או ליגת משנה)',
    uclDirect: '{team} במקום {position} — ישיר לשמינית הגמר',
    uclPlayoff: '{team} במקום {position} — פלייאוף (מקומות 9-24)',
    uclOut: '{team} במקום {position} — מתחת לקו ההדחה בליגת האלופות',
    /* כדורסל: אין נקודות טבלה, שערים וירידות — המאזן ואחוז הניצחונות הם הנתון. */
    leaderBasketball: '{team} מוליכה את הליגה עם מאזן {record}',
    titleRaceBasketball: '{team} עם מאזן {record} — במרחק {gap} ניצחונות מהמוליכה {leader}',
    titleRaceBasketballOne: '{team} עם מאזן {record} — ניצחון אחד פחות מהמוליכה {leader}',
    bestOffenseBasketball: 'ל{team} ההתקפה הפורה בליגה ({points} נקודות זכות)',
    worstDefenseBasketball: 'ל{team} ההגנה החלשה בליגה ({points} נקודות ספיגה)',
    diffBasketball: 'הפרש הנקודות של {team}: {diff}',
    levelOnWins: 'שתי הקבוצות עם אותו מספר ניצחונות ({points})',
    gapOneWin: 'רק ניצחון אחד מפריד ביניהן',
    gapWins: '{gap} ניצחונות מפרידים ביניהן',
    pointsGapBasketball: 'פער של {gap} ניצחונות ({home} {homePoints} · {away} {awayPoints})',
  },

  settings: {
    provider: 'ספק ה-IPTV',
    providerHint: 'הזן את פרטי הפאנל שלך (Xtream) או קישורי M3U/XMLTV',
    tvKeyboardHint:
      'בשלט: OK על שדה פותח את המקלדת של הטלוויזיה, BACK סוגר אותה. כל שאר המקשים מנווטים כרגיל.',
    mode: 'סוג החיבור',
    modeAntifriz: 'antifriz.tv — מדריך שידורים באתר',
    modeXtream: 'פאנל Xtream (שם משתמש וסיסמה)',
    modeM3u: 'קישורי M3U + XMLTV',
    antifriz: 'מקור לוח השידורים (antifriz)',
    antifrizBase: 'כתובת האתר',
    antifrizHint:
      'מכאן נשלף לוח השידורים. השליפה נשמרת ליום שלם לפי שעון ישראל, ואם לא החלפת ערוצים — לא תתבצע קריאה נוספת לאתר.',
    host: 'כתובת השרת',
    hostHint: 'לדוגמה: bethoven.af.stream.com:8080',
    username: 'שם משתמש',
    password: 'סיסמה',
    m3uUrl: 'קישור M3U',
    xmltvUrl: 'קישור XMLTV',
    israeliOnly: 'רק ערוצים ישראליים (131 ערוצים)',
    epgChannels: 'ערוצים לבדיקת EPG',
    epgChannelsHint:
      'רק הערוצים המסומנים נבדקים בלוח השידורים. כל ערוץ הוא בקשה אחת לאתר, ולכן כדאי לבחור רק את מה שחשוב לך.',
    epgSelected: 'נבחרו {count} מתוך {total} ערוצים',
    epgCategorySelected: '{count}/{total}',
    epgCategoryToggle: 'בחר את כל קטגוריית {category}',
    epgSelectAll: 'בחר הכל',
    epgClear: 'נקה בחירה',
    epgEmpty: 'לא נבחר ערוץ — נסרוק את ברירת המחדל',
    delaySeconds: 'השהיה בין ערוצים (בשניות)',
    delayHint: 'ההשהיה בין בקשה לבקשה בזמן שליפת לוח השידורים. 10 שניות = הקצב הבטוח.',
    api: 'מקורות מידע',
    tmdbKey: 'מפתח TMDB',
    tmdbHint: 'חינמי מ-themoviedb.org — משמש לציונים ותקצירים בעברית',
    omdbKey: 'מפתח OMDb',
    omdbHint: 'חינמי מ-omdbapi.com — מוסיף ציוני IMDb ו-Rotten Tomatoes לסרטים',
    apiKeyVisibleHint: 'המפתח מוצג כמו שהוא — כך אפשר לוודא שהעתקת אותו נכון',
    missingChannels: 'ערוצים שלא נמצאו במדריך',
    footballKey: 'מפתח Football API',
    footballHint: 'למיקום הקבוצות בטבלה ולנתוני משחקים',
    prefs: 'העדפות אישיות',
    favoriteTeam: 'הקבוצה שאני אוהד',
    favoriteSeries: 'סדרות מועדפות',
    favoriteMovies: 'סרטים מועדפים',
    favoriteChannels: 'ערוצים מועדפים',
    liveSportsOnly: 'בספורט — רק שידורים ישירים',
    minMovieRating: 'ציון מינימלי לסרט',
    minMovieRatingHint:
      'סרט שהציון המשוקלל שלו (IMDb, TMDB ו-Rotten Tomatoes — לפי מספר המדרגים, בסולם 1–10) מתחת לזה לא יוצג בכלל. סרט בלי שום ציון ידוע וסרט מהמועדפים שלי כן יוצגו. 0 = בלי סינון.',
    hideUnratedMovies: 'הסתר סרטים בלי ציון או ביקורת',
    hideUnratedMoviesHint:
      'סרט שמסד הנתונים של הסרטים (TMDB / OMDb) לא הכיר — בלי ציון, בלי תקציר ובלי ביקורת — לא יוצג בכלל. סרט מהמועדפים שלי תמיד יוצג.',
    minSeriesRating: 'ציון מינימלי לסדרה',
    includeNews: 'כלול קטגוריית חדשות חשובות',
    sortMode: 'סדר ההמלצות',
    sortModeTime: 'לפי הזמן הקרוב (מה שמשודר עכשיו)',
    sortModeScore: 'לפי הציון הגבוה',
    sortModeHint:
      'לפי הזמן הקרוב: קודם מה שמשודר עכשיו ואחר כך השידור שהתחיל/יתחיל בזמן הקרוב ביותר — כדי למצוא משהו לראות עכשיו. לפי הציון: התכנית המעניינת ביותר קודם, גם אם היא בעוד שעה.',
    showClock: 'הצג שעון בפינה הימנית העליונה',
    showClockHint:
      'השעון נשאר קבוע בפינה גם כשגוללים את הרשימה, ולא נתפס בניווט בשלט. ביטול הסימון מסתיר אותו.',
    lookAhead: 'כמה שעות קדימה לסרוק',
    /** בחירת הענפים שמעניינים את המשתמש. */
    sportKinds: 'ענפים שמעניינים אותי',
    sportKindsHint:
      'בטאב הספורט יוצגו רק משחקים מהענפים המסומנים — כברירת מחדל כדורגל, כדורסל וטניס. בלי שום סימון — כל הענפים.',
    listHint: 'רשימה מופרדת בפסיקים',
    saved: 'ההגדרות נשמרו',
    testConnection: 'בדוק חיבור',
    testing: 'בודק…',
    connected: 'החיבור תקין — נמצאו {count} ערוצים',
    connectionFailed: 'החיבור נכשל: {message}',
    clearData: 'אפס הכל',
  },

  warnings: {
    noSettings: 'לא הוגדרו פרטי ספק — פתח את ההגדרות כדי להתחיל',
    noTmdbKey: 'לא הוגדר מפתח TMDB — הסרטים והסדרות יסווגו לפי ה-EPG בלבד',
    tmdbKeyRejected:
      'מפתח TMDB לא החזיר נתונים לאף סרט — בדוק את המפתח בהגדרות (ייתכן שהוא שגוי או שהמכסה נגמרה)',
    tmdbUnreachable:
      'לא הצלחתי להגיע ל-TMDB (אין רשת או שהשרת לא זמין) — הסרטים והסדרות יוצגו בלי ציוני TMDB',
    tmdbPartial:
      'הפסקתי את חיפוש הביקורות אחרי {seconds} שניות כדי לא לעכב את הסריקה — חלק מהתכניות בלי ציון',
    noFootballKey:
      'לא הוגדר מפתח Football API — מיקומי הקבוצות מגיעים מהמקורות החינמיים (ESPN לעונה הנוכחית, וטבלה מקומית לליגת העל)',
    noChannels: 'לא נמצאו ערוצים ישראליים בלוח השידורים',
    noGuideChannels: 'לא הצלחתי לקרוא את רשימת הערוצים מאתר לוח השידורים',
    missingGuideChannels: 'ערוצים שנבחרו בהגדרות לא נמצאו במדריך',
    partialEpg: 'חלק מהערוצים לא החזירו לוח שידורים',
    offlineTable: 'משתמש בטבלת הליגה המקומית (snapshot)',
    cacheFull: 'האחסון המקומי מלא — לא הצלחתי לשמור את לוח השידורים',
  },

  reasonsGroup: {
    why: 'למה מומלץ',
  },
} as const

/** החלפת {key} בתבנית מחרוזת. */
export function tpl(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  )
}

/**
 * זמן קצר לקריאה בטלוויזיה: 18,000 -> "18 שנ׳", 65,000 -> "1:05 דק׳".
 * משמש לבאר ההתקדמות (זמן שחלף / נותר).
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  if (totalSeconds < 60) return `${totalSeconds} שנ׳`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (seconds === 0) return `${minutes} דק׳`
  return `${minutes}:${String(seconds).padStart(2, '0')} דק׳`
}

/** 12345 -> "12,345" */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('he-IL').format(n)
}

/** Format minutes as "21:30" in Israel time. */
export function formatTime(epochMs: number): string {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(epochMs))
}

/**
 * השעון הקבוע שבפינה: "21:30:05" בזמן ישראל.
 *
 * הפורמט נבנה פעם אחת ונשמר — השעון מתעדכן כל השנייה, ובטלוויזיה אין טעם
 * לבנות מחדש Intl.DateTimeFormat בכל טיק. hourCycle 'h23' מבטיח 00:00 ולא 24:00.
 *
 * אם ה-WebView של הטלוויזיה כל כך ישן שאין בו Intl (או שאין בו אזורי זמן),
 * נופלים לשעון המקומי של המכשיר במקום להפיל את האפליקציה בפתיחה.
 */
let clockFormatter: Intl.DateTimeFormat | undefined
let clockFormatterBroken = false

export function formatClockTime(epochMs: number): string {
  if (!clockFormatterBroken) {
    try {
      if (!clockFormatter) {
        clockFormatter = new Intl.DateTimeFormat('he-IL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
          timeZone: 'Asia/Jerusalem',
        })
      }
      return clockFormatter.format(new Date(epochMs))
    } catch {
      clockFormatterBroken = true
    }
  }
  const date = new Date(epochMs)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "שעה" / "שעתיים" / "5 שעות" — עם היחיד והזוגי שבעברית. */
function formatHours(hours: number): string {
  if (hours === 1) return 'שעה'
  if (hours === 2) return 'שעתיים'
  return `${hours} שעות`
}

/**
 * פרק זמן במילים: "45 דק׳", "שעה ו-5 דק׳", "3 שעות ו-9 דק׳".
 *
 * מעל שעה עוברים לשעות: "בעוד 189 דק׳" הוא מספר שאפשר לחשב רק בראש, בעוד
 * "בעוד 3 שעות ו-9 דק׳" אומר מיד מתי. בדיוק מעל שעה אין דקות מיותרות.
 */
export function formatMinutesSpan(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  if (total < 60) return `${total} דק׳`
  const hours = Math.floor(total / 60)
  const rest = total % 60
  const hoursText = formatHours(hours)
  return rest === 0 ? hoursText : `${hoursText} ו-${rest} דק׳`
}

/** "בעוד 12 דק׳" / "בעוד שעתיים ו-5 דק׳" / "התחיל לפני 5 דק׳" */
export function formatRelativeMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  const abs = Math.abs(rounded)
  if (abs === 0) return 'עכשיו'
  if (rounded > 0) return `בעוד ${formatMinutesSpan(abs)}`
  return `התחיל לפני ${formatMinutesSpan(abs)}`
}

export const hebrewWeekdays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const
