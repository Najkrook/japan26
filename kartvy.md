# Analys av Kartvy och Platsdata

Här är analysen av varför bilder inte dyker upp på kartan trots att de laddas upp. Genomgången fokuserar på flödet från filval till visning.

## 🔍 Sammanfattning
Problemet ligger med största sannolikhet i **extraheringen av metadata** vid uppladdningstillfället. Appen hämtar rätt bilder från databasen, men bilderna saknar koordinater (`latitude` och `longitude`), vilket gör att de filtreras bort av kartkomponenten.

## 🛠 Tekniska Fynd

### 1. Problematisk EXIF-extrahering
I filen `src/utils/mediaProcessing.ts` används biblioteket `exifr` för att läsa bilddata:

```typescript
const metadata = await exifr.parse(file, {
  pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
});
```

> [!IMPORTANT]
> **Huvudmisstänkt:** Parametern `pick` begränsar `exifr` till att enbart läsa de exakta taggarna som anges. `latitude` och `longitude` är dock inte faktiska EXIF-taggar, utan beräknade egenskaper som `exifr` skapar utifrån rådata (`GPSLatitude`, `GPSLongitude`, etc.). 
>
> Genom att enbart "picka" de beräknade namnen läser biblioteket sannolikt inte in de råa GPS-taggarna som krävs för att utföra beräkningen. Detta resulterar i att koordinaterna blir `undefined`.

### 2. Validering i Uppladdningspanelen
I `src/components/UploadPanel.tsx` sparas koordinaterna endast om de existerar:

```typescript
if (item.latitude !== undefined && item.longitude !== undefined) {
  mediaPayload.latitude = item.latitude;
  mediaPayload.longitude = item.longitude;
}
```

Om `exifr` misslyckas (se punkt 1) skickas inga koordinater alls till Firestore. Bilden laddas upp ok, men utan geografisk stämpel.

### 3. Filtrering i Kartvyn
Kartvyn fungerar som förväntat genom att den hämtar alla bilder, men den har en strikt säkerhetsspärr i `src/utils/mapMedia.ts`:

```typescript
export const hasMapCoordinates = (item: Media): boolean =>
  hasFiniteCoordinate(item.latitude) && hasFiniteCoordinate(item.longitude);

export const getMapMedia = (media: Media[]): Media[] => media.filter(hasMapCoordinates);
```

Eftersom bilderna i databasen saknar dessa fält, rensas de bort innan kartan ritas ut, och du ser meddelandet *"Ingen platsdata hittades"*.

## 💡 Möjliga Orsaker (Icketechniska)
*   **Källfiler utan GPS:** Om bilderna är tagna med en kamera/app där platstjänster är avstängda, eller om de skickats via t.ex. Messenger/WhatsApp (som ofta rensar metadata), finns ingen platsdata att läsa in.
*   **Webbläsarbegränsningar:** Vissa webbläsare kräver tillåtelse att läsa filers metadata, men oftast är det inget hinder för EXIF-läsning.

## 🛰 Nästa Steg
För att bekräfta detta kan man titta i Firebase Console under kollektionen `media`. Om dokumenten saknar fälten `latitude` och `longitude` så bekräftar det att felet sker vid uppladdningen (troligen pga `pick`-filtret nämnt ovan).
