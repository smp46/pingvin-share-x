# Features & Fixes – Todo

Quellen: meine Kommentare und die Antworten von smp46 in [#251](https://github.com/smp46/pingvin-share-x/pull/251) und [#252](https://github.com/smp46/pingvin-share-x/pull/252), eigene Beobachtungen, Abgleich mit allen Issues/PRs in [smp46/pingvin-share-x](https://github.com/smp46/pingvin-share-x/issues).
Stand: 14.11.2026

**Sortiert nach Art der Aktion:**

| Abschnitt | Was ich tue | Anzahl |
|---|---|---|
| B | Warten auf Antwort in #252 | 2 |
| C | In bestehenden Issues kommentieren | 3 (+ E7 in #130) |
| D | Bug-Reports | 5 |
| E | Feature-Issues | 10 |
| F | Gute Kandidaten für eigene PRs | 7 |
| G | Erledigt / nichts zu tun | 5 |

**Basis-Branch für eigenen Code:** `upstream/main`, außer es betrifft PWA/Share-Target-Code aus #252 → `feature/pwa-share-target`.

**Issue mit Code-Link:** Problem immer in eigenen Worten beschreiben, Code nur als Ergänzung verlinken:
`https://github.com/smp46/pingvin-share-x/compare/main...mvolk-arch:pingvin-share-x-test:<branch>`

---

## B. Warten auf Antwort in #252

### B1. Share Target: Samsung-Internet-Fallback
- smp46 hat das manuelle Auslesen von `multipart/form-data` entfernt. Meine Begründung steht im Kommentar vom 14.11.2026.
- Ohne Fallback zeigt Samsung Internet eine Fehlermeldung statt die Dateien zu übernehmen.
- [ ] Antwort abwarten. Bei Ablehnung: eigener kleiner PR anbieten oder in der Doku „nur Chrome/Edge“ vermerken.

### B2. Übersetzungen: Fallback auf Englisch
- Neue Texte gibt es zunächst nur in `en-US.ts`. Bis Crowdin synchronisiert, sieht man in anderen Sprachen die rohen Übersetzungsschlüssel.
- Vorschlag in `_app.tsx`: `{ ...LOCALES.ENGLISH.messages, ...aktuelleSprache }`.
- [ ] Antwort abwarten. Falls nicht in #252 gelöst → **F-Kandidat** (kleiner PR, Basis `upstream/main`).

---

## C. In bestehenden Issues kommentieren

### C1. Share-Name: Standardname → [#244](https://github.com/smp46/pingvin-share-x/issues/244)
- #244 „Configurable requirements for share name and password protection“: smp46 baut Admin-Optionen „Name ist Pflicht“ (und Passwort) ein.
- Mein Zusatz: ein **vorausgefüllter Standardname**, damit schnelles Teilen nicht ohne Namen passiert und „Meine Freigaben“ keine leeren Namen zeigt.
  - Vorschlag: aus den Dateien gebildet, z. B. „rechnung.pdf“ bzw. „rechnung.pdf + 3 weitere“. Ist später in „Meine Freigaben“ aussagekräftiger als ein fester Text.
  - Alternative: fester Text in allen Sprachen, z. B. „Freigegebene Dateien“.
  - Beim Anklicken markiert, damit man ihn direkt überschreiben kann.
- [ ] Kommentar in #244 schreiben.

### C2. Admin: Share-Liste → [#150](https://github.com/smp46/pingvin-share-x/issues/150) / [#274](https://github.com/smp46/pingvin-share-x/issues/274)
- #150 (Sortieren, Suchen, Filtern) ist geplant, #274 („Created on“-Spalte) hat smp46 zugesagt.
- Meine Zusatzideen: Restlaufzeit in Tagen/Wochen statt Datum, Filter nach Benutzer, Share-Größe, Anzahl Shares pro Benutzer.
- [ ] Kommentar in #150 (Erstellungsdatum ist mit #274 schon abgedeckt).

### C3. Upload-Seite: zuletzt erstellte Shares → [#125](https://github.com/smp46/pingvin-share-x/issues/125)
- #125 sieht eine Liste „Recently Uploaded Shares“ mit „Open share“-Button vor. smp46 möchte dafür die Tabelle aus `pages/account/shares.tsx` als Komponente auslagern.
- [ ] Bei E5 (Share direkt öffnen) auf #125 verweisen. Optional kurz in #125 erwähnen, dass der Link auch in „Meine Freigaben“ fehlt.

---

## D. Bug-Reports

### D1. Drop-Fläche zu klein, Datei öffnet sich im Browser
- Unter „Freigabe bearbeiten“ (und generell) ist die Drop-Fläche klein. Legt man die Datei daneben ab, öffnet der Browser die Datei und verlässt die Seite. **Eingaben gehen verloren.**
- Vorschlag: die ganze Seite als Drop-Fläche, mindestens aber außerhalb der Fläche das Öffnen im Browser verhindern (`dragover`/`drop` mit `preventDefault()` auf `window`).
- Code: `frontend/src/components/upload/Dropzone.tsx` (verwendet auf `/upload` und in `EditableUpload.tsx`).
- [ ] Bug-Report. Danach evtl. **F-Kandidat**.

### D2. Mobile Tastatur / Empfängerfeld
- Die Bildschirmtastatur bleibt im Empfängerfeld und verdeckt den „Teilen“-Button.
- Tippt man zum Schließen der Tastatur daneben, schließt sich der ganze Dialog, alle Eingaben sind weg.
- Eine getippte Adresse wird beim Wechsel in ein anderes Feld nicht übernommen, sondern verschwindet,.auch Zeichen wie <leerzeichen>, <Enter>, <Tab>, <komma>, <simikolon> sollten eine eingabe abschließen- Vorbild: Nginx Proxy Manager (Eingabe von Domains).
- smp46: „Bug, Report mit mehr Details“.
- [ ] Bug-Report mit Gerät, Browser, Schritten, ggf. Video.

### D3. PWA: PDF-Vorschau ohne Zurück-Button
- In der installierten App öffnet die PDF-Vorschau im Vollbild. Ohne Zurück-Button des Browsers kommt man nicht mehr heraus.
- **Ursache (keine Abhängigkeit):** Die PDF-„Vorschau“ ist gar keine Vorschau im Dialog. `PdfPreview` in `frontend/src/components/share/FilePreview.tsx` leitet das ganze Fenster auf die Datei um:
  `window.location.href = /api/shares/${shareId}/files/${fileId}?download=false`
  Der Browser zeigt die PDF dann mit seinem eingebauten Viewer an, die App ist verlassen. Im Browser-Tab rettet einen der Zurück-Button, in der PWA (ohne Browserleiste) nicht.
- Stammt noch aus dem ursprünglichen Pingvin Share (Commit `c807d208` „feat: add preview modal“, 2023), betrifft also nicht nur die PWA.
- Lösungsideen:
  - **In neuem Tab öffnen** (`window.open(url, "_blank")`): kleinste Änderung; in der PWA öffnet sich die PDF dann im Browser bzw. einem Custom Tab, die App bleibt erhalten.
  - **Im Dialog einbetten** (`<iframe>`/`<object>`): funktioniert am Desktop, aber Chrome auf Android zeigt PDFs in iframes nicht an.
  - **pdf.js / react-pdf:** einheitlich auf allen Geräten, aber neue, große Abhängigkeit, braucht Zustimmung von smp46.
- [ ] Bug-Report. Betrifft die PWA besonders, ist aber unabhängig von #252 → Basis `upstream/main`. Danach **F-Kandidat** (Variante „neuer Tab“).

### D4. Übersetzungen: Tooltips in „Meine Freigaben“
- In `frontend/src/pages/account/shares.tsx` sind drei Tooltips fest auf Englisch: „Password Protected“, „Recipients Only“, „Sent to Recipients“.
- smp46 wollte selbst ein Issue anlegen, bisher gibt es keins.
- [ ] Nachfragen oder selbst melden (alle drei Tooltips nennen). Danach **F-Kandidat**.

### D5. Upload-Seite: neuer Drop verwirft bisherige Dateien
- Ist *Administration → Konfiguration → Share → „Freigabe-Fenster automatisch öffnen“* (`share.autoOpenShareModal`) **eingeschaltet**, ersetzt jedes Ablegen auf `/upload` alle bisher abgelegten Dateien. Schließt man den Dialog und legt eine weitere Datei ab, sind die vorherigen weg.
- Erwartet: Dateien werden hinzugefügt, wie bei ausgeschalteter Einstellung und wie unter „Freigabe bearbeiten“.
- Code: `frontend/src/pages/upload/index.tsx`, `handleDropzoneFilesChanged`: `const baseFiles = autoOpenCreateUploadModal ? [] : filesRef.current;` Mit aktiver Einstellung wird die bisherige Liste bewusst geleert.
- Offene Frage an smp46: Ist das Absicht? Falls ja, warum (z. B. damit der Dialog nur die neuen Dateien zeigt)?
- Verwandt: [#213](https://github.com/smp46/pingvin-share-x/issues/213) (Upload sofort beim Ablegen starten).
- [ ] Bug-Report bzw. Issue. Danach **F-Kandidat**.

---

## E. Feature-Issues

### E1. Share-Details nachträglich bearbeiten *(zusammengefasst)*
Ein gemeinsames Issue, weil alles den gleichen Dialog betrifft:
- **Name und Beschreibung** nachträglich ändern (aktuell nur Dateien bearbeitbar). Der Info-Dialog des Shares würde sich anbieten.
- **Empfänger anzeigen:** sehen, an welche E-Mail-Adressen ein Share ging (z. B. Tippfehler prüfen).
- **Erneut senden:** Button, um die E-Mail an die Empfänger nochmal zu schicken.
- smp46 zu Empfängern: „Issue, dann mache ich es“. Zum erneuten Senden: „Issue öffnen“.
- [ ] Issue.

### E2. Download-Log
- Protokoll, wann Dateien eines Shares heruntergeladen wurden, einfach in der Oberfläche.
- Verwandt: [#141](https://github.com/smp46/pingvin-share-x/issues/141) (Audit-Log für Admin-Aktionen).
- [ ] Issue, auf #141 verweisen. (Evtl. mit E1 verbinden, falls es zu dünn ist.)

### E3. Dateivorschau beim Erstellen/Bearbeiten
- Vorschau (Bilder, PDF, …) gibt es nur in der Empfängeransicht. Auf `/upload` und unter „Freigabe bearbeiten“ (/edit) kann man Dateien nur entfernen, aber nicht ansehen.
- Ziel: vor dem Teilen oder Löschen prüfen, ob es die richtige Datei ist.
- Code: `components/upload/FileList.tsx` hat nur Bearbeiten (Text) und Löschen. `components/share/FilePreview.tsx` + `showFilePreviewModal.tsx` gibt es schon. Für noch nicht hochgeladene Dateien muss die Vorschau lokal aus dem `File`-Objekt kommen (`URL.createObjectURL`).
- [ ] Issue → **F-Kandidat**.

### E4. PWA: eigenes App-Icon im Admin-Bereich
- Eigenes Bild als App-Icon, unabhängig vom Logo der Web-Oberfläche. Optional Innenabstand und Hintergrundfarbe einstellbar.
- Dazu: Vorschau der ausgewählten Bilder im Admin-Bereich und andere Formate als PNG.
- smp46: „schaue ich mir an“.
- [ ] Issue nach dem Merge von #252. Basis bis dahin: `feature/pwa-share-target`.

### E5. „Meine Freigaben“: Share direkt öffnen
- Um den Share aus Sicht des Empfängers anzusehen, muss man den Link kopieren und in einem neuen Tab einfügen.
- Vorschlag: Name oder ID in der Tabelle als Link (neuer Tab).
- [ ] Kleines Issue, auf #125 verweisen (siehe C3) → **F-Kandidat**.

### E6. Zeitzone (`TZ`-Variable)
- Das Image läuft in UTC und hat kein `tzdata`, eine `TZ`-Variable allein wirkt deshalb nicht.
- Mein Workaround: `/etc/localtime` read-only mounten (siehe `/opt/pingvin/docker-compose.yml`).
- smp46: „Gerne Issue“.
- [ ] Issue. Lösung vermutlich `tzdata` ins Image und `TZ` dokumentieren.

### E7. Speicherplatz: Gesamtverbrauch begrenzen und anzeigen → [#130](https://github.com/smp46/pingvin-share-x/issues/130) kommentieren
**Was es heute gibt:**
- Pro Benutzer: *Custom storage quota* (Benutzerverwaltung → Benutzer → Berechtigungen).
- Pro Share: maximale Share-Größe.
- **Keine** Grenze für alle Shares zusammen und keine Prüfung des freien Speichers.
- Die Speicheranzeige im Admin-Bereich prüft das Dateisystem von `data/uploads` (`backend/src/system/system.service.ts`, `check-disk-space`) und zeigt nur frei/belegt für das ganze Dateisystem.

**Vorhanden:** #130 „Add a configurable global storage quota“ (offen, noch ohne Antwort von smp46) deckt das feste Gesamtlimit ab. → **Kommentieren statt neues Issue**, mit meinen Ergänzungen:
1. **Gesamtlimit für alle Shares** in GB **oder** Prozent des Speichers (#130 nennt nur GB).
2. **Neue Shares nur bis X % Belegung des Speichers erlauben** (z. B. 80 %), unabhängig vom Gesamtlimit. Schützt andere Dienste auf demselben Server, auch wenn andere Programme den Speicher füllen.
3. **Anzeige:** wie viel des belegten Speichers auf Pingvin entfällt (bisher nur frei/belegt fürs ganze Dateisystem), idealerweise mit dem Gesamtlimit als Balken.

**Workaround ohne Code-Änderung (für den Kommentar und ggf. die Doku, siehe [#185](https://github.com/smp46/pingvin-share-x/issues/185)):**
Die Uploads liegen in `data/uploads` (auf dem Host bei mir `/opt/pingvin/data/uploads`). Bekommt dieses Verzeichnis ein **eigenes Dateisystem mit fester Größe**, kann Pingvin nie mehr belegen. Die Speicheranzeige im Admin-Bereich zeigt dann automatisch dieses Dateisystem an.
- **Image-Datei mit fester Größe** (funktioniert auf jedem Linux):
  ```bash
  fallocate -l 100G /srv/pingvin-uploads.img
  mkfs.ext4 /srv/pingvin-uploads.img
  mount -o loop /srv/pingvin-uploads.img /opt/pingvin/data/uploads
  chown 1000:1000 /opt/pingvin/data/uploads
  # dauerhaft in /etc/fstab:
  # /srv/pingvin-uploads.img  /opt/pingvin/data/uploads  ext4  loop,defaults  0  2
  ```
  Vorher Container stoppen und vorhandene Uploads in das neue Dateisystem kopieren.
- **Eigene Partition / LVM-Volume** mit fester Größe: gleiches Prinzip, flexibler vergrößerbar (`lvextend` + `resize2fs`).
- **ZFS / Btrfs:** eigenes Dataset/Subvolume mit Quota (`zfs set quota=100G pool/pingvin`, `btrfs qgroup limit 100G …`), z. B. auf TrueNAS/Proxmox.
- **XFS-Projektquota** auf das Verzeichnis, falls das Dateisystem XFS ist.
- **S3-Speicher** (z. B. MinIO) mit Bucket-Quota.
- Nicht geeignet: Docker-Optionen wie `--storage-opt size=` gelten nur für das Container-Dateisystem, nicht für Bind-Mounts wie `./data`.

- [ ] Kommentar in #130 (Ergänzungen 1–3 + Hinweis auf den Workaround).

### E8. E-Mail-Empfänger und OIDC
- **Autovervollständigung** aus registrierten Benutzern und bereits verwendeten Adressen. smp46: aus Sicherheitsgründen konfigurierbar (nicht standardmäßig alle Benutzer zeigen).
- **Option „Nur diese Empfänger“ ausblendbar:** mit OIDC/SSO überflüssig.
- [ ] Issue (beides zusammen oder getrennt).

### E9. Login- und E-Mail-Konfiguration
Drei getrennte Issues, smp46 hat allen zugestimmt:
- [ ] **Social-Login-Einstellungen:** Provider auswählen, dann nur die nötigen Felder anzeigen.
- [ ] **Generic OIDC:** Button-Text einstellbar („Mit Authentik anmelden“) und Claim für den sichtbaren Benutzernamen wählbar. Verwandt: [#236](https://github.com/smp46/pingvin-share-x/issues/236) (Sync Name from OAuth), prüfen, ob das schon reicht.
- [ ] **E-Mail-Templates als Dateien** wie bei Vaultwarden, mit separatem Header/Footer (Outlook-CSS lässt sich im kleinen Textfeld kaum debuggen). smp46: über `config.yaml` schon möglich, deaktiviert dann aber alle UI-Einstellungen.

### E10. Gesamtfortschritt bei großen Uploads (Fortschritts-Dialog)
- **Problem:** Der Fortschritt wird nur **pro Datei** angezeigt (Kreis, Kreis + %, oder % + Restzeit über *Konfiguration → Darstellung → Upload progress style*). Bei einem großen Medien-Archiv (viele Fotos/Videos):
  - keine **Gesamtdauer / Gesamtrestzeit** und kein **Gesamtfortschritt** (Dateien x von y, MB x von y, Geschwindigkeit),
  - man muss in der langen Liste immer weiter nach unten scrollen, um zu sehen, welche Dateien gerade hochgeladen werden (es laufen 3 gleichzeitig, `pLimit(3)` in `pages/upload/index.tsx`),
  - kommen die Dateien aus einer **langsamen Quelle** (USB-Laufwerk, Netzwerkfreigabe/SMB, OneDrive „Dateien bei Bedarf“), dauert der Upload deutlich länger und ist schwer abzuschätzen. Die Restzeit pro Datei sagt dann wenig über die Gesamtdauer aus (verwandt: [#213](https://github.com/smp46/pingvin-share-x/issues/213), dort das gleiche Problem mit OneDrive),
  - verlässt man die Seite zu früh, weil man den Stand nicht sieht, ist der Upload unvollständig. (Es gibt zwar eine Rückfrage beim Verlassen, `hooks/confirm-leave.hook.ts`, aber man weiß nicht, wie lange es noch dauert.)
- **Vorschlag:** Admin-Einstellung „Fortschritts-Dialog bei großen Uploads anzeigen“ ab X Dateien (optional ab X MB). Dann erscheint ein modaler Dialog mit:
  - Gesamtfortschritt (Balken + %), Dateien x/y, Datenmenge x/y,
  - Upload-Geschwindigkeit und geschätzte Restzeit für den ganzen Upload,
  - die gerade laufenden Dateien,
  - Hinweis „Seite nicht schließen“, ggf. Liste fehlgeschlagener Dateien am Ende.
- Kein bestehendes Issue dafür. Verwandt: [#131](https://github.com/smp46/pingvin-share-x/issues/131) (laufende Uploads abbrechen, ein „Abbrechen“-Button würde gut in den Dialog passen), [#149](https://github.com/smp46/pingvin-share-x/issues/149)/#154 (Prozent + Restzeit pro Datei, erledigt).
- smp46 hatte das in #251 mit dem Hinweis auf *Upload progress style* beantwortet, also missverstanden. Im Issue deshalb deutlich machen: **pro Datei gibt es, es fehlt der Gesamtüberblick.** Screenshot einer langen Liste mitten im Upload hilft.
- [ ] Issue.

---

## F. Gute Kandidaten für eigene PRs
Klein, klar abgegrenzt, wenig Diskussionsbedarf. Vorher jeweils Issue abwarten bzw. Zustimmung von smp46.

| Kandidat | Aus | Aufwand |
|---|---|---|
| Tooltips übersetzen | D4 | sehr klein |
| Share direkt öffnen (Link in „Meine Freigaben“) | E5 | sehr klein |
| Drop außerhalb der Fläche abfangen | D1 | klein |
| Fallback auf Englisch | B2 | sehr klein |
| Drop fügt hinzu statt zu ersetzen | D5 | sehr klein |
| PDF-Vorschau in neuem Tab | D3 | sehr klein |
| Dateivorschau beim Erstellen/Bearbeiten | E3 | mittel |

---

## G. Erledigt / nichts zu tun

- **Speicherlimits pro Benutzer:** gibt es unter Benutzerverwaltung → Benutzer → Berechtigungen → *Custom storage quota*. Fehlende Doku fällt laut smp46 unter [#185](https://github.com/smp46/pingvin-share-x/issues/185).
- **Ordner-Vorschau:** [#264](https://github.com/smp46/pingvin-share-x/issues/264) geschlossen, Fix mit `getMimeType` in #288.
- **Teilen-Dialog öffnet sofort beim ersten Drop:** Einstellung *Konfiguration → Share → „Freigabe-Fenster automatisch öffnen“* ausgeschaltet. Dateien werden jetzt hinzugefügt, der Dialog kommt erst über „Teilen“. (Getestet 14.11.2026; das Verwerfen bei eingeschalteter Einstellung bleibt als D5.)
- **Startseite blitzt auf:** [#263](https://github.com/smp46/pingvin-share-x/issues/263) / [#251](https://github.com/smp46/pingvin-share-x/pull/251) gemergt.
- **Name als Pflichtfeld:** wird mit #244 umgesetzt (mein Zusatz siehe C1).
