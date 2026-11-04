// Daily Orders and Manual (R5.1, R5.3, R5.4). Original text in both languages; the Orders use public data only
// (callsigns and known fists from Watch.worldCtx, which the player legitimately holds). The day key is G2 (R5.2).
import type { Lang } from "../i18n";

export interface DocPage { readonly title: string; readonly body: string }
export interface Station { readonly callsign: string; readonly wpm: number | null }

const ORDERS: Readonly<Record<Lang, { readonly head: string; readonly pages: readonly DocPage[]; readonly stations: string; readonly stationsNote: string; readonly news: string; readonly end: DocPage }>> = {
  en: {
    head: "DAILY ORDERS — DAY 1",
    pages: [
      { title: "Verification tasks", body: "Check every incoming order before it is stamped:\n1. Fist: the keying speed matches the station's known fist.\n2. DF bearing: the bearing agrees with the position the sender claims.\n3. DTG: the time group is current, neither stale nor ahead.\n4. Grid: the reference is readable and lies at sea.\n5. Check letter: the last letter matches your table.\nA single failed check is enough to stamp FALSE." },
      { title: "Stamping rules", body: "INPUT: Echo stamp on the back (TRUE or FALSE), signed below. No other stamp.\nOUTPUT: one RED stamp on the back.\nClip the Input and its Output together and hand the bundle to the crew at the door.\nOne message per bundle.\nPapers handed to the radio room are records: never bin them." },
    ],
    stations: "Known stations",
    stationsNote: "Fist = usual keying speed. Unknown stations have no entry.",
    news: "News",
    end: { title: "End of orders", body: "These orders are valid for this watch only.\nReturn them to the drawer when you leave the desk." },
  },
  vi: {
    head: "DAILY ORDERS — NGÀY 1",
    pages: [
      { title: "Nhiệm vụ xác minh", body: "Soát mọi mệnh lệnh đến trước khi đóng dấu:\n1. Fist: tốc độ gõ khớp với fist đã biết của đài.\n2. Hướng DF: hướng đo khớp với vị trí bên gửi khai.\n3. DTG: nhóm giờ còn hiệu lực, không cũ và không vượt trước.\n4. Grid: tọa độ đọc được và nằm trên biển.\n5. Check letter: chữ cuối khớp với bảng của bạn.\nChỉ cần một mục sai là đóng dấu GIẢ." },
      { title: "Luật đóng dấu", body: "INPUT: dấu Echo ở mặt sau (THẬT hoặc GIẢ), ký bên dưới. Không dấu nào khác.\nOUTPUT: một dấu ĐỎ ở mặt sau.\nGhim tờ Input với tờ Output của nó và giao cả xấp cho thủy thủ ở cửa.\nMỗi xấp một bức điện.\nGiấy giao cho phòng điện đài là hồ sơ: không bao giờ vứt." },
    ],
    stations: "Các đài đã biết",
    stationsNote: "Fist = tốc độ gõ quen thuộc. Đài lạ không có trong danh sách.",
    news: "Tin tức",
    end: { title: "Hết lệnh", body: "Lệnh này chỉ có hiệu lực trong ca trực này.\nCất lại vào ngăn kéo khi rời bàn." },
  },
};

/** Short invented items; three are chosen per watch with the cosmetic RNG (same choice in both languages). */
export const NEWS: Readonly<Record<Lang, readonly string[]>> = {
  en: [
    "Storm front moving east; expect static on the long-wave band after dusk.",
    "Supply boat delayed two days. Coffee is rationed until further notice.",
    "A forged order was caught last week by its check letter alone. Look at every letter.",
    "Escorts reported working in pairs near the convoy route.",
    "The chief reminds all stations: the transmitter is heard by everyone, not only by HQ.",
    "Mail arrives with the supply boat. Write short letters.",
  ],
  vi: [
    "Front bão đang dịch về phía đông; sau chạng vạng sóng dài sẽ nhiễu.",
    "Tàu tiếp tế chậm hai ngày. Cà phê được chia khẩu phần cho tới khi có lệnh mới.",
    "Tuần trước một lệnh giả bị bắt chỉ nhờ check letter. Hãy soát từng chữ.",
    "Tàu hộ tống được báo là đi theo cặp gần tuyến đoàn tàu.",
    "Máy trưởng nhắc mọi đài: máy phát ai cũng nghe được, không riêng HQ.",
    "Thư đến cùng tàu tiếp tế. Viết thư ngắn thôi.",
  ],
};

/** The day key as printed on the Orders (R5.2): from `dayEnigma`; the only place the desk shows it (R4.7). */
export interface DayKey { readonly reflector: string; readonly rotors: readonly string[]; readonly rings: string; readonly plugboard: readonly string[] }

const OBSCURA: Readonly<Record<Lang, { readonly title: string; readonly lines: readonly [string, string, string, string]; readonly how: string }>> = {
  en: { title: "Obscura Setup", lines: ["REFLECTOR", "ROTORS", "RINGS", "PLUGS"], how: "Rotors: Greek, left, middle, right.\nOpen the rotor cover (machine off) and set each window to the indicator printed on the Input. Shut the cover, switch on, type. Space ends a group." },
  vi: { title: "Obscura Setup", lines: ["PHẢN XẠ", "ROTOR", "VÒNG", "DÂY CẮM"], how: "Rotor: Greek, trái, giữa, phải.\nMở nắp rotor (máy tắt), đặt từng cửa sổ theo indicator in trên tờ Input. Đóng nắp, bật máy, gõ. Space kết thúc một nhóm." },
};

/** G3 reference data printed on the Orders: signature specimens, approved senders, the standing order, safe waters and resupply points. */
export interface PaperDocs {
  readonly signatures: readonly { readonly callsign: string; readonly variant: number }[];
  readonly approved: readonly string[];
  readonly order: "burnInput" | "archiveOutput" | "keepNothing";
  readonly items: readonly { readonly kind: "safeCoords" | "resupply"; readonly n: number; readonly xKm: number; readonly yKm: number; readonly lost: boolean }[];
}
/** Specimen signatures: the same short strokes are printed on the Input (back) and on the Orders, to be compared by eye. */
export const SIGNATURES: readonly string[] = ["~^~", "/\\/", "=-=", "<~>", "|/|", "_~_"];

const PAPER_TXT: Readonly<Record<Lang, { auth: string; authBody: string; spec: string; approved: string; order: string; orders: Readonly<Record<PaperDocs["order"], string>>; items: string; safe: string; supply: string; revoked: string; none: string }>> = {
  en: {
    auth: "Authentication", spec: "Specimen signatures", approved: "Approved senders", order: "Standing order", items: "Safe waters and resupply", safe: "SAFE", supply: "SUPPLY", revoked: "REVOKED", none: "(none)",
    authBody: "Genuine orders carry the printed seal and their station's specimen signature on the back of the Input, and an approved sender ID. The sender ID is enciphered: read it with the machine (dialled to the indicator, plugboard wired, power on).",
    orders: { burnInput: "After a hand-over, burn the Input. Never archive an Input.", archiveOutput: "After a hand-over, archive the Output. Never burn an Output.", keepNothing: "Keep nothing: do not archive or burn any sheet after a hand-over." },
  },
  vi: {
    auth: "Xác thực", spec: "Chữ ký mẫu", approved: "Người gửi được duyệt", order: "Lệnh thường trực", items: "Vùng an toàn và tiếp tế", safe: "AN TOÀN", supply: "TIẾP TẾ", revoked: "ĐÃ THU HỒI", none: "(không có)",
    authBody: "Lệnh thật có dấu in và chữ ký mẫu của đài ở mặt sau tờ Input, cùng một Sender ID được duyệt. Sender ID được mã hóa: đọc bằng máy (đặt theo indicator, cắm plugboard, bật nguồn).",
    orders: { burnInput: "Sau khi giao, hủy tờ Input. Không bao giờ lưu Input.", archiveOutput: "Sau khi giao, lưu tờ Output. Không bao giờ hủy Output.", keepNothing: "Không giữ gì: sau khi giao không lưu và không hủy tờ nào." },
  },
};

function paperPages(lang: Lang, d: PaperDocs): DocPage[] {
  const t = PAPER_TXT[lang];
  const specs = d.signatures.map((s) => `${s.callsign.padEnd(6, " ")} ${SIGNATURES[s.variant] ?? "?"}`).join("\n");
  const items = d.items.map((i) => `${i.kind === "safeCoords" ? t.safe : t.supply} ${i.n}  X ${i.xKm >= 0 ? "+" : "-"}${Math.abs(i.xKm)}  Y ${i.yKm >= 0 ? "+" : "-"}${Math.abs(i.yKm)} km${i.lost ? `  [${t.revoked}]` : ""}`).join("\n");
  return [
    { title: t.auth, body: `${t.authBody}\n\n${t.spec}\n${specs}\n\n${t.approved}\n${d.approved.join("  ") || t.none}` },
    { title: t.order, body: t.orders[d.order] },
    { title: t.items, body: items.length > 0 ? items : t.none },
  ];
}

export function ordersPages(lang: Lang, stations: readonly Station[], newsIdx: readonly number[], key?: DayKey, paper?: PaperDocs): { readonly head: string; readonly pages: readonly DocPage[] } {
  const o = ORDERS[lang];
  const ob = OBSCURA[lang];
  const setup: DocPage[] = key === undefined ? [] : [{ title: ob.title, body: `${ob.lines[0].padEnd(10, " ")}${key.reflector}\n${ob.lines[1].padEnd(10, " ")}${key.rotors.join(" ")}\n${ob.lines[2].padEnd(10, " ")}${[...key.rings].join(" ")}\n${ob.lines[3].padEnd(10, " ")}${key.plugboard.join(" ")}\n\n${ob.how}` }];
  const list = stations.map((s) => `${s.callsign.padEnd(6, " ")} ${s.wpm === null ? "—" : `${s.wpm} wpm`}`).join("\n");
  const news = newsIdx.map((k) => `• ${NEWS[lang][k] ?? ""}`).join("\n");
  const extra = paper === undefined ? [] : paperPages(lang, paper);
  return { head: o.head, pages: [...o.pages, ...setup, ...extra, { title: o.stations, body: `${list}\n\n${o.stationsNote}` }, { title: o.news, body: news }, o.end] };
}

/** Picks `n` distinct news items from a cosmetic random source. */
export function pickNews(rng: () => number, n = 3): number[] {
  const pool = NEWS.en.map((_, k) => k);
  const out: number[] = [];
  while (out.length < n && pool.length > 0) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0] as number);
  return out;
}

export const MANUAL: Readonly<Record<Lang, { readonly head: string; readonly pages: readonly DocPage[] }>> = {
  en: {
    head: "RADIO DESK MANUAL",
    pages: [
      { title: "Contents", body: "1. The desk\n2. Teletyper\n3. Cipher machine\n4. Echo stamper\n5. Paperwork\n6. Boat controls" },
      { title: "1. The desk", body: "Drag sheets with the mouse, or Tab to one and press Enter to pick it up, the arrow keys to move it and Enter to put it down.\nThe ⟲ corner turns a sheet over.\nThe drawer at the left edge holds the stamps, the pen, the clips, the Daily Orders and this Manual." },
      { title: "2. Teletyper", body: "The lamp blinks while a signal prints. Each transmission prints its own Input sheet: noise shows as ?.\nREPEAT asks the sender to send again; the old sheet stays on the desk." },
      { title: "3. Cipher machine", body: "Click an Input sheet to work on that message. LID opens the rotor cover (machine off only): set the 4 windows with the mouse wheel, arrow keys or by typing letters and wire the PLUGBOARD from the Orders (click two letters to join them, a wired letter to pull the plug), then shut the cover and switch PWR on. The keys do nothing while the machine is off.\nType the groups (Space ends a group; the rotors restart at every group), then press Enter to decode. Green letters match the printed Input, red ones do not. A wrong setting or plugboard gives wrong text and no warning. Paperwork mistakes are cited by the sim: stamps on the wrong sheet or colour, binning records, a bad hand-over, a missed deadline, acting against the standing order. Five citations end your watch.\nThe Output sheet shows your copy, then the plain text. Damaged groups are marked.\nPULL OUT brings the machine over the desk." },
      { title: "4. Echo stamper", body: "Select the Input, back side up. Set the switch to TRUE or FALSE. READY lights when the sheet is in place.\nPress STAMP. The decision goes to the boat at once and the ink never comes off." },
      { title: "5. Paperwork", body: "Take a tool from the drawer, then click a sheet. Stamps and signatures go on the back.\nThe clip joins sheets of the same message; clip the same sheet twice to take it out again.\nDrop the bundle on the door (or press HAND OVER). The bin refuses records." },
      { title: "6. Boat controls", body: "Lever: surface, periscope depth, dive. − and + change speed; the arrow keys steer.\nSILENCE stops all transmitting. REPORT keys the transmitter for ten seconds: every second on the air can be heard.\nAUTH, SONAR and LOG open the drawers on the top panel." },
    ],
  },
  vi: {
    head: "SỔ TAY BÀN ĐIỆN ĐÀI",
    pages: [
      { title: "Mục lục", body: "1. Bàn làm việc\n2. Máy in tin\n3. Máy mã\n4. Máy dấu Echo\n5. Giấy tờ\n6. Điều khiển tàu" },
      { title: "1. Bàn làm việc", body: "Kéo giấy bằng chuột, hoặc Tab tới một tờ, Enter để nhấc, mũi tên để di chuyển, Enter để đặt.\nGóc ⟲ để lật tờ giấy.\nNgăn kéo ở mép trái đựng dấu, bút, ghim, Daily Orders và sổ tay này." },
      { title: "2. Máy in tin", body: "Đèn nháy khi tín hiệu đang in. Mỗi lần phát in ra một tờ Input riêng: chỗ nhiễu hiện là ?.\nXIN LẶP để bên gửi phát lại; tờ cũ vẫn ở trên bàn." },
      { title: "3. Máy mã", body: "Bấm vào tờ Input để làm bức điện đó. NẮP mở nắp rotor (chỉ khi máy tắt): đặt 4 cửa sổ bằng lăn chuột, phím mũi tên hoặc gõ chữ và cắm BẢNG CẮM theo Orders (bấm hai chữ để nối, bấm chữ đã nối để rút), rồi đóng nắp và bật NGUỒN. Máy tắt thì phím không có tác dụng.\nGõ các nhóm (Space kết thúc nhóm; rotor đặt lại ở đầu mỗi nhóm), rồi Enter để giải. Chữ xanh khớp tờ Input đã in, chữ đỏ thì không. Đặt sai hoặc cắm sai thì ra chữ sai và không có cảnh báo. Lỗi giấy tờ bị mô phỏng cảnh cáo: đóng sai tờ hoặc sai màu, vứt hồ sơ, giao sai cách, quá hạn, làm trái lệnh thường trực. Năm cảnh cáo là hết ca.\nTờ Output hiện bản chép, sau đó là bản rõ. Nhóm hỏng được đánh dấu.\nKÉO RA để đưa máy lên bàn." },
      { title: "4. Máy dấu Echo", body: "Chọn tờ Input, lật mặt sau lên. Gạt công tắc THẬT hoặc GIẢ. Đèn SẴN SÀNG sáng khi tờ giấy đúng chỗ.\nBấm ĐÓNG DẤU. Quyết định được gửi lên tàu ngay và mực không bao giờ xóa được." },
      { title: "5. Giấy tờ", body: "Lấy dụng cụ trong ngăn kéo rồi bấm vào tờ giấy. Dấu và chữ ký ở mặt sau.\nGhim nối các tờ của cùng bức điện; ghim lại chính tờ đó lần nữa để gỡ ra.\nThả xấp giấy vào cửa (hoặc bấm GIAO). Thùng rác không nhận hồ sơ." },
      { title: "6. Điều khiển tàu", body: "Cần gạt: nổi, độ sâu kính tiềm vọng, lặn. − và + đổi tốc độ; phím mũi tên để lái.\nIM LẶNG ngừng mọi lần phát. BÁO CÁO bật máy phát mười giây: mỗi giây phát sóng đều có thể bị nghe thấy.\nAUTH, SONAR và LOG mở ngăn kéo ở bảng trên." },
    ],
  },
};
