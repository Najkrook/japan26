# Roadmap

Det här dokumentet samlar förbättringsförslag för den nuvarande journalvyn i appen. Fokus ligger på mobilupplevelsen som kombinerar hero-sektion, header, dagkort, Ema-sektion och bottom-nav. Syftet är inte att beskriva exakt kod, utan att skapa ett tydligt produkt- och designunderlag som kan användas för framtida implementation.

Utgångspunkten är att vyn redan har en stark grund: den är personlig, tematiskt sammanhållen och har flera fina detaljer som sakura, serif-typografi, Ema-tavla och kartvy. Det som saknas i nuvarande form är främst skarpare informationshierarki, tydligare orientering över tid och några funktionella länkar mellan de olika delarna av resedagboken.

## Designförbättringar

### Hero-blocket mer redaktionellt och levande

**Vad det är**  
Hero-blocket högst upp bör utvecklas från att främst vara stämningsskapande till att också fungera som en redaktionell introduktion till själva resan. I dag sätter det ton, men det berättar ganska lite om vad användaren faktiskt kommer att möta i journalen.

**Varför det förbättrar upplevelsen**  
Ett mer levande hero-block gör startsidan mer meningsfull redan innan användaren börjar scrolla. Det skapar en känsla av att sidan är en aktiv resedagbok och inte bara en snygg landningsyta. Det gör också att användaren snabbare förstår om resan är pågående, avslutad, nyligen uppdaterad eller full av nytt innehåll.

**Hur det skulle kunna se ut**  
Under “Japan 2026” kan hero-blocket kompletteras med en kort statusrad, till exempel senaste stad, antal publicerade dagar eller när journalen senast uppdaterades. Informationen bör kännas integrerad i layouten, inte som en dashboard.

**Vad det påverkar i nuvarande vy**  
Det påverkar toppen av sidan, framför allt den första skärmbilden innan scroll. Hero-sektionen blir mindre tom och får bättre balans mellan känsla och information.

**Prioritet**  
Hög

### Tydligare visuell uppdelning i dagkortet

**Vad det är**  
Dagkortet bör struktureras tydligare så att datum, text, bildyta och Ema-sektion känns som medvetet separerade delar av samma berättelse. I nuläget finns sektionerna där, men de flyter ibland visuellt ihop på mobil.

**Varför det förbättrar upplevelsen**  
När ett dagkort innehåller både bild, anteckning, redigering och Ema-delen blir det lätt visuellt tungt. En tydligare uppdelning minskar den kognitiva belastningen och gör varje kort enklare att läsa, särskilt på små skärmar där allt staplas vertikalt.

**Hur det skulle kunna se ut**  
Det kan göras med subtila avdelare, mer konsekventa sektionstitlar, mer genomtänkta mellanrum och tydligare rytm mellan innehållsblocken. Till exempel kan dagtexten alltid få en tydlig topp- och bottenmarginal, medan Ema-sektionen får en egen “ceremoniell” övergång så att den inte känns som en vanlig kommentarsruta.

**Vad det påverkar i nuvarande vy**  
Det påverkar framför allt hur dagkortet uppfattas visuellt. Samma innehåll kan kännas betydligt mer lättläst utan att funktionaliteten ändras.

**Prioritet**  
Hög

### Starkare japansk identitet i header och logotyp

**Vad det är**  
Headern har redan rätt grund, men den kan få en ännu tydligare japansk signatur så att toppnavigeringen känns mindre generisk och mer som en del av journalens identitet.

**Varför det förbättrar upplevelsen**  
Headern är det första användaren möter och det mest återkommande elementet genom hela appen. Om den bär mer identitet stärker den hela upplevelsen utan att varje enskild vy måste göra allt arbete själv.

**Hur det skulle kunna se ut**  
Det kan handla om att förfina relationen mellan den röda stämpeln till vänster och logotyptexten i mitten, till exempel genom en tunn dekorrad, ett litet mon-inspirerat element eller en mer genomarbetad typografisk lockup. Viktigt är att hålla den elegant och inte dekorera sönder den.

**Vad det påverkar i nuvarande vy**  
Det påverkar främst intrycket av appen som helhet och gör att journalvyn känns mer sammanhållen med resten av varumärket.

**Prioritet**  
Medel

### Ema-sektionen mer rituell och shrine-lik

**Vad det är**  
Ema-sektionen bör kännas mer som en plats man besöker och mindre som ännu en del av ett innehållskort. Den ska upplevas som ett litet digitalt ritualmoment i dagkortet.

**Varför det förbättrar upplevelsen**  
Ema-delen är en av de mest originella funktionerna i hela appen. Om den får en starkare atmosfär höjer den inte bara sig själv utan också hela journalkänslan.

**Hur det skulle kunna se ut**  
Rubriken kan vara mer ceremoniell, träreglarna mer integrerade med bakgrunden och ingressen kan kännas mer som en inbjudan än en vanlig UI-label. Även mikrocopyn kan bidra, till exempel genom att formulera det som en önskan, hälsning eller hälsningstavla snarare än bara ett inputområde.

**Vad det påverkar i nuvarande vy**  
Det påverkar den nedre delen av varje dagkort och hur socialt innehåll upplevs. Det kan göra att Ema-delen känns som ett signaturinslag snarare än ett tillägg.

**Prioritet**  
Hög

### Bottom-nav med tydligare aktiv status

**Vad det är**  
Bottom-nav bör ge en tydligare känsla av att användaren rör sig mellan två olika lägen: journal och karta. Det bör inte bara vara två knappar, utan två tydliga destinationer.

**Varför det förbättrar upplevelsen**  
På mobil blir bottom-nav en central kontrollpunkt. Om aktiv status är tydligare minskar tvekan och appen känns mer polerad.

**Hur det skulle kunna se ut**  
Aktiv flik kan markeras med en mjukt glidande bakgrund, en tunn stämpelmarkering eller ett mer distinkt skift i kontrast och typografi. Rörelsen bör vara diskret men tydlig, så att navigationen känns levande utan att bli busig.

**Vad det påverkar i nuvarande vy**  
Det påverkar hela mobilupplevelsen och hur lätt det är att förstå att journal och karta är två delar av samma resa.

**Prioritet**  
Medel

### Rikare typografisk hierarki

**Vad det är**  
Typografin bör användas mer strategiskt för att skilja berättelse, metadata och japanskt atmosfärskapande från varandra.

**Varför det förbättrar upplevelsen**  
I en resejournal bär typografin mycket av känslan. När allt ligger för nära varandra i ton blir sidan svårare att skanna och mindre minnesvärd.

**Hur det skulle kunna se ut**  
Serif kan få dominera rubriker och berättande innehåll, mono kan reserveras tydligare för metadata och etiketter, och japanska displaydetaljer kan användas sparsamt där de verkligen skapar stämning. Resultatet bör kännas redaktionellt och medvetet, inte bara “fint”.

**Vad det påverkar i nuvarande vy**  
Det påverkar helhetsintrycket i hero, datum, små etiketter och Ema-sektion.

**Prioritet**  
Medel

## Funktionsförbättringar

### Snabbnavigering mellan dagar

**Vad det är**  
Lägg till ett sätt att snabbt hoppa mellan dagar i journalen utan att användaren måste scrolla genom hela sidan.

**Varför det förbättrar upplevelsen**  
När journalen växer blir lång scroll snabbt tröttande, särskilt för återvändande användare som redan sett äldre innehåll och vill hoppa till en specifik dag eller den senaste uppdateringen.

**Hur det skulle kunna se ut**  
Det kan vara en kompakt dag-picker, en sticky mini-tidslinje eller nästa/föregående-kontroller som följer scrollen. Den bör vara diskret men alltid tillgänglig.

**Vad det påverkar i nuvarande vy**  
Det påverkar hur användaren rör sig genom journalen, särskilt i längre reseperioder med många dagkort.

**Prioritet**  
Låg

### Progress och överblick i journalen

**Vad det är**  
Visa tydligare var i journalen användaren befinner sig och hur mycket innehåll som finns totalt.

**Varför det förbättrar upplevelsen**  
Överblick minskar känslan av oändlig scroll och hjälper användaren att förstå resans struktur. Det skapar också en känsla av progression.

**Hur det skulle kunna se ut**  
Det kan vara ett litet sticky-element som visar “Dag 4 av 12”, aktiv plats eller datumintervall. Det kan också kopplas till den dag som för närvarande är i viewporten.

**Vad det påverkar i nuvarande vy**  
Det påverkar navigationen och förståelsen för hur journalen är organiserad över tid.

**Prioritet**  
låg

### Hero med riktig statusdata

**Vad det är**  
Hero-sektionen bör kunna visa levande journaldata, inte bara dekorativ text.

**Varför det förbättrar upplevelsen**  
Det gör att toppen av sidan blir relevant även vid återbesök. Användaren får direkt en känsla av vad som hänt sen sist.

**Hur det skulle kunna se ut**  
Exempel är antal uppladdade minnen, antal publicerade dagar, senaste uppdateringsdatum eller aktuell stad. Informationen ska kännas varm och redaktionell, inte som torr statistik.

**Vad det påverkar i nuvarande vy**  
Det påverkar startsidan direkt och gör att hero får större funktionellt värde.

**Prioritet**  
Hög

### Social feedback i Ema-sektionen

**Vad det är**  
Ema-delen kan visa tydligare att den lever, till exempel genom att signalera aktivitet eller nyhet.

**Varför det förbättrar upplevelsen**  
När användare ser att andra lämnat hälsningar ökar sannolikheten att de själva engagerar sig. Det gör också att sektionen känns social snarare än dekorativ.

**Hur det skulle kunna se ut**  
Det kan vara antal Ema för dagen, en liten “senast tillagd” markering eller en mild badge som visar att tavlan fått nya hälsningar. Det ska inte kännas som social media, bara lite mer levande.

**Vad det påverkar i nuvarande vy**  
Det påverkar främst Ema-sektionens upplevda aktivitet och gör den mer inbjudande.

**Prioritet**  
Medel

### Sektioner eller snabbhopp i dagkort

**Vad det är**  
Dagkortet kan få interna sektioner eller mininavigering så att användaren snabbt kan hoppa till bilder, text eller Ema inom samma dag.

**Varför det förbättrar upplevelsen**  
Vissa användare vill se bilder först, andra vill läsa text eller gå direkt till hälsningar. Att kunna hoppa inom ett dagkort minskar friktion.

**Hur det skulle kunna se ut**  
Det kan vara små ankare eller etiketter högst upp i kortet, till exempel “Minnen”, “Text”, “Ema”. På mobil bör de vara mycket diskreta.

**Vad det påverkar i nuvarande vy**  
Det påverkar främst större dagkort med mycket innehåll och gör dem mer flexibla att konsumera.

**Prioritet**  
Medel

### Tydligare koppling mellan dagkort och karta

**Vad det är**  
Journal och karta bör kännas som två perspektiv på samma resa, inte två separata lägen.

**Varför det förbättrar upplevelsen**  
När innehåll i journalen tydligt leder till karta och vice versa blir produkten mer sammanhängande. Det gör att kartan känns mer användbar och inte bara som en sidofunktion.

**Hur det skulle kunna se ut**  
Ett dagkort kan ha en liten länk eller knapp som öppnar rätt plats i kartvyn. Kartan kan i sin tur tydligare leda tillbaka till den aktuella dagen i journalen.

**Vad det påverkar i nuvarande vy**  
Det påverkar relationen mellan bottom-nav och själva innehållet, och gör navigeringen mer meningsfull.

**Prioritet**  
Medel

### Expanderbar dagtext för mobil

**Vad det är**  
Längre dagtexter kan få ett kompakt förhandsläge med möjlighet att expandera.

**Varför det förbättrar upplevelsen**  
På mobil blir långa textblock snabbt tunga. Ett preview-läge gör att korten känns mer lätthanterliga utan att behöva ta bort berättelsen.

**Hur det skulle kunna se ut**  
Visa två eller tre rader som standard och låt användaren trycka på “Läs mer” för att expandera texten. Viktigt att övergången känns mjuk och att det alltid går att stänga igen.

**Vad det påverkar i nuvarande vy**  
Det påverkar den narrativa delen av dagkortet och gör längre inlägg mer tillgängliga.

**Prioritet**  
Hög

### Dagens höjdpunkt i varje dag

**Vad det är**  
Varje dag kan få en tydligt markerad höjdpunkt, till exempel en bild eller ett mini-block som signalerar dagens viktigaste minne.

**Varför det förbättrar upplevelsen**  
Det skapar bättre berättelsestruktur. I dag kan flera delar konkurrera om uppmärksamheten, men en höjdpunkt hjälper användaren att snabbt förstå dagens kärna.

**Hur det skulle kunna se ut**  
Det kan vara en “featured” bild, en liten etikett eller en kort rad som lyfter det viktigaste momentet för dagen. Detta ska kännas kuraterat, inte automatiskt och slumpmässigt.

**Vad det påverkar i nuvarande vy**  
Det påverkar dagkortets dramaturgi och gör att varje dag känns mer som en berättelse än en lös samling komponenter.

**Prioritet**  
Medel

## Prioritering

### Hög

- Hero-blocket mer redaktionellt och levande
- Tydligare visuell uppdelning i dagkortet
- Ema-sektionen mer rituell och shrine-lik
- Snabbnavigering mellan dagar
- Progress och överblick i journalen
- Hero med riktig statusdata
- Expanderbar dagtext för mobil

### Medel

- Starkare japansk identitet i header och logotyp
- Bottom-nav med tydligare aktiv status
- Rikare typografisk hierarki
- Social feedback i Ema-sektionen
- Sektioner eller snabbhopp i dagkort
- Tydligare koppling mellan dagkort och karta
- Dagens höjdpunkt i varje dag

### Låg

- Inga förslag är direkt lågprioriterade i nuläget, men typografiska finjusteringar och vissa navdetaljer kan vänta tills de större strukturella förbättringarna är på plats.

## Rekommenderad ordning

### Steg 1: Förbättra hierarki och orientering

Börja med sådant som direkt förbättrar läsbarhet och användarens förståelse av sidan. Det innebär att först arbeta med hero-blocket, dagkortets uppdelning, progressöversikt och snabbnavigering mellan dagar. Dessa förändringar ger störst effekt på hur sidan används dagligen.

### Steg 2: Förstärk berättelsen i varje dag

När strukturen känns tydlig kan fokus flyttas till innehållets dramaturgi. Då är det lämpligt att lägga till expanderbar dagtext, “dagens höjdpunkt” och tydligare intern struktur i dagkortet. Det här gör att varje dag känns mer kuraterad och mindre som en rå innehållscontainer.

### Steg 3: Gör Ema-sektionen till ett signaturinslag

När resten av dagkortet är stabilt bör Ema-sektionen förädlas vidare. Här passar det att lägga till social feedback, rikare introduktion och tydligare ritualkänsla. Eftersom Ema redan är en unik funktion är det här ett område som kan bli starkt differentierande för hela produkten.

### Steg 4: Förfina identitet och polish

Till sist kommer de mer identitetsdrivna förbättringarna: starkare header, bättre typografisk hierarki och mer uttrycksfull bottom-nav. De blir mest effektiva när grundstrukturen redan fungerar, eftersom de då förstärker en tydlig produkt i stället för att försöka rädda en oklar layout.

### Steg 5: Knyt ihop journal och karta

När journalvyn i sig känns stark och tydlig kan kopplingen till kartan fördjupas. Det är då rätt läge att bygga starkare övergångar mellan dagkort och kartvy så att appen känns som ett sammanhängande reseverktyg och inte två parallella upplevelser.
