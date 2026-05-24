export interface Theme {
  name: string;
  label: string;
  emoji: string;
  gradient: string;       // CSS background for nav sidebar / header
  primary: string;        // OKLCH value for --primary
  primaryFg: string;      // foreground on primary
}

// SVG data URIs for illustrated kid themes
// Single-quoted SVG attributes, # encoded as %23, < as %3C, > as %3E

// Ocean: layered wave scene — sky, 5 wave bands with foam caps, sun, seagulls
const OCEAN_SVG = "linear-gradient(rgba(0,0,0,0.12),rgba(0,0,0,0.12)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%230369a1'/%3E%3Crect width='200' height='100' fill='%2338bdf8' opacity='0.35'/%3E%3Cpath d='M0 155 C50 148 100 162 150 153 S185 148 200 152 L200 300 L0 300Z' fill='%230c4a6e' opacity='.7'/%3E%3Cpath d='M0 178 C35 165 75 182 110 172 S165 158 200 170 L200 300 L0 300Z' fill='%230c4a6e'/%3E%3Cpath d='M0 200 C30 188 65 205 100 194 S162 178 200 192 L200 300 L0 300Z' fill='%230e7490'/%3E%3Cpath d='M0 220 C28 208 60 224 94 214 S158 198 200 212 L200 300 L0 300Z' fill='%230891b2'/%3E%3Cpath d='M0 240 C22 228 52 244 82 234 S148 218 200 232 L200 300 L0 300Z' fill='%2306b6d4'/%3E%3Cpath d='M8 239 Q18 233 28 239' stroke='white' stroke-width='2' fill='none' opacity='.65'/%3E%3Cpath d='M55 232 Q65 226 75 232' stroke='white' stroke-width='2' fill='none' opacity='.6'/%3E%3Cpath d='M100 225 Q110 219 120 225' stroke='white' stroke-width='2' fill='none' opacity='.6'/%3E%3Cpath d='M155 228 Q165 222 175 228' stroke='white' stroke-width='1.5' fill='none' opacity='.5'/%3E%3Cpath d='M20 219 Q28 214 36 219' stroke='white' stroke-width='1.5' fill='none' opacity='.4'/%3E%3Cpath d='M80 213 Q88 208 96 213' stroke='white' stroke-width='1.5' fill='none' opacity='.4'/%3E%3Cpath d='M145 211 Q153 206 161 211' stroke='white' stroke-width='1' fill='none' opacity='.3'/%3E%3Ccircle cx='100' cy='40' r='14' fill='%23fef3c7' opacity='.9'/%3E%3Ccircle cx='100' cy='40' r='9' fill='%23fde68a'/%3E%3Cellipse cx='100' cy='175' rx='10' ry='2.5' fill='%23fde68a' opacity='.15'/%3E%3Cellipse cx='100' cy='195' rx='15' ry='3' fill='%23fde68a' opacity='.1'/%3E%3Cpath d='M72 62 Q78 56 84 62' stroke='white' stroke-width='1.5' fill='none' opacity='.7'/%3E%3Cpath d='M95 50 Q100 45 105 50' stroke='white' stroke-width='1.2' fill='none' opacity='.55'/%3E%3Cpath d='M118 68 Q123 63 128 68' stroke='white' stroke-width='1' fill='none' opacity='.45'/%3E%3C/svg%3E\") center / cover no-repeat";

// Minecraft: world cross-section — sky, clouds, creeper, grass, dirt, stone, diamond ore
const MINECRAFT_SVG = "linear-gradient(rgba(0,0,0,0.18),rgba(0,0,0,0.18)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%2387CEEB'/%3E%3Crect x='155' y='14' width='18' height='18' fill='%23FFE57A'/%3E%3Crect x='152' y='18' width='24' height='10' fill='%23FFE57A'/%3E%3Crect x='159' y='10' width='10' height='26' fill='%23FFE57A'/%3E%3Crect x='18' y='32' width='44' height='12' fill='white'/%3E%3Crect x='24' y='22' width='32' height='14' fill='white'/%3E%3Crect x='14' y='38' width='14' height='8' fill='white'/%3E%3Crect x='108' y='48' width='38' height='12' fill='white'/%3E%3Crect x='116' y='38' width='22' height='14' fill='white'/%3E%3Crect x='62' y='78' width='24' height='24' fill='%234a7c3a'/%3E%3Crect x='62' y='78' width='24' height='4' fill='%2372c53a'/%3E%3Crect x='67' y='84' width='6' height='6' fill='%231a1a1a'/%3E%3Crect x='79' y='84' width='6' height='6' fill='%231a1a1a'/%3E%3Crect x='70' y='92' width='12' height='3' fill='%231a1a1a'/%3E%3Crect x='70' y='95' width='4' height='5' fill='%231a1a1a'/%3E%3Crect x='78' y='95' width='4' height='5' fill='%231a1a1a'/%3E%3Crect width='200' height='22' y='112' fill='%235DA02A'/%3E%3Crect width='200' height='5' y='112' fill='%2372D336'/%3E%3Crect x='20' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='40' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='60' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='80' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='100' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='120' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='140' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='160' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect x='180' y='112' width='1' height='22' fill='%233d6b18' opacity='.5'/%3E%3Crect width='200' height='82' y='134' fill='%238B5E3C'/%3E%3Crect x='6' y='144' width='8' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='32' y='158' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='58' y='146' width='8' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='80' y='166' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='104' y='143' width='6' height='7' fill='%23704B2B' opacity='.6'/%3E%3Crect x='128' y='160' width='8' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='152' y='147' width='7' height='6' fill='%23704B2B' opacity='.6'/%3E%3Crect x='176' y='163' width='7' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='14' y='172' width='8' height='6' fill='%23704B2B' opacity='.5'/%3E%3Crect x='44' y='180' width='6' height='5' fill='%23704B2B' opacity='.4'/%3E%3Crect x='70' y='175' width='8' height='6' fill='%23704B2B' opacity='.5'/%3E%3Crect x='96' y='185' width='7' height='5' fill='%23704B2B' opacity='.4'/%3E%3Crect x='140' y='176' width='8' height='5' fill='%23704B2B' opacity='.5'/%3E%3Crect x='168' y='182' width='6' height='6' fill='%23704B2B' opacity='.4'/%3E%3Crect width='200' height='1' y='154' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='1' y='174' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='1' y='194' fill='%23704B2B' opacity='.3'/%3E%3Crect x='20' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='40' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='60' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='80' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='100' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='120' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='140' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='160' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect x='180' y='134' width='1' height='82' fill='%23704B2B' opacity='.3'/%3E%3Crect width='200' height='84' y='216' fill='%23888'/%3E%3Crect x='0' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='40' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='80' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='120' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='160' y='216' width='20' height='20' fill='%23808080'/%3E%3Crect x='20' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='60' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='100' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='140' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect x='180' y='236' width='20' height='20' fill='%23808080'/%3E%3Crect width='200' height='1' y='236' fill='%23555' opacity='.4'/%3E%3Crect width='200' height='1' y='256' fill='%23555' opacity='.4'/%3E%3Crect width='200' height='1' y='276' fill='%23555' opacity='.4'/%3E%3Crect x='20' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='40' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='60' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='80' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='100' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='120' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='140' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='160' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='180' y='216' width='1' height='84' fill='%23555' opacity='.4'/%3E%3Crect x='26' y='256' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='28' y='253' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3Crect x='86' y='268' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='88' y='265' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3Crect x='152' y='258' width='8' height='8' fill='%2300d4ff' opacity='.9'/%3E%3Crect x='154' y='255' width='4' height='14' fill='%2300d4ff' opacity='.7'/%3E%3C/svg%3E\") center / cover no-repeat";

// Space: cover scene — stars scattered across canvas, one moon, one rocket, one planet
const SPACE_SVG = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%230d0a2e'/%3E%3Ccircle cx='22' cy='25' r='1.5' fill='white' opacity='.7'/%3E%3Ccircle cx='78' cy='18' r='2' fill='white' opacity='.9'/%3E%3Ccircle cx='145' cy='30' r='1' fill='white' opacity='.6'/%3E%3Ccircle cx='168' cy='55' r='1.8' fill='white' opacity='.7'/%3E%3Ccircle cx='35' cy='75' r='1.2' fill='white' opacity='.8'/%3E%3Ccircle cx='115' cy='65' r='1.5' fill='white' opacity='.6'/%3E%3Ccircle cx='62' cy='115' r='1' fill='white' opacity='.5'/%3E%3Ccircle cx='155' cy='105' r='2' fill='white' opacity='.8'/%3E%3Ccircle cx='88' cy='148' r='1.2' fill='white' opacity='.7'/%3E%3Ccircle cx='18' cy='160' r='1.5' fill='white' opacity='.6'/%3E%3Ccircle cx='130' cy='175' r='1' fill='white' opacity='.5'/%3E%3Ccircle cx='72' cy='200' r='1.8' fill='white' opacity='.8'/%3E%3Ccircle cx='182' cy='185' r='1' fill='white' opacity='.6'/%3E%3Ccircle cx='45' cy='240' r='1.2' fill='white' opacity='.7'/%3E%3Ccircle cx='120' cy='250' r='2' fill='white' opacity='.5'/%3E%3Ccircle cx='170' cy='265' r='1' fill='white' opacity='.7'/%3E%3Cpath d='M95,130 L96.5,135.5 L102,137 L96.5,138.5 L95,144 L93.5,138.5 L88,137 L93.5,135.5Z' fill='white' opacity='.85'/%3E%3Ccircle cx='80' cy='55' r='12' fill='%23ffe566'/%3E%3Ccircle cx='87' cy='49' r='10' fill='%230d0a2e'/%3E%3Cellipse cx='140' cy='195' rx='18' ry='5' fill='none' stroke='%23a78bfa' stroke-width='2' opacity='.5'/%3E%3Ccircle cx='140' cy='195' r='11' fill='%237c3aed' opacity='.8'/%3E%3Cg transform='translate(110,165) rotate(-40)'%3E%3Crect x='-5' y='-14' width='10' height='20' rx='5' fill='%23c0c8ff'/%3E%3Cpolygon points='-5,-14 5,-14 0,-24' fill='%23ff4444'/%3E%3Crect x='-9' y='5' width='5' height='8' rx='2' fill='%23ff6b35'/%3E%3Crect x='4' y='5' width='5' height='8' rx='2' fill='%23ff6b35'/%3E%3Ccircle cx='0' cy='-5' r='3' fill='%2338bdf8' opacity='.8'/%3E%3C/g%3E%3C/svg%3E\") center / cover no-repeat";

// Dino: jungle scene with a cute cartoon dino. Overlay darkens it so white text stays readable.
const DINO_SVG = "linear-gradient(rgba(5,40,15,0.35),rgba(5,40,15,0.35)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%2316a34a'/%3E%3Ccircle cx='170' cy='80' r='50' fill='%2315803d' opacity='.6'/%3E%3Ccircle cx='20' cy='210' r='60' fill='%2314532d' opacity='.4'/%3E%3Cellipse cx='100' cy='200' rx='48' ry='38' fill='%23166534'/%3E%3Cellipse cx='74' cy='162' rx='22' ry='32' fill='%23166534' transform='rotate(-15,74,162)'/%3E%3Cellipse cx='58' cy='132' rx='20' ry='13' fill='%23166534' transform='rotate(-20,58,132)'/%3E%3Ccircle cx='50' cy='126' r='4.5' fill='%2322c55e'/%3E%3Ccircle cx='51' cy='125' r='2' fill='%23052e16'/%3E%3Cpath d='M48,136 Q58,142 65,136' stroke='%2322c55e' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3Crect x='80' y='232' width='16' height='38' rx='8' fill='%23166534'/%3E%3Crect x='106' y='235' width='16' height='35' rx='8' fill='%23166534'/%3E%3Cpath d='M148,192 Q170,174 178,148' stroke='%23166534' stroke-width='14' fill='none' stroke-linecap='round'/%3E%3Crect x='172' y='148' width='8' height='100' rx='4' fill='%23854d0e'/%3E%3Cellipse cx='176' cy='148' rx='30' ry='12' fill='%2322c55e' transform='rotate(-25,176,148)'/%3E%3Cellipse cx='176' cy='144' rx='26' ry='10' fill='%234ade80' transform='rotate(25,176,144)'/%3E%3Crect x='10' y='228' width='7' height='72' rx='3.5' fill='%23854d0e'/%3E%3Cellipse cx='13' cy='228' rx='22' ry='9' fill='%2322c55e' transform='rotate(20,13,228)'/%3E%3Cellipse cx='13' cy='224' rx='20' ry='8' fill='%234ade80' transform='rotate(-20,13,224)'/%3E%3C/svg%3E\") center / cover no-repeat";

// Sloth: anatomically correct — dark eye mask, tiny beady eyes, rope-like arms, 3 curved claws per hand
const SLOTH_SVG = "linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.25)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23234a1e'/%3E%3Ccircle cx='20' cy='50' r='45' fill='%23366b25' opacity='.5'/%3E%3Ccircle cx='175' cy='35' r='50' fill='%23366b25' opacity='.4'/%3E%3Ccircle cx='100' cy='82' r='28' fill='%234a8a30' opacity='.3'/%3E%3Crect x='0' y='94' width='200' height='18' rx='9' fill='%234a2810'/%3E%3Crect x='0' y='94' width='200' height='5' rx='2.5' fill='%235c3317' opacity='.4'/%3E%3Cellipse cx='55' cy='90' rx='18' ry='8' fill='%234a8a30' transform='rotate(-25,55,90)'/%3E%3Cellipse cx='152' cy='88' rx='14' ry='7' fill='%234a8a30' transform='rotate(20,152,88)'/%3E%3Cpath d='M91,152 Q84,130 83,112' stroke='%238B7355' stroke-width='9' fill='none' stroke-linecap='round'/%3E%3Cpath d='M79,112 Q77,103 80,95' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M82,112 Q80,102 83,94' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M85,112 Q83,103 86,95' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M109,152 Q116,130 117,112' stroke='%238B7355' stroke-width='9' fill='none' stroke-linecap='round'/%3E%3Cpath d='M115,112 Q113,103 116,95' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M118,112 Q116,102 119,94' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M121,112 Q119,103 122,95' stroke='%235c3a1e' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cellipse cx='100' cy='172' rx='20' ry='22' fill='%238B7355'/%3E%3Cellipse cx='100' cy='175' rx='12' ry='14' fill='%23c4a882' opacity='.5'/%3E%3Ccircle cx='100' cy='148' r='21' fill='%238B7355'/%3E%3Cellipse cx='93' cy='147' rx='9' ry='7' fill='%23331a00' opacity='.7'/%3E%3Cellipse cx='107' cy='147' rx='9' ry='7' fill='%23331a00' opacity='.7'/%3E%3Ccircle cx='93' cy='147' r='3.5' fill='%231a0800'/%3E%3Ccircle cx='107' cy='147' r='3.5' fill='%231a0800'/%3E%3Ccircle cx='94' cy='146' r='1' fill='white' opacity='.85'/%3E%3Ccircle cx='108' cy='146' r='1' fill='white' opacity='.85'/%3E%3Cellipse cx='100' cy='154' rx='3' ry='2' fill='%23442200'/%3E%3Cpath d='M94,158 Q100,163 106,158' stroke='%23442200' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='81' cy='137' r='5' fill='%238B7355'/%3E%3Ccircle cx='119' cy='137' r='5' fill='%238B7355'/%3E%3Cpath d='M86,190 Q80,200 78,210' stroke='%238B7355' stroke-width='7' fill='none' stroke-linecap='round'/%3E%3Cpath d='M114,190 Q120,200 122,210' stroke='%238B7355' stroke-width='7' fill='none' stroke-linecap='round'/%3E%3Cpath d='M112,90 L118,90 L113,97 L119,97' stroke='white' stroke-width='2' fill='none' opacity='.45' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M120,76 L128,76 L121,85 L129,85' stroke='white' stroke-width='2.5' fill='none' opacity='.35' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M129,60 L139,60 L130,71 L140,71' stroke='white' stroke-width='3' fill='none' opacity='.25' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='40' cy='285' r='50' fill='%23366b25' opacity='.4'/%3E%3Ccircle cx='160' cy='290' r='55' fill='%23366b25' opacity='.35'/%3E%3Ccircle cx='100' cy='280' r='40' fill='%234a8a30' opacity='.25'/%3E%3C/svg%3E\") center / cover no-repeat";

// Candy: bright lollipops with a dark overlay so text stays readable
const CANDY_SVG = "linear-gradient(rgba(90,0,70,0.5),rgba(70,0,100,0.5)), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%23fce7f3'/%3E%3Ccircle cx='50' cy='75' r='38' fill='%23f9a8d4'/%3E%3Ccircle cx='50' cy='75' r='38' fill='none' stroke='%23f472b6' stroke-width='10' stroke-dasharray='20,12'/%3E%3Ccircle cx='50' cy='75' r='12' fill='%23fbbf24' opacity='.7'/%3E%3Crect x='46' y='111' width='8' height='65' rx='4' fill='white'/%3E%3Ccircle cx='155' cy='185' r='30' fill='%23c4b5fd'/%3E%3Ccircle cx='155' cy='185' r='30' fill='none' stroke='%238b5cf6' stroke-width='8' stroke-dasharray='16,10'/%3E%3Ccircle cx='155' cy='185' r='10' fill='%23fbbf24' opacity='.7'/%3E%3Crect x='151' y='213' width='7' height='55' rx='3.5' fill='white'/%3E%3Ccircle cx='165' cy='55' r='22' fill='%23fde68a'/%3E%3Ccircle cx='165' cy='55' r='22' fill='none' stroke='%23f59e0b' stroke-width='6' stroke-dasharray='12,7'/%3E%3Crect x='162' y='75' width='6' height='38' rx='3' fill='white'/%3E%3Cpath d='M28,210 Q22,185 32,162 Q38,140 30,118 Q24,102 28,88' stroke='%23fecdd3' stroke-width='20' fill='none' stroke-linecap='round'/%3E%3Cpath d='M28,210 Q22,185 32,162 Q38,140 30,118 Q24,102 28,88' stroke='%23f43f5e' stroke-width='7' fill='none' stroke-linecap='round' stroke-dasharray='22,16'/%3E%3C/svg%3E\") center / cover no-repeat";

// Dynamic time-of-day helpers
export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'golden' | 'dusk' | 'night';

export function getTimeOfDay(hour = new Date().getHours()): TimeOfDay {
  if (hour >= 5  && hour < 7)  return 'dawn';
  if (hour >= 7  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 19) return 'golden';
  if (hour >= 19 && hour < 21) return 'dusk';
  return 'night';
}

export function getDynamicGradient(hour?: number): string {
  switch (getTimeOfDay(hour)) {
    case 'dawn':      return "radial-gradient(ellipse at 50% 120%, rgba(251,191,36,0.6) 0%, transparent 60%), linear-gradient(175deg, #4c1d95 0%, #be185d 50%, #f97316 100%)";
    case 'morning':   return "radial-gradient(ellipse at 80% 0%, rgba(254,240,138,0.5) 0%, transparent 50%), linear-gradient(175deg, #0284c7 0%, #0ea5e9 60%, #7dd3fc 100%)";
    case 'afternoon': return "radial-gradient(ellipse at 70% 10%, rgba(255,255,255,0.3) 0%, transparent 40%), linear-gradient(175deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)";
    case 'golden':    return "radial-gradient(ellipse at 90% 80%, rgba(251,191,36,0.7) 0%, transparent 50%), linear-gradient(175deg, #92400e 0%, #b45309 30%, #f97316 70%, #fbbf24 100%)";
    case 'dusk':      return "radial-gradient(ellipse at 50% 100%, rgba(249,115,22,0.4) 0%, transparent 50%), linear-gradient(175deg, #4c1d95 0%, #7c3aed 40%, #c026d3 70%, #f43f5e 100%)";
    case 'night':     return "radial-gradient(ellipse at 80% 15%, rgba(255,255,255,0.15) 0%, transparent 35%), linear-gradient(175deg, #0f0a2e 0%, #1e1b4b 60%, #1e3a5f 100%)";
  }
}

export function getDynamicPrimary(hour?: number): string {
  switch (getTimeOfDay(hour)) {
    case 'dawn':      return "oklch(0.58 0.22 50)";
    case 'morning':   return "oklch(0.55 0.20 220)";
    case 'afternoon': return "oklch(0.50 0.18 220)";
    case 'golden':    return "oklch(0.62 0.22 65)";
    case 'dusk':      return "oklch(0.52 0.25 300)";
    case 'night':     return "oklch(0.35 0.18 260)";
  }
}

export const THEMES: Theme[] = [
  // ── Clean / adult themes ────────────────────────────────────────
  {
    name: "violet",
    label: "Violet",
    emoji: "🟣",
    gradient: "linear-gradient(175deg, #7c3aed 0%, #4f46e5 100%)",
    primary: "oklch(0.56 0.24 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "sky",
    label: "Sky Blue",
    emoji: "🔵",
    gradient: "linear-gradient(175deg, #0284c7 0%, #0369a1 100%)",
    primary: "oklch(0.55 0.20 220)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "rose",
    label: "Rose",
    emoji: "🌸",
    gradient: "linear-gradient(175deg, #e11d48 0%, #be123c 100%)",
    primary: "oklch(0.55 0.25 10)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "emerald",
    label: "Emerald",
    emoji: "🌿",
    gradient: "linear-gradient(175deg, #059669 0%, #047857 100%)",
    primary: "oklch(0.55 0.18 160)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "amber",
    label: "Sunshine",
    emoji: "🌻",
    gradient: "linear-gradient(175deg, #d97706 0%, #b45309 100%)",
    primary: "oklch(0.65 0.20 80)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "ocean",
    label: "Ocean",
    emoji: "🌊",
    gradient: OCEAN_SVG,
    primary: "oklch(0.55 0.18 200)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "midnight",
    label: "Midnight",
    emoji: "🌙",
    gradient: "radial-gradient(circle at 15% 25%, rgba(255,255,255,0.7) 1px, transparent 2px), radial-gradient(circle at 55% 12%, rgba(255,255,255,0.5) 1px, transparent 2px), radial-gradient(circle at 85% 40%, rgba(255,255,255,0.6) 1px, transparent 2px), radial-gradient(circle at 35% 65%, rgba(255,255,255,0.4) 0.8px, transparent 2px), radial-gradient(circle at 75% 80%, rgba(255,255,255,0.5) 1px, transparent 2px), linear-gradient(175deg, #1e1b4b 0%, #312e81 100%)",
    primary: "oklch(0.30 0.18 280)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "pink",
    label: "Rainbow",
    emoji: "🌈",
    gradient: "linear-gradient(175deg, #f43f5e 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #8b5cf6 100%)",
    primary: "oklch(0.55 0.26 330)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "dynamic",
    label: "Time of Day",
    emoji: "🌅",
    gradient: getDynamicGradient(),
    primary: getDynamicPrimary(),
    primaryFg: "oklch(1 0 0)",
  },
  // ── Illustrated kid themes ────────────────────────────────────────
  {
    name: "space",
    label: "Space",
    emoji: "🚀",
    gradient: SPACE_SVG,
    primary: "oklch(0.55 0.22 270)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "dino",
    label: "Dino",
    emoji: "🦕",
    gradient: DINO_SVG,
    primary: "oklch(0.60 0.22 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "gaming",
    label: "Minecraft",
    emoji: "⛏️",
    gradient: MINECRAFT_SVG,
    primary: "oklch(0.55 0.20 145)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "candy",
    label: "Candy",
    emoji: "🍭",
    gradient: CANDY_SVG,
    primary: "oklch(0.55 0.26 330)",
    primaryFg: "oklch(1 0 0)",
  },
  {
    name: "sloth",
    label: "Sloth",
    emoji: "🦥",
    gradient: SLOTH_SVG,
    primary: "oklch(0.52 0.14 65)",
    primaryFg: "oklch(1 0 0)",
  },
];

export const DEFAULT_THEME = THEMES[0];

export function getTheme(name: string | undefined): Theme {
  return THEMES.find((t) => t.name === name) ?? DEFAULT_THEME;
}

export function applyTheme(name: string | undefined) {
  const theme = getTheme(name);
  const root = document.documentElement;
  const primary = name === "dynamic" ? getDynamicPrimary() : theme.primary;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", theme.primaryFg);
  root.style.setProperty("--ring", primary);
  root.dataset.theme = theme.name;
}
