## WikiReliability – a critical reading helper for Wikipedia

WikiReliability is a small web application that helps you assess the reliability of a single Wikipedia article. It does not replace your own critical reading, but acts as a "second pair of eyes": it quickly scans the article, highlights key signals and combines them into a summary (a 0–100 score and a verbal verdict: Weak / Moderate / Good / Excellent).

The tool is designed especially for students, teachers and anyone who uses Wikipedia as a background information source and wants to quickly see whether an article is more of an early draft or already quite established and well‑developed.

Basic idea:

- The user enters the URL or title of a Wikipedia article.
- The backend service fetches information about the article’s structure and edit history from the Wikipedia API.
- These data points are converted into numeric signals, to which a chosen policy (strictness profile / weights) is applied.
- As a result, the app shows:
  - a score from 0 to 100,
  - a verbal classification (Weak, Moderate, Good, Excellent),
  - the profile used and the most important signals, briefly explained.

The application includes three predefined strictness profiles (Permissive, Normal, Strict) that differ in how harshly they penalize problems (for example, many “citation needed” markers) and how strongly they emphasize each signal. The user can also tweak the weights manually and effectively use a custom profile.

> Important: The application does not check whether the facts in the article are true. It evaluates the article’s structure, use of sources and edit history. The final responsibility for critical reading always remains with the reader.

## What is the analysis based on?

The analysis is based on a set of signals that describe how the article looks from a technical point of view: how many references it has, how recent it is, whether it is marked as problematic, how it has been edited and what kind of quality labels it has. Below we go through the most important signals and explain why they affect the reliability assessment.

### 1. References and “citation needed” markers

**What is measured?**

- How many references the article contains.
- How many times the article contains “citation needed” / “[lähde?]” style markers.

**Why does it affect the score?**

- The credibility of a Wikipedia article depends on whether claims can be checked against original sources.
- An article with many references receives positive scoring: references indicate that authors have made an effort to look up background sources.
- Repeated “citation needed” markers are a direct warning sign: there are claims in the article that are not backed by a source. These cause a clear penalty.

**How is it reflected in the calculation?**

- Up to a certain threshold (for example around 10–15 references), references increase the score.
- “Citation needed” / “[lähde?]” hits reduce the score quickly: one or a few may still be seen as a “warning”, but a large number is treated as a clear problem.

### 2. Problem templates and the talk page

**What is measured?**

- Whether the article has problem templates attached, such as:
  - {{disputed}}
  - {{advert}}
  - {{unreferenced}}
  - {{coi}}
  - {{hoax}}
- How many times the article’s talk page contains markers referring to disputes or cleanup needs (for example “dispute”, “POV”, “cleanup”).

**Why does it affect the score?**

- Problem templates are the community’s direct message that the article has some structural or content issue (for example a one-sided point of view, advertising tone, or missing sources).
- Lively discussion is not automatically bad, but many dispute‑related markers on the talk page are often a sign that the content has been repeatedly questioned.

**How is it reflected in the calculation?**

- Even a single serious problem template (for example “hoax”) can significantly lower the score and, in the strict profile, may lead to rejection.
- The number of “problem words” on the talk page reduces the score gradually.

### 3. Recency and edit history

**What is measured?**

- How many days have passed since the latest edit.
- What proportion of recent edits are rollbacks/undos (the revert rate).
- How many different users have edited the article (unique editors).

**Why does it affect the score?**

- Being up to date is particularly important for fast‑changing topics. A very old, untouched article may be outdated.
- Frequent reverts indicate that the content is being disputed or that someone is repeatedly trying to add inappropriate material.
- Participation by many different editors is often a good sign: more eyes have seen the content and errors are more likely to have been caught.

**How is it reflected in the calculation?**

- Recent edits give positive points, but the effect decreases gradually as time passes (for example, once the last edit is more than about a year ago, extra recency points become small).
- A high revert rate reduces the score. The strict profile reacts already to relatively small amounts of revert activity, while the permissive profile is more forgiving.
- Unique editors are rewarded: the more distinct contributors there are (for example up to around 10 users), the stronger the positive effect on the score.

### 4. Length and structure

**What is measured?**

- The article’s word count.
- The number of headings (headingCount), especially section headings (H2–H4).

**Why does it affect the score?**

- A very short article (“stub”) can be a useful starting point, but is rarely comprehensive. A longer text gives room for background, examples and references.
- A clear structure and sub‑headings help readers grasp the whole and indicate that the topic has been organised rather than thrown together as a single block of text.

**How is it reflected in the calculation?**

- Length yields points up to an “ideal length” (for example around 2000 words). Beyond that, extra length does not significantly increase the score.
- The number of headings is mapped to a 0–1 scale (for example 0–5 headings); more headings increase the structure score, but a reasonable number is enough.

### 5. Quality labels and protection

**What is measured?**

- Whether the article has quality labels such as:
  - Good article / “Laadukas artikkeli”
  - Featured article / “Valittu artikkeli”
- Whether the article is protected (only some users can edit it).

**Why does it affect the score?**

- Quality labels are a sign from the Wikipedia community that the article has gone through a more thorough review process and meets specific quality criteria.
- Protection often indicates that the article is subject to vandalism or disputes, but it also suggests that the page is monitored more closely by administrators.

**How is it reflected in the calculation?**

- A featured article gets the largest quality bonus, a good article a somewhat smaller one. A stub, on the other hand, reduces the score.
- Protection yields a small bonus: it does not automatically make the article reliable, but it shows that attention is being paid to it.

### 6. Profiles and weights

Not all signals are weighted equally. The application uses a policy in which each signal has its own weight. In addition, profiles can completely reject an article in certain situations.

**Strictness profiles:**

- **Strict**
  - Strongly penalises missing sources, problem templates and a high revert rate.
  - May also reject an article outright if, for example, there are problem templates or the revert rate is very high.
- **Normal (default)**
  - A balanced default: takes all signals into account, but does not react quite as sensitively as the strict profile.
- **Permissive**
  - More forgiving of problems, emphasises positive signals (for example many references and many editors).

**Rejection rules (rejectIf):**

- Some profiles (especially the strict one) may decide that an article should not be used at all if a condition is met, for example:
  - too many “citation needed” markers,
  - serious problem templates,
  - a very high revert rate,
  - a very old, unmaintained article.

In these cases the application shows the verdict “Weak” and explains the reason (for example “problem templates” or “revert rate”).

## Summary: how to read the result?

When you get an analysis result, you can interpret it for example like this:

- **The score and verbal verdict** give a general, indicative level of reliability.
- **References and citation needed markers** show whether the article’s claims are properly backed up.
- **Problem templates and talk page** reveal if there have been major disputes or quality issues around the article’s content.
- **Recency and editors** tell you whether the article is up to date and whether it has been edited by many people.
- **Length, structure and quality labels** hint at whether you are looking at a short starter article or a carefully polished one.

The purpose of the tool is to turn these technical signals into an easy‑to‑grasp overview – not to deliver a final verdict. Use the result as support for your own critical reading, not as a substitute for it.

## WikiReliability – Wikipedian lähdekriittinen analyysityökalu

WikiReliability on pieni web-sovellus, joka auttaa arvioimaan yksittäisen Wikipedia-artikkelin luotettavuutta. Se ei korvaa omaa lähdekritiikkiäsi, vaan toimii "toisena silmäparina": se käy artikkelin nopeasti läpi, nostaa esiin olennaisia signaaleja ja laskee niiden pohjalta yhteenvedon (pisteet 0–100 ja sanallinen arvio Heikko / Kohtalainen / Hyvä / Erinomainen).

Sovellus on suunniteltu erityisesti opiskelijoille, opettajille ja muille, jotka käyttävät Wikipediaa taustatietolähteenä ja haluavat nopeasti hahmottaa, onko artikkeli enemmän luonnosvaiheessa vai jo melko vakiintunut ja laadukas.

Perusidea:

- Käyttäjä syöttää Wikipedia-artikkelin osoitteen tai nimen.
- Taustapalvelu hakee artikkelin rakenteeseen ja muokkaushistoriaan liittyviä tietoja Wikipedian rajapinnasta.
- Nämä tiedot muunnetaan numeroiksi ("signaaleiksi"), joille sovelletaan valittua politiikkaa (strictness profile / painotukset).
- Lopputuloksena näytetään:
  - pisteet 0–100,
  - sanallinen luokitus (Heikko, Kohtalainen, Hyvä, Erinomainen),
  - käytetty profiili ja tärkeimmät signaalit lyhyesti avattuna.

Sovelluksessa on kolme valmista "tiukkuusprofiilia" (Salliva, Normaali, Tiukka), jotka eroavat siinä, miten herkästi ne rankaisevat ongelmista (esim. paljon "lähde?"-merkintöjä) ja kuinka suurta painoa ne antavat eri signaaleille. Lisäksi käyttäjä voi halutessaan säätää painotuksia käsin ja käyttää näin omaa mukautettua profiilia.

> Tärkeää: Sovellus ei tarkista tietojen paikkansapitävyyttä, vaan arvioi artikkelin rakennetta, lähteiden käyttöä ja muokkaushistoriaa. Lopullinen vastuu lähdekritiikistä on aina lukijalla.

## Mihin analyysi perustuu?

Analyysi perustuu joukkoon signaaleja, jotka kuvaavat sitä, miltä artikkeli näyttää teknisesti: paljonko siinä on lähteitä, kuinka tuore se on, onko artikkeli merkitty ongelmalliseksi, miten sitä on muokattu ja millaisia laatumerkkejä artikkelilla on. Alla käydään läpi tärkeimmät signaalit ja se, miksi ne vaikuttavat luotettavuusarvioon.

### 1. Lähteet ja "lähde?"-merkinnät

**Mitä mitataan?**

- Kuinka monta viitettä (references) artikkelissa on.
- Kuinka monta kertaa artikkelissa esiintyy "citation needed" / "[lähde?]" -tyyppisiä merkintöjä.

**Miksi se vaikuttaa pisteisiin?**

- Wikipedia-artikkelin uskottavuus perustuu siihen, että väitteet voidaan tarkistaa alkuperäisistä lähteistä.
- Runsaasti viitteitä sisältävä artikkeli saa positiivista pisteytystä: viitteet viittaavat siihen, että kirjoittajat ovat vaivautuneet hakemaan taustalähteitä.
- Toistuvat "lähde?"-merkinnät ovat suora signaali ongelmasta: artikkelissa on väitteitä, joille ei ole annettu lähdettä. Näistä annetaan selvä miinus.

**Miten se näkyy laskennassa?**

- Jopa tiettyyn rajaan asti (esim. noin 10–15 viitettä) viitteet kasvattavat pistemäärää.
- "Citation needed" / "[lähde?]" -osumat vähentävät pisteitä nopeasti: yksi tai muutama merkintä voi olla vielä "varoitus", mutta suuri määrä tulkitaan selkeäksi ongelmaksi.

### 2. Ongelmatemplaatit ja keskustelusivu

**Mitä mitataan?**

- Onko artikkeliin liitetty ongelmatunnisteita, kuten:
  - {{disputed}}
  - {{advert}}
  - {{unreferenced}}
  - {{coi}}
  - {{hoax}}
- Kuinka monta kertaa artikkelin keskustelusivulla esiintyy kiistoihin tai siivoustarpeeseen viittaavia merkintöjä (esim. "dispute", "POV", "cleanup").

**Miksi se vaikuttaa pisteisiin?**

- Ongelmatemplaatit ovat yhteisön suora viesti siitä, että artikkelissa on jokin rakenteellinen tai sisällöllinen ongelma (esimerkiksi yksipuolinen näkökulma, mainosmaisuus tai lähteiden puute).
- Vilkas keskustelu ei ole automaattisesti huono asia, mutta monet kiistoihin viittaavat merkinnät keskustelusivulla ovat usein merkki siitä, että sisältöä on jouduttu toistuvasti kyseenalaistamaan.

**Miten se näkyy laskennassa?**

- Yksikin vakava ongelmatunniste (esim. "hoax") voi tiputtaa pisteitä tuntuvasti ja voi tiukassa profiilissa johtaa hylkäykseen.
- Keskustelusivun "ongelmasanoista" kertynyt määrä vähentää pisteitä asteittain.

### 3. Tuoreus ja muokkaushistoria

**Mitä mitataan?**

- Kuinka monta päivää on kulunut viimeisimmästä muokkauksesta.
- Kuinka suuri osa viimeaikaisista muokkauksista on "peruuttamisia" (rollback/undo) eli revert rate.
- Kuinka monta eri käyttäjää on muokannut artikkelia (unique editors).

**Miksi se vaikuttaa pisteisiin?**

- Ajan tasalla oleminen on tärkeää erityisesti nopeasti muuttuvissa aiheissa. Hyvin vanha, koskematon artikkeli voi olla vanhentunut.
- Toistuvat peruutukset viittaavat siihen, että sisällöstä kiistellään tai joku yrittää toistuvasti lisätä sopimatonta materiaalia.
- Monen eri muokkaajan osallistuminen on usein hyvä merkki: sisältöä on katsottu useasta näkökulmasta, virheitä on todennäköisemmin korjattu.

**Miten se näkyy laskennassa?**

- Tuoreista muokkauksista saa pluspisteitä, mutta vaikutus pienenee asteittain, kun viimeisestä muokkauksesta on kulunut aikaa (esim. yli vuosi ei enää juurikaan tuo lisäpisteitä).
- Suuri revert rate vähentää pisteitä. Tiukka profiili reagoi jo melko pieneen revert-määrään, salliva profiili antaa enemmän anteeksi.
- Uniikkeja muokkaajia palkitaan: mitä useampi eri tekijä (esim. jopa noin 10 erilaista kirjoittajaa), sitä suurempi positiivinen vaikutus pisteisiin.

### 4. Pituus ja rakenne

**Mitä mitataan?**

- Sanamäärä (word count) artikkelista.
- Otsikoiden määrä (headingCount), erityisesti väliotsikot (H2–H4).

**Miksi se vaikuttaa pisteisiin?**

- Hyvin lyhyt artikkeli ("tynkä") voi olla hyödyllinen lähtöpiste, mutta harvoin kattava. Pidempi teksti antaa tilaa taustoitukselle, esimerkeille ja lähdeviitteille.
- Selkeä rakenne ja väliotsikot auttavat hahmottamaan kokonaisuutta ja viittaavat siihen, että aihe on jäsennelty eikä vain kasattu yhdeksi pitkäksi tekstimassaksi.

**Miten se näkyy laskennassa?**

- Pituudesta saa pisteitä tiettyyn "ihannepituuteen" asti (esim. noin 2000 sanaa). Tämän yli lisäpituus ei juuri enää kasvata pistemäärää.
- Väliotsikoiden määrä muunnetaan 0–1 -skaalalle (esim. 0–5 otsikkoa); useampi otsikko nostaa rakennepisteitä, mutta kohtuullinen määrä riittää.

### 5. Laatutunnukset ja suojaukset

**Mitä mitataan?**

- Onko artikkeli merkitty laatutunnuksilla, kuten:
  - Good article / Laadukas artikkeli
  - Featured article / Valittu artikkeli
- Onko artikkeli suojattu (protected), eli vain osa käyttäjistä voi muokata sitä.

**Miksi se vaikuttaa pisteisiin?**

- Laatutunnukset ovat Wikipedian yhteisön antama merkki siitä, että artikkeli on käynyt läpi tarkemman arviointiprosessin ja täyttää tietyt laatuvaatimukset.
- Suojaukset kertovat usein, että artikkeli on altis vandalismille tai kiistelylle, mutta samalla se viittaa siihen, että ylläpito seuraa sivua tarkemmin.

**Miten se näkyy laskennassa?**

- Valittu artikkeli saa suurimman laatubonuksen, laadukas artikkeli hieman pienemmän. Tynkä (stub) puolestaan vähentää pisteitä.
- Suojauksesta saa pienen lisäbonuksen: se ei tee artikkelista automaattisesti luotettavaa, mutta kertoo, että siihen kiinnitetään huomiota.

### 6. Profiilit ja painotukset

Kaikkia yllä kuvattuja signaaleja ei painoteta yhtä paljon. Sovelluksessa käytetään politiikkaa (Policy), jossa jokaiselle signaalille on oma painokerroin. Lisäksi profiilit voivat hylätä artikkelin kokonaan tietyissä tilanteissa.

**Tiukkuusprofiilit:**

- **Tiukka (Strict)**
  - Rankaisee voimakkaasti puuttuvista lähteistä, ongelmatunnisteista ja suuresta revert rate -arvosta.
  - Voi myös hylätä artikkelin ("rejected"), jos esimerkiksi ongelmatemplaatteja on tai revert rate on hyvin korkea.
- **Normaali (Default)**
  - Tasapainoinen oletus: ottaa kaikki signaalit huomioon, mutta ei reagoi ihan yhtä herkästi kuin tiukka.
- **Salliva (Permissive)**
  - Antaa enemmän anteeksi ongelmille, korostaa positiivisia signaaleja (esim. paljon lähteitä ja muokkaajia).

**Hylkäysehdot (rejectIf):**

- Tietyt profiilit (erityisesti tiukka) voivat päättää, että artikkelia ei kannata käyttää lainkaan, jos jokin ehto täyttyy, esimerkiksi:
  - liikaa "lähde?"-merkintöjä,
  - vakavia ongelmatunnisteita,
  - hyvin korkea revert rate,
  - erittäin vanha, päivittämätön artikkeli.

Tällöin sovellus näyttää luokituksen "Heikko" ja kertoo syyn (esim. "problem templates" tai "revert rate").

## Yhteenveto: mitä tulosta kannattaa lukea?

Kun saat analyysin tuloksen, voit tulkita sitä esimerkiksi näin:

- **Pisteet ja sanallinen arvio** kertovat yleisen suuntaa-antavan luotettavuustason.
- **Lähteet ja lähde?-merkinnät** näyttävät, onko artikkelin väitteitä perusteltu kunnolla.
- **Ongelmatemplaatit ja keskustelu** paljastavat, jos artikkelin sisällöstä on ollut isompia kiistoja tai laatuongelmia.
- **Tuoreus ja muokkaajat** kertovat, onko artikkeli ajantasainen ja onko sitä muokannut moni ihminen.
- **Pituus, rakenne ja laatutunnukset** antavat vihjeen siitä, onko kyseessä lyhyt aloitus vai huolella viimeistelty artikkeli.

Sovelluksen tarkoitus on tehdä näistä teknisistä signaaleista helposti hahmotettava kokonaisuus – ei antaa lopullista tuomiota. Käytä tulosta tukena omalle lähdekritiikillesi, ei sen korvikkeena.
