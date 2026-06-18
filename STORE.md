# Chrome Web Store — avaldamise materjalid

Kõik tekstid ja varad poe-vormi täitmiseks. Kopeeri väljadesse Developer Dashboardis.

## Põhiväljad

**Nimi:** Jutusta — Loe eesti keeles

**Lühikirjeldus** (≤132 tähemärki):
> Vali veebilehel tekst ja kuula see eesti keeles ette — tõlge + kõnesüntees Jutusta API kaudu. 150+ häält, 40+ keelt.

**Kategooria:** Productivity (alt: Accessibility)

**Keel:** Eesti

## Detailne kirjeldus

(Chrome Web Store kirjelduse väli on lihttekst — kopeeri täpselt nii.)

Loe ingliskeelne (või muukeelne) veeb eesti keeles ette.

Vali suvalisel veebilehel tekst ja lase see eesti keeles ette lugeda. Laiendus tõlgib valiku ja loeb selle loomuliku eestikeelse häälega — heli algab kohe ja jätkub sujuvalt, sest järgmist lõiku genereeritakse juba eelmise mängimise ajal.

Funktsioonid
• 150+ häält 40+ keeles (mehed ja naised), sh 39 eestikeelset — laetakse otse Jutusta API-st
• Vali lähte- ja sihtkeel; hääled filtreeritakse valitud sihtkeele järgi
• Käivitus: vali tekst → paremklõpsu menüü „Loe eesti keeles ette“ või kiirklahv Alt+Shift+R
• Reguleeritav kõnetempo (0,5×–2×)
• Peata igal hetkel klahviga Esc

Vajab Jutusta API võtit (jutusta.ee → Arendajatele). Võti salvestatakse ainult sinu brauseris.

Avatud lähtekood: https://github.com/hv-tec/jutusta-loe-ext

## Õiguste põhjendused (Permission justifications)

- **storage** — API võtme ja kasutaja eelistuste (hääl, keel, tempo) salvestamiseks lokaalselt.
- **contextMenus** — paremklõpsu valiku „Loe eesti keeles ette“ lisamiseks.
- **activeTab** — juurdepääs ainult aktiivsele vahelehele ja ainult kasutaja žesti (paremklõps või kiirklahv) peale, et lugeda valitud tekst. Ei küsi püsivat juurdepääsu kõigile saitidele.
- **scripting** — sisu-skripti süstimiseks aktiivsesse vahelehte alles siis, kui kasutaja laienduse käivitab.
- **host_permissions: https://jutusta.ee/** — tõlke- ja kõnesünteesi-päringute tegemiseks Jutusta API-le.
- **Single purpose:** valitud teksti tõlkimine eesti keelde ja ettelugemine.

## Andmekasutuse deklaratsioon (Data usage)
- Kogub: **autentimisteave** (kasutaja sisestatud API võti, hoitakse lokaalselt) ja **kasutaja sisu** (valitud tekst, saadetakse Jutusta API-le töötlemiseks).
- EI müü andmeid kolmandatele. EI kasuta andmeid laienduse põhifunktsiooniga mitteseotud eesmärkidel. EI kasuta krediidivõimekuse hindamiseks.

**Privaatsuspoliitika URL:**
> https://github.com/hv-tec/jutusta-loe-ext/blob/main/PRIVACY.md

## Varad (store-assets/)
- Ikoon 128×128: `icons/icon128.png`
- Screenshot 1280×800: `store-assets/screenshot-1280x800.png`
- Väike promo-tile 440×280: `store-assets/promo-tile-440x280.png`

## Üleslaaditav pakett
`dist/jutusta-loe-ext.zip` — **versioon 1.1.1** (ehita: `bash tools/build-zip.sh`)

**Mis on uut v1.1.x-s:**
- 150+ häält 40+ keeles, laetakse dünaamiliselt Jutusta API-st (enne 12 kõvasti koodis)
- Lähte- + sihtkeele valik; hääled filtreeritakse sihtkeele järgi
- `<all_urls>` asendatud turvalisema `activeTab`-iga (käivitus paremklõps / Alt+Shift+R)
- Selgemad veateated (kuvab API enda sõnumi, nt „krediit otsas“)

## Käsitsi sammud (ainult sina saad teha)
1. Registreeru Chrome Web Store Developer'iks: https://chrome.google.com/webstore/devconsole (ühekordne 5 USD tasu)
2. Ava item → **Package → Upload new package** → `dist/jutusta-loe-ext.zip` (v1.1.1; kirjutab vana 1.0.1 mustandi üle)
3. Täida ülaltoodud kirjeldus, kategooria, keel; laadi screenshot + ikoon
4. Kleebi privaatsuspoliitika URL; täida andmekasutuse vorm ülaltoodu järgi
5. Esita ülevaatamiseks (review võtab tavaliselt mõne päeva)
