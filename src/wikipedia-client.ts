import axios from 'axios';
import { SearchResult, WikipediaArticle, ArticleSection, Coordinates, RelatedTopic } from './types.js';

export class WikipediaClient {
  private language: string;
  private baseUrl: string;
  private accessToken?: string;
  private enableCache: boolean;
  private cache: Map<string, any> = new Map();

  // ── ISO 3166-1 alpha-2 country codes → Wikipedia language code ───────────
  // Covers every UN-recognised country plus common territories.
  // Where a country has multiple official languages, the majority/official one is used.
  public static readonly COUNTRY_TO_LANGUAGE: Record<string, string> = {
    // A
    'AD': 'ca',  'Andorra': 'ca',
    'AE': 'ar',  'UAE': 'ar',       'United Arab Emirates': 'ar',
    'AF': 'fa',  'Afghanistan': 'fa',
    'AG': 'en',  'Antigua and Barbuda': 'en',
    'AL': 'sq',  'Albania': 'sq',
    'AM': 'hy',  'Armenia': 'hy',
    'AO': 'pt',  'Angola': 'pt',
    'AR': 'es',  'Argentina': 'es',
    'AT': 'de',  'Austria': 'de',
    'AU': 'en',  'Australia': 'en',
    'AZ': 'az',  'Azerbaijan': 'az',
    // B
    'BA': 'bs',  'Bosnia and Herzegovina': 'bs',
    'BB': 'en',  'Barbados': 'en',
    'BD': 'bn',  'Bangladesh': 'bn',
    'BE': 'nl',  'Belgium': 'nl',
    'BF': 'fr',  'Burkina Faso': 'fr',
    'BG': 'bg',  'Bulgaria': 'bg',
    'BH': 'ar',  'Bahrain': 'ar',
    'BI': 'fr',  'Burundi': 'fr',
    'BJ': 'fr',  'Benin': 'fr',
    'BN': 'ms',  'Brunei': 'ms',
    'BO': 'es',  'Bolivia': 'es',
    'BR': 'pt',  'Brazil': 'pt',
    'BS': 'en',  'Bahamas': 'en',
    'BT': 'dz',  'Bhutan': 'dz',
    'BW': 'en',  'Botswana': 'en',
    'BY': 'be',  'Belarus': 'be',
    'BZ': 'en',  'Belize': 'en',
    // C
    'CA': 'en',  'Canada': 'en',
    'CD': 'fr',  'Democratic Republic of the Congo': 'fr',
    'CF': 'fr',  'Central African Republic': 'fr',
    'CG': 'fr',  'Republic of the Congo': 'fr',
    'CH': 'de',  'Switzerland': 'de',
    'CI': 'fr',  "Côte d'Ivoire": 'fr',  'Ivory Coast': 'fr',
    'CL': 'es',  'Chile': 'es',
    'CM': 'fr',  'Cameroon': 'fr',
    'CN': 'zh',  'China': 'zh',
    'CO': 'es',  'Colombia': 'es',
    'CR': 'es',  'Costa Rica': 'es',
    'CU': 'es',  'Cuba': 'es',
    'CV': 'pt',  'Cape Verde': 'pt',
    'CY': 'el',  'Cyprus': 'el',
    'CZ': 'cs',  'Czech Republic': 'cs',  'Czechia': 'cs',
    // D
    'DJ': 'fr',  'Djibouti': 'fr',
    'DK': 'da',  'Denmark': 'da',
    'DM': 'en',  'Dominica': 'en',
    'DO': 'es',  'Dominican Republic': 'es',
    'DZ': 'ar',  'Algeria': 'ar',
    // E
    'EC': 'es',  'Ecuador': 'es',
    'EE': 'et',  'Estonia': 'et',
    'EG': 'ar',  'Egypt': 'ar',
    'ER': 'ti',  'Eritrea': 'ti',
    'ES': 'es',  'Spain': 'es',
    'ET': 'am',  'Ethiopia': 'am',
    // F
    'FI': 'fi',  'Finland': 'fi',
    'FJ': 'en',  'Fiji': 'en',
    'FM': 'en',  'Micronesia': 'en',
    'FR': 'fr',  'France': 'fr',
    // G
    'GA': 'fr',  'Gabon': 'fr',
    'GB': 'en',  'United Kingdom': 'en',  'UK': 'en',
    'GD': 'en',  'Grenada': 'en',
    'GE': 'ka',  'Georgia': 'ka',
    'GH': 'en',  'Ghana': 'en',
    'GM': 'en',  'Gambia': 'en',
    'GN': 'fr',  'Guinea': 'fr',
    'GQ': 'es',  'Equatorial Guinea': 'es',
    'GR': 'el',  'Greece': 'el',
    'GT': 'es',  'Guatemala': 'es',
    'GW': 'pt',  'Guinea-Bissau': 'pt',
    'GY': 'en',  'Guyana': 'en',
    // H
    'HN': 'es',  'Honduras': 'es',
    'HR': 'hr',  'Croatia': 'hr',
    'HT': 'ht',  'Haiti': 'ht',
    'HU': 'hu',  'Hungary': 'hu',
    // I
    'ID': 'id',  'Indonesia': 'id',
    'IE': 'en',  'Ireland': 'en',
    'IL': 'he',  'Israel': 'he',
    'IN': 'hi',  'India': 'hi',
    'IQ': 'ar',  'Iraq': 'ar',
    'IR': 'fa',  'Iran': 'fa',
    'IS': 'is',  'Iceland': 'is',
    'IT': 'it',  'Italy': 'it',
    // J
    'JM': 'en',  'Jamaica': 'en',
    'JO': 'ar',  'Jordan': 'ar',
    'JP': 'ja',  'Japan': 'ja',
    // K
    'KE': 'sw',  'Kenya': 'sw',
    'KG': 'ky',  'Kyrgyzstan': 'ky',
    'KH': 'km',  'Cambodia': 'km',
    'KI': 'en',  'Kiribati': 'en',
    'KM': 'ar',  'Comoros': 'ar',
    'KN': 'en',  'Saint Kitts and Nevis': 'en',
    'KP': 'ko',  'North Korea': 'ko',
    'KR': 'ko',  'South Korea': 'ko',
    'KW': 'ar',  'Kuwait': 'ar',
    'KZ': 'kk',  'Kazakhstan': 'kk',
    // L
    'LA': 'lo',  'Laos': 'lo',
    'LB': 'ar',  'Lebanon': 'ar',
    'LC': 'en',  'Saint Lucia': 'en',
    'LI': 'de',  'Liechtenstein': 'de',
    'LK': 'si',  'Sri Lanka': 'si',
    'LR': 'en',  'Liberia': 'en',
    'LS': 'st',  'Lesotho': 'st',
    'LT': 'lt',  'Lithuania': 'lt',
    'LU': 'fr',  'Luxembourg': 'fr',
    'LV': 'lv',  'Latvia': 'lv',
    'LY': 'ar',  'Libya': 'ar',
    // M
    'MA': 'ar',  'Morocco': 'ar',
    'MC': 'fr',  'Monaco': 'fr',
    'MD': 'ro',  'Moldova': 'ro',
    'ME': 'sr',  'Montenegro': 'sr',
    'MG': 'mg',  'Madagascar': 'mg',
    'MH': 'en',  'Marshall Islands': 'en',
    'MK': 'mk',  'North Macedonia': 'mk',
    'ML': 'fr',  'Mali': 'fr',
    'MM': 'my',  'Myanmar': 'my',  'Burma': 'my',
    'MN': 'mn',  'Mongolia': 'mn',
    'MR': 'ar',  'Mauritania': 'ar',
    'MT': 'mt',  'Malta': 'mt',
    'MU': 'fr',  'Mauritius': 'fr',
    'MV': 'dv',  'Maldives': 'dv',
    'MW': 'en',  'Malawi': 'en',
    'MX': 'es',  'Mexico': 'es',
    'MY': 'ms',  'Malaysia': 'ms',
    'MZ': 'pt',  'Mozambique': 'pt',
    // N
    'NA': 'af',  'Namibia': 'af',
    'NE': 'fr',  'Niger': 'fr',
    'NG': 'en',  'Nigeria': 'en',
    'NI': 'es',  'Nicaragua': 'es',
    'NL': 'nl',  'Netherlands': 'nl',
    'NO': 'no',  'Norway': 'no',
    'NP': 'ne',  'Nepal': 'ne',
    'NR': 'en',  'Nauru': 'en',
    'NZ': 'en',  'New Zealand': 'en',
    // O
    'OM': 'ar',  'Oman': 'ar',
    // P
    'PA': 'es',  'Panama': 'es',
    'PE': 'es',  'Peru': 'es',
    'PG': 'en',  'Papua New Guinea': 'en',
    'PH': 'tl',  'Philippines': 'tl',
    'PK': 'ur',  'Pakistan': 'ur',
    'PL': 'pl',  'Poland': 'pl',
    'PT': 'pt',  'Portugal': 'pt',
    'PW': 'en',  'Palau': 'en',
    'PY': 'es',  'Paraguay': 'es',
    // Q
    'QA': 'ar',  'Qatar': 'ar',
    // R
    'RO': 'ro',  'Romania': 'ro',
    'RS': 'sr',  'Serbia': 'sr',
    'RU': 'ru',  'Russia': 'ru',
    'RW': 'rw',  'Rwanda': 'rw',
    // S
    'SA': 'ar',  'Saudi Arabia': 'ar',
    'SB': 'en',  'Solomon Islands': 'en',
    'SC': 'fr',  'Seychelles': 'fr',
    'SD': 'ar',  'Sudan': 'ar',
    'SE': 'sv',  'Sweden': 'sv',
    'SG': 'en',  'Singapore': 'en',
    'SI': 'sl',  'Slovenia': 'sl',
    'SK': 'sk',  'Slovakia': 'sk',
    'SL': 'en',  'Sierra Leone': 'en',
    'SM': 'it',  'San Marino': 'it',
    'SN': 'fr',  'Senegal': 'fr',
    'SO': 'so',  'Somalia': 'so',
    'SR': 'nl',  'Suriname': 'nl',
    'SS': 'en',  'South Sudan': 'en',
    'ST': 'pt',  'São Tomé and Príncipe': 'pt',
    'SV': 'es',  'El Salvador': 'es',
    'SY': 'ar',  'Syria': 'ar',
    'SZ': 'en',  'Eswatini': 'en',  'Swaziland': 'en',
    // T
    'TD': 'fr',  'Chad': 'fr',
    'TG': 'fr',  'Togo': 'fr',
    'TH': 'th',  'Thailand': 'th',
    'TJ': 'tg',  'Tajikistan': 'tg',
    'TL': 'pt',  'East Timor': 'pt',  'Timor-Leste': 'pt',
    'TM': 'tk',  'Turkmenistan': 'tk',
    'TN': 'ar',  'Tunisia': 'ar',
    'TO': 'en',  'Tonga': 'en',
    'TR': 'tr',  'Turkey': 'tr',  'Türkiye': 'tr',
    'TT': 'en',  'Trinidad and Tobago': 'en',
    'TV': 'en',  'Tuvalu': 'en',
    'TW': 'zh-tw', 'Taiwan': 'zh-tw',
    'TZ': 'sw',  'Tanzania': 'sw',
    // U
    'UA': 'uk',  'Ukraine': 'uk',
    'UG': 'en',  'Uganda': 'en',
    'US': 'en',  'USA': 'en',  'United States': 'en',  'United States of America': 'en',
    'UY': 'es',  'Uruguay': 'es',
    'UZ': 'uz',  'Uzbekistan': 'uz',
    // V
    'VA': 'it',  'Vatican': 'it',  'Holy See': 'it',
    'VC': 'en',  'Saint Vincent and the Grenadines': 'en',
    'VE': 'es',  'Venezuela': 'es',
    'VN': 'vi',  'Vietnam': 'vi',  'Viet Nam': 'vi',
    'VU': 'fr',  'Vanuatu': 'fr',
    // W
    'WS': 'sm',  'Samoa': 'sm',
    // Y
    'YE': 'ar',  'Yemen': 'ar',
    // Z
    'ZA': 'af',  'South Africa': 'af',
    'ZM': 'en',  'Zambia': 'en',
    'ZW': 'en',  'Zimbabwe': 'en',

    // ── Special territories & common aliases ───────────────────────────────
    'HK': 'zh-yue', 'Hong Kong': 'zh-yue',
    'MO': 'zh',     'Macao': 'zh',  'Macau': 'zh',
    'PS': 'ar',     'Palestine': 'ar',
    'XK': 'sq',     'Kosovo': 'sq',

    // ── Direct language-code pass-throughs (for convenience) ───────────────
    // Major Wikipedia languages a user might pass directly as "country"
    'EN': 'en',   'DE': 'de',   'FR': 'fr',   'ES': 'es',
    'PT': 'pt',   'RU': 'ru',   'JA': 'ja',   'ZH': 'zh',
    'AR': 'ar',   'IT': 'it',   'KO': 'ko',   'NL': 'nl',
    'PL': 'pl',   'SV': 'sv',   'UK': 'uk',   'VI': 'vi',
    'FA': 'fa',   'TR': 'tr',   'HI': 'hi',   'ID': 'id',
    'CS': 'cs',   'HU': 'hu',   'RO': 'ro',   'FI': 'fi',
    'DA': 'da',   'NO': 'no',   'SK': 'sk',   'EL': 'el',
    'HE': 'he',   'BG': 'bg',   'HR': 'hr',   'SL': 'sl',
    'SR': 'sr',   'LT': 'lt',   'LV': 'lv',   'ET': 'et',
    'SQ': 'sq',   'MK': 'mk',   'BS': 'bs',   'BE': 'be',
    'KA': 'ka',   'HY': 'hy',   'AZ': 'az',   'KK': 'kk',
    'UZ': 'uz',   'TK': 'tk',   'KY': 'ky',   'TG': 'tg',
    'MN': 'mn',   'MY': 'my',   'KM': 'km',   'LO': 'lo',
    'SI': 'si',   'NE': 'ne',   'UR': 'ur',   'BN': 'bn',
    'TA': 'ta',   'TE': 'te',   'ML': 'ml',   'KN': 'kn',
    'MS': 'ms',   'TL': 'tl',   'SW': 'sw',   'AF': 'af',
    'IS': 'is',   'MT': 'mt',   'GL': 'gl',   'EU': 'eu',
    'CA': 'ca',   'OC': 'oc',   'CY': 'cy',   'GA': 'ga',
    'EO': 'eo',   'LA': 'la',   'VO': 'vo',   'IO': 'io',
    'IA': 'ia',   'IE': 'ie',   'AN': 'an',   'AST': 'ast',
    'SCN': 'scn', 'NAP': 'nap', 'VEC': 'vec', 'LMO': 'lmo',
    'PMN': 'pms', 'FUR': 'fur', 'LIJ': 'lij', 'RUE': 'rue',
    'WA': 'wa',   'LI': 'li',   'ZEA': 'zea', 'VLS': 'vls',
    'FY': 'fy',   'NDS': 'nds', 'BAR': 'bar', 'ALS': 'als',
    'KSH': 'ksh', 'PDC': 'pdc', 'LB': 'lb',
    'MR': 'mr',   'GU': 'gu',   'PA': 'pa',   'OR': 'or',
    'AS': 'as',   'SA': 'sa',   'HIF': 'hif', 'BPY': 'bpy',
    'DZ': 'dz',   'BO': 'bo',   'WUU': 'wuu', 'YUE': 'yue',
    'MIN': 'min', 'CEB': 'ceb', 'WAR': 'war', 'ILO': 'ilo',
    'BCL': 'bcl', 'PNB': 'pnb', 'SDC': 'sdc', 'HBM': 'hbm',
    'TT': 'tt',   'BA': 'ba',   'CV': 'cv',   'SAH': 'sah',
    'MHR': 'mhr', 'MRJ': 'mrj', 'UDM': 'udm', 'KV': 'kv',
    'KOI': 'koi', 'ACE': 'ace', 'BJN': 'bjn', 'BUG': 'bug',
    'MAP_BMS': 'map-bms', 'JV': 'jv',   'SU': 'su',
    'AMI': 'ami', 'TRV': 'trv', 'ZH_YUE': 'zh-yue',
    'ZH_HANS': 'zh-hans', 'ZH_HANT': 'zh-hant',
    'ZH_TW': 'zh-tw',    'ZH_HK': 'zh-hk',
    'PT_BR': 'pt',        'ES_MX': 'es',
    'NB': 'nb',   'NN': 'nn',   'SIMPLE': 'simple',
    'KO': 'ko',
  };

  // ── Full set of valid Wikipedia subdomain language codes ─────────────────
  // Used to validate direct language= arguments (pass-through without mapping)
  private static readonly VALID_LANGUAGE_CODES = new Set([
    'ab','ace','ady','af','ak','als','alt','am','ami','an','ang','ar','arc',
    'ary','arz','as','ast','atj','av','avk','awa','ay','az',
    'ba','ban','bar','bat-smg','bcl','be','be-tarask','bg','bh','bi','bjn',
    'bm','bn','bo','bpy','br','bs','bug','bxr',
    'ca','cbk-zam','cdo','ce','ceb','ch','cho','chr','chy','ckb','co','cr',
    'crh','cs','csb','cu','cv','cy',
    'da','dag','de','din','diq','dsb','dtp','dty','dv','dz',
    'ee','el','eml','en','eo','es','et','eu','ext',
    'fa','ff','fi','fiu-vro','fj','fo','fr','frp','frr','fur','fy',
    'ga','gag','gan','gcr','gd','gl','glk','gn','gom','gor','got','gsw',
    'gu','guc','gur','guw','gv',
    'ha','hak','haw','he','hi','hif','ho','hr','hsb','ht','hu','hy','hyw',
    'hz',
    'ia','id','ie','ig','ii','ik','ilo','inh','io','is','it','iu',
    'ja','jam','jbo','jv',
    'ka','kaa','kab','kbd','kbp','kcg','kg','ki','kj','kk','kl','km','kn',
    'ko','koi','kr','krc','ks','ksh','ku','kv','kw','ky',
    'la','lad','lb','lbe','lez','lfn','lg','li','lij','lld','lmo','ln','lo',
    'lrc','lt','ltg','lv',
    'mai','map-bms','mdf','mg','mh','mhr','mi','min','mk','ml','mn','mni',
    'mnw','mo','mr','mrj','ms','mt','mus','mwl','my','myv','mzn',
    'na','nah','nap','nds','nds-nl','ne','new','ng','nia','nl','nn','no',
    'nov','nqo','nrm','nso','nv','ny',
    'oc','olo','om','or','os',
    'pa','pag','pam','pap','pcd','pcm','pdc','pfl','pi','pih','pl','pms',
    'pnb','pnt','ps','pt',
    'qu',
    'rm','rmy','rn','ro','roa-rup','roa-tara','ru','rue','rw',
    'sa','sah','sat','sc','scn','sco','sd','se','sg','sh','shi','shn','si',
    'simple','sk','skr','sl','sm','smn','sn','so','sq','sr','srn','ss','st',
    'stq','su','sv','sw','szl',
    'szy','ta','tay','tcy','te','tet','tg','th','ti','tk','tl','tn','to',
    'tpi','tr','trv','ts','tt','tum','tw','ty',
    'tyv',
    'udm','ug','uk','ur','uz',
    've','vec','vep','vi','vls','vo',
    'wa','war','wo','wuu',
    'xal','xh','xmf',
    'yi','yo',
    'za','zea','zh','zh-classical','zh-min-nan','zh-yue','zh-hans','zh-hant',
    'zh-tw','zh-hk','zu',
  ]);

  constructor(options: {
    language?: string;
    country?: string;
    enableCache?: boolean;
    accessToken?: string;
  } = {}) {
    this.language = options.language || 'en';
    this.accessToken = options.accessToken;
    this.enableCache = options.enableCache || false;

    if (options.country) {
      // Try exact match first, then uppercase, then title-case
      const resolved =
        WikipediaClient.COUNTRY_TO_LANGUAGE[options.country] ||
        WikipediaClient.COUNTRY_TO_LANGUAGE[options.country.toUpperCase()] ||
        WikipediaClient.COUNTRY_TO_LANGUAGE[
          options.country.charAt(0).toUpperCase() + options.country.slice(1).toLowerCase()
        ];

      if (resolved) {
        this.language = resolved;
      } else {
        // Last resort: treat the value as a raw language code if it looks valid
        const lc = options.country.toLowerCase().replace(/_/g, '-');
        if (WikipediaClient.VALID_LANGUAGE_CODES.has(lc)) {
          this.language = lc;
        } else {
          throw new Error(
            `Unsupported country or language: "${options.country}". ` +
            `Use list_supported_countries to see all supported options.`
          );
        }
      }
    } else if (options.language) {
      // Validate the language code
      const lc = options.language.toLowerCase().replace(/_/g, '-');
      if (WikipediaClient.VALID_LANGUAGE_CODES.has(lc)) {
        this.language = lc;
      } else {
        // Accept it anyway — Wikipedia may have added new editions since this list was built
        this.language = options.language;
      }
    }

    this.baseUrl = `https://${this.language}.wikipedia.org/w/api.php`;
  }

  getLanguage(): string {
    return this.language;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'User-Agent': 'Wikipedia-MCP-Server/1.0.0 (https://vercel.com/wikipedia-mcp)'
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private getCacheKey(method: string, params: Record<string, any>): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.enableCache) return null;
    return this.cache.get(key) ?? null;
  }

  private setCache(key: string, value: any): void {
    if (!this.enableCache) return;
    this.cache.set(key, value);
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  private async makeRequest(params: Record<string, any>): Promise<any> {
    const cacheKey = this.getCacheKey('request', params);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(this.baseUrl, {
        params: { format: 'json', ...params },
        headers: this.getHeaders(),
        timeout: 10000
      });
      this.setCache(cacheKey, response.data);
      return response.data;
    } catch (error: any) {
      console.error('Wikipedia API request failed:', error.message);
      throw new Error(`Wikipedia API error: ${error.message}`);
    }
  }

  async search(query: string, options: { limit?: number } = {}): Promise<SearchResult[]> {
    if (!query?.trim()) return [];
    const data = await this.makeRequest({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: options.limit || 10,
      srsort: 'relevance'
    });
    return (data.query?.search ?? []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      pageid: item.pageid,
      url: `https://${this.language}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
    }));
  }

  async getArticle(title: string): Promise<WikipediaArticle> {
    if (!title?.trim()) return { title, pageid: 0, exists: false, error: 'Invalid title provided' };
    try {
      const data = await this.makeRequest({
        action: 'query',
        prop: 'extracts|info|categories',
        titles: title,
        exintro: false,
        explaintext: true,
        inprop: 'url|preload',
        clshow: '!hidden',
        redirects: 1,
        formatversion: 2
      });
      if (data.query?.pages) {
        const page = data.query.pages[0];
        if (page.missing !== undefined) return { title, pageid: 0, exists: false, error: 'Article not found' };
        return {
          title: page.title,
          pageid: page.pageid,
          summary: this.extractSummary(page.extract),
          text: page.extract,
          links: [],
          categories: page.categories?.map((c: any) => c.title) ?? [],
          exists: true
        };
      }
      return { title, pageid: 0, exists: false, error: 'Article not found' };
    } catch (error: any) {
      return { title, pageid: 0, exists: false, error: error.message };
    }
  }

  async getSummary(title: string): Promise<string> {
    if (!title?.trim()) return 'Error: Invalid title provided';
    try {
      const data = await this.makeRequest({
        action: 'query',
        prop: 'extracts',
        titles: title,
        exintro: true,
        explaintext: true,
        redirects: 1,
        formatversion: 2
      });
      if (data.query?.pages) {
        const page = data.query.pages[0];
        if (page.missing !== undefined) return 'Error: Article not found';
        return page.extract || 'Error: No summary available';
      }
      return 'Error: Article not found';
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async getSections(title: string): Promise<ArticleSection[]> {
    if (!title?.trim()) return [];
    try {
      const data = await this.makeRequest({ action: 'parse', page: title, prop: 'sections', formatversion: 2 });
      return (data.parse?.sections ?? []).map((s: any) => ({ title: s.line, content: '', level: s.level }));
    } catch (error: any) {
      console.error('Error getting sections:', error.message);
      return [];
    }
  }

  async getLinks(title: string): Promise<string[]> {
    if (!title?.trim()) return [];
    try {
      const data = await this.makeRequest({
        action: 'query', prop: 'links', titles: title, pllimit: 500, formatversion: 2
      });
      return data.query?.pages?.[0]?.links?.map((l: any) => l.title) ?? [];
    } catch (error: any) {
      console.error('Error getting links:', error.message);
      return [];
    }
  }

  async getCoordinates(title: string): Promise<any> {
    if (!title?.trim()) return { title, pageid: 0, coordinates: [], exists: false, error: 'Invalid title provided' };
    try {
      const data = await this.makeRequest({
        action: 'query', prop: 'coordinates', titles: title,
        coprop: 'type|name|dim|globe', formatversion: 2
      });
      if (data.query?.pages) {
        const page = data.query.pages[0];
        if (page.missing !== undefined) return { title, pageid: 0, coordinates: [], exists: false, error: 'Article not found' };
        return {
          title: page.title,
          pageid: page.pageid,
          coordinates: (page.coordinates ?? []).map((c: any) => ({
            latitude: c.lat, longitude: c.lon, globe: c.globe || 'earth', type: c.type, dim: c.dim, name: c.name
          })),
          exists: true
        };
      }
      return { title, pageid: 0, coordinates: [], exists: false, error: 'Article not found' };
    } catch (error: any) {
      return { title, pageid: 0, coordinates: [], exists: false, error: error.message };
    }
  }

  async getRelatedTopics(title: string, limit: number = 10): Promise<RelatedTopic[]> {
    if (!title?.trim()) return [];
    try {
      const links = await this.getLinks(title);
      const relatedTopics: RelatedTopic[] = [];
      for (const link of links.slice(0, limit)) {
        try {
          const summary = await this.getSummary(link);
          if (summary && !summary.startsWith('Error:')) {
            relatedTopics.push({
              title: link,
              description: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
              relevance: 0.8
            });
          }
        } catch { continue; }
      }
      return relatedTopics;
    } catch (error: any) {
      console.error('Error getting related topics:', error.message);
      return [];
    }
  }

  async summarizeForQuery(title: string, query: string, maxLength: number = 250): Promise<string> {
    if (!title?.trim() || !query?.trim()) return 'Error: Invalid title or query provided';
    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) return 'Error: Article not found or no content available';
      const queryWords = query.toLowerCase().split(/\s+/);
      const relevant = article.text.split(/[.!?]+/).filter(s =>
        queryWords.some(w => s.toLowerCase().includes(w))
      );
      const summary = (relevant.length ? relevant.join('. ').trim() : await this.getSummary(title));
      return summary.length > maxLength ? summary.substring(0, maxLength) + '...' : summary;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async summarizeSection(title: string, sectionTitle: string, maxLength: number = 150): Promise<string> {
    if (!title?.trim() || !sectionTitle?.trim()) return 'Error: Invalid title or section title provided';
    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) return 'Error: Article not found or no content available';
      let sectionContent = '';
      let inTarget = false;
      let targetLevel = 0;
      for (const line of article.text.split('\n')) {
        const t = line.trim();
        const m = t.match(/^(=+)\s*(.+?)\s*\1$/);
        if (m) {
          const level = m[1].length;
          if (m[2].toLowerCase() === sectionTitle.toLowerCase()) { inTarget = true; targetLevel = level; }
          else if (inTarget && level <= targetLevel) break;
        } else if (inTarget && t) {
          sectionContent += t + ' ';
        }
      }
      if (!sectionContent.trim()) return 'Error: Section not found';
      return sectionContent.length > maxLength ? sectionContent.substring(0, maxLength) + '...' : sectionContent.trim();
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async extractFacts(title: string, topic?: string, count: number = 5): Promise<string[]> {
    if (!title?.trim()) return [];
    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) return [];
      let content = article.text;
      if (topic?.trim()) {
        const s = await this.summarizeForQuery(title, topic, 1000);
        if (s && !s.startsWith('Error:')) content = s;
      }
      const facts: string[] = [];
      for (const sentence of content.split(/[.!?]+/)) {
        const t = sentence.trim();
        if (t.length < 20 || t.length > 300) continue;
        if (/\b(is|are|was|were|has|have|can|cannot|must|should)\b/i.test(t) ||
            /\b\d{1,4}\b/.test(t) ||
            /\b(born|died|established|founded|created|invented)\b/i.test(t)) {
          facts.push(t);
          if (facts.length >= count) break;
        }
      }
      return facts;
    } catch (error: any) {
      console.error('Error extracting facts:', error.message);
      return [];
    }
  }

  async testConnectivity(): Promise<any> {
    const start = Date.now();
    try {
      const data = await this.makeRequest({ action: 'query', meta: 'siteinfo', siprop: 'general', format: 'json' });
      const ms = Date.now() - start;
      if (data.query?.general) {
        return {
          status: 'success',
          base_url: `https://${this.language}.wikipedia.org`,
          language: this.language,
          site_name: data.query.general.sitename || 'Wikipedia',
          response_time_ms: ms
        };
      }
      return { status: 'failed', error: 'Invalid response from Wikipedia API', response_time_ms: ms };
    } catch (error: any) {
      return { status: 'failed', error: error.message, response_time_ms: Date.now() - start };
    }
  }

  private extractSummary(text: string): string {
    if (!text) return '';
    const first = text.split('\n\n')[0];
    return first.length <= 500 ? first : first.substring(0, 500) + '...';
  }

  static listSupportedCountries(): Record<string, any> {
    // Group country codes / names by their target language
    const byLanguage: Record<string, string[]> = {};
    for (const [country, language] of Object.entries(WikipediaClient.COUNTRY_TO_LANGUAGE)) {
      (byLanguage[language] ??= []).push(country);
    }

    // Also surface every valid Wikipedia language code on its own
    const allLanguages: Record<string, any> = {};
    for (const lang of WikipediaClient.VALID_LANGUAGE_CODES) {
      allLanguages[lang] = {
        wikipedia_url: `https://${lang}.wikipedia.org`,
        country_codes: byLanguage[lang] ?? []
      };
    }
    return allLanguages;
  }
}
